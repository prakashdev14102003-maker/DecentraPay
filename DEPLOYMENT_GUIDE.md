# DecentraPay Production Deployment Guide

This guide outlines exactly how to take DecentraPay from a local Docker environment into a live, scaleable production environment.

## 1. Smart Contracts (Blockchain Layer)

In production, the Smart Contracts must be deployed to a public testnet (like **Sepolia**) or a mainnet (like **Ethereum**, **Arbitrum**, or **Base**).

### Understanding the Relayer Wallet
To make DecentraPay a **truly frictionless, gasless experience** for enterprise users, the platform uses a Relayer/Custodial architecture. This means the application's backend pays the Ethereum network gas fee (the "toll") so that companies do not have to buy crypto or install MetaMask to use your platform.

### Steps:
1. Create a brand new MetaMask wallet. This will act as your "Treasury" or "Relayer" wallet.
2. Visit an online **Sepolia Faucet** to request free Sepolia ETH to this wallet address. (In Mainnet, you would fund this wallet with real ETH).
3. Open `/packages/contracts/.env` and add this wallet's Private Key and an Alchemy/Infura RPC URL.
```env
PRIVATE_KEY=your_real_metamask_private_key
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```
4. Deploy the proxy contracts. **Important:** Because you deploy using this wallet's private key, the Smart Contracts will automatically assign this wallet the `DEFAULT_ADMIN_ROLE` and `VERIFIER_ROLE`.
```bash
cd packages/contracts
npx hardhat run scripts/deploy.ts --network sepolia
```
5. Copy the 3 deployed contract addresses (`CarbonCredit`, `DecentraPayRegistry`, `Marketplace`). You will need these (and the same Private Key) for the Backend Environment Variables!

---

## 2. PostgreSQL Database (Data Layer)

For production, you should migrate away from the local Docker Postgres container and use a managed database like **AWS RDS**, **Supabase**, or **Neon**.

### Steps:
1. Create a production Postgres instance on your provider.
2. Get the production connection string.
3. Keep this connection string highly secure.

---

## 3. The Relayer API (Backend Layer)

Since the Express API holds the crucial `PRIVATE_KEY` that conducts transactions on behalf of users, this environment must be strictly secured. Excellent hosts for this include **Railway**, **Render**, or **AWS EC2/ECS**.

### Steps:
1. Deploy the `apps/api` folder to your chosen provider.
2. Set your **Production Environment Variables** heavily guarded in the hosting dashboard:
```env
PORT=3001
DATABASE_URL=postgresql://user:pass@production-db-url:5432/decentrapay
JWT_SECRET=super_secure_production_random_string_256_bits
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_secure_relayer_private_key
CARBON_CREDIT_ADDRESS=0xProdAddressHere...
REGISTRY_ADDRESS=0xProdAddressHere...
MARKETPLACE_ADDRESS=0xProdAddressHere...
```
3. Ensure your CI/CD pipeline runs `bun run db:push` before spinning up the main server so Drizzle executes table migrations cleanly.

---

## 4. The Next.js Dashboard (Frontend Layer)

Because this is an App Router Next.js 15 app, the best deployment target is **Vercel**.

### Steps:
1. Import your GitHub repository directly into Vercel.
2. Set the `Root Directory` in Vercel to `apps/web`.
3. Add the single required Environment Variable pointing to your production Backend API.
```env
NEXT_PUBLIC_API_URL=https://api.decentrapay.io
```
4. Click Deploy.

---

## 5. Integrating REAL Proof Documents (Optional but Recommended for Prod)

As explained in the architectural documents, our local environment uses "in-memory" deterministic DB hashing to avoid S3 bills. When deploying to production for actual enterprise clients:

1. Install the `aws-sdk` inside `apps/api` (it supports Cloudflare natively).
2. When the Verifier approves a submission, trigger `pdfkit` to generate the PDF summary report. 
3. Upload that `.pdf` directly to **Cloudflare R2** (significantly cheaper and zero egress fees).
4. Extract the physical Cloudflare R2 object URL alongside the SHA-256 Hash.
5. In `submissions.ts`, update the Postgres schema to save `documentUrl: "https://pub-...r2.dev"`. 
