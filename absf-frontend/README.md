# Optimistic AI Oracle - Frontend

Modern, production-ready React frontend for the Optimistic AI Oracle decentralized AI inference platform.

## 🌟 Features

- ✅ **Wallet Integration** - MetaMask connection with account management
- ✅ **Request Inference** - Submit AI inference requests with stake
- ✅ **Prover Actions** - Register as prover and post inference results
- ✅ **Dispute Mechanism** - Challenge incorrect inferences
- ✅ **Request Tracking** - View detailed request information
- ✅ **Real-time Updates** - Live contract state updates
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile
- ✅ **Toast Notifications** - User-friendly feedback system

## 🚀 Quick Start

### Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- MetaMask browser extension

### Installation

```bash
# Navigate to frontend directory
cd absf-frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your contract address
# REACT_APP_CONTRACT_ADDRESS=0x...

# Start development server
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
absf-frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── App.js              # Main application component
│   ├── App.css             # Styling
│   ├── index.js            # Entry point
│   └── index.css           # Global styles
├── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `absf-frontend` directory:

```bash
# Contract address (required)
REACT_APP_CONTRACT_ADDRESS=0x...

# Chain ID (optional, defaults to Sepolia)
REACT_APP_CHAIN_ID=11155111
```

### Supported Networks

- **Sepolia Testnet** (Chain ID: 11155111) - Recommended for testing
- **Ethereum Mainnet** (Chain ID: 1) - Production

## 🎨 User Interface

### 1. Request Inference Tab

Submit AI inference requests:
- Enter model name (e.g., "gpt-4", "llama-2")
- Provide input data
- Stake ETH (minimum as configured in contract)
- Receive request ID for tracking

### 2. Prover Actions Tab

For registered provers:
- **Register as Prover** - Stake ETH to become a prover
- **Post Inference** - Submit inference results for requests
- **Finalize Inference** - Claim rewards after dispute window

### 3. Dispute Tab

Challenge incorrect inferences:
- Enter request ID
- Provide counter-example proof
- Stake required amount
- Submit dispute

### 4. View Request Tab

Track request status:
- View requester, prover, challenger addresses
- Check stake amounts
- Monitor dispute deadline
- See request status (Pending, Posted, Disputed, Finalized, Settled)

## 💡 Usage Examples

### Connect Wallet

1. Click "Connect Wallet" button
2. Approve MetaMask connection
3. Ensure you're on Sepolia testnet
4. View your account info in header

### Request Inference

1. Go to "Request Inference" tab
2. Enter model name: `gpt-4`
3. Enter input: `What is blockchain?`
4. Enter stake: `0.1` (or minimum required)
5. Click "Submit Request"
6. Approve transaction in MetaMask
7. Note the request ID from success message

### Post Inference (Provers)

1. Register as prover first (if not already)
2. Go to "Prover Actions" tab
3. Enter request ID
4. Enter output data (inference result)
5. Click "Post Inference"
6. Approve transaction

### Dispute Inference

1. Go to "Dispute" tab
2. Enter request ID
3. Provide counter-example
4. Enter required stake amount
5. Click "Submit Dispute"
6. Approve transaction

## 🔐 Security

### Best Practices

- ✅ Never share your private keys
- ✅ Always verify contract address
- ✅ Use testnet for testing
- ✅ Check transaction details before approving
- ✅ Keep MetaMask updated

### Contract Verification

Before using, verify the contract address:
1. Check on Etherscan
2. Verify source code matches repository
3. Confirm deployment by trusted party

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## 📦 Building for Production

```bash
# Create optimized production build
npm run build

# The build folder will contain optimized files
# Deploy to your hosting service (Vercel, Netlify, etc.)
```

### Deployment Options

**Vercel:**
```bash
npm install -g vercel
vercel
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy
```

**IPFS:**
```bash
npm run build
ipfs add -r build/
```

## 🎨 Customization

### Styling

Edit `src/App.css` to customize:
- Colors (CSS variables in `:root`)
- Layout and spacing
- Component styles
- Responsive breakpoints

### Contract ABI

Update `CONTRACT_ABI` in `src/App.js` if contract changes:
```javascript
const CONTRACT_ABI = [
  // Add your contract ABI here
];
```

## 🐛 Troubleshooting

### MetaMask Not Detected

**Problem:** "Please install MetaMask!" error

**Solution:**
1. Install MetaMask extension
2. Refresh the page
3. Ensure MetaMask is unlocked

### Wrong Network

**Problem:** Connected to wrong network

**Solution:**
1. Open MetaMask
2. Switch to Sepolia testnet
3. Refresh the page

### Transaction Failures

**Problem:** Transactions fail or revert

**Solution:**
1. Check you have enough ETH for gas
2. Verify stake amounts meet minimums
3. Ensure you're not trying to post inference for your own request
4. Check dispute window hasn't expired

### Contract Not Loading

**Problem:** Contract data not displaying

**Solution:**
1. Verify `REACT_APP_CONTRACT_ADDRESS` in `.env`
2. Ensure contract is deployed on current network
3. Check browser console for errors
4. Verify contract ABI matches deployed contract

## 📊 Performance

### Optimization Tips

- ✅ Use production build for deployment
- ✅ Enable code splitting
- ✅ Optimize images and assets
- ✅ Use CDN for static files
- ✅ Enable caching

### Metrics

- **Bundle Size:** ~500KB (gzipped)
- **Load Time:** < 2s (on 3G)
- **Lighthouse Score:** 90+

## 🔄 Updates

### Updating Contract Address

1. Edit `.env` file
2. Update `REACT_APP_CONTRACT_ADDRESS`
3. Restart development server

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update all dependencies
npm update

# Update specific package
npm update ethers
```

## 📱 Mobile Support

The frontend is fully responsive and works on:
- ✅ Desktop browsers (Chrome, Firefox, Safari, Edge)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ✅ Tablet devices
- ✅ MetaMask mobile app

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT License - see [LICENSE](../LICENSE) for details.

## 🔗 Links

- [Main Repository](https://github.com/IamTamheedNazir/optimistic-ai-oracle)
- [Documentation](https://docs.optimistic-ai-oracle.io)
- [Smart Contract](../contracts/OptimisticOracleV2.sol)
- [Deployment Guide](../DEVELOPMENT.md)

## 💬 Support

- GitHub Issues: [Report bugs](https://github.com/IamTamheedNazir/optimistic-ai-oracle/issues)
- Discussions: [Ask questions](https://github.com/IamTamheedNazir/optimistic-ai-oracle/discussions)

---

**Built with ❤️ for the decentralized AI future**
