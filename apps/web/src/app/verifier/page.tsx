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
  proofPdfPath: string | null;
}

export default function VerifierQueuePage() {
  const api = useApiClient();
  const [queue, setQueue] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
  const UPLOADS_BASE = API_URL.startsWith("http")
    ? API_URL.replace("/api/v1", "/uploads")
    : "/uploads";

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

  const handleDecide = async (
    id: string,
    decision: "APPROVED" | "REJECTED"
  ) => {
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
                    <span className="text-muted-foreground">
                      Auditor Total:
                    </span>
                    <div className="font-mono font-semibold">
                      {v.auditorTotalKg
                        ? `${parseFloat(v.auditorTotalKg).toFixed(3)} kg`
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tolerance:</span>
                    <div className="font-mono font-semibold">
                      {v.tolerancePct}%
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">PDF Hash:</span>
                    <div className="font-mono text-xs truncate">
                      {v.auditPdfHash}
                    </div>
                  </div>
                </div>

                {/* Proof Document Download */}
                {v.proofPdfPath && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-amber-400 shrink-0"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Proof Document</p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded by company as supporting evidence
                      </p>
                    </div>
                    <a
                      href={`${UPLOADS_BASE}/${v.proofPdfPath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      View Proof
                    </a>
                  </div>
                )}

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
                    disabled={
                      acting === v.id || (reasons[v.id] || "").length < 20
                    }
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
