"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ActivityRow {
    id: number;
    scope: 1 | 2 | 3;
    activityType: string;
    activityValue: string;
    activityUnit: string;
}

const ACTIVITY_TYPES: Record<string, { label: string; unit: string; scope: 1 | 2 | 3 }> = {
    // Scope 1 — Stationary combustion
    natural_gas: { label: "Natural Gas", unit: "mmBtu", scope: 1 },
    coal_bituminous: { label: "Coal (Bituminous)", unit: "mmBtu", scope: 1 },
    distillate_fuel_oil_2: { label: "Distillate Fuel Oil #2", unit: "gallon", scope: 1 },
    motor_gasoline: { label: "Motor Gasoline", unit: "gallon", scope: 1 },
    propane: { label: "Propane", unit: "gallon", scope: 1 },
    lpg: { label: "LPG", unit: "gallon", scope: 1 },
    // Scope 1 — Mobile combustion
    diesel_onroad: { label: "Diesel (On-road)", unit: "gallon", scope: 1 },
    diesel_offroad: { label: "Diesel (Off-road)", unit: "gallon", scope: 1 },
    gasoline_onroad: { label: "Gasoline (On-road)", unit: "gallon", scope: 1 },
    // Scope 1 — Agriculture
    synthetic_n_urea: { label: "Fertilizer (Urea, 46% N)", unit: "kg_N", scope: 1 },
    enteric_dairy: { label: "Dairy Cattle (Enteric)", unit: "head_year", scope: 1 },
    enteric_beef: { label: "Beef Cattle (Enteric)", unit: "head_year", scope: 1 },
    rice_irrigated: { label: "Rice Cultivation", unit: "hectare_season", scope: 1 },
    diesel_ag_equipment: { label: "Ag Diesel Equipment", unit: "gallon", scope: 1 },
    // Scope 1 — Technology
    data_center_diesel_generator: { label: "Data Center Diesel Gen", unit: "gallon", scope: 1 },
    refrigerant_r410a: { label: "Refrigerant R-410A", unit: "kg", scope: 1 },
    // Scope 2
    us_avg: { label: "Electricity — US Average", unit: "kWh", scope: 2 },
    us_camx: { label: "Electricity — WECC California", unit: "kWh", scope: 2 },
    us_erct: { label: "Electricity — ERCOT Texas", unit: "kWh", scope: 2 },
    in_north: { label: "Electricity — India North", unit: "kWh", scope: 2 },
    in_south: { label: "Electricity — India South", unit: "kWh", scope: 2 },
    in_west: { label: "Electricity — India West", unit: "kWh", scope: 2 },
    eu_avg: { label: "Electricity — EU Average", unit: "kWh", scope: 2 },
    data_center_electricity: { label: "Data Center Electricity", unit: "kWh", scope: 2 },
    // Scope 3
    air_short_haul: { label: "Air Travel (Short-haul)", unit: "passenger_mile", scope: 3 },
    air_long_haul: { label: "Air Travel (Long-haul)", unit: "passenger_mile", scope: 3 },
    passenger_car: { label: "Car Travel", unit: "vehicle_mile", scope: 3 },
    truck_medium_heavy: { label: "Freight Truck", unit: "ton_mile", scope: 3 },
    mixed_msw_landfilled: { label: "Waste (MSW Landfilled)", unit: "short_ton", scope: 3 },
    employee_commuting: { label: "Employee Commuting", unit: "vehicle_mile", scope: 3 },
};

let nextRowId = 1;

export default function NewSubmissionPage() {
    const api = useApiClient();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [period, setPeriod] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    });
    const [rows, setRows] = useState<ActivityRow[]>([
        { id: nextRowId++, scope: 1, activityType: "natural_gas", activityValue: "", activityUnit: "mmBtu" },
    ]);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [result, setResult] = useState<{
        totalScope1Kg: number;
        totalScope2Kg: number;
        totalScope3Kg: number;
        totalKg: number;
    } | null>(null);
    const [loading, setLoading] = useState(false);

    const addRow = () => {
        setRows([
            ...rows,
            { id: nextRowId++, scope: 1, activityType: "natural_gas", activityValue: "", activityUnit: "mmBtu" },
        ]);
    };

    const removeRow = (id: number) => {
        setRows(rows.filter((r) => r.id !== id));
    };

    const updateRow = (id: number, field: keyof ActivityRow, value: string | number) => {
        setRows(
            rows.map((r) => {
                if (r.id !== id) return r;
                if (field === "activityType") {
                    const info = ACTIVITY_TYPES[value as string];
                    return { ...r, activityType: value as string, activityUnit: info?.unit ?? r.activityUnit, scope: info?.scope ?? r.scope };
                }
                return { ...r, [field]: value };
            })
        );
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== "application/pdf") {
                toast.error("Only PDF files are allowed");
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error("File size must be less than 10 MB");
                return;
            }
            setProofFile(file);
        }
    };

    const removeFile = () => {
        setProofFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleCalculate = async () => {
        if (!proofFile) {
            toast.error("Please upload a proof document (PDF)");
            return;
        }

        setLoading(true);
        try {
            // Create submission with proof document via FormData
            const formData = new FormData();
            formData.append("period", period);
            formData.append("proofDocument", proofFile);

            const submission = await api.fetchRaw("/submissions", {
                method: "POST",
                body: formData,
            });

            // Then add activities and calculate
            const activities = rows
                .filter((r) => r.activityValue && parseFloat(r.activityValue) > 0)
                .map((r) => ({
                    scope: r.scope,
                    activityType: r.activityType,
                    activityValue: parseFloat(r.activityValue),
                    activityUnit: r.activityUnit,
                }));

            const calcResult = await api.fetch(`/submissions/${submission.id}/activities`, {
                method: "POST",
                body: JSON.stringify({ activities }),
            });

            setResult(calcResult);
            toast.success("Emissions calculated successfully!");

            // Navigate to submission detail
            setTimeout(() => router.push(`/dashboard/submissions/${submission.id}`), 1500);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to calculate");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">New Submission</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Enter your activity data and upload a proof document to calculate emissions
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Period</CardTitle>
                    <CardDescription>YYYYMM format — one submission per period</CardDescription>
                </CardHeader>
                <CardContent>
                    <Input
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        placeholder="202604"
                        className="w-40 font-mono"
                        maxLength={6}
                    />
                </CardContent>
            </Card>

            {/* Proof Document Upload */}
            <Card className="border-amber-500/30">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        Proof Document
                    </CardTitle>
                    <CardDescription>
                        Upload a PDF document as evidence to support your emission data (max 10 MB)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {proofFile ? (
                        <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{proofFile.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {(proofFile.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={removeFile}
                                className="text-muted-foreground hover:text-red-400 shrink-0"
                            >
                                ✕ Remove
                            </Button>
                        </div>
                    ) : (
                        <div
                            className="border-2 border-dashed border-border/60 rounded-lg p-8 text-center cursor-pointer hover:border-amber-500/40 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-muted-foreground mb-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            <p className="text-sm text-muted-foreground">
                                Click to select a PDF file or drag & drop
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                PDF only, max 10 MB
                            </p>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Activity Data</CardTitle>
                            <CardDescription>Add your emission sources across all scopes</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={addRow}>
                            + Add Row
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {rows.map((row) => (
                            <div
                                key={row.id}
                                className="flex items-end gap-3 p-4 rounded-lg border border-border/40 bg-muted/20"
                            >
                                <div className="w-16">
                                    <Label className="text-xs text-muted-foreground">Scope</Label>
                                    <Badge
                                        variant="secondary"
                                        className={
                                            row.scope === 1
                                                ? "bg-amber-500/10 text-amber-400"
                                                : row.scope === 2
                                                    ? "bg-blue-500/10 text-blue-400"
                                                    : "bg-purple-500/10 text-purple-400"
                                        }
                                    >
                                        {row.scope}
                                    </Badge>
                                </div>
                                <div className="flex-[2] min-w-[280px]">
                                    <Label className="text-xs text-muted-foreground">Activity Type</Label>
                                    <Select
                                        value={row.activityType}
                                        onValueChange={(v) => v && updateRow(row.id, "activityType", v)}
                                    >
                                        <SelectTrigger className="mt-1 w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="min-w-[300px]">
                                            {Object.entries(ACTIVITY_TYPES).map(([key, info]) => (
                                                <SelectItem key={key} value={key}>
                                                    <span className="text-xs text-muted-foreground mr-1">S{info.scope}</span>
                                                    {info.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-40">
                                    <Label className="text-xs text-muted-foreground">Value</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={row.activityValue}
                                        onChange={(e) => updateRow(row.id, "activityValue", e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div className="w-28">
                                    <Label className="text-xs text-muted-foreground">Unit</Label>
                                    <Input
                                        value={row.activityUnit}
                                        disabled
                                        className="mt-1 text-muted-foreground"
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeRow(row.id)}
                                    className="text-muted-foreground hover:text-red-400"
                                >
                                    ✕
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Result preview */}
            {result && (
                <Card className="border-emerald-500/30">
                    <CardHeader>
                        <CardTitle className="text-lg text-emerald-400">Calculation Result</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-4 gap-4">
                            <div>
                                <div className="text-xs text-muted-foreground">Scope 1</div>
                                <div className="text-lg font-semibold">{(result.totalScope1Kg / 1000).toFixed(3)} t</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Scope 2</div>
                                <div className="text-lg font-semibold">{(result.totalScope2Kg / 1000).toFixed(3)} t</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Scope 3</div>
                                <div className="text-lg font-semibold">{(result.totalScope3Kg / 1000).toFixed(3)} t</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Total</div>
                                <div className="text-lg font-bold text-emerald-400">
                                    {(result.totalKg / 1000).toFixed(3)} t CO₂e
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-end">
                <Button
                    onClick={handleCalculate}
                    disabled={loading || rows.length === 0 || !proofFile}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
                >
                    {loading ? "Calculating…" : "Submit & Calculate"}
                </Button>
            </div>
        </div>
    );
}
