// ─── Enums ─────────────────────────────────────────────

export const SECTORS = ["ENERGY", "TECH", "AGRI"] as const;
export type Sector = (typeof SECTORS)[number];

export const ROLES = ["COMPANY", "VERIFIER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const SUBMISSION_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const KYC_STATUSES = ["NEW", "VERIFIED", "REJECTED"] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const ORDER_SIDES = ["BUY", "SELL"] as const;
export type OrderSide = (typeof ORDER_SIDES)[number];

export const ORDER_STATUSES = ["OPEN", "FILLED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const VERIFICATION_DECISIONS = ["PENDING", "APPROVED", "REJECTED"] as const;
export type VerificationDecision = (typeof VERIFICATION_DECISIONS)[number];

export const SCOPES = [1, 2, 3] as const;
export type Scope = (typeof SCOPES)[number];

// ─── API Types ─────────────────────────────────────────

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        role: Role;
        companyId: string | null;
    };
}

export interface RegisterRequest {
    email: string;
    password: string;
    company: {
        name: string;
        sector: Sector;
        country: string;
        ethAddress?: string;
        monthlyAllowanceKg: number;
    };
}

export interface ActivityInput {
    scope: Scope;
    activityType: string;
    activityValue: number;
    activityUnit: string;
}

export interface EmissionRow {
    scope: Scope;
    activityType: string;
    activityValue: number;
    activityUnit: string;
    gas: string;
    emissionFactor: number;
    gwp: number;
    emissionKg: number;
    factorSourceRef: string;
}

export interface CalculationResult {
    factorLibraryVersion: string;
    totalScope1Kg: number;
    totalScope2Kg: number;
    totalScope3Kg: number;
    totalKg: number;
    emissions: EmissionRow[];
}

export interface OrderBookEntry {
    price: number;
    quantity: number;
    total: number;
}

export interface OrderBook {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
}

// ─── API Response Wrapper ──────────────────────────────

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
