const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying OptimisticOracleV2...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  // Configuration parameters
  const MIN_STAKE = ethers.parseEther("0.1"); // 0.1 ETH
  const MIN_PROVER_STAKE = ethers.parseEther("0.5"); // 0.5 ETH
  const DISPUTE_WINDOW = 24 * 60 * 60; // 24 hours in seconds

  console.log("⚙️  Configuration:");
  console.log("   Min Stake:", ethers.formatEther(MIN_STAKE), "ETH");
  console.log("   Min Prover Stake:", ethers.formatEther(MIN_PROVER_STAKE), "ETH");
  console.log("   Dispute Window:", DISPUTE_WINDOW / 3600, "hours\n");

  // Deploy contract
  console.log("📦 Deploying contract...");
  const OptimisticOracleV2 = await ethers.getContractFactory("OptimisticOracleV2");
  const oracle = await OptimisticOracleV2.deploy(MIN_STAKE, MIN_PROVER_STAKE, DISPUTE_WINDOW);

  await oracle.waitForDeployment();
  const address = await oracle.getAddress();

  console.log("✅ OptimisticOracleV2 deployed to:", address);
  console.log("🔗 Transaction hash:", oracle.deploymentTransaction().hash);

  // Wait for confirmations
  console.log("\n⏳ Waiting for confirmations...");
  await oracle.deploymentTransaction().wait(5);
  console.log("✅ Confirmed!\n");

  // Verify contract state
  console.log("🔍 Verifying deployment...");
  const minStake = await oracle.minStake();
  const minProverStake = await oracle.minProverStake();
  const disputeWindow = await oracle.disputeWindow();
  const owner = await oracle.owner();

  console.log("   Min Stake:", ethers.formatEther(minStake), "ETH");
  console.log("   Min Prover Stake:", ethers.formatEther(minProverStake), "ETH");
  console.log("   Dispute Window:", Number(disputeWindow) / 3600, "hours");
  console.log("   Owner:", owner);
  console.log("   Paused:", await oracle.paused());

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contract: "OptimisticOracleV2",
    address: address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    transactionHash: oracle.deploymentTransaction().hash,
    configuration: {
      minStake: ethers.formatEther(MIN_STAKE),
      minProverStake: ethers.formatEther(MIN_PROVER_STAKE),
      disputeWindow: DISPUTE_WINDOW,
    },
  };

  console.log("\n📄 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Verification instructions
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n📝 To verify on Etherscan, run:");
    console.log(
      `npx hardhat verify --network ${hre.network.name} ${address} "${MIN_STAKE}" "${MIN_PROVER_STAKE}" "${DISPUTE_WINDOW}"`
    );
  }

  console.log("\n✨ Deployment complete!\n");

  return {
    oracle,
    address,
    deploymentInfo,
  };
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

module.exports = { main };
