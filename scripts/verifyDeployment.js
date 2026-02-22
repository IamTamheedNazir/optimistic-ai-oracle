const { ethers } = require("hardhat");

/**
 * Verify deployment and contract state
 * Usage: npx hardhat run scripts/verifyDeployment.js --network sepolia
 */

async function main() {
  console.log("🔍 Verifying Deployment...\n");

  // Get contract address from command line or prompt
  const contractAddress = process.env.CONTRACT_ADDRESS || process.argv[2];

  if (!contractAddress) {
    console.error("❌ Please provide contract address:");
    console.error("   export CONTRACT_ADDRESS=0x...");
    console.error("   OR");
    console.error("   npx hardhat run scripts/verifyDeployment.js --network sepolia 0x...");
    process.exit(1);
  }

  if (!ethers.isAddress(contractAddress)) {
    console.error("❌ Invalid contract address:", contractAddress);
    process.exit(1);
  }

  console.log("📍 Contract Address:", contractAddress);
  console.log("🌐 Network:", hre.network.name);
  console.log("");

  // Connect to contract
  const oracle = await ethers.getContractAt("OptimisticOracleV2", contractAddress);

  // Verification checks
  const checks = [];

  try {
    // 1. Check contract exists
    const code = await ethers.provider.getCode(contractAddress);
    checks.push({
      name: "Contract Exists",
      status: code !== "0x",
      value: code.length > 2 ? `${code.length} bytes` : "No code",
    });

    // 2. Check owner
    const owner = await oracle.owner();
    checks.push({
      name: "Owner Set",
      status: owner !== ethers.ZeroAddress,
      value: owner,
    });

    // 3. Check min stake
    const minStake = await oracle.minStake();
    checks.push({
      name: "Min Stake",
      status: minStake > 0,
      value: ethers.formatEther(minStake) + " ETH",
    });

    // 4. Check min prover stake
    const minProverStake = await oracle.minProverStake();
    checks.push({
      name: "Min Prover Stake",
      status: minProverStake > 0,
      value: ethers.formatEther(minProverStake) + " ETH",
    });

    // 5. Check dispute window
    const disputeWindow = await oracle.disputeWindow();
    checks.push({
      name: "Dispute Window",
      status: disputeWindow >= 3600, // At least 1 hour
      value: Number(disputeWindow) / 3600 + " hours",
    });

    // 6. Check paused status
    const paused = await oracle.paused();
    checks.push({
      name: "Not Paused",
      status: !paused,
      value: paused ? "⚠️ PAUSED" : "Active",
    });

    // 7. Check request counter
    const requestId = await oracle.getCurrentRequestId();
    checks.push({
      name: "Request Counter",
      status: true,
      value: requestId.toString(),
    });

    // 8. Check contract balance
    const balance = await ethers.provider.getBalance(contractAddress);
    checks.push({
      name: "Contract Balance",
      status: true,
      value: ethers.formatEther(balance) + " ETH",
    });

    // Display results
    console.log("📊 Verification Results:\n");
    console.log("┌─────────────────────────┬────────┬──────────────────────────────────────────┐");
    console.log("│ Check                   │ Status │ Value                                    │");
    console.log("├─────────────────────────┼────────┼──────────────────────────────────────────┤");

    checks.forEach((check) => {
      const status = check.status ? "✅ PASS" : "❌ FAIL";
      const name = check.name.padEnd(23);
      const value = check.value.substring(0, 40).padEnd(40);
      console.log(`│ ${name} │ ${status} │ ${value} │`);
    });

    console.log("└─────────────────────────┴────────┴──────────────────────────────────────────┘");

    // Summary
    const passed = checks.filter((c) => c.status).length;
    const total = checks.length;
    const percentage = Math.round((passed / total) * 100);

    console.log("");
    console.log("📈 Summary:");
    console.log(`   Passed: ${passed}/${total} (${percentage}%)`);

    if (percentage === 100) {
      console.log("   ✅ All checks passed! Deployment verified.");
    } else {
      console.log("   ⚠️ Some checks failed. Please review.");
    }

    // Additional info
    console.log("");
    console.log("🔗 Links:");
    
    if (hre.network.name === "sepolia") {
      console.log(`   Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
    } else if (hre.network.name === "mainnet") {
      console.log(`   Etherscan: https://etherscan.io/address/${contractAddress}`);
    }

    // Test basic functionality
    console.log("");
    console.log("🧪 Testing Basic Functionality...");

    try {
      // Test view functions
      const testModelHash = ethers.id("test-model");
      console.log("   ✅ Can call view functions");

      // Check if we can estimate gas for transactions
      const [signer] = await ethers.getSigners();
      const testInput = ethers.toUtf8Bytes("test");
      
      try {
        const gasEstimate = await oracle.requestInference.estimateGas(
          testModelHash,
          testInput,
          { value: minStake }
        );
        console.log("   ✅ Can estimate gas:", gasEstimate.toString());
      } catch (error) {
        console.log("   ⚠️ Gas estimation:", error.message.split("\n")[0]);
      }

      console.log("");
      console.log("✨ Verification Complete!");
    } catch (error) {
      console.error("   ❌ Functionality test failed:", error.message);
    }
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
