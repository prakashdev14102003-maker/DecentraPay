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

interface Trade {
    id: string;
    price: string;
    quantity: string;
    royaltyPaid: string;
    platformFee: string;
    executedAt: string;
}

export default function MarketplacePage() {
    const api = useApiClient();
    const [bids, setBids] = useState<Order[]>([]);
    const [asks, setAsks] = useState<Order[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
    const [price, setPrice] = useState("");
    const [quantity, setQuantity] = useState("");
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const loadData = async () => {
        try {
            const [book, tradeList] = await Promise.all([
                api.fetch("/marketplace/orderbook"),
                api.fetch("/marketplace/trades"),
            ]);
            setBids(book.bids || []);
            setAsks(book.asks || []);
            setTrades(tradeList || []);
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
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bids.map((b) => (
                                        <TableRow key={b.id}>
                                            <TableCell className="text-emerald-400 font-mono">
                                                {parseFloat(b.price).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {parseFloat(b.remaining).toFixed(3)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">
                                                {(parseFloat(b.price) * parseFloat(b.remaining)).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
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
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {asks.map((a) => (
                                        <TableRow key={a.id}>
                                            <TableCell className="text-red-400 font-mono">
                                                {parseFloat(a.price).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {parseFloat(a.remaining).toFixed(3)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">
                                                {(parseFloat(a.price) * parseFloat(a.remaining)).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

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
