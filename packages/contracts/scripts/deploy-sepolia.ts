import { ethers, upgrades } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying to Sepolia with account:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

    // 1. Deploy CarbonCredit
    const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
    const carbonCredit = await upgrades.deployProxy(CarbonCredit, [deployer.address], {
        initializer: "initialize",
    });
    await carbonCredit.waitForDeployment();
    const ccAddress = await carbonCredit.getAddress();
    console.log("CarbonCredit deployed to:", ccAddress);

    // 2. Deploy Registry
    const Registry = await ethers.getContractFactory("DecentraPayRegistry");
    const registry = await upgrades.deployProxy(
        Registry,
        [deployer.address, ccAddress],
        { initializer: "initialize" }
    );
    await registry.waitForDeployment();
    const regAddress = await registry.getAddress();
    console.log("DecentraPayRegistry deployed to:", regAddress);

    // 3. Grant MINTER_ROLE
    const MINTER_ROLE = await carbonCredit.MINTER_ROLE();
    await carbonCredit.grantRole(MINTER_ROLE, regAddress);
    console.log("MINTER_ROLE granted to Registry");

    // 4. Deploy Marketplace
    const Marketplace = await ethers.getContractFactory("Marketplace");
    const marketplace = await upgrades.deployProxy(
        Marketplace,
        [deployer.address, ccAddress, deployer.address],
        { initializer: "initialize" }
    );
    await marketplace.waitForDeployment();
    const mpAddress = await marketplace.getAddress();
    console.log("Marketplace deployed to:", mpAddress);

    console.log("\n─── Sepolia Deployment Summary ───");
    console.log(`CarbonCredit:        ${ccAddress}`);
    console.log(`DecentraPayRegistry: ${regAddress}`);
    console.log(`Marketplace:         ${mpAddress}`);
    console.log(`\nVerify on Etherscan:`);
    console.log(`https://sepolia.etherscan.io/address/${ccAddress}`);
    console.log(`https://sepolia.etherscan.io/address/${regAddress}`);
    console.log(`https://sepolia.etherscan.io/address/${mpAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
