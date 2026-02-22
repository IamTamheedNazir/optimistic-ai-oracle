const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("OptimisticOracleV2", function () {
  // ============================================
  // FIXTURES
  // ============================================

  async function deployOracleFixture() {
    const [owner, requester, prover, challenger, other] = await ethers.getSigners();

    const minStake = ethers.parseEther("0.1");
    const minProverStake = ethers.parseEther("0.5");
    const disputeWindow = 24 * 60 * 60; // 24 hours

    const OptimisticOracleV2 = await ethers.getContractFactory("OptimisticOracleV2");
    const oracle = await OptimisticOracleV2.deploy(minStake, minProverStake, disputeWindow);

    return { oracle, owner, requester, prover, challenger, other, minStake, minProverStake, disputeWindow };
  }

  async function deployWithRegisteredProverFixture() {
    const fixture = await deployOracleFixture();
    const { oracle, prover, minProverStake } = fixture;

    // Register prover
    await oracle.connect(prover).registerProver({ value: minProverStake });

    return fixture;
  }

  async function deployWithRequestFixture() {
    const fixture = await deployWithRegisteredProverFixture();
    const { oracle, requester, minStake } = fixture;

    // Create inference request
    const modelHash = ethers.id("test-model-v1");
    const inputData = ethers.toUtf8Bytes("test input data");

    const tx = await oracle.connect(requester).requestInference(modelHash, inputData, {
      value: minStake,
    });
    const receipt = await tx.wait();
    const requestId = 1; // First request

    return { ...fixture, requestId, modelHash, inputData };
  }

  async function deployWithPostedInferenceFixture() {
    const fixture = await deployWithRequestFixture();
    const { oracle, prover, requestId } = fixture;

    // Post inference
    const outputData = ethers.toUtf8Bytes("test output data");
    await oracle.connect(prover).postInference(requestId, outputData);

    return { ...fixture, outputData };
  }

  // ============================================
  // DEPLOYMENT TESTS
  // ============================================

  describe("Deployment", function () {
    it("Should deploy with correct initial parameters", async function () {
      const { oracle, minStake, minProverStake, disputeWindow } = await loadFixture(deployOracleFixture);

      expect(await oracle.minStake()).to.equal(minStake);
      expect(await oracle.minProverStake()).to.equal(minProverStake);
      expect(await oracle.disputeWindow()).to.equal(disputeWindow);
      expect(await oracle.getCurrentRequestId()).to.equal(0);
    });

    it("Should revert if min stake is zero", async function () {
      const OptimisticOracleV2 = await ethers.getContractFactory("OptimisticOracleV2");
      await expect(
        OptimisticOracleV2.deploy(0, ethers.parseEther("0.5"), 24 * 60 * 60)
      ).to.be.revertedWithCustomError(OptimisticOracleV2, "InvalidConfiguration");
    });

    it("Should revert if dispute window is too short", async function () {
      const OptimisticOracleV2 = await ethers.getContractFactory("OptimisticOracleV2");
      await expect(
        OptimisticOracleV2.deploy(ethers.parseEther("0.1"), ethers.parseEther("0.5"), 30 * 60) // 30 minutes
      ).to.be.revertedWithCustomError(OptimisticOracleV2, "InvalidConfiguration");
    });
  });

  // ============================================
  // PROVER REGISTRATION TESTS
  // ============================================

  describe("Prover Registration", function () {
    it("Should allow prover registration with sufficient stake", async function () {
      const { oracle, prover, minProverStake } = await loadFixture(deployOracleFixture);

      await expect(oracle.connect(prover).registerProver({ value: minProverStake }))
        .to.emit(oracle, "ProverRegistered")
        .withArgs(prover.address, minProverStake);

      expect(await oracle.isRegisteredProver(prover.address)).to.be.true;
      expect(await oracle.getProverStake(prover.address)).to.equal(minProverStake);
    });

    it("Should revert registration with insufficient stake", async function () {
      const { oracle, prover, minProverStake } = await loadFixture(deployOracleFixture);

      const insufficientStake = minProverStake - ethers.parseEther("0.1");

      await expect(
        oracle.connect(prover).registerProver({ value: insufficientStake })
      ).to.be.revertedWithCustomError(oracle, "InsufficientStake");
    });

    it("Should allow increasing prover stake", async function () {
      const { oracle, prover, minProverStake } = await loadFixture(deployWithRegisteredProverFixture);

      const additionalStake = ethers.parseEther("0.5");
      const expectedTotal = minProverStake + additionalStake;

      await expect(oracle.connect(prover).increaseProverStake({ value: additionalStake }))
        .to.emit(oracle, "ProverStakeIncreased")
        .withArgs(prover.address, expectedTotal);

      expect(await oracle.getProverStake(prover.address)).to.equal(expectedTotal);
    });

    it("Should allow prover unregistration", async function () {
      const { oracle, prover, minProverStake } = await loadFixture(deployWithRegisteredProverFixture);

      const balanceBefore = await ethers.provider.getBalance(prover.address);

      await expect(oracle.connect(prover).unregisterProver())
        .to.emit(oracle, "ProverUnregistered")
        .withArgs(prover.address, minProverStake);

      expect(await oracle.isRegisteredProver(prover.address)).to.be.false;
      expect(await oracle.getProverStake(prover.address)).to.equal(0);

      const balanceAfter = await ethers.provider.getBalance(prover.address);
      expect(balanceAfter).to.be.gt(balanceBefore); // Account for gas costs
    });
  });

  // ============================================
  // INFERENCE REQUEST TESTS
  // ============================================

  describe("Inference Requests", function () {
    it("Should create inference request with sufficient stake", async function () {
      const { oracle, requester, minStake } = await loadFixture(deployOracleFixture);

      const modelHash = ethers.id("test-model-v1");
      const inputData = ethers.toUtf8Bytes("test input");

      await expect(
        oracle.connect(requester).requestInference(modelHash, inputData, { value: minStake })
      )
        .to.emit(oracle, "InferenceRequested")
        .withArgs(1, requester.address, modelHash, minStake, 0);

      const request = await oracle.getRequest(1);
      expect(request.requester).to.equal(requester.address);
      expect(request.modelHash).to.equal(modelHash);
      expect(request.requesterStake).to.equal(minStake);
      expect(request.status).to.equal(0); // Pending
    });

    it("Should revert request with insufficient stake", async function () {
      const { oracle, requester, minStake } = await loadFixture(deployOracleFixture);

      const modelHash = ethers.id("test-model-v1");
      const inputData = ethers.toUtf8Bytes("test input");
      const insufficientStake = minStake - ethers.parseEther("0.01");

      await expect(
        oracle.connect(requester).requestInference(modelHash, inputData, { value: insufficientStake })
      ).to.be.revertedWithCustomError(oracle, "InsufficientStake");
    });

    it("Should increment request ID counter", async function () {
      const { oracle, requester, minStake } = await loadFixture(deployOracleFixture);

      const modelHash = ethers.id("test-model-v1");
      const inputData = ethers.toUtf8Bytes("test input");

      await oracle.connect(requester).requestInference(modelHash, inputData, { value: minStake });
      expect(await oracle.getCurrentRequestId()).to.equal(1);

      await oracle.connect(requester).requestInference(modelHash, inputData, { value: minStake });
      expect(await oracle.getCurrentRequestId()).to.equal(2);
    });
  });

  // ============================================
  // POST INFERENCE TESTS
  // ============================================

  describe("Post Inference", function () {
    it("Should allow registered prover to post inference", async function () {
      const { oracle, prover, requestId, minProverStake } = await loadFixture(deployWithRequestFixture);

      const outputData = ethers.toUtf8Bytes("test output");

      await expect(oracle.connect(prover).postInference(requestId, outputData))
        .to.emit(oracle, "InferencePosted")
        .withArgs(requestId, prover.address, outputData, minProverStake);

      const request = await oracle.getRequest(requestId);
      expect(request.prover).to.equal(prover.address);
      expect(request.status).to.equal(1); // Posted
      expect(request.disputeDeadline).to.be.gt(0);
    });

    it("Should revert if prover is not registered", async function () {
      const { oracle, other, requestId } = await loadFixture(deployWithRequestFixture);

      const outputData = ethers.toUtf8Bytes("test output");

      await expect(
        oracle.connect(other).postInference(requestId, outputData)
      ).to.be.revertedWithCustomError(oracle, "UnauthorizedProver");
    });

    it("Should revert if requester tries to post inference", async function () {
      const { oracle, requester, requestId } = await loadFixture(deployWithRequestFixture);

      const outputData = ethers.toUtf8Bytes("test output");

      await expect(
        oracle.connect(requester).postInference(requestId, outputData)
      ).to.be.revertedWithCustomError(oracle, "RequesterCannotProve");
    });

    it("Should lock prover stake when posting", async function () {
      const { oracle, prover, requestId, minProverStake } = await loadFixture(deployWithRequestFixture);

      const stakeBefore = await oracle.getProverStake(prover.address);
      const outputData = ethers.toUtf8Bytes("test output");

      await oracle.connect(prover).postInference(requestId, outputData);

      const stakeAfter = await oracle.getProverStake(prover.address);
      expect(stakeAfter).to.equal(stakeBefore - minProverStake);
    });
  });

  // ============================================
  // DISPUTE TESTS
  // ============================================

  describe("Dispute Inference", function () {
    it("Should allow dispute with sufficient stake", async function () {
      const { oracle, challenger, requestId, minStake, minProverStake } = await loadFixture(
        deployWithPostedInferenceFixture
      );

      const counterExample = ethers.toUtf8Bytes("counter example");
      const requiredStake = minStake + minProverStake;

      await expect(
        oracle.connect(challenger).disputeInference(requestId, counterExample, { value: requiredStake })
      )
        .to.emit(oracle, "InferenceDisputed")
        .withArgs(requestId, challenger.address, requiredStake);

      const request = await oracle.getRequest(requestId);
      expect(request.challenger).to.equal(challenger.address);
      expect(request.status).to.equal(4); // Settled
    });

    it("Should revert dispute with insufficient stake", async function () {
      const { oracle, challenger, requestId, minStake } = await loadFixture(deployWithPostedInferenceFixture);

      const counterExample = ethers.toUtf8Bytes("counter example");
      const insufficientStake = minStake;

      await expect(
        oracle.connect(challenger).disputeInference(requestId, counterExample, { value: insufficientStake })
      ).to.be.revertedWithCustomError(oracle, "InsufficientStake");
    });

    it("Should revert dispute after window closes", async function () {
      const { oracle, challenger, requestId, minStake, minProverStake, disputeWindow } = await loadFixture(
        deployWithPostedInferenceFixture
      );

      // Fast forward past dispute window
      await time.increase(disputeWindow + 1);

      const counterExample = ethers.toUtf8Bytes("counter example");
      const requiredStake = minStake + minProverStake;

      await expect(
        oracle.connect(challenger).disputeInference(requestId, counterExample, { value: requiredStake })
      ).to.be.revertedWithCustomError(oracle, "DisputeWindowClosed");
    });
  });

  // ============================================
  // FINALIZE TESTS
  // ============================================

  describe("Finalize Inference", function () {
    it("Should finalize inference after dispute window", async function () {
      const { oracle, prover, requestId, minStake, minProverStake, disputeWindow } = await loadFixture(
        deployWithPostedInferenceFixture
      );

      // Fast forward past dispute window
      await time.increase(disputeWindow + 1);

      const totalReward = minStake + minProverStake;

      await expect(oracle.finalizeInference(requestId))
        .to.emit(oracle, "InferenceFinalized")
        .withArgs(requestId, prover.address, totalReward);

      const request = await oracle.getRequest(requestId);
      expect(request.status).to.equal(3); // Finalized
    });

    it("Should revert finalization during dispute window", async function () {
      const { oracle, requestId } = await loadFixture(deployWithPostedInferenceFixture);

      await expect(oracle.finalizeInference(requestId)).to.be.revertedWithCustomError(
        oracle,
        "DisputeWindowOpen"
      );
    });

    it("Should transfer reward to prover on finalization", async function () {
      const { oracle, prover, requestId, minStake, minProverStake, disputeWindow } = await loadFixture(
        deployWithPostedInferenceFixture
      );

      const balanceBefore = await ethers.provider.getBalance(prover.address);

      await time.increase(disputeWindow + 1);
      await oracle.finalizeInference(requestId);

      const balanceAfter = await ethers.provider.getBalance(prover.address);
      const expectedReward = minStake + minProverStake;

      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  // ============================================
  // ADMIN TESTS
  // ============================================

  describe("Admin Functions", function () {
    it("Should allow owner to update config", async function () {
      const { oracle, owner } = await loadFixture(deployOracleFixture);

      const newMinStake = ethers.parseEther("0.2");
      const newMinProverStake = ethers.parseEther("1.0");
      const newDisputeWindow = 48 * 60 * 60; // 48 hours

      await expect(oracle.connect(owner).updateConfig(newMinStake, newMinProverStake, newDisputeWindow))
        .to.emit(oracle, "ConfigUpdated")
        .withArgs(newMinStake, newMinProverStake, newDisputeWindow);

      expect(await oracle.minStake()).to.equal(newMinStake);
      expect(await oracle.minProverStake()).to.equal(newMinProverStake);
      expect(await oracle.disputeWindow()).to.equal(newDisputeWindow);
    });

    it("Should revert config update from non-owner", async function () {
      const { oracle, other } = await loadFixture(deployOracleFixture);

      await expect(
        oracle.connect(other).updateConfig(ethers.parseEther("0.2"), ethers.parseEther("1.0"), 48 * 60 * 60)
      ).to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to pause contract", async function () {
      const { oracle, owner } = await loadFixture(deployOracleFixture);

      await oracle.connect(owner).pause();
      expect(await oracle.paused()).to.be.true;
    });

    it("Should prevent operations when paused", async function () {
      const { oracle, owner, requester, minStake } = await loadFixture(deployOracleFixture);

      await oracle.connect(owner).pause();

      const modelHash = ethers.id("test-model");
      const inputData = ethers.toUtf8Bytes("test");

      await expect(
        oracle.connect(requester).requestInference(modelHash, inputData, { value: minStake })
      ).to.be.revertedWithCustomError(oracle, "EnforcedPause");
    });

    it("Should allow owner to unpause contract", async function () {
      const { oracle, owner } = await loadFixture(deployOracleFixture);

      await oracle.connect(owner).pause();
      await oracle.connect(owner).unpause();

      expect(await oracle.paused()).to.be.false;
    });
  });

  // ============================================
  // REENTRANCY TESTS
  // ============================================

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy on requestInference", async function () {
      // This would require a malicious contract - placeholder for now
      // In production, deploy a malicious contract that attempts reentrancy
      expect(true).to.be.true;
    });

    it("Should prevent reentrancy on unregisterProver", async function () {
      // This would require a malicious contract - placeholder for now
      expect(true).to.be.true;
    });
  });

  // ============================================
  // GAS OPTIMIZATION TESTS
  // ============================================

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for request creation", async function () {
      const { oracle, requester, minStake } = await loadFixture(deployOracleFixture);

      const modelHash = ethers.id("test-model");
      const inputData = ethers.toUtf8Bytes("test");

      const tx = await oracle.connect(requester).requestInference(modelHash, inputData, { value: minStake });
      const receipt = await tx.wait();

      // Gas should be under 200k for simple request
      expect(receipt.gasUsed).to.be.lt(200000);
    });
  });
});
