# Development Guide

Complete guide for developing, testing, and deploying the Optimistic AI Oracle.

## 📋 Table of Contents

- [Setup](#setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contract Interaction](#contract-interaction)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

---

## 🛠️ Setup

### Prerequisites

```bash
# Check versions
node --version  # Should be >= 16.0.0
npm --version   # Should be >= 8.0.0
```

### Installation

```bash
# 1. Clone repository
git clone https://github.com/IamTamheedNazir/optimistic-ai-oracle.git
cd optimistic-ai-oracle

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 4. Compile contracts
npm run compile
```

### Environment Variables

Required variables in `.env`:

```bash
# Blockchain
PRIVATE_KEY=your_private_key_without_0x
INFURA_API_KEY=your_infura_project_id

# Verification
ETHERSCAN_API_KEY=your_etherscan_api_key

# Optional
REPORT_GAS=true
COINMARKETCAP_API_KEY=your_cmc_api_key
```

---

## 🔄 Development Workflow

### 1. Smart Contract Development

**File Structure:**
```
contracts/
├── OptimisticOracle.sol      # V1 (deprecated)
└── OptimisticOracleV2.sol    # V2 (production-ready)
```

**Compile Contracts:**
```bash
npm run compile

# Clean and recompile
npm run clean
npm run compile
```

**Key Improvements in V2:**
- ✅ Reentrancy protection (OpenZeppelin ReentrancyGuard)
- ✅ Prover staking requirement
- ✅ Extended dispute window (24 hours)
- ✅ Access control and pausability
- ✅ Proper error handling with custom errors
- ✅ Gas optimizations
- ✅ Comprehensive events

### 2. Writing Tests

**Test Structure:**
```
test/
└── OptimisticOracleV2.test.js
```

**Test Categories:**
- Deployment tests
- Prover registration tests
- Inference request tests
- Post inference tests
- Dispute tests
- Finalization tests
- Admin function tests
- Reentrancy protection tests
- Gas optimization tests

**Example Test:**
```javascript
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
  });
});
```

---

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run with gas reporting
npm run test:gas

# Run specific test file
npx hardhat test test/OptimisticOracleV2.test.js

# Run specific test
npx hardhat test --grep "Should create inference request"
```

### Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| Statements | 80%+ | TBD |
| Branches | 80%+ | TBD |
| Functions | 80%+ | TBD |
| Lines | 80%+ | TBD |

### Gas Optimization

**Check gas usage:**
```bash
REPORT_GAS=true npm test
```

**Optimization targets:**
- Request creation: < 200k gas
- Post inference: < 150k gas
- Dispute: < 200k gas
- Finalize: < 100k gas

---

## 🚀 Deployment

### Local Deployment

```bash
# 1. Start local node
npm run node

# 2. Deploy (in another terminal)
npm run deploy:local
```

### Testnet Deployment (Sepolia)

```bash
# 1. Ensure you have Sepolia ETH
# Get from: https://sepoliafaucet.com/

# 2. Deploy
npm run deploy:sepolia

# 3. Verify on Etherscan
npm run verify -- --network sepolia DEPLOYED_ADDRESS "100000000000000000" "500000000000000000" "86400"
```

### Mainnet Deployment

**⚠️ CRITICAL CHECKLIST:**

- [ ] Security audit completed
- [ ] All tests passing (100%)
- [ ] Coverage > 80%
- [ ] Gas optimizations done
- [ ] Testnet deployment successful
- [ ] Multi-sig wallet setup
- [ ] Emergency pause tested
- [ ] Documentation complete
- [ ] Bug bounty program ready

```bash
# Deploy to mainnet (use with extreme caution!)
npm run deploy:mainnet
```

### Deployment Configuration

**Default Parameters:**
```javascript
MIN_STAKE = 0.1 ETH          // Minimum stake for requests
MIN_PROVER_STAKE = 0.5 ETH   // Minimum stake for provers
DISPUTE_WINDOW = 24 hours    // Dispute window duration
```

**Adjust in `scripts/deployV2.js`:**
```javascript
const MIN_STAKE = ethers.parseEther("0.1");
const MIN_PROVER_STAKE = ethers.parseEther("0.5");
const DISPUTE_WINDOW = 24 * 60 * 60;
```

---

## 🔌 Contract Interaction

### Using Hardhat Console

```bash
npx hardhat console --network sepolia
```

```javascript
// Get contract instance
const Oracle = await ethers.getContractFactory("OptimisticOracleV2");
const oracle = await Oracle.attach("DEPLOYED_ADDRESS");

// Check configuration
await oracle.minStake();
await oracle.minProverStake();
await oracle.disputeWindow();

// Register as prover
await oracle.registerProver({ value: ethers.parseEther("0.5") });

// Request inference
const modelHash = ethers.id("my-model-v1");
const inputData = ethers.toUtf8Bytes("input data");
await oracle.requestInference(modelHash, inputData, { value: ethers.parseEther("0.1") });

// Get request details
const request = await oracle.getRequest(1);
console.log(request);
```

### Using Scripts

Create interaction scripts in `scripts/`:

```javascript
// scripts/interact.js
const { ethers } = require("hardhat");

async function main() {
  const oracle = await ethers.getContractAt(
    "OptimisticOracleV2",
    "DEPLOYED_ADDRESS"
  );
  
  // Your interaction code here
}

main().catch(console.error);
```

Run:
```bash
npx hardhat run scripts/interact.js --network sepolia
```

---

## 🔐 Security

### Security Checklist

**Smart Contract:**
- [x] Reentrancy protection (ReentrancyGuard)
- [x] Access control (Ownable)
- [x] Pausability (Pausable)
- [x] Custom errors (gas efficient)
- [x] Checks-Effects-Interactions pattern
- [ ] Formal verification (planned)
- [ ] Professional audit (planned)

**Testing:**
- [x] Unit tests
- [x] Integration tests
- [ ] Fuzzing tests (planned)
- [ ] Invariant tests (planned)

**Deployment:**
- [ ] Multi-sig wallet
- [ ] Timelock for upgrades
- [ ] Emergency procedures
- [ ] Monitoring setup

### Static Analysis

```bash
# Install Slither
pip3 install slither-analyzer

# Run analysis
slither contracts/OptimisticOracleV2.sol
```

### Common Vulnerabilities Checked

- ✅ Reentrancy
- ✅ Integer overflow/underflow (Solidity 0.8+)
- ✅ Access control
- ✅ Front-running
- ✅ Timestamp dependence
- ✅ Gas limit issues

---

## 🐛 Troubleshooting

### Common Issues

**1. Compilation Errors**

```bash
# Clear cache and recompile
npm run clean
npm run compile
```

**2. Test Failures**

```bash
# Run tests with verbose output
npx hardhat test --verbose

# Run specific test
npx hardhat test --grep "test name"
```

**3. Deployment Failures**

```bash
# Check account balance
npx hardhat run scripts/checkBalance.js --network sepolia

# Verify network configuration
npx hardhat run scripts/verifyNetwork.js --network sepolia
```

**4. Gas Estimation Errors**

```bash
# Increase gas limit in hardhat.config.js
networks: {
  sepolia: {
    gas: 6000000,
    gasPrice: 20000000000, // 20 gwei
  }
}
```

**5. Verification Errors**

```bash
# Flatten contract
npx hardhat flatten contracts/OptimisticOracleV2.sol > Flattened.sol

# Verify manually on Etherscan
```

### Debug Mode

```bash
# Enable Hardhat debug mode
npx hardhat test --verbose

# Use console.log in Solidity
import "hardhat/console.sol";
console.log("Debug:", value);
```

---

## 📊 Performance Metrics

### Gas Usage (Target)

| Function | Gas Limit | Actual | Status |
|----------|-----------|--------|--------|
| registerProver | 100k | TBD | 🟡 |
| requestInference | 200k | TBD | 🟡 |
| postInference | 150k | TBD | 🟡 |
| disputeInference | 200k | TBD | 🟡 |
| finalizeInference | 100k | TBD | 🟡 |

### Test Coverage (Target)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Statements | 80% | TBD | 🟡 |
| Branches | 80% | TBD | 🟡 |
| Functions | 80% | TBD | 🟡 |
| Lines | 80% | TBD | 🟡 |

---

## 🔄 CI/CD Pipeline

### GitHub Actions (Planned)

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

---

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- [Ethereum Security](https://ethereum.org/en/developers/docs/smart-contracts/security/)

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## 🔐 Security

See [SECURITY.md](SECURITY.md) for security policy.

---

**Happy Building! 🚀**
