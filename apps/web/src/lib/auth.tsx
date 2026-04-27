"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
    id: string;
    email: string;
    role: "COMPANY" | "VERIFIER" | "ADMIN";
    companyId: string | null;
}

interface AuthContextType {
    user: User | null;
    accessToken: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => void;
}

interface RegisterData {
    email: string;
    password: string;
    company: {
        name: string;
        sector: "ENERGY" | "TECH" | "AGRI";
        country: string;
        ethAddress?: string;
        monthlyAllowanceKg: number;
    };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem("decentrapay_auth");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setUser(parsed.user);
                setAccessToken(parsed.accessToken);
            } catch {
                localStorage.removeItem("decentrapay_auth");
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Login failed");

        setUser(data.data.user);
        setAccessToken(data.data.accessToken);
        localStorage.setItem(
            "decentrapay_auth",
            JSON.stringify({
                user: data.data.user,
                accessToken: data.data.accessToken,
                refreshToken: data.data.refreshToken,
            })
        );
    };

    const register = async (regData: RegisterData) => {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(regData),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Registration failed");
        // Auto-login after registration
        await login(regData.email, regData.password);
    };

    const logout = () => {
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem("decentrapay_auth");
    };

    return (
        <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

export function useApiClient() {
    const { accessToken } = useAuth();

    return {
        fetch: async (path: string, options: RequestInit = {}) => {
            const res = await fetch(`${API_URL}${path}`, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                    ...options.headers,
                },
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Request failed");
            return data.data;
        },
    };
}
