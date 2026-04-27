import { db } from "../db/index.js";
import { users, companies, wallets, orders as dbOrders, trades } from "../db/schema/index.js";
import bcrypt from "bcryptjs";

async function runSeed() {
    console.log("🌱 Checking if database needs seeding...");
    const existingUsers = await db.select().from(users).limit(1);

    if (existingUsers.length > 0) {
        console.log("🌱 Database already has users. Skipping seed.");
        return;
    }

    console.log("🌱 Populating DEMO data...");

    // 1. Create standard password
    const passwordHash = await bcrypt.hash("demo123", 12);

    // 2. Create Verifier
    const [verifier] = await db.insert(users).values({
        email: "verifier@decentrapay.io",
        passwordHash,
        role: "VERIFIER"
    }).returning();

    // 3. Create Companies
    const companyData = [
        { name: "Acme Energy", sector: "ENERGY", countryCode: "US", monthlyAllowanceKg: 500000 },
        { name: "EcoTech Industries", sector: "TECH", countryCode: "DE", monthlyAllowanceKg: 150000 },
        { name: "Global AgriFarm", sector: "AGRI", countryCode: "BR", monthlyAllowanceKg: 300000 }
    ];

    const insertedCompanies = [];
    for (const c of companyData) {
        const [comp] = await db.insert(companies).values({
            name: c.name,
            sector: (c.sector as any),
            country: c.countryCode,
            monthlyAllowanceKg: c.monthlyAllowanceKg.toString()
        }).returning();

        const [user] = await db.insert(users).values({
            email: `admin@${c.name.toLowerCase().replace(/ /g, '')}.com`,
            passwordHash,
            role: "COMPANY",
            companyId: comp.id
        }).returning();

        // Create Wallets
        await db.insert(wallets).values({
            companyId: comp.id,
            balanceCredits: "0",
            surplusCredits: "0",
            deficitCredits: "0",
        });

        insertedCompanies.push({ ...comp, userId: user.id, email: user.email });
    }

    // 4. Create dummy marketplace data (Orders)
    const [compA, compB, compC] = insertedCompanies;

    // Give compA some pre-existing credits via wallet to sell
    const { eq } = await import("drizzle-orm");
    await db.update(wallets).set({ balanceCredits: "150.500" }).where(eq(wallets.companyId, compA.id));

    const insertedOrders = await db.insert(dbOrders).values([
        { companyId: compA.id, side: "SELL", price: "24.50", quantity: "50", remaining: "50", status: "OPEN" },
        { companyId: compC.id, side: "SELL", price: "25.00", quantity: "120", remaining: "120", status: "OPEN" },
        { companyId: compB.id, side: "BUY", price: "24.00", quantity: "80", remaining: "80", status: "OPEN" }
    ]).returning();

    // Dummy trades
    await db.insert(trades).values([
        { buyOrderId: insertedOrders[2].id, sellOrderId: insertedOrders[0].id, price: "23.50", quantity: "20", royaltyPaid: "47.00", platformFee: "0.47" },
        { buyOrderId: insertedOrders[2].id, sellOrderId: insertedOrders[1].id, price: "28.00", quantity: "45", royaltyPaid: "126.00", platformFee: "1.26" }
    ]);

    console.log(`
=================================================
✅ DEMO SETUP COMPLETE! MOCK DATA INJECTED
=================================================
You can log in to test the application flows using:

[VERIFIER ACCOUNT]
Email: verifier@decentrapay.io 
Pass:  demo123

[COMPANY ACCOUNTS]
Email: ${compA.email}
Email: ${compB.email}
Email: ${compC.email}
Pass:  demo123 (for all companies)
=================================================
    `);
}

runSeed().catch(err => {
    console.error("Seed error:", err);
    process.exit(1);
});
