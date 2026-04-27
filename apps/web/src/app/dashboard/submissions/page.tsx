"use client";

import { useApiClient } from "@/lib/auth";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Submission {
    id: string;
    period: string;
    status: string;
    totalKg: string | null;
    totalScope1Kg: string | null;
    totalScope2Kg: string | null;
    totalScope3Kg: string | null;
    factorLibraryVersion: string;
    createdAt: string;
}

export default function SubmissionsPage() {
    const api = useApiClient();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.fetch("/submissions").then(setSubmissions).catch(console.error).finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Submissions</h1>
                <Link href="/dashboard/submissions/new">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        New Submission
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : submissions.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <p className="mb-4">No submissions yet. Start tracking your emissions.</p>
                        <Link href="/dashboard/submissions/new">
                            <Button variant="outline">Create Submission</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {submissions
                        .slice()
                        .reverse()
                        .map((s) => (
                            <Link key={s.id} href={`/dashboard/submissions/${s.id}`}>
                                <Card className="hover:border-emerald-500/30 transition-colors cursor-pointer">
                                    <CardContent className="py-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <div className="font-mono font-semibold">{s.period}</div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        {new Date(s.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
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
                                            <div className="text-right">
                                                {s.totalKg ? (
                                                    <>
                                                        <div className="font-semibold">
                                                            {(parseFloat(s.totalKg) / 1000).toFixed(3)} t CO₂e
                                                        </div>
                                                        <div className="text-xs text-muted-foreground flex gap-3 mt-0.5">
                                                            <span>S1: {s.totalScope1Kg ? (parseFloat(s.totalScope1Kg) / 1000).toFixed(2) : "—"}</span>
                                                            <span>S2: {s.totalScope2Kg ? (parseFloat(s.totalScope2Kg) / 1000).toFixed(2) : "—"}</span>
                                                            <span>S3: {s.totalScope3Kg ? (parseFloat(s.totalScope3Kg) / 1000).toFixed(2) : "—"}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">No data</span>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                </div>
            )}
        </div>
    );
}
