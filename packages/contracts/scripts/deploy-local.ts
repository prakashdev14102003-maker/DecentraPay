import { ethers, upgrades } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // 1. Deploy CarbonCredit (upgradeable proxy)
    const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
    const carbonCredit = await upgrades.deployProxy(CarbonCredit, [deployer.address], {
        initializer: "initialize",
    });
    await carbonCredit.waitForDeployment();
    const ccAddress = await carbonCredit.getAddress();
    console.log("CarbonCredit deployed to:", ccAddress);

    // 2. Deploy DecentraPayRegistry (upgradeable proxy)
    const Registry = await ethers.getContractFactory("DecentraPayRegistry");
    const registry = await upgrades.deployProxy(
        Registry,
        [deployer.address, ccAddress],
        { initializer: "initialize" }
    );
    await registry.waitForDeployment();
    const regAddress = await registry.getAddress();
    console.log("DecentraPayRegistry deployed to:", regAddress);

    // 3. Grant MINTER_ROLE to the Registry on CarbonCredit
    const MINTER_ROLE = await carbonCredit.MINTER_ROLE();
    await carbonCredit.grantRole(MINTER_ROLE, regAddress);
    console.log("MINTER_ROLE granted to Registry");

    // 4. Deploy Marketplace (upgradeable proxy)
    const Marketplace = await ethers.getContractFactory("Marketplace");
    const marketplace = await upgrades.deployProxy(
        Marketplace,
        [deployer.address, ccAddress, deployer.address],
        { initializer: "initialize" }
    );
    await marketplace.waitForDeployment();
    const mpAddress = await marketplace.getAddress();
    console.log("Marketplace deployed to:", mpAddress);

    console.log("\n─── Deployment Summary ───");
    console.log(`CarbonCredit:        ${ccAddress}`);
    console.log(`DecentraPayRegistry: ${regAddress}`);
    console.log(`Marketplace:         ${mpAddress}`);
    console.log(`Treasury:            ${deployer.address}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
