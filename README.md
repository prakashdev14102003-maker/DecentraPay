# DecentraPay - EPA-Aligned Carbon Credit Registry 🌍

DecentraPay is a fully integrated, monorepo platform designed for calculating, verifying, and trading carbon emissions credits. Leveraging deterministic EPA greenhouse gas models, a robust Drizzle ORM PostgreSQL backend, and an immutable Ethereum-based smart contract layer, DecentraPay gives companies unparalleled trust and transparency in carbon markets.

This project uses a turborepo architecture containing Next.js 15, Express, Hardhat, and smart contracts under one cohesive umbrella.

## Quick Start (Dockerized Dev Environment)

You can launch the entire ecosystem (Postgres Database, Hardhat local blockchain, Express API server, and Next.js Frontend) simply using Docker.

```bash
docker compose up --build
```
> **Note**: The backend `seed.ts` script automatically populates mocked Company accounts, verification data, wallet balances, and resting limit orders into your fresh PostgreSQL container upon first startup.

Check your docker console for the initial `DCC` (DecentraPay Carbon Credit) system-generated login credentials! 
- Next.js Dashboard: **http://localhost:3000**
- Express API: **http://localhost:3001**

## Monorepo Packages

The project structure is broken out intelligently:

* `/apps/web`: Frontend client built with **Next.js 15** (App Router) and styled with Shadcn UI & Tailwind.
* `/apps/api`: Relational backend using **Bun + Express**. Handles the rigid calculation engine using EPA variables, REST API routes, generic RBAC auth, and acts as the smart contract relayer.
* `/packages/contracts`: **Solidity** / Hardhat folder housing `CarbonCredit.sol`, `Marketplace.sol`, and `DecentraPayRegistry.sol`. Managed via OpenZeppelin Upgradeable v5 proxies.
* `/packages/shared`: Shared TS types across services.

## Further Reading
Curious how we hide the complexity of Web3 (like MetaMask popups and gas fees) from users while still anchoring irrefutable proofs to Semantic blockchains? **Check out the architecture breakdown in [HOW_IT_WORKS.md](./HOW_IT_WORKS.md).**
