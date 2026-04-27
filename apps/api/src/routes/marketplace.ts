import { Router, Request, Response } from "express";
import { z } from "zod";
import { eq, and, asc, desc } from "drizzle-orm";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { db } from "../db/index.js";
import { orders, trades, wallets } from "../db/schema/index.js";

const router = Router();

const placeOrderSchema = z.object({
    side: z.enum(["BUY", "SELL"]),
    price: z.number().positive(),
    quantity: z.number().positive(),
});

// GET /api/v1/marketplace/orderbook — Get the order book
router.get(
    "/orderbook",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const depth = parseInt(req.query.depth as string) || 20;

            const bids = await db
                .select()
                .from(orders)
                .where(and(eq(orders.side, "BUY"), eq(orders.status, "OPEN")))
                .orderBy(desc(orders.price), asc(orders.placedAt))
                .limit(depth);

            const asks = await db
                .select()
                .from(orders)
                .where(and(eq(orders.side, "SELL"), eq(orders.status, "OPEN")))
                .orderBy(asc(orders.price), asc(orders.placedAt))
                .limit(depth);

            res.json({ success: true, data: { bids, asks } });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to fetch order book";
            res.status(500).json({ success: false, error: message });
        }
    }
);

// POST /api/v1/marketplace/orders — Place a new order
router.post(
    "/orders",
    authenticate,
    authorize("COMPANY"),
    validate(placeOrderSchema),
    async (req: Request, res: Response) => {
        try {
            const companyId = req.user!.companyId!;
            const { side, price, quantity } = req.body;

            // If selling, check that company has enough credits
            if (side === "SELL") {
                const [wallet] = await db
                    .select()
                    .from(wallets)
                    .where(eq(wallets.companyId, companyId))
                    .limit(1);

                if (!wallet || parseFloat(wallet.balanceCredits) < quantity) {
                    res.status(400).json({
                        success: false,
                        error: "Insufficient credit balance to place sell order",
                    });
                    return;
                }
            }

            const [order] = await db
                .insert(orders)
                .values({
                    companyId,
                    side,
                    price: String(price),
                    quantity: String(quantity),
                    remaining: String(quantity),
                })
                .returning();

            // Attempt to match
            await tryMatch(order.id, side, price);

            // Re-fetch order after matching
            const [updated] = await db
                .select()
                .from(orders)
                .where(eq(orders.id, order.id))
                .limit(1);

            res.status(201).json({ success: true, data: updated });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Order placement failed";
            res.status(500).json({ success: false, error: message });
        }
    }
);

// DELETE /api/v1/marketplace/orders/:id — Cancel an order
router.delete(
    "/orders/:id",
    authenticate,
    authorize("COMPANY"),
    async (req: Request, res: Response) => {
        try {
            const [order] = await db
                .select()
                .from(orders)
                .where(eq(orders.id, req.params.id))
                .limit(1);

            if (!order) {
                res.status(404).json({ success: false, error: "Order not found" });
                return;
            }

            if (order.companyId !== req.user!.companyId) {
                res.status(403).json({ success: false, error: "Not your order" });
                return;
            }

            if (order.status !== "OPEN") {
                res.status(400).json({ success: false, error: "Order is not open" });
                return;
            }

            await db
                .update(orders)
                .set({ status: "CANCELLED" })
                .where(eq(orders.id, order.id));

            res.json({ success: true, data: { id: order.id, status: "CANCELLED" } });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Cancel failed";
            res.status(500).json({ success: false, error: message });
        }
    }
);

// GET /api/v1/marketplace/trades — Trade history
router.get(
    "/trades",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const limit = parseInt(req.query.limit as string) || 50;
            const tradeList = await db
                .select()
                .from(trades)
                .orderBy(desc(trades.executedAt))
                .limit(limit);

            res.json({ success: true, data: tradeList });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to fetch trades";
            res.status(500).json({ success: false, error: message });
        }
    }
);

// ─── Matching Engine ───────────────────────────────────

const ROYALTY_BPS = 1000; // 10%
const PLATFORM_BPS = 10; // 0.10%

async function tryMatch(orderId: string, side: string, price: number) {
    const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

    if (!order || order.status !== "OPEN") return;

    // Find matching counter-orders
    const counterSide = side === "BUY" ? "SELL" : "BUY";

    let counterOrders;
    if (side === "BUY") {
        // Match with asks at or below the buy price
        counterOrders = await db
            .select()
            .from(orders)
            .where(and(eq(orders.side, "SELL"), eq(orders.status, "OPEN")))
            .orderBy(asc(orders.price), asc(orders.placedAt));
    } else {
        // Match with bids at or above the sell price
        counterOrders = await db
            .select()
            .from(orders)
            .where(and(eq(orders.side, "BUY"), eq(orders.status, "OPEN")))
            .orderBy(desc(orders.price), asc(orders.placedAt));
    }

    let remaining = parseFloat(order.remaining);

    for (const counter of counterOrders) {
        if (remaining <= 0) break;

        const counterPrice = parseFloat(counter.price);

        // Price check
        if (side === "BUY" && counterPrice > price) break;
        if (side === "SELL" && counterPrice < price) break;

        const counterRemaining = parseFloat(counter.remaining);
        const fillQty = Math.min(remaining, counterRemaining);
        const fillPrice = counterPrice; // price-time priority: use resting order's price

        // Calculate fees
        const gross = fillPrice * fillQty;
        const royalty = Math.round((gross * ROYALTY_BPS) / 10000 * 10000) / 10000;
        const platformFee = Math.round((gross * PLATFORM_BPS) / 10000 * 10000) / 10000;

        const buyOrderId = side === "BUY" ? order.id : counter.id;
        const sellOrderId = side === "SELL" ? order.id : counter.id;

        // Record trade
        await db.insert(trades).values({
            buyOrderId,
            sellOrderId,
            price: String(fillPrice),
            quantity: String(fillQty),
            royaltyPaid: String(royalty),
            platformFee: String(platformFee),
        });

        // Update counter order
        const newCounterRemaining = counterRemaining - fillQty;
        await db
            .update(orders)
            .set({
                remaining: String(newCounterRemaining),
                status: newCounterRemaining <= 0 ? "FILLED" : "OPEN",
            })
            .where(eq(orders.id, counter.id));

        // Update wallets — transfer credits from seller to buyer
        const buyCompanyId = side === "BUY" ? order.companyId : counter.companyId;
        const sellCompanyId = side === "SELL" ? order.companyId : counter.companyId;

        // Debit seller
        const [sellerWallet] = await db
            .select()
            .from(wallets)
            .where(eq(wallets.companyId, sellCompanyId))
            .limit(1);
        if (sellerWallet) {
            await db
                .update(wallets)
                .set({
                    balanceCredits: String(
                        parseFloat(sellerWallet.balanceCredits) - fillQty
                    ),
                    updatedAt: new Date(),
                })
                .where(eq(wallets.companyId, sellCompanyId));
        }

        // Credit buyer
        const [buyerWallet] = await db
            .select()
            .from(wallets)
            .where(eq(wallets.companyId, buyCompanyId))
            .limit(1);
        if (buyerWallet) {
            await db
                .update(wallets)
                .set({
                    balanceCredits: String(
                        parseFloat(buyerWallet.balanceCredits) + fillQty
                    ),
                    updatedAt: new Date(),
                })
                .where(eq(wallets.companyId, buyCompanyId));
        }

        remaining -= fillQty;
    }

    // Update our order
    await db
        .update(orders)
        .set({
            remaining: String(remaining),
            status: remaining <= 0 ? "FILLED" : "OPEN",
        })
        .where(eq(orders.id, order.id));
}

export default router;
