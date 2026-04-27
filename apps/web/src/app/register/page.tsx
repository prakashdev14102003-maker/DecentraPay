"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function RegisterPage() {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [sector, setSector] = useState<"ENERGY" | "TECH" | "AGRI">("ENERGY");
    const [country, setCountry] = useState("US");
    const [allowance, setAllowance] = useState("260000");
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const router = useRouter();

    const handleNext = () => {
        if (step === 1) {
            if (!email || !password) {
                toast.error("Please fill in all fields");
                return;
            }
            if (password.length < 10) {
                toast.error("Password must be at least 10 characters");
                return;
            }
            if (password !== confirmPassword) {
                toast.error("Passwords do not match");
                return;
            }
            setStep(2);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await register({
                email,
                password,
                company: {
                    name: companyName,
                    sector,
                    country,
                    monthlyAllowanceKg: parseFloat(allowance),
                },
            });
            toast.success("Account created successfully!");
            router.push("/dashboard");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">D</span>
                        </div>
                        <span className="text-xl font-semibold">DecentraPay</span>
                    </Link>
                </div>

                {/* Step indicators */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className={`h-1.5 w-12 rounded-full ${step >= 1 ? "bg-emerald-500" : "bg-muted"}`} />
                    <div className={`h-1.5 w-12 rounded-full ${step >= 2 ? "bg-emerald-500" : "bg-muted"}`} />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{step === 1 ? "Create Account" : "Company Details"}</CardTitle>
                        <CardDescription>
                            {step === 1
                                ? "Enter your credentials to get started"
                                : "Tell us about your company"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {step === 1 ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Min 10 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm">Confirm Password</Label>
                                    <Input
                                        id="confirm"
                                        type="password"
                                        placeholder="Re-enter password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button
                                    type="button"
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={handleNext}
                                >
                                    Continue
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="company">Company Name</Label>
                                    <Input
                                        id="company"
                                        placeholder="Acme Energy Corp"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Sector</Label>
                                    <Select value={sector} onValueChange={(v) => setSector(v as typeof sector)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ENERGY">⚡ Energy</SelectItem>
                                            <SelectItem value="TECH">💻 Technology</SelectItem>
                                            <SelectItem value="AGRI">🌾 Agriculture</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country Code</Label>
                                        <Input
                                            id="country"
                                            placeholder="US"
                                            maxLength={2}
                                            value={country}
                                            onChange={(e) => setCountry(e.target.value.toUpperCase())}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="allowance">Monthly Allowance (kg)</Label>
                                        <Input
                                            id="allowance"
                                            type="number"
                                            placeholder="260000"
                                            value={allowance}
                                            onChange={(e) => setAllowance(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setStep(1)}
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                        disabled={loading}
                                    >
                                        {loading ? "Creating…" : "Create Account"}
                                    </Button>
                                </div>
                            </form>
                        )}
                        <div className="mt-4 text-center text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link href="/login" className="text-emerald-400 hover:underline">
                                Sign in
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
