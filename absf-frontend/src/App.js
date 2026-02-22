import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Contract ABI - Add your deployed contract ABI here
const CONTRACT_ABI = [
  "function minStake() view returns (uint256)",
  "function minProverStake() view returns (uint256)",
  "function disputeWindow() view returns (uint256)",
  "function getCurrentRequestId() view returns (uint256)",
  "function isRegisteredProver(address) view returns (bool)",
  "function getProverStake(address) view returns (uint256)",
  "function getRequest(uint256) view returns (tuple(address requester, address prover, address challenger, bytes32 modelHash, bytes inputData, bytes outputData, uint256 requesterStake, uint256 proverStake, uint256 challengerStake, uint256 disputeDeadline, uint8 status, uint256 createdAt, uint256 settledAt))",
  "function registerProver() payable",
  "function increaseProverStake() payable",
  "function unregisterProver()",
  "function requestInference(bytes32, bytes) payable returns (uint256)",
  "function postInference(uint256, bytes)",
  "function disputeInference(uint256, bytes) payable",
  "function finalizeInference(uint256)",
  "event InferenceRequested(uint256 indexed requestId, address indexed requester, bytes32 indexed modelHash, uint256 stake, uint256 disputeDeadline)",
  "event InferencePosted(uint256 indexed requestId, address indexed prover, bytes outputData, uint256 proverStake)",
  "event InferenceDisputed(uint256 indexed requestId, address indexed challenger, uint256 challengerStake)",
  "event InferenceFinalized(uint256 indexed requestId, address indexed prover, uint256 reward)",
  "event InferenceSettled(uint256 indexed requestId, address indexed winner, bool inferenceValid, uint256 reward)"
];

// Replace with your deployed contract address
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "0x...";

function App() {
  // State
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [balance, setBalance] = useState("0");
  const [chainId, setChainId] = useState(null);
  
  // Contract state
  const [minStake, setMinStake] = useState("0");
  const [minProverStake, setMinProverStake] = useState("0");
  const [disputeWindow, setDisputeWindow] = useState("0");
  const [currentRequestId, setCurrentRequestId] = useState("0");
  const [isProver, setIsProver] = useState(false);
  const [proverStake, setProverStake] = useState("0");
  
  // UI state
  const [activeTab, setActiveTab] = useState('request');
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [modelName, setModelName] = useState('');
  const [inputData, setInputData] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [requestId, setRequestId] = useState('');
  const [outputData, setOutputData] = useState('');
  const [counterExample, setCounterExample] = useState('');
  const [requestDetails, setRequestDetails] = useState(null);

  // Initialize Web3
  useEffect(() => {
    initializeWeb3();
  }, []);

  // Load contract data when contract is set
  useEffect(() => {
    if (contract && account) {
      loadContractData();
    }
  }, [contract, account]);

  const initializeWeb3 = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(web3Provider);

        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
      } catch (error) {
        console.error('Error initializing Web3:', error);
        toast.error('Failed to initialize Web3');
      }
    } else {
      toast.error('Please install MetaMask!');
    }
  };

  const connectWallet = async () => {
    if (!provider) {
      toast.error('Please install MetaMask!');
      return;
    }

    try {
      setLoading(true);
      const accounts = await provider.send('eth_requestAccounts', []);
      const userAccount = accounts[0];
      setAccount(userAccount);

      const web3Signer = await provider.getSigner();
      setSigner(web3Signer);

      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));

      const userBalance = await provider.getBalance(userAccount);
      setBalance(ethers.formatEther(userBalance));

      // Initialize contract
      const oracleContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, web3Signer);
      setContract(oracleContract);

      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const loadContractData = async () => {
    try {
      const [minStakeVal, minProverStakeVal, disputeWindowVal, requestIdVal, isProverVal, proverStakeVal] = 
        await Promise.all([
          contract.minStake(),
          contract.minProverStake(),
          contract.disputeWindow(),
          contract.getCurrentRequestId(),
          contract.isRegisteredProver(account),
          contract.getProverStake(account)
        ]);

      setMinStake(ethers.formatEther(minStakeVal));
      setMinProverStake(ethers.formatEther(minProverStakeVal));
      setDisputeWindow((Number(disputeWindowVal) / 3600).toString());
      setCurrentRequestId(requestIdVal.toString());
      setIsProver(isProverVal);
      setProverStake(ethers.formatEther(proverStakeVal));
    } catch (error) {
      console.error('Error loading contract data:', error);
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setAccount(null);
      setSigner(null);
      setContract(null);
      toast.info('Please connect your wallet');
    } else {
      window.location.reload();
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  // Contract interactions
  const handleRegisterProver = async () => {
    if (!contract || !stakeAmount) {
      toast.error('Please enter stake amount');
      return;
    }

    try {
      setLoading(true);
      const stake = ethers.parseEther(stakeAmount);
      const tx = await contract.registerProver({ value: stake });
      toast.info('Transaction submitted...');
      
      const receipt = await tx.wait();
      toast.success('Registered as prover successfully!');
      
      await loadContractData();
      setStakeAmount('');
    } catch (error) {
      console.error('Error registering prover:', error);
      toast.error(error.reason || 'Failed to register as prover');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestInference = async () => {
    if (!contract || !modelName || !inputData || !stakeAmount) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      setLoading(true);
      const modelHash = ethers.id(modelName);
      const inputBytes = ethers.toUtf8Bytes(inputData);
      const stake = ethers.parseEther(stakeAmount);

      const tx = await contract.requestInference(modelHash, inputBytes, { value: stake });
      toast.info('Transaction submitted...');
      
      const receipt = await tx.wait();
      
      // Get request ID from event
      const event = receipt.logs.find(log => {
        try {
          return contract.interface.parseLog(log).name === 'InferenceRequested';
        } catch {
          return false;
        }
      });

      const newRequestId = event ? contract.interface.parseLog(event).args[0] : 'Unknown';
      
      toast.success(`Inference requested! Request ID: ${newRequestId.toString()}`);
      
      await loadContractData();
      setModelName('');
      setInputData('');
      setStakeAmount('');
    } catch (error) {
      console.error('Error requesting inference:', error);
      toast.error(error.reason || 'Failed to request inference');
    } finally {
      setLoading(false);
    }
  };

  const handlePostInference = async () => {
    if (!contract || !requestId || !outputData) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      setLoading(true);
      const outputBytes = ethers.toUtf8Bytes(outputData);

      const tx = await contract.postInference(requestId, outputBytes);
      toast.info('Transaction submitted...');
      
      await tx.wait();
      toast.success('Inference posted successfully!');
      
      await loadContractData();
      setRequestId('');
      setOutputData('');
    } catch (error) {
      console.error('Error posting inference:', error);
      toast.error(error.reason || 'Failed to post inference');
    } finally {
      setLoading(false);
    }
  };

  const handleDisputeInference = async () => {
    if (!contract || !requestId || !counterExample || !stakeAmount) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      setLoading(true);
      const counterBytes = ethers.toUtf8Bytes(counterExample);
      const stake = ethers.parseEther(stakeAmount);

      const tx = await contract.disputeInference(requestId, counterBytes, { value: stake });
      toast.info('Transaction submitted...');
      
      await tx.wait();
      toast.success('Dispute submitted successfully!');
      
      await loadContractData();
      setRequestId('');
      setCounterExample('');
      setStakeAmount('');
    } catch (error) {
      console.error('Error disputing inference:', error);
      toast.error(error.reason || 'Failed to dispute inference');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeInference = async () => {
    if (!contract || !requestId) {
      toast.error('Please enter request ID');
      return;
    }

    try {
      setLoading(true);
      const tx = await contract.finalizeInference(requestId);
      toast.info('Transaction submitted...');
      
      await tx.wait();
      toast.success('Inference finalized successfully!');
      
      await loadContractData();
      setRequestId('');
    } catch (error) {
      console.error('Error finalizing inference:', error);
      toast.error(error.reason || 'Failed to finalize inference');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = async () => {
    if (!contract || !requestId) {
      toast.error('Please enter request ID');
      return;
    }

    try {
      setLoading(true);
      const request = await contract.getRequest(requestId);
      setRequestDetails(request);
      toast.success('Request details loaded!');
    } catch (error) {
      console.error('Error viewing request:', error);
      toast.error('Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusName = (status) => {
    const statuses = ['Pending', 'Posted', 'Disputed', 'Finalized', 'Settled'];
    return statuses[status] || 'Unknown';
  };

  return (
    <div className="App">
      <ToastContainer position="top-right" autoClose={5000} />
      
      {/* Header */}
      <header className="header">
        <div className="container">
          <h1>🌌 Optimistic AI Oracle</h1>
          <p className="subtitle">Decentralized AI Inference with Blockchain Verification</p>
          
          {!account ? (
            <button onClick={connectWallet} disabled={loading} className="connect-btn">
              {loading ? 'Connecting...' : '🔗 Connect Wallet'}
            </button>
          ) : (
            <div className="wallet-info">
              <div className="info-item">
                <span className="label">Account:</span>
                <span className="value">{account.substring(0, 6)}...{account.substring(38)}</span>
              </div>
              <div className="info-item">
                <span className="label">Balance:</span>
                <span className="value">{parseFloat(balance).toFixed(4)} ETH</span>
              </div>
              <div className="info-item">
                <span className="label">Network:</span>
                <span className="value">{chainId === 11155111 ? 'Sepolia' : chainId}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      {account && contract && (
        <main className="main">
          <div className="container">
            {/* Contract Info */}
            <div className="contract-info">
              <h2>📊 Contract Information</h2>
              <div className="info-grid">
                <div className="info-card">
                  <span className="info-label">Min Stake</span>
                  <span className="info-value">{minStake} ETH</span>
                </div>
                <div className="info-card">
                  <span className="info-label">Min Prover Stake</span>
                  <span className="info-value">{minProverStake} ETH</span>
                </div>
                <div className="info-card">
                  <span className="info-label">Dispute Window</span>
                  <span className="info-value">{disputeWindow} hours</span>
                </div>
                <div className="info-card">
                  <span className="info-label">Total Requests</span>
                  <span className="info-value">{currentRequestId}</span>
                </div>
                <div className="info-card">
                  <span className="info-label">Prover Status</span>
                  <span className="info-value">{isProver ? '✅ Registered' : '❌ Not Registered'}</span>
                </div>
                <div className="info-card">
                  <span className="info-label">Your Prover Stake</span>
                  <span className="info-value">{proverStake} ETH</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
              <button 
                className={activeTab === 'request' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('request')}
              >
                📤 Request Inference
              </button>
              <button 
                className={activeTab === 'prover' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('prover')}
              >
                👨‍💻 Prover Actions
              </button>
              <button 
                className={activeTab === 'dispute' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('dispute')}
              >
                ⚔️ Dispute
              </button>
              <button 
                className={activeTab === 'view' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('view')}
              >
                🔍 View Request
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'request' && (
                <div className="form-section">
                  <h3>📤 Request AI Inference</h3>
                  <div className="form-group">
                    <label>Model Name</label>
                    <input
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="e.g., gpt-4, llama-2"
                    />
                  </div>
                  <div className="form-group">
                    <label>Input Data</label>
                    <textarea
                      value={inputData}
                      onChange={(e) => setInputData(e.target.value)}
                      placeholder="Enter your input data..."
                      rows="4"
                    />
                  </div>
                  <div className="form-group">
                    <label>Stake Amount (ETH)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder={`Minimum: ${minStake} ETH`}
                    />
                  </div>
                  <button 
                    onClick={handleRequestInference} 
                    disabled={loading}
                    className="action-btn"
                  >
                    {loading ? 'Processing...' : 'Submit Request'}
                  </button>
                </div>
              )}

              {activeTab === 'prover' && (
                <div className="form-section">
                  <h3>👨‍💻 Prover Actions</h3>
                  
                  {!isProver ? (
                    <>
                      <p className="info-text">Register as a prover to post inference results</p>
                      <div className="form-group">
                        <label>Stake Amount (ETH)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          placeholder={`Minimum: ${minProverStake} ETH`}
                        />
                      </div>
                      <button 
                        onClick={handleRegisterProver} 
                        disabled={loading}
                        className="action-btn"
                      >
                        {loading ? 'Processing...' : 'Register as Prover'}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="success-text">✅ You are registered as a prover</p>
                      <div className="form-group">
                        <label>Request ID</label>
                        <input
                          type="number"
                          value={requestId}
                          onChange={(e) => setRequestId(e.target.value)}
                          placeholder="Enter request ID"
                        />
                      </div>
                      <div className="form-group">
                        <label>Output Data</label>
                        <textarea
                          value={outputData}
                          onChange={(e) => setOutputData(e.target.value)}
                          placeholder="Enter inference result..."
                          rows="4"
                        />
                      </div>
                      <button 
                        onClick={handlePostInference} 
                        disabled={loading}
                        className="action-btn"
                      >
                        {loading ? 'Processing...' : 'Post Inference'}
                      </button>
                      
                      <div className="divider"></div>
                      
                      <h4>Finalize Inference</h4>
                      <p className="info-text">Finalize after dispute window expires</p>
                      <div className="form-group">
                        <label>Request ID</label>
                        <input
                          type="number"
                          value={requestId}
                          onChange={(e) => setRequestId(e.target.value)}
                          placeholder="Enter request ID"
                        />
                      </div>
                      <button 
                        onClick={handleFinalizeInference} 
                        disabled={loading}
                        className="action-btn secondary"
                      >
                        {loading ? 'Processing...' : 'Finalize Inference'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'dispute' && (
                <div className="form-section">
                  <h3>⚔️ Dispute Inference</h3>
                  <p className="warning-text">⚠️ Disputing requires stake equal to requester + prover stakes</p>
                  <div className="form-group">
                    <label>Request ID</label>
                    <input
                      type="number"
                      value={requestId}
                      onChange={(e) => setRequestId(e.target.value)}
                      placeholder="Enter request ID"
                    />
                  </div>
                  <div className="form-group">
                    <label>Counter-Example</label>
                    <textarea
                      value={counterExample}
                      onChange={(e) => setCounterExample(e.target.value)}
                      placeholder="Provide proof that inference is incorrect..."
                      rows="4"
                    />
                  </div>
                  <div className="form-group">
                    <label>Stake Amount (ETH)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder="Enter stake amount"
                    />
                  </div>
                  <button 
                    onClick={handleDisputeInference} 
                    disabled={loading}
                    className="action-btn danger"
                  >
                    {loading ? 'Processing...' : 'Submit Dispute'}
                  </button>
                </div>
              )}

              {activeTab === 'view' && (
                <div className="form-section">
                  <h3>🔍 View Request Details</h3>
                  <div className="form-group">
                    <label>Request ID</label>
                    <input
                      type="number"
                      value={requestId}
                      onChange={(e) => setRequestId(e.target.value)}
                      placeholder="Enter request ID"
                    />
                  </div>
                  <button 
                    onClick={handleViewRequest} 
                    disabled={loading}
                    className="action-btn"
                  >
                    {loading ? 'Loading...' : 'Load Details'}
                  </button>

                  {requestDetails && (
                    <div className="request-details">
                      <h4>Request Details</h4>
                      <div className="details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Requester:</span>
                          <span className="detail-value">{requestDetails.requester}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Prover:</span>
                          <span className="detail-value">{requestDetails.prover || 'None'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Challenger:</span>
                          <span className="detail-value">{requestDetails.challenger || 'None'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Status:</span>
                          <span className="detail-value status">{getStatusName(requestDetails.status)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Requester Stake:</span>
                          <span className="detail-value">{ethers.formatEther(requestDetails.requesterStake)} ETH</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Prover Stake:</span>
                          <span className="detail-value">{ethers.formatEther(requestDetails.proverStake)} ETH</span>
                        </div>
                        {requestDetails.disputeDeadline > 0 && (
                          <div className="detail-item">
                            <span className="detail-label">Dispute Deadline:</span>
                            <span className="detail-value">
                              {new Date(Number(requestDetails.disputeDeadline) * 1000).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>Built with ❤️ for the decentralized AI future</p>
          <p>
            <a href="https://github.com/IamTamheedNazir/optimistic-ai-oracle" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            {' | '}
            <a href="https://docs.optimistic-ai-oracle.io" target="_blank" rel="noopener noreferrer">
              Documentation
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
