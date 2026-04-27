"use client";

import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function VerifierLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-background flex">
            <aside className="w-64 border-r border-border/40 flex flex-col">
                <div className="p-6">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">D</span>
                        </div>
                        <span className="text-lg font-semibold">DecentraPay</span>
                    </Link>
                </div>
                <Separator />
                <nav className="flex-1 p-4 space-y-1">
                    <Link href="/verifier">
                        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${pathname === "/verifier" ? "bg-emerald-500/10 text-emerald-400" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                            <span>✅</span><span>Verification Queue</span>
                        </div>
                    </Link>
                </nav>
                <Separator />
                <div className="p-4">
                    <div className="text-xs text-muted-foreground mb-2 px-3">{user.email}</div>
                    <div className="text-xs mb-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-medium">VERIFIER</span>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => { logout(); router.push("/"); }}>
                        Sign out
                    </Button>
                </div>
            </aside>
            <main className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto p-8">{children}</div>
            </main>
        </div>
    );
}
