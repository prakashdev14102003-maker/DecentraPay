"use client";

import { use, useEffect, useState } from "react";
import { useApiClient } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Emission {
    id: string;
    scope: number;
    activityType: string;
    activityValue: string;
    activityUnit: string;
    gas: string;
    emissionFactor: string;
    gwp: string;
    emissionKg: string;
}

interface Submission {
    id: string;
    period: string;
    status: string;
    totalKg: string | null;
    totalScope1Kg: string | null;
    totalScope2Kg: string | null;
    totalScope3Kg: string | null;
    factorLibraryVersion: string;
    proofPdfPath: string | null;
    proofPdfHash: string | null;
    createdAt: string;
}

export default function SubmissionDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const api = useApiClient();
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [emissions, setEmissions] = useState<Emission[]>([]);
    const [loading, setLoading] = useState(true);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
    const UPLOADS_BASE = API_URL.replace("/api/v1", "/uploads");

    useEffect(() => {
        api
            .fetch(`/submissions/${id}`)
            .then((data: { submission: Submission; emissions: Emission[] }) => {
                setSubmission(data.submission);
                setEmissions(data.emissions);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (loading) {
        return <div className="h-40 bg-muted rounded-xl animate-pulse" />;
    }

    if (!submission) {
        return <div className="text-muted-foreground">Submission not found</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Submission {submission.period}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Created {new Date(submission.createdAt).toLocaleDateString()} •
                        Factor library {submission.factorLibraryVersion}
                    </p>
                </div>
                <Badge
                    variant={
                        submission.status === "VERIFIED"
                            ? "default"
                            : submission.status === "REJECTED"
                                ? "destructive"
                                : "secondary"
                    }
                    className={`text-base px-4 py-1 ${submission.status === "VERIFIED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : ""
                        }`}
                >
                    {submission.status}
                </Badge>
            </div>

            {/* Proof Document */}
            {submission.proofPdfPath && (
                <Card className="border-amber-500/20">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            <div className="flex-1">
                                <p className="text-sm font-medium">Proof Document</p>
                                {submission.proofPdfHash && (
                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                        SHA-256: {submission.proofPdfHash}
                                    </p>
                                )}
                            </div>
                            <a
                                href={`${UPLOADS_BASE}/${submission.proofPdfPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Download
                            </a>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Scope totals */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: "Scope 1", value: submission.totalScope1Kg, color: "text-amber-400" },
                    { label: "Scope 2", value: submission.totalScope2Kg, color: "text-blue-400" },
                    { label: "Scope 3", value: submission.totalScope3Kg, color: "text-purple-400" },
                    { label: "Total", value: submission.totalKg, color: "text-emerald-400" },
                ].map((s) => (
                    <Card key={s.label}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-xl font-bold ${s.color}`}>
                                {s.value ? `${(parseFloat(s.value) / 1000).toFixed(3)} t` : "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {s.value ? `${parseFloat(s.value).toFixed(3)} kg CO₂e` : ""}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Emission details */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Emission Details</CardTitle>
                </CardHeader>
                <CardContent>
                    {emissions.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No emission data available</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Scope</TableHead>
                                    <TableHead>Activity</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Gas</TableHead>
                                    <TableHead className="text-right">Factor</TableHead>
                                    <TableHead className="text-right">GWP</TableHead>
                                    <TableHead className="text-right">kg CO₂e</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {emissions.map((e) => (
                                    <TableRow key={e.id}>
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                className={
                                                    e.scope === 1
                                                        ? "bg-amber-500/10 text-amber-400"
                                                        : e.scope === 2
                                                            ? "bg-blue-500/10 text-blue-400"
                                                            : "bg-purple-500/10 text-purple-400"
                                                }
                                            >
                                                {e.scope}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{e.activityType}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {parseFloat(e.activityValue).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{e.activityUnit}</TableCell>
                                        <TableCell className="text-sm">{e.gas}</TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                            {parseFloat(e.emissionFactor).toFixed(6)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                            {parseFloat(e.gwp).toFixed(1)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-semibold">
                                            {parseFloat(e.emissionKg).toFixed(3)}
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
