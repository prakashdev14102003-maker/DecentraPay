import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("DecentraPay Ecosystem", function () {
    let admin: any, verifier: any, companyA: any, companyB: any;
    let carbonCredit: any, registry: any, marketplace: any;

    beforeEach(async function () {
        [admin, verifier, companyA, companyB] = await ethers.getSigners();

        // 1. Deploy CarbonCredit
        const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
        carbonCredit = await upgrades.deployProxy(CarbonCredit, [admin.address]);

        // 2. Deploy Registry
        const Registry = await ethers.getContractFactory("DecentraPayRegistry");
        registry = await upgrades.deployProxy(Registry, [admin.address, await carbonCredit.getAddress()]);

        // 3. Deploy Marketplace
        const Marketplace = await ethers.getContractFactory("Marketplace");
        marketplace = await upgrades.deployProxy(Marketplace, [admin.address, await carbonCredit.getAddress(), admin.address]);

        // Roles Setup
        const MINTER_ROLE = await carbonCredit.MINTER_ROLE();
        await carbonCredit.grantRole(MINTER_ROLE, await registry.getAddress());

        const VERIFIER_ROLE = await registry.VERIFIER_ROLE();
        await registry.grantRole(VERIFIER_ROLE, verifier.address);
    });

    describe("Registry & Verification", function () {
        it("Should allow a verifier to anchor audit and mint credits", async function () {
            const auditHash = "0x" + "a".repeat(64);
            const creditsToMint = ethers.parseUnits("100", 18);

            await expect(
                registry.connect(verifier).anchorAudit(companyA.address, 202604, auditHash, creditsToMint)
            ).to.emit(registry, "AuditAnchored")
                .withArgs(companyA.address, 202604, auditHash, creditsToMint);

            // Verifier then issues
            await expect(
                registry.connect(verifier).issueCredits(companyA.address, creditsToMint, 202604)
            ).to.emit(registry, "CreditsIssued")
                .withArgs(companyA.address, 202604, creditsToMint);

            expect(await carbonCredit.balanceOf(companyA.address)).to.equal(creditsToMint);

            const record = await registry.anchors(companyA.address, 202604);
            expect(record.auditHash).to.equal(auditHash);
        });

        it("Should prevent non-verifiers from anchoring audits", async function () {
            const auditHash = "0x" + "b".repeat(64);
            await expect(
                registry.connect(companyA).anchorAudit(companyA.address, 202605, auditHash, 100)
            ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
        });
    });

    describe("Marketplace & Trade Settlement", function () {
        const creditsToMint = ethers.parseUnits("1000", 18);

        beforeEach(async function () {
            // Setup: Company A gets 1000 credits for 202604
            const auditHash = "0x" + "a".repeat(64);
            await registry.connect(verifier).anchorAudit(companyA.address, 202604, auditHash, creditsToMint);
            await registry.connect(verifier).issueCredits(companyA.address, creditsToMint, 202604);

            // Approve Marketplace for company A
            await carbonCredit.connect(companyA).approve(await marketplace.getAddress(), creditsToMint);
        });

        it("Should place an ask order", async function () {
            const amount = ethers.parseUnits("50", 18);
            const price = ethers.parseUnits("12", 18); // 12 wei per credit

            await expect(marketplace.connect(companyA).placeOrder(false, price, amount))
                .to.emit(marketplace, "OrderPlaced");

            const order = await marketplace.orders(1);
            expect(order.trader).to.equal(companyA.address);
            expect(order.quantity).to.equal(amount);
            expect(order.isBuy).to.be.false;
        });

        it("Should execute trade by passing credits to buyer", async function () {
            const askAmount = ethers.parseUnits("100", 18);
            const price = ethers.parseUnits("10", 18);

            // 1. Company A places SELL
            await marketplace.connect(companyA).placeOrder(false, price, askAmount);

            // 2. Company B places BUY
            await marketplace.connect(companyB).placeOrder(true, price, askAmount);

            // 3. Settle Trade (buy=2, sell=1)
            await expect(marketplace.connect(admin).settleTrade(2, 1, askAmount))
                .to.emit(marketplace, "Trade")
                .withArgs(2, 1, companyB.address, companyA.address, price, askAmount, 0);

            // Company B should receive credits
            expect(await carbonCredit.balanceOf(companyB.address)).to.equal(askAmount);

            // Check orders are inactive
            const buyOrder = await marketplace.orders(2);
            expect(buyOrder.active).to.be.false;
        });
    });
});
