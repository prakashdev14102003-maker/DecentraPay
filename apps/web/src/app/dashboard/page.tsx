"use client";

import { useAuth, useApiClient } from "@/lib/auth";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CompanyData {
    company: {
        id: string;
        name: string;
        sector: string;
        country: string;
        monthlyAllowanceKg: string;
        kycStatus: string;
    };
    wallet: {
        balanceCredits: string;
        surplusCredits: string;
        deficitCredits: string;
    } | null;
}

interface Submission {
    id: string;
    period: string;
    status: string;
    totalKg: string | null;
    createdAt: string;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const api = useApiClient();
    const [companyData, setCompanyData] = useState<CompanyData | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [company, subs] = await Promise.all([
                    api.fetch("/companies/me"),
                    api.fetch("/submissions"),
                ]);
                setCompanyData(company);
                setSubmissions(subs);
            } catch {
                // API might not be running yet
            } finally {
                setLoading(false);
            }
        }
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 bg-muted rounded w-48 animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    const allowanceKg = companyData?.company
        ? parseFloat(companyData.company.monthlyAllowanceKg)
        : 0;
    const allowanceTons = (allowanceKg / 1000).toFixed(2);
    const balance = companyData?.wallet
        ? parseFloat(companyData.wallet.balanceCredits).toFixed(2)
        : "0.00";
    const surplus = companyData?.wallet
        ? parseFloat(companyData.wallet.surplusCredits).toFixed(2)
        : "0.00";
    const deficit = companyData?.wallet
        ? parseFloat(companyData.wallet.deficitCredits).toFixed(2)
        : "0.00";

    const latestSubmission = submissions[submissions.length - 1];
    const latestEmissions = latestSubmission?.totalKg
        ? (parseFloat(latestSubmission.totalKg) / 1000).toFixed(2)
        : "—";

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        {companyData?.company?.name ?? "Dashboard"}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {companyData?.company?.sector} sector •{" "}
                        {companyData?.company?.country}
                    </p>
                </div>
                <Link href="/dashboard/submissions/new">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        New Submission
                    </Button>
                </Link>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Monthly Allowance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{allowanceTons} t</div>
                        <p className="text-xs text-muted-foreground mt-1">CO₂e per month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Latest Emissions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{latestEmissions} t</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {latestSubmission?.period
                                ? `Period ${latestSubmission.period}`
                                : "No submissions yet"}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Credit Balance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">
                            {balance}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Carbon credits</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Surplus / Deficit
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {parseFloat(surplus) > 0 ? (
                                <span className="text-emerald-400">+{surplus}</span>
                            ) : parseFloat(deficit) > 0 ? (
                                <span className="text-red-400">-{deficit}</span>
                            ) : (
                                "0.00"
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">kg CO₂e</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent submissions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Recent Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                    {submissions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p className="mb-4">No submissions yet.</p>
                            <Link href="/dashboard/submissions/new">
                                <Button variant="outline">Create Your First Submission</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {submissions
                                .slice(-5)
                                .reverse()
                                .map((s) => (
                                    <Link key={s.id} href={`/dashboard/submissions/${s.id}`}>
                                        <div className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="text-sm font-mono">{s.period}</div>
                                                <Badge
                                                    variant={
                                                        s.status === "VERIFIED"
                                                            ? "default"
                                                            : s.status === "REJECTED"
                                                                ? "destructive"
                                                                : "secondary"
                                                    }
                                                    className={
                                                        s.status === "VERIFIED"
                                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                            : ""
                                                    }
                                                >
                                                    {s.status}
                                                </Badge>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {s.totalKg
                                                    ? `${(parseFloat(s.totalKg) / 1000).toFixed(2)} t CO₂e`
                                                    : "No data"}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* User role info */}
            <div className="text-xs text-muted-foreground">
                Signed in as {user?.email} • Role: {user?.role}
            </div>
        </div>
    );
}
