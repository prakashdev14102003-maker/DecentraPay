"use client";

import { useState } from "react";
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
    const [period, setPeriod] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    });
    const [rows, setRows] = useState<ActivityRow[]>([
        { id: nextRowId++, scope: 1, activityType: "natural_gas", activityValue: "", activityUnit: "mmBtu" },
    ]);
    const [result, setResult] = useState<{
        totalScope1Kg: number;
        totalScope2Kg: number;
        totalScope3Kg: number;
        totalKg: number;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

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

    const handleCalculate = async () => {
        setLoading(true);
        try {
            // First create the submission
            const submission = await api.fetch("/submissions", {
                method: "POST",
                body: JSON.stringify({ period }),
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
                    Enter your activity data to calculate emissions
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
                    disabled={loading || rows.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
                >
                    {loading ? "Calculating…" : "Submit & Calculate"}
                </Button>
            </div>
        </div>
    );
}
