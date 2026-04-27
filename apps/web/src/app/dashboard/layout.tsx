"use client";

import { useAuth, useApiClient } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LayoutDashboard, FileText, Wallet, ArrowRightLeft, ShieldCheck, ChevronLeft, ChevronRight, LogOut, Building } from "lucide-react";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/submissions", label: "Submissions", icon: FileText },
    { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
    { href: "/dashboard/marketplace", label: "Marketplace", icon: ArrowRightLeft },
];

const verifierItems = [
    { href: "/verifier", label: "Verification Queue", icon: ShieldCheck },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const api = useApiClient();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [companyInfo, setCompanyInfo] = useState<any>(null);

    useEffect(() => {
        if (user && user.role === "COMPANY") {
            api.fetch("/companies/me").then(setCompanyInfo).catch(() => { });
        }
    }, [user]);

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

    const items = user.role === "VERIFIER" ? verifierItems : navItems;

    return (
        <div className="min-h-screen bg-background flex transition-all duration-300">
            {/* Sidebar */}
            <aside className={`${isCollapsed ? "w-20" : "w-64"} border-r border-border/40 flex flex-col transition-all duration-300 relative`}>
                <Button
                    variant="outline"
                    size="icon"
                    className="absolute -right-4 top-6 h-8 w-8 rounded-full border bg-background"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>

                <div className={`p-6 flex items-center ${isCollapsed ? "justify-center" : "gap-2"}`}>
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                            <span className="text-white font-bold text-sm">D</span>
                        </div>
                        {!isCollapsed && <span className="text-lg font-semibold overflow-hidden whitespace-nowrap">DecentraPay</span>}
                    </Link>
                </div>
                <Separator />
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {items.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link key={item.href} href={item.href}>
                                <div
                                    className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname === item.href
                                        ? "bg-emerald-500/10 text-emerald-400 font-medium"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        }`}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <Icon className="h-5 w-5 shrink-0" />
                                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                                </div>
                            </Link>
                        );
                    })}
                </nav>
                <Separator />
                <div className="p-4 flex flex-col gap-3">
                    {!isCollapsed ? (
                        <div className="px-1 overflow-hidden">
                            {companyInfo && (
                                <div className="flex items-center gap-2 mb-3">
                                    <Building className="h-4 w-4 text-emerald-500 shrink-0" />
                                    <span className="text-sm font-medium truncate text-emerald-100">{companyInfo.name}</span>
                                </div>
                            )}
                            <div className="text-xs text-muted-foreground truncate mb-1">
                                {user.email}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium tracking-wide">
                                    {user.role}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center mb-2" title={companyInfo?.name || user.email}>
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <span className="text-emerald-400 font-medium text-xs text-center">{user.email[0].toUpperCase()}</span>
                            </div>
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        className={`w-full ${isCollapsed ? "justify-center px-0" : "justify-start gap-2"} text-muted-foreground hover:text-red-400 hover:bg-red-500/10`}
                        onClick={() => {
                            logout();
                            router.push("/");
                        }}
                        title={isCollapsed ? "Sign out" : undefined}
                    >
                        <LogOut className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span>Sign out</span>}
                    </Button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto bg-muted/10">
                <div className="max-w-6xl mx-auto p-4 md:p-8">{children}</div>
            </main>
        </div>
    );
}
