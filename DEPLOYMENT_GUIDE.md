# 🚀 DEPLOYMENT GUIDE - Optimistic AI Oracle

**Complete guide for deploying and testing the Optimistic AI Oracle platform**

---

## 📋 TABLE OF CONTENTS

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Testing](#testing)
4. [Testnet Deployment](#testnet-deployment)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 PREREQUISITES

### Required Software
- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **Git**
- **MetaMask** browser extension

### Required Accounts
- **Infura** or **Alchemy** account (for RPC endpoints)
- **Etherscan** account (for contract verification)
- **Sepolia ETH** (for testnet deployment)

### Get Testnet ETH
- Sepolia Faucet: https://sepoliafaucet.com/
- Alternative: https://faucet.quicknode.com/ethereum/sepolia

---

## 💻 LOCAL DEVELOPMENT

### Step 1: Clone Repository
```bash
git clone https://github.com/IamTamheedNazir/optimistic-ai-oracle.git
cd optimistic-ai-oracle
```

### Step 2: Install Dependencies

**Backend:**
```bash
npm install
```

**Frontend:**
```bash
cd absf-frontend
npm install
cd ..
```

### Step 3: Configure Environment

**Root `.env`:**
```bash
cp .env.example .env
```

Edit `.env`:
```bash
# Network Configuration
INFURA_API_KEY=your_infura_key_here
ALCHEMY_API_KEY=your_alchemy_key_here
PRIVATE_KEY=your_private_key_without_0x

# Verification
ETHERSCAN_API_KEY=your_etherscan_key_here

# Gas Reporting (optional)
REPORT_GAS=true
COINMARKETCAP_API_KEY=your_cmc_key_here
```

**Frontend `.env`:**
```bash
cd absf-frontend
cp .env.example .env
```

Edit `absf-frontend/.env`:
```bash
# Will be updated after contract deployment
REACT_APP_CONTRACT_ADDRESS=0x...
REACT_APP_CHAIN_ID=31337
REACT_APP_NETWORK_NAME=localhost
```

### Step 4: Start Local Blockchain

**Terminal 1:**
```bash
npm run node
```

This starts a local Hardhat node at `http://localhost:8545`

### Step 5: Deploy Contract Locally

**Terminal 2:**
```bash
npm run deploy:local
```

**Expected Output:**
```
Deploying OptimisticOracleV2...
Contract deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Min Stake: 0.1 ETH
Min Prover Stake: 0.5 ETH
Dispute Window: 86400 seconds (24 hours)
```

**Copy the contract address!**

### Step 6: Update Frontend Config

Edit `absf-frontend/.env`:
```bash
REACT_APP_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
REACT_APP_CHAIN_ID=31337
REACT_APP_NETWORK_NAME=localhost
```

### Step 7: Start Frontend

**Terminal 3:**
```bash
cd absf-frontend
npm start
```

Frontend opens at `http://localhost:3000`

### Step 8: Connect MetaMask to Local Network

1. Open MetaMask
2. Click network dropdown
3. Add Network → Add network manually
4. Fill in:
   - **Network Name:** Localhost 8545
   - **RPC URL:** http://localhost:8545
   - **Chain ID:** 31337
   - **Currency Symbol:** ETH
5. Save

### Step 9: Import Test Account

Hardhat provides test accounts with 10,000 ETH each:

1. Copy private key from Hardhat node output
2. MetaMask → Import Account
3. Paste private key
4. Done!

### Step 10: Test the Application

1. Connect wallet in frontend
2. Try requesting inference
3. Register as prover
4. Post inference
5. View request history

---

## 🧪 TESTING

### Run All Tests

**Backend Tests:**
```bash
npm test
```

**Frontend Tests:**
```bash
cd absf-frontend
npm test
```

### Run Specific Tests

**Single test file:**
```bash
npm test OptimisticOracleV2.test.js
```

**With coverage:**
```bash
npm run test:coverage
```

**With gas reporting:**
```bash
npm run test:gas
```

### Test Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| Smart Contracts | 90% | 70% |
| Frontend Components | 80% | 80% |
| Utilities | 90% | 90% |
| Integration | 70% | 70% |

### Integration Tests

**Start local node first:**
```bash
npm run node
```

**Deploy contract:**
```bash
npm run deploy:local
```

**Run integration tests:**
```bash
cd absf-frontend
npm test -- fullWorkflow.test.js
```

---

## 🌐 TESTNET DEPLOYMENT (SEPOLIA)

### Step 1: Get Sepolia ETH

Visit https://sepoliafaucet.com/ and get test ETH

### Step 2: Configure Environment

Edit root `.env`:
```bash
INFURA_API_KEY=your_infura_key
PRIVATE_KEY=your_private_key_without_0x
ETHERSCAN_API_KEY=your_etherscan_key
```

### Step 3: Deploy to Sepolia

```bash
npm run deploy:sepolia
```

**Expected Output:**
```
Deploying to Sepolia...
Contract deployed to: 0x1234567890123456789012345678901234567890
Transaction hash: 0xabcdef...
Block number: 12345678
Gas used: 2,500,000
```

**Save the contract address!**

### Step 4: Verify Contract on Etherscan

```bash
npx hardhat verify --network sepolia \
  0x1234567890123456789012345678901234567890 \
  "100000000000000000" \
  "500000000000000000" \
  "86400"
```

**Arguments:**
- `100000000000000000` = 0.1 ETH (minStake)
- `500000000000000000` = 0.5 ETH (minProverStake)
- `86400` = 24 hours (disputeWindow)

### Step 5: Verify Deployment

```bash
npx hardhat run scripts/verifyDeployment.js --network sepolia 0x1234...
```

### Step 6: Update Frontend

Edit `absf-frontend/.env`:
```bash
REACT_APP_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
REACT_APP_CHAIN_ID=11155111
REACT_APP_NETWORK_NAME=sepolia
```

### Step 7: Build Frontend

```bash
cd absf-frontend
npm run build
```

### Step 8: Deploy Frontend

**Option 1: Vercel**
```bash
npm install -g vercel
vercel
```

**Option 2: Netlify**
```bash
npm install -g netlify-cli
netlify deploy
```

**Option 3: IPFS**
```bash
npm run build
ipfs add -r build/
```

### Step 9: Test on Testnet

1. Visit your deployed frontend
2. Connect MetaMask (Sepolia network)
3. Test all features:
   - Request inference
   - Register as prover
   - Post inference
   - Dispute
   - View history

---

## 🚀 PRODUCTION DEPLOYMENT (MAINNET)

### ⚠️ CRITICAL WARNINGS

**DO NOT deploy to mainnet until:**
- ✅ Professional security audit complete
- ✅ Bug bounty program running (2+ weeks)
- ✅ All tests passing (90%+ coverage)
- ✅ Testnet testing complete (2+ weeks)
- ✅ Multi-sig wallet setup
- ✅ Emergency pause mechanism tested
- ✅ Upgrade mechanism tested

### Step 1: Final Security Checklist

- [ ] Professional audit by OpenZeppelin/Trail of Bits
- [ ] All audit findings resolved
- [ ] Re-audit completed
- [ ] Bug bounty program (Immunefi/HackerOne)
- [ ] No critical/high severity issues
- [ ] Test coverage >= 90%
- [ ] Gas optimization complete
- [ ] Emergency procedures documented
- [ ] Multi-sig setup (3-of-5 or 4-of-7)
- [ ] Monitoring and alerting configured

### Step 2: Prepare Mainnet Environment

Edit `.env`:
```bash
INFURA_API_KEY=your_mainnet_infura_key
PRIVATE_KEY=your_mainnet_deployer_key
ETHERSCAN_API_KEY=your_etherscan_key
```

### Step 3: Deploy to Mainnet

```bash
npm run deploy:mainnet
```

### Step 4: Verify on Etherscan

```bash
npx hardhat verify --network mainnet \
  CONTRACT_ADDRESS \
  "100000000000000000" \
  "500000000000000000" \
  "86400"
```

### Step 5: Transfer Ownership to Multi-Sig

```bash
npx hardhat run scripts/transferOwnership.js --network mainnet
```

### Step 6: Deploy Production Frontend

**Build:**
```bash
cd absf-frontend
REACT_APP_CONTRACT_ADDRESS=0x... npm run build
```

**Deploy to production hosting**

### Step 7: Setup Monitoring

- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Grafana** - Metrics dashboard
- **PagerDuty** - Alerting

### Step 8: Announce Launch

- Twitter announcement
- Discord/Telegram
- Blog post
- Documentation site
- Demo video

---

## 🐛 TROUBLESHOOTING

### Common Issues

#### 1. "Please install MetaMask!"

**Solution:**
- Install MetaMask extension
- Refresh page
- Ensure MetaMask is unlocked

#### 2. "Contract not configured"

**Solution:**
- Check `.env` file exists
- Verify `REACT_APP_CONTRACT_ADDRESS` is set
- Restart development server

#### 3. "Insufficient funds"

**Solution:**
- Check wallet balance
- Get testnet ETH from faucet
- Reduce stake amount

#### 4. "Transaction failed"

**Solution:**
- Check gas price
- Verify contract requirements
- Check error message in console
- Try increasing gas limit

#### 5. "Wrong network"

**Solution:**
- Switch MetaMask to correct network
- Check `REACT_APP_CHAIN_ID` matches
- Refresh page

#### 6. Tests failing

**Solution:**
```bash
# Clear cache
rm -rf node_modules
npm install

# Rebuild
npm run compile

# Run tests
npm test
```

#### 7. Frontend not loading

**Solution:**
```bash
# Clear cache
cd absf-frontend
rm -rf node_modules build
npm install
npm start
```

#### 8. Contract deployment fails

**Solution:**
- Check private key is correct
- Verify sufficient ETH for gas
- Check RPC endpoint is working
- Try different gas price

---

## 📊 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Environment configured
- [ ] Testnet ETH acquired

### Deployment
- [ ] Contract deployed
- [ ] Contract verified on Etherscan
- [ ] Deployment verified with script
- [ ] Frontend configured
- [ ] Frontend deployed

### Post-Deployment
- [ ] Test all features
- [ ] Monitor for errors
- [ ] Check gas usage
- [ ] Verify events emitting
- [ ] Test with multiple accounts

### Production Only
- [ ] Security audit complete
- [ ] Bug bounty running
- [ ] Multi-sig configured
- [ ] Monitoring setup
- [ ] Emergency procedures ready
- [ ] Team trained
- [ ] Documentation complete
- [ ] Marketing ready

---

## 🔗 USEFUL LINKS

### Development
- **Hardhat Docs:** https://hardhat.org/docs
- **Ethers.js Docs:** https://docs.ethers.org/
- **React Docs:** https://react.dev/

### Networks
- **Sepolia Faucet:** https://sepoliafaucet.com/
- **Sepolia Explorer:** https://sepolia.etherscan.io/
- **Mainnet Explorer:** https://etherscan.io/

### Tools
- **Remix IDE:** https://remix.ethereum.org/
- **Tenderly:** https://tenderly.co/
- **OpenZeppelin Wizard:** https://wizard.openzeppelin.com/

### Security
- **OpenZeppelin:** https://openzeppelin.com/security-audits/
- **Trail of Bits:** https://www.trailofbits.com/
- **Immunefi:** https://immunefi.com/

---

## 📞 SUPPORT

- **GitHub Issues:** https://github.com/IamTamheedNazir/optimistic-ai-oracle/issues
- **Discussions:** https://github.com/IamTamheedNazir/optimistic-ai-oracle/discussions
- **Email:** tamheed@example.com

---

**Last Updated:** February 22, 2026  
**Version:** 0.2.0  
**Status:** Production-Ready (Pending Audit)
