"use client";

import { useApiClient } from "@/lib/auth";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Wallet {
    id: string;
    companyId: string;
    balanceCredits: string;
    surplusCredits: string;
    deficitCredits: string;
    ethAddress: string | null;
}

export default function WalletPage() {
    const api = useApiClient();
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.fetch("/wallets/me").then(setWallet).catch(console.error).finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) return <div className="h-40 bg-muted rounded-xl animate-pulse" />;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Wallet</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-emerald-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Credit Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-400">
                            {wallet ? parseFloat(wallet.balanceCredits).toFixed(3) : "0.000"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Carbon credits (1 credit = 1 tonne CO₂e)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Surplus</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-400">
                            {wallet ? parseFloat(wallet.surplusCredits).toFixed(3) : "0.000"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Below monthly allowance</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Deficit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-400">
                            {wallet ? parseFloat(wallet.deficitCredits).toFixed(3) : "0.000"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Above monthly allowance</p>
                    </CardContent>
                </Card>
            </div>

            {wallet?.ethAddress && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Ethereum Address</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <code className="text-sm bg-muted px-3 py-2 rounded-lg block font-mono">
                            {wallet.ethAddress}
                        </code>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
