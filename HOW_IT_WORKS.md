# How DecentraPay Works

DecentraPay is an end-to-end Carbon Registry and Marketplace designed to feel like a seamless Web2 application while providing the immutable transparency of Web3. 

To achieve this, we use a hybrid architecture consisting of PostgreSQL, Express.js, Next.js, and Solidity Smart Contracts.

## 1. Trustless yet Frictionless (The Custodial Model)
You might wonder: *"Why didn't I have to sign a MetaMask popup to trade?"*

To make onboarding frictionless for traditional companies (who may not understand crypto wallets or gas fees), DecentraPay uses a **Custodial Relayer Architecture**.
* **Authentication**: Companies sign in using standard email and password.
* **Gasless Experience**: Behind the scenes, the Express.js API acts as a secure relayer. It holds an administrator Private Key.
* **Proxy Execution**: When an action requires blockchain validation (like minting credits or settling a trade), the Backend securely signs the transaction and broadcasts it to the network on behalf of the company. Companies do not pay gas.

---

## 2. Where Does The Data Live?

We split data storage based on its required speed vs. required trust.

### Web2: High-Speed Operational Data (PostgreSQL)
For a snappy user interface and complex querying, operational state lives in standard PostgreSQL:
* **User Accounts**: Emails, bcrypt-hashed passwords, and RBAC roles (`COMPANY` vs `VERIFIER`).
* **Emission Submissions**: The raw, highly detailed input a company provided (e.g., *500 mmBtu of Natural Gas in scope 1*).
* **The Order Book Engine**: Open resting limit-orders (bids and asks) are stored in the relational database. This allows users to browse market depth and filter orders instantly without heavy RPC load.

### Web3: Irrefutable Proofs & Ownership (Blockchain)
We use Solidity Smart Contracts restricted to storing **tamper-evident proofs** and managing **asset custody**.
* **Audit Anchors**: When a verifier approves a submission, the API generates a PDF audit report, calculates its `SHA-256` hash, and uploads the PDF to cloud storage. Only the **Hash** and the total approved emission amount are saved to the `DecentraPayRegistry.sol` contract. If the PDF is ever secretly modified, the hash will change, immediately exposing the tampering.
* **Carbon Credits (ERC-20)**: `CarbonCredit.sol` manages the actual token balances. 1 Token mathematically equates to 1 Tonne of CO2e.
* **Trade Settlement**: When the PostgreSQL matching engine detects that a Buyer's Bid price has crossed a Seller's Ask price, the API fires a `settleTrade` transaction to the `Marketplace.sol` Smart Contract. The Smart Contract forcefully moves the ERC-20 tokens from the Seller to the Buyer on-chain. It also computes and redirects a 10% royalty tax back to the original issuer.

---

## 3. The Lifecycle of a Carbon Credit

1. **Submission**: A `COMPANY` enters their physical activity data (e.g., liters of gasoline consumed). The deterministic API calculates the emissions footprint against the EPA 2025 library.
2. **Verification**: A `VERIFIER` reviews the math and approves the submission.
3. **Anchoring & Minting**: The API permanently hashes the approval onto the Blockchain. The Smart Contract mints `DCC` (DecentraPay Carbon Credit) ERC-20 tokens directly into the Company's on-chain balance.
4. **Order Placement**: The company places a "Sell" Ask on the marketplace. The limit order sits in Postgres awaiting a buyer. *(The Smart Contract verifies they have exactly that amount in allowance).*
5. **Matching & Settlement**: Another company places a "Buy" Bid. The backend matching engine pairs them up and instructs `Marketplace.sol` to atomically swap the funds/credits over the blockchain.
