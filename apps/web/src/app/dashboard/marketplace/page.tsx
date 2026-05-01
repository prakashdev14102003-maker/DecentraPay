"use client";

import { useApiClient } from "@/lib/auth";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Order {
    id: string;
    companyId: string;
    side: "BUY" | "SELL";
    price: string;
    quantity: string;
    remaining: string;
    status: string;
    placedAt: string;
}

interface MyOrder extends Order {
    filled: string;
    fillPct: number;
}

interface Trade {
    id: string;
    price: string;
    quantity: string;
    royaltyPaid: string;
    platformFee: string;
    executedAt: string;
}

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { className: string; label: string }> = {
        OPEN: { className: "bg-slate-500/10 text-slate-400 border-slate-500/20", label: "Open" },
        PARTIALLY_FILLED: { className: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Partial" },
        FILLED: { className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Filled" },
        CANCELLED: { className: "bg-red-500/10 text-red-400 border-red-500/20", label: "Cancelled" },
    };
    const c = config[status] || config.OPEN;
    return <Badge variant="secondary" className={c.className}>{c.label}</Badge>;
}

function FillProgressBar({ fillPct }: { fillPct: number }) {
    return (
        <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.min(fillPct, 100)}%` }}
                />
            </div>
            <span className="text-xs text-muted-foreground font-mono">{fillPct}%</span>
        </div>
    );
}

export default function MarketplacePage() {
    const api = useApiClient();
    const [bids, setBids] = useState<Order[]>([]);
    const [asks, setAsks] = useState<Order[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [myOrders, setMyOrders] = useState<MyOrder[]>([]);
    const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
    const [price, setPrice] = useState("");
    const [quantity, setQuantity] = useState("");
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    const loadData = async () => {
        try {
            const [book, tradeList, orders] = await Promise.all([
                api.fetch("/marketplace/orderbook"),
                api.fetch("/marketplace/trades"),
                api.fetch("/marketplace/orders/mine").catch(() => []),
            ]);
            setBids(book.bids || []);
            setAsks(book.asks || []);
            setTrades(tradeList || []);
            setMyOrders(orders || []);
        } catch {
            // API might not be running
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePlaceOrder = async () => {
        if (!price || !quantity) return;
        setLoading(true);
        try {
            await api.fetch("/marketplace/orders", {
                method: "POST",
                body: JSON.stringify({
                    side: orderSide,
                    price: parseFloat(price),
                    quantity: parseFloat(quantity),
                }),
            });
            toast.success("Order placed!");
            setDialogOpen(false);
            setPrice("");
            setQuantity("");
            loadData();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to place order");
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        setCancellingId(orderId);
        try {
            await api.fetch(`/marketplace/orders/${orderId}`, { method: "DELETE" });
            toast.success("Order cancelled");
            loadData();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to cancel order");
        } finally {
            setCancellingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Marketplace</h1>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    {/* @ts-ignore */}
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Place Order
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Place Order</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div>
                                <Label>Side</Label>
                                <Select value={orderSide} onValueChange={(v) => setOrderSide(v as "BUY" | "SELL")}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BUY">🟢 Buy</SelectItem>
                                        <SelectItem value="SELL">🔴 Sell</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Price per Credit</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="1200.00"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Quantity (credits)</Label>
                                <Input
                                    type="number"
                                    step="0.001"
                                    placeholder="3.600"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <Button
                                onClick={handlePlaceOrder}
                                disabled={loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {loading ? "Placing…" : `Place ${orderSide} Order`}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Order Book */}
            <div className="grid md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg text-emerald-400">Bids (Buy)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {bids.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">No bids</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Price</TableHead>
                                        <TableHead className="text-right">Remaining</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Fill</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bids.map((b) => {
                                        const qty = parseFloat(b.quantity);
                                        const rem = parseFloat(b.remaining);
                                        const filled = qty - rem;
                                        const fillPct = qty > 0 ? Math.round((filled / qty) * 100) : 0;
                                        return (
                                            <TableRow key={b.id}>
                                                <TableCell className="text-emerald-400 font-mono">
                                                    {parseFloat(b.price).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {rem.toFixed(3)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-muted-foreground">
                                                    {qty.toFixed(3)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {fillPct > 0 ? <FillProgressBar fillPct={fillPct} /> : <span className="text-xs text-muted-foreground">—</span>}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-muted-foreground">
                                                    {(parseFloat(b.price) * rem).toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg text-red-400">Asks (Sell)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {asks.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">No asks</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Price</TableHead>
                                        <TableHead className="text-right">Remaining</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Fill</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {asks.map((a) => {
                                        const qty = parseFloat(a.quantity);
                                        const rem = parseFloat(a.remaining);
                                        const filled = qty - rem;
                                        const fillPct = qty > 0 ? Math.round((filled / qty) * 100) : 0;
                                        return (
                                            <TableRow key={a.id}>
                                                <TableCell className="text-red-400 font-mono">
                                                    {parseFloat(a.price).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {rem.toFixed(3)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-muted-foreground">
                                                    {qty.toFixed(3)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {fillPct > 0 ? <FillProgressBar fillPct={fillPct} /> : <span className="text-xs text-muted-foreground">—</span>}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-muted-foreground">
                                                    {(parseFloat(a.price) * rem).toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* My Orders */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">My Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    {myOrders.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No orders placed yet</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Side</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Filled</TableHead>
                                    <TableHead>Progress</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Placed</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {myOrders.map((o) => (
                                    <TableRow key={o.id}>
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                className={
                                                    o.side === "BUY"
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : "bg-red-500/10 text-red-400"
                                                }
                                            >
                                                {o.side}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            {parseFloat(o.price).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {parseFloat(o.quantity).toFixed(3)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {parseFloat(o.filled).toFixed(3)}
                                        </TableCell>
                                        <TableCell>
                                            <FillProgressBar fillPct={o.fillPct} />
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={o.status} />
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground">
                                            {new Date(o.placedAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {(o.status === "OPEN" || o.status === "PARTIALLY_FILLED") && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-muted-foreground hover:text-red-400 text-xs"
                                                    onClick={() => handleCancelOrder(o.id)}
                                                    disabled={cancellingId === o.id}
                                                >
                                                    {cancellingId === o.id ? "…" : "Cancel"}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Recent Trades */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Recent Trades</CardTitle>
                </CardHeader>
                <CardContent>
                    {trades.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No trades yet</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Price</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Royalty</TableHead>
                                    <TableHead className="text-right">Fee</TableHead>
                                    <TableHead className="text-right">Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {trades.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell className="font-mono">{parseFloat(t.price).toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono">{parseFloat(t.quantity).toFixed(3)}</TableCell>
                                        <TableCell className="text-right font-mono text-amber-400">
                                            {parseFloat(t.royaltyPaid).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-muted-foreground">
                                            {parseFloat(t.platformFee).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground">
                                            {new Date(t.executedAt).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
