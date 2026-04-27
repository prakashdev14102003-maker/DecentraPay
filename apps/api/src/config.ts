import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const config = {
    port: parseInt(process.env.PORT || "4000", 10),
    nodeEnv: process.env.NODE_ENV || "development",

    // Database
    databaseUrl:
        process.env.DATABASE_URL ||
        "postgresql://decentrapay:devpass@localhost:5432/decentrapay",

    // Auth
    jwtSecret: process.env.JWT_SECRET || "dev-jwt-secret-change-in-production",
    jwtRefreshSecret:
        process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-in-production",
    jwtAccessExpiresIn: "15m",
    jwtRefreshExpiresIn: "7d",
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),

    // CORS
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",

    // Blockchain
    sepoliaRpcUrl: process.env.SEPOLIA_RPC_URL || "",
    deployerPrivateKey: process.env.DEPLOYER_PRIVATE_KEY || "",
    carbonCreditProxy: process.env.CARBON_CREDIT_PROXY || "",
    registryProxy: process.env.REGISTRY_PROXY || "",
    marketplaceProxy: process.env.MARKETPLACE_PROXY || "",
    treasuryAddress: process.env.TREASURY_ADDRESS || "",

    // Tolerance
    defaultTolerancePct: parseFloat(
        process.env.DEFAULT_TOLERANCE_PCT || "2.0"
    ),
} as const;
