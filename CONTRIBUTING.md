# Contributing to ABSF-2025

First off, thank you for considering contributing to ABSF-2025! 🎉

It's people like you that make ABSF-2025 such a great tool for the decentralized AI community.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Community](#community)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [tamheed@example.com](mailto:tamheed@example.com).

### Our Standards

**Examples of behavior that contributes to a positive environment:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Examples of unacceptable behavior:**
- The use of sexualized language or imagery
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

## 🤝 How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

**Bug Report Template:**
```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. macOS, Windows, Linux]
 - Node Version: [e.g. 16.0.0]
 - Hardhat Version: [e.g. 2.24.1]

**Additional context**
Add any other context about the problem here.
```

### 💡 Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description** of the suggested enhancement
- **Provide specific examples** to demonstrate the steps
- **Describe the current behavior** and **explain which behavior you expected to see instead**
- **Explain why this enhancement would be useful**

### 🔧 Your First Code Contribution

Unsure where to begin? You can start by looking through these `beginner` and `help-wanted` issues:

- **Beginner issues** - issues which should only require a few lines of code
- **Help wanted issues** - issues which should be a bit more involved than beginner issues

### 📝 Pull Requests

1. **Fork the repo** and create your branch from `master`
2. **If you've added code** that should be tested, add tests
3. **If you've changed APIs**, update the documentation
4. **Ensure the test suite passes**
5. **Make sure your code lints**
6. **Issue that pull request!**

## 🛠️ Development Setup

### Prerequisites

- Node.js >= 16.0
- npm or yarn
- Git
- MetaMask wallet (for testing)
- Sepolia testnet ETH

### Setup Steps

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/absf-2025.git
cd absf-2025

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Edit .env with your credentials

# 4. Compile contracts
npx hardhat compile

# 5. Run tests
npx hardhat test

# 6. Start local blockchain (optional)
npx hardhat node
```

### Project Structure

```
absf-2025/
├── contracts/          # Solidity smart contracts
├── scripts/            # Deployment and interaction scripts
├── test/              # Test files (to be added)
├── absf-frontend/     # React frontend
└── docs/              # Documentation
```

## 🔄 Pull Request Process

1. **Update the README.md** with details of changes to the interface, if applicable
2. **Update the documentation** with any new environment variables, exposed ports, useful file locations, etc.
3. **Increase the version numbers** in any examples files and the README.md to the new version that this Pull Request would represent
4. **Ensure all tests pass** and add new tests for new functionality
5. **Request review** from at least one maintainer
6. **Squash commits** before merging (if requested)

### PR Title Format

Use conventional commits format:

```
<type>(<scope>): <subject>

Examples:
feat(oracle): add fraud proof verification
fix(frontend): resolve wallet connection issue
docs(readme): update installation instructions
test(oracle): add dispute mechanism tests
refactor(contracts): optimize gas usage
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semi-colons, etc)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding missing tests
- `chore`: Changes to build process or auxiliary tools

## 🎨 Style Guidelines

### Solidity Style Guide

Follow the [Official Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html):

```solidity
// ✅ Good
contract OptimisticOracle {
    uint256 public constant MIN_STAKE = 0.1 ether;
    
    mapping(uint256 => InferenceRequest) public requests;
    
    event InferenceRequested(
        uint256 indexed requestId,
        address indexed requester,
        bytes32 modelHash
    );
    
    function requestInference(
        bytes32 modelHash,
        bytes memory inputData
    ) external payable returns (uint256) {
        require(msg.value >= MIN_STAKE, "Insufficient stake");
        // Implementation
    }
}

// ❌ Bad
contract optimisticoracle {
    uint256 min_stake = 0.1 ether;
    mapping(uint256=>InferenceRequest) requests;
    event inferenceRequested(uint256 requestId,address requester,bytes32 modelHash);
    function RequestInference(bytes32 modelHash,bytes memory inputData)external payable returns(uint256){
        require(msg.value>=min_stake);
    }
}
```

### JavaScript/React Style Guide

- Use ES6+ features
- Use functional components with hooks
- Use meaningful variable names
- Add JSDoc comments for functions
- Use async/await instead of promises

```javascript
// ✅ Good
/**
 * Request AI inference from the smart contract
 * @param {string} input - Input data for inference
 * @returns {Promise<string>} Transaction hash
 */
const handleRequestInference = async (input) => {
  if (!contract || !signer) {
    throw new Error("Contract not initialized");
  }
  
  try {
    const modelHash = "0x" + "abc123".padEnd(64, "0");
    const inputData = toUtf8Bytes(input);
    const value = parseEther("0.01");
    
    const tx = await contract.requestInference(modelHash, inputData, { value });
    const receipt = await tx.wait();
    
    return receipt.hash;
  } catch (error) {
    console.error("Inference request failed:", error);
    throw error;
  }
};

// ❌ Bad
const req = async (i) => {
  const m = "0x" + "abc123".padEnd(64, "0");
  const d = toUtf8Bytes(i);
  const v = parseEther("0.01");
  const t = await contract.requestInference(m, d, { value: v });
  const r = await t.wait();
  return r.hash;
};
```

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

```bash
# ✅ Good
feat(oracle): add fraud proof verification

Implement proper fraud proof verification mechanism using
Merkle proofs to validate counter-examples submitted during
the dispute window.

Closes #123

# ❌ Bad
added stuff
```

## 🧪 Testing Guidelines

### Writing Tests

- Write tests for all new features
- Ensure tests are deterministic
- Use descriptive test names
- Test edge cases and error conditions

```javascript
// ✅ Good
describe("OptimisticOracle", function () {
  describe("requestInference", function () {
    it("should create a new inference request with valid stake", async function () {
      const modelHash = ethers.utils.formatBytes32String("model1");
      const inputData = ethers.utils.toUtf8Bytes("test input");
      const stake = ethers.utils.parseEther("0.1");
      
      await expect(
        oracle.requestInference(modelHash, inputData, { value: stake })
      ).to.emit(oracle, "InferenceRequested");
    });
    
    it("should revert when stake is insufficient", async function () {
      const modelHash = ethers.utils.formatBytes32String("model1");
      const inputData = ethers.utils.toUtf8Bytes("test input");
      const insufficientStake = ethers.utils.parseEther("0.05");
      
      await expect(
        oracle.requestInference(modelHash, inputData, { value: insufficientStake })
      ).to.be.revertedWith("Insufficient stake");
    });
  });
});

// ❌ Bad
it("test1", async function () {
  await oracle.requestInference("0x123", "0x456", { value: 100 });
});
```

### Running Tests

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/OptimisticOracle.test.js

# Run with coverage
npx hardhat coverage

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

## 📚 Documentation

- Update README.md for user-facing changes
- Add JSDoc/NatSpec comments for all public functions
- Update CHANGELOG.md for notable changes
- Create/update wiki pages for major features

## 🌐 Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Discord**: Real-time chat (coming soon)
- **Twitter**: [@tamheednazir](https://twitter.com/tamheednazir)

### Getting Help

If you need help, you can:

1. Check the [documentation](README.md)
2. Search [existing issues](../../issues)
3. Ask in [GitHub Discussions](../../discussions)
4. Reach out on Discord (coming soon)

## 🏆 Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes
- Project website (coming soon)

## 📄 License

By contributing to ABSF-2025, you agree that your contributions will be licensed under the MIT License.

---

## 🙏 Thank You!

Your contributions to open source, large or small, make projects like this possible. Thank you for taking the time to contribute.

**Happy Coding! 🚀**
