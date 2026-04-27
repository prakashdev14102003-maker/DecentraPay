/**
 * Calculation Engine — Pure Function
 *
 * Converts activity data into kg CO₂-equivalent using the versioned
 * EPA Emission Factors Hub + IPCC AR6 GWPs.
 *
 * Formula: Emission (kg CO₂e) = Activity Value × Emission Factor × GWP
 * E_total = Σᵢ (Aᵢ × EFᵢ × GWPᵢ)
 *
 * Constraint C1: Same inputs + same factor-library version ⇒ identical output.
 */

import fs from "fs";
import path from "path";
import type { ActivityInput, EmissionRow, CalculationResult, Scope } from "@decentrapay/shared";

// ─── Types for factor library JSON ──────────────────────

interface FactorSet {
    [gas: string]: number;
}

interface FuelEntry {
    unit: string;
    factors: FactorSet;
    heatContent?: number;
    co2PerUnit?: number;
    ch4Factor?: number;
    n2oFactor?: number;
    scope?: number;
    note?: string;
}

interface FactorLibrary {
    version: string;
    effectiveFrom: string;
    source: string;
    gwp: Record<string, number>;
    categories: Record<string, {
        description: string;
        scope: number;
        fuels?: Record<string, FuelEntry>;
        grids?: Record<string, FuelEntry>;
        modes?: Record<string, FuelEntry>;
        materials?: Record<string, FuelEntry>;
        activities?: Record<string, FuelEntry>;
    }>;
    unitConversions: Record<string, number>;
}

// ─── Factor library cache (immutable per version) ───────

const libraryCache = new Map<string, FactorLibrary>();

function loadFactorLibrary(version: string): FactorLibrary {
    const cached = libraryCache.get(version);
    if (cached) return cached;

    const filePath = path.join(
        __dirname,
        "../data/factor-library",
        `${version}.json`
    );

    if (!fs.existsSync(filePath)) {
        throw new Error(`Factor library version ${version} not found at ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const lib: FactorLibrary = JSON.parse(raw);
    libraryCache.set(version, lib);
    return lib;
}

// ─── Lookup helpers ─────────────────────────────────────

interface LookupResult {
    gasFactors: Array<{ gas: string; factor: number; gwp: number }>;
    expectedUnit: string;
    scope: Scope;
    sourceRef: string;
}

function lookupActivity(
    lib: FactorLibrary,
    activityType: string,
    _activityUnit: string
): LookupResult {
    // Search through all categories for the activity type
    for (const [catName, category] of Object.entries(lib.categories)) {
        const collection =
            category.fuels || category.grids || category.modes ||
            category.materials || category.activities;
        if (!collection) continue;

        const entry = collection[activityType];
        if (!entry) continue;

        const scope = (entry.scope ?? category.scope) as Scope;
        const sourceRef = `${lib.source} — ${catName}/${activityType}`;

        // For mobile combustion with direct CO2 per unit
        if (entry.co2PerUnit !== undefined) {
            const gasFactors: LookupResult["gasFactors"] = [
                { gas: "CO2", factor: entry.co2PerUnit, gwp: 1 },
            ];
            if (entry.ch4Factor && entry.ch4Factor > 0) {
                gasFactors.push({
                    gas: "CH4_fossil",
                    factor: entry.ch4Factor,
                    gwp: lib.gwp.CH4_fossil,
                });
            }
            if (entry.n2oFactor && entry.n2oFactor > 0) {
                gasFactors.push({
                    gas: "N2O",
                    factor: entry.n2oFactor,
                    gwp: lib.gwp.N2O,
                });
            }
            return { gasFactors, expectedUnit: entry.unit, scope, sourceRef };
        }

        // Standard factor lookup
        const gasFactors: LookupResult["gasFactors"] = [];
        for (const [gas, factor] of Object.entries(entry.factors)) {
            // Resolve GWP: strip directional suffix like N2O_direct → N2O
            const gwpKey = gas.replace("_direct", "");
            const gwp = lib.gwp[gwpKey] ?? 1; // default to 1 for CO2
            gasFactors.push({ gas, factor, gwp });
        }

        return { gasFactors, expectedUnit: entry.unit, scope, sourceRef };
    }

    throw new Error(
        `Activity type "${activityType}" not found in factor library`
    );
}

// ─── Main pure function ─────────────────────────────────

export function calculate(
    activities: ActivityInput[],
    factorLibraryVersion: string = "v2025.1"
): CalculationResult {
    const lib = loadFactorLibrary(factorLibraryVersion);
    const emissionRows: EmissionRow[] = [];

    for (const activity of activities) {
        const lookup = lookupActivity(
            lib,
            activity.activityType,
            activity.activityUnit
        );

        for (const { gas, factor, gwp } of lookup.gasFactors) {
            // Emission = activity_value × emission_factor × GWP
            // For gases where factor already includes CO2-equivalent (like CO2 itself),
            // gwp = 1 so it's just activity_value × factor
            const emissionKg = roundTo3(activity.activityValue * factor * gwp);

            emissionRows.push({
                scope: activity.scope || lookup.scope,
                activityType: activity.activityType,
                activityValue: activity.activityValue,
                activityUnit: activity.activityUnit,
                gas,
                emissionFactor: factor,
                gwp,
                emissionKg,
                factorSourceRef: lookup.sourceRef,
            });
        }
    }

    // Aggregate by scope
    const totalScope1Kg = roundTo3(
        emissionRows
            .filter((r) => r.scope === 1)
            .reduce((sum, r) => sum + r.emissionKg, 0)
    );
    const totalScope2Kg = roundTo3(
        emissionRows
            .filter((r) => r.scope === 2)
            .reduce((sum, r) => sum + r.emissionKg, 0)
    );
    const totalScope3Kg = roundTo3(
        emissionRows
            .filter((r) => r.scope === 3)
            .reduce((sum, r) => sum + r.emissionKg, 0)
    );
    const totalKg = roundTo3(totalScope1Kg + totalScope2Kg + totalScope3Kg);

    return {
        factorLibraryVersion,
        totalScope1Kg,
        totalScope2Kg,
        totalScope3Kg,
        totalKg,
        emissions: emissionRows,
    };
}

function roundTo3(n: number): number {
    return Math.round(n * 1000) / 1000;
}
