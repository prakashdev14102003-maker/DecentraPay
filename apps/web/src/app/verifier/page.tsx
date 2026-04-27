"use client";

import { useApiClient } from "@/lib/auth";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Verification {
    id: string;
    submissionId: string;
    auditPdfHash: string;
    auditorTotalKg: string | null;
    tolerancePct: string;
    decision: string;
    reason: string | null;
    decidedAt: string | null;
}

export default function VerifierQueuePage() {
    const api = useApiClient();
    const [queue, setQueue] = useState<Verification[]>([]);
    const [loading, setLoading] = useState(true);
    const [reasons, setReasons] = useState<Record<string, string>>({});
    const [acting, setActing] = useState<string | null>(null);

    const loadQueue = async () => {
        try {
            const data = await api.fetch("/verifier/queue");
            setQueue(data || []);
        } catch {
            //
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQueue();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDecide = async (id: string, decision: "APPROVED" | "REJECTED") => {
        setActing(id);
        try {
            await api.fetch(`/verifier/decide/${id}`, {
                method: "POST",
                body: JSON.stringify({
                    decision,
                    reason: decision === "REJECTED" ? reasons[id] : undefined,
                }),
            });
            toast.success(`Submission ${decision.toLowerCase()}`);
            loadQueue();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Decision failed");
        } finally {
            setActing(null);
        }
    };

    if (loading) {
        return <div className="h-40 bg-muted rounded-xl animate-pulse" />;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Verification Queue</h1>

            {queue.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        No pending verifications.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {queue.map((v) => (
                        <Card key={v.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-mono">
                                        Submission: {v.submissionId.slice(0, 8)}...
                                    </CardTitle>
                                    <Badge variant="secondary">PENDING</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Auditor Total:</span>
                                        <div className="font-mono font-semibold">
                                            {v.auditorTotalKg ? `${parseFloat(v.auditorTotalKg).toFixed(3)} kg` : "—"}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Tolerance:</span>
                                        <div className="font-mono font-semibold">{v.tolerancePct}%</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">PDF Hash:</span>
                                        <div className="font-mono text-xs truncate">{v.auditPdfHash}</div>
                                    </div>
                                </div>

                                <div>
                                    <Textarea
                                        placeholder="Rejection reason (min 20 chars)..."
                                        value={reasons[v.id] || ""}
                                        onChange={(e) =>
                                            setReasons({ ...reasons, [v.id]: e.target.value })
                                        }
                                        className="text-sm"
                                        rows={2}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => handleDecide(v.id, "APPROVED")}
                                        disabled={acting === v.id}
                                    >
                                        ✓ Approve
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleDecide(v.id, "REJECTED")}
                                        disabled={acting === v.id || (reasons[v.id] || "").length < 20}
                                    >
                                        ✕ Reject
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
