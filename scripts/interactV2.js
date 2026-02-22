const { ethers } = require("hardhat");
const readline = require("readline");

// Interactive CLI for contract interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("🔌 OptimisticOracleV2 Interaction Script\n");

  // Get contract address
  const contractAddress = await question("📍 Enter contract address: ");
  
  if (!ethers.isAddress(contractAddress)) {
    console.error("❌ Invalid contract address");
    process.exit(1);
  }

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("👤 Using account:", signer.address);

  const balance = await ethers.provider.getBalance(signer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH\n");

  // Connect to contract
  const oracle = await ethers.getContractAt("OptimisticOracleV2", contractAddress);

  // Display contract info
  console.log("📊 Contract Information:");
  console.log("   Min Stake:", ethers.formatEther(await oracle.minStake()), "ETH");
  console.log("   Min Prover Stake:", ethers.formatEther(await oracle.minProverStake()), "ETH");
  console.log("   Dispute Window:", Number(await oracle.disputeWindow()) / 3600, "hours");
  console.log("   Owner:", await oracle.owner());
  console.log("   Paused:", await oracle.paused());
  console.log("   Current Request ID:", await oracle.getCurrentRequestId());
  console.log("");

  // Main menu
  while (true) {
    console.log("🎯 Available Actions:");
    console.log("1. Register as Prover");
    console.log("2. Check Prover Status");
    console.log("3. Request Inference");
    console.log("4. Post Inference");
    console.log("5. Dispute Inference");
    console.log("6. Finalize Inference");
    console.log("7. View Request Details");
    console.log("8. Increase Prover Stake");
    console.log("9. Unregister Prover");
    console.log("0. Exit");
    console.log("");

    const choice = await question("Select action (0-9): ");

    try {
      switch (choice) {
        case "1":
          await registerProver(oracle, signer);
          break;
        case "2":
          await checkProverStatus(oracle, signer);
          break;
        case "3":
          await requestInference(oracle, signer);
          break;
        case "4":
          await postInference(oracle, signer);
          break;
        case "5":
          await disputeInference(oracle, signer);
          break;
        case "6":
          await finalizeInference(oracle, signer);
          break;
        case "7":
          await viewRequest(oracle);
          break;
        case "8":
          await increaseProverStake(oracle, signer);
          break;
        case "9":
          await unregisterProver(oracle, signer);
          break;
        case "0":
          console.log("👋 Goodbye!");
          rl.close();
          process.exit(0);
        default:
          console.log("❌ Invalid choice\n");
      }
    } catch (error) {
      console.error("❌ Error:", error.message, "\n");
    }
  }
}

async function registerProver(oracle, signer) {
  console.log("\n📝 Register as Prover");
  
  const minStake = await oracle.minProverStake();
  console.log("Required stake:", ethers.formatEther(minStake), "ETH");
  
  const stakeAmount = await question("Enter stake amount (ETH): ");
  const stake = ethers.parseEther(stakeAmount);
  
  if (stake < minStake) {
    console.log("❌ Insufficient stake. Minimum:", ethers.formatEther(minStake), "ETH\n");
    return;
  }
  
  console.log("⏳ Registering...");
  const tx = await oracle.registerProver({ value: stake });
  const receipt = await tx.wait();
  
  console.log("✅ Registered successfully!");
  console.log("   Transaction:", receipt.hash);
  console.log("   Gas used:", receipt.gasUsed.toString());
  console.log("");
}

async function checkProverStatus(oracle, signer) {
  console.log("\n🔍 Prover Status");
  
  const isRegistered = await oracle.isRegisteredProver(signer.address);
  const stake = await oracle.getProverStake(signer.address);
  
  console.log("   Address:", signer.address);
  console.log("   Registered:", isRegistered ? "✅ Yes" : "❌ No");
  console.log("   Stake:", ethers.formatEther(stake), "ETH");
  console.log("");
}

async function requestInference(oracle, signer) {
  console.log("\n📤 Request Inference");
  
  const minStake = await oracle.minStake();
  console.log("Required stake:", ethers.formatEther(minStake), "ETH");
  
  const modelName = await question("Enter model name: ");
  const inputData = await question("Enter input data: ");
  const stakeAmount = await question("Enter stake amount (ETH): ");
  
  const modelHash = ethers.id(modelName);
  const inputBytes = ethers.toUtf8Bytes(inputData);
  const stake = ethers.parseEther(stakeAmount);
  
  if (stake < minStake) {
    console.log("❌ Insufficient stake. Minimum:", ethers.formatEther(minStake), "ETH\n");
    return;
  }
  
  console.log("⏳ Creating request...");
  const tx = await oracle.requestInference(modelHash, inputBytes, { value: stake });
  const receipt = await tx.wait();
  
  // Get request ID from event
  const event = receipt.logs.find(log => {
    try {
      return oracle.interface.parseLog(log).name === "InferenceRequested";
    } catch {
      return false;
    }
  });
  
  const requestId = event ? oracle.interface.parseLog(event).args[0] : "Unknown";
  
  console.log("✅ Request created successfully!");
  console.log("   Request ID:", requestId.toString());
  console.log("   Transaction:", receipt.hash);
  console.log("   Gas used:", receipt.gasUsed.toString());
  console.log("");
}

async function postInference(oracle, signer) {
  console.log("\n📥 Post Inference");
  
  const requestId = await question("Enter request ID: ");
  const outputData = await question("Enter output data: ");
  
  const outputBytes = ethers.toUtf8Bytes(outputData);
  
  console.log("⏳ Posting inference...");
  const tx = await oracle.postInference(requestId, outputBytes);
  const receipt = await tx.wait();
  
  console.log("✅ Inference posted successfully!");
  console.log("   Transaction:", receipt.hash);
  console.log("   Gas used:", receipt.gasUsed.toString());
  console.log("");
}

async function disputeInference(oracle, signer) {
  console.log("\n⚔️ Dispute Inference");
  
  const requestId = await question("Enter request ID: ");
  
  // Get request details
  const request = await oracle.getRequest(requestId);
  const requiredStake = request.requesterStake + request.proverStake;
  
  console.log("Required stake:", ethers.formatEther(requiredStake), "ETH");
  
  const counterExample = await question("Enter counter-example: ");
  const stakeAmount = await question("Enter stake amount (ETH): ");
  
  const counterBytes = ethers.toUtf8Bytes(counterExample);
  const stake = ethers.parseEther(stakeAmount);
  
  if (stake < requiredStake) {
    console.log("❌ Insufficient stake. Required:", ethers.formatEther(requiredStake), "ETH\n");
    return;
  }
  
  console.log("⏳ Disputing inference...");
  const tx = await oracle.disputeInference(requestId, counterBytes, { value: stake });
  const receipt = await tx.wait();
  
  console.log("✅ Dispute submitted successfully!");
  console.log("   Transaction:", receipt.hash);
  console.log("   Gas used:", receipt.gasUsed.toString());
  console.log("");
}

async function finalizeInference(oracle, signer) {
  console.log("\n✨ Finalize Inference");
  
  const requestId = await question("Enter request ID: ");
  
  console.log("⏳ Finalizing...");
  const tx = await oracle.finalizeInference(requestId);
  const receipt = await tx.wait();
  
  console.log("✅ Inference finalized successfully!");
  console.log("   Transaction:", receipt.hash);
  console.log("   Gas used:", receipt.gasUsed.toString());
  console.log("");
}

async function viewRequest(oracle) {
  console.log("\n🔍 View Request Details");
  
  const requestId = await question("Enter request ID: ");
  
  const request = await oracle.getRequest(requestId);
  
  console.log("\n📊 Request Details:");
  console.log("   Request ID:", requestId);
  console.log("   Requester:", request.requester);
  console.log("   Prover:", request.prover || "None");
  console.log("   Challenger:", request.challenger || "None");
  console.log("   Model Hash:", request.modelHash);
  console.log("   Requester Stake:", ethers.formatEther(request.requesterStake), "ETH");
  console.log("   Prover Stake:", ethers.formatEther(request.proverStake), "ETH");
  console.log("   Challenger Stake:", ethers.formatEther(request.challengerStake), "ETH");
  console.log("   Status:", getStatusName(request.status));
  console.log("   Created At:", new Date(Number(request.createdAt) * 1000).toLocaleString());
  
  if (request.disputeDeadline > 0) {
    const deadline = new Date(Number(request.disputeDeadline) * 1000);
    const now = new Date();
    const timeLeft = deadline - now;
    
    console.log("   Dispute Deadline:", deadline.toLocaleString());
    if (timeLeft > 0) {
      console.log("   Time Remaining:", Math.floor(timeLeft / 1000 / 60), "minutes");
    } else {
      console.log("   Time Remaining: Expired");
    }
  }
  
  if (request.settledAt > 0) {
    console.log("   Settled At:", new Date(Number(request.settledAt) * 1000).toLocaleString());
  }
  
  console.log("");
}

async function increaseProverStake(oracle, signer) {
  console.log("\n💰 Increase Prover Stake");
  
  const currentStake = await oracle.getProverStake(signer.address);
  console.log("Current stake:", ethers.formatEther(currentStake), "ETH");
  
  const additionalAmount = await question("Enter additional stake (ETH): ");
  const stake = ethers.parseEther(additionalAmount);
  
  console.log("⏳ Increasing stake...");
  const tx = await oracle.increaseProverStake({ value: stake });
  const receipt = await tx.wait();
  
  const newStake = await oracle.getProverStake(signer.address);
  
  console.log("✅ Stake increased successfully!");
  console.log("   New stake:", ethers.formatEther(newStake), "ETH");
  console.log("   Transaction:", receipt.hash);
  console.log("   Gas used:", receipt.gasUsed.toString());
  console.log("");
}

async function unregisterProver(oracle, signer) {
  console.log("\n🚪 Unregister Prover");
  
  const stake = await oracle.getProverStake(signer.address);
  console.log("Stake to be returned:", ethers.formatEther(stake), "ETH");
  
  const confirm = await question("Are you sure? (yes/no): ");
  
  if (confirm.toLowerCase() !== "yes") {
    console.log("❌ Cancelled\n");
    return;
  }
  
  console.log("⏳ Unregistering...");
  const tx = await oracle.unregisterProver();
  const receipt = await tx.wait();
  
  console.log("✅ Unregistered successfully!");
  console.log("   Transaction:", receipt.hash);
  console.log("   Gas used:", receipt.gasUsed.toString());
  console.log("");
}

function getStatusName(status) {
  const statuses = ["Pending", "Posted", "Disputed", "Finalized", "Settled"];
  return statuses[status] || "Unknown";
}

// Run the script
main()
  .then(() => {})
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    rl.close();
    process.exit(1);
  });
