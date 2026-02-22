import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Import new components
import RequestHistory from './components/RequestHistory';
import LoadingSpinner, { InlineSpinner } from './components/LoadingSpinner';
import TransactionStatus from './components/TransactionStatus';
import { handleError, withRetry, validateTransaction } from './utils/errorHandler';
import { SUCCESS_MESSAGES, INFO_MESSAGES } from './utils/errorMessages';

// Contract ABI
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
  const [txHash, setTxHash] = useState(null);
  const [showTxStatus, setShowTxStatus] = useState(false);
  
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

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
      } catch (error) {
        handleError(error, 'Initialize Web3');
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
      toast.info(INFO_MESSAGES.CONNECTING_WALLET);

      const accounts = await provider.send("eth_requestAccounts", []);
      const userAccount = accounts[0];
      setAccount(userAccount);

      const web3Signer = await provider.getSigner();
      setSigner(web3Signer);

      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));

      const userBalance = await provider.getBalance(userAccount);
      setBalance(ethers.formatEther(userBalance));

      if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "0x...") {
        const oracleContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, web3Signer);
        setContract(oracleContract);
      }

      toast.success(SUCCESS_MESSAGES.WALLET_CONNECTED);
    } catch (error) {
      handleError(error, 'Connect Wallet');
    } finally {
      setLoading(false);
    }
  };

  const loadContractData = async () => {
    try {
      const [min, minProv, window, reqId, isProv, stake] = await Promise.all([
        contract.minStake(),
        contract.minProverStake(),
        contract.disputeWindow(),
        contract.getCurrentRequestId(),
        contract.isRegisteredProver(account),
        contract.getProverStake(account)
      ]);

      setMinStake(ethers.formatEther(min));
      setMinProverStake(ethers.formatEther(minProv));
      setDisputeWindow(window.toString());
      setCurrentRequestId(reqId.toString());
      setIsProver(isProv);
      setProverStake(ethers.formatEther(stake));
    } catch (error) {
      handleError(error, 'Load Contract Data');
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

  // Request Inference
  const handleRequestInference = async (e) => {
    e.preventDefault();
    
    const validation = await validateTransaction({
      signer,
      contract,
      stake: parseFloat(stakeAmount),
      minStake: parseFloat(minStake),
      balance: parseFloat(balance),
    });

    if (!validation.isValid) {
      validation.errors.forEach(err => toast.error(err));
      return;
    }

    try {
      setLoading(true);
      toast.info(INFO_MESSAGES.PROCESSING_TRANSACTION);

      const modelHash = ethers.id(modelName);
      const inputBytes = ethers.toUtf8Bytes(inputData);
      const stake = ethers.parseEther(stakeAmount);

      const tx = await withRetry(
        () => contract.requestInference(modelHash, inputBytes, { value: stake }),
        3
      );

      setTxHash(tx.hash);
      setShowTxStatus(true);
      toast.info(SUCCESS_MESSAGES.TRANSACTION_SUBMITTED);

      const receipt = await tx.wait();
      
      toast.success(SUCCESS_MESSAGES.INFERENCE_REQUESTED);
      
      // Reset form
      setModelName('');
      setInputData('');
      setStakeAmount('');
      
      // Reload data
      await loadContractData();
      
      setShowTxStatus(false);
    } catch (error) {
      handleError(error, 'Request Inference');
      setShowTxStatus(false);
    } finally {
      setLoading(false);
    }
  };

  // Register as Prover
  const handleRegisterProver = async () => {
    const validation = await validateTransaction({
      signer,
      contract,
      stake: parseFloat(minProverStake),
      balance: parseFloat(balance),
    });

    if (!validation.isValid) {
      validation.errors.forEach(err => toast.error(err));
      return;
    }

    try {
      setLoading(true);
      toast.info(INFO_MESSAGES.PROCESSING_TRANSACTION);

      const stake = ethers.parseEther(minProverStake);
      const tx = await withRetry(
        () => contract.registerProver({ value: stake }),
        3
      );

      setTxHash(tx.hash);
      setShowTxStatus(true);
      toast.info(SUCCESS_MESSAGES.TRANSACTION_SUBMITTED);

      await tx.wait();
      
      toast.success(SUCCESS_MESSAGES.PROVER_REGISTERED);
      await loadContractData();
      
      setShowTxStatus(false);
    } catch (error) {
      handleError(error, 'Register Prover');
      setShowTxStatus(false);
    } finally {
      setLoading(false);
    }
  };

  // Post Inference
  const handlePostInference = async (e) => {
    e.preventDefault();

    if (!requestId || !outputData) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      toast.info(INFO_MESSAGES.PROCESSING_TRANSACTION);

      const outputBytes = ethers.toUtf8Bytes(outputData);
      const tx = await withRetry(
        () => contract.postInference(requestId, outputBytes),
        3
      );

      setTxHash(tx.hash);
      setShowTxStatus(true);
      toast.info(SUCCESS_MESSAGES.TRANSACTION_SUBMITTED);

      await tx.wait();
      
      toast.success(SUCCESS_MESSAGES.INFERENCE_POSTED);
      
      setRequestId('');
      setOutputData('');
      
      setShowTxStatus(false);
    } catch (error) {
      handleError(error, 'Post Inference');
      setShowTxStatus(false);
    } finally {
      setLoading(false);
    }
  };

  // Dispute Inference
  const handleDisputeInference = async (e) => {
    e.preventDefault();

    if (!requestId || !counterExample) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      // Get request details to calculate required stake
      const request = await contract.getRequest(requestId);
      const requiredStake = request.requesterStake + request.proverStake;

      const validation = await validateTransaction({
        signer,
        contract,
        stake: parseFloat(ethers.formatEther(requiredStake)),
        balance: parseFloat(balance),
      });

      if (!validation.isValid) {
        validation.errors.forEach(err => toast.error(err));
        setLoading(false);
        return;
      }

      toast.info(INFO_MESSAGES.PROCESSING_TRANSACTION);

      const counterBytes = ethers.toUtf8Bytes(counterExample);
      const tx = await withRetry(
        () => contract.disputeInference(requestId, counterBytes, { value: requiredStake }),
        3
      );

      setTxHash(tx.hash);
      setShowTxStatus(true);
      toast.info(SUCCESS_MESSAGES.TRANSACTION_SUBMITTED);

      await tx.wait();
      
      toast.success(SUCCESS_MESSAGES.DISPUTE_SUBMITTED);
      
      setRequestId('');
      setCounterExample('');
      
      setShowTxStatus(false);
    } catch (error) {
      handleError(error, 'Dispute Inference');
      setShowTxStatus(false);
    } finally {
      setLoading(false);
    }
  };

  // Finalize Inference
  const handleFinalizeInference = async () => {
    if (!requestId) {
      toast.error('Please enter a request ID');
      return;
    }

    try {
      setLoading(true);
      toast.info(INFO_MESSAGES.PROCESSING_TRANSACTION);

      const tx = await withRetry(
        () => contract.finalizeInference(requestId),
        3
      );

      setTxHash(tx.hash);
      setShowTxStatus(true);
      toast.info(SUCCESS_MESSAGES.TRANSACTION_SUBMITTED);

      await tx.wait();
      
      toast.success(SUCCESS_MESSAGES.INFERENCE_FINALIZED);
      
      setRequestId('');
      
      setShowTxStatus(false);
    } catch (error) {
      handleError(error, 'Finalize Inference');
      setShowTxStatus(false);
    } finally {
      setLoading(false);
    }
  };

  // View Request Details
  const handleViewRequest = async () => {
    if (!requestId) {
      toast.error('Please enter a request ID');
      return;
    }

    try {
      setLoading(true);
      const request = await contract.getRequest(requestId);
      setRequestDetails(request);
      toast.success('Request details loaded');
    } catch (error) {
      handleError(error, 'View Request');
    } finally {
      setLoading(false);
    }
  };

  // Increase Prover Stake
  const handleIncreaseStake = async () => {
    if (!stakeAmount) {
      toast.error('Please enter stake amount');
      return;
    }

    try {
      setLoading(true);
      toast.info(INFO_MESSAGES.PROCESSING_TRANSACTION);

      const stake = ethers.parseEther(stakeAmount);
      const tx = await withRetry(
        () => contract.increaseProverStake({ value: stake }),
        3
      );

      setTxHash(tx.hash);
      setShowTxStatus(true);
      toast.info(SUCCESS_MESSAGES.TRANSACTION_SUBMITTED);

      await tx.wait();
      
      toast.success(SUCCESS_MESSAGES.STAKE_INCREASED);
      
      setStakeAmount('');
      await loadContractData();
      
      setShowTxStatus(false);
    } catch (error) {
      handleError(error, 'Increase Stake');
      setShowTxStatus(false);
    } finally {
      setLoading(false);
    }
  };

  // Unregister Prover
  const handleUnregisterProver = async () => {
    try {
      setLoading(true);
      toast.info(INFO_MESSAGES.PROCESSING_TRANSACTION);

      const tx = await withRetry(
        () => contract.unregisterProver(),
        3
      );

      setTxHash(tx.hash);
      setShowTxStatus(true);
      toast.info(SUCCESS_MESSAGES.TRANSACTION_SUBMITTED);

      await tx.wait();
      
      toast.success(SUCCESS_MESSAGES.PROVER_UNREGISTERED);
      await loadContractData();
      
      setShowTxStatus(false);
    } catch (error) {
      handleError(error, 'Unregister Prover');
      setShowTxStatus(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <ToastContainer position="top-right" autoClose={5000} />

      {/* Header */}
      <header className="header">
        <div className="container">
          <h1>🔮 Optimistic AI Oracle</h1>
          <p className="subtitle">Decentralized AI Inference with Optimistic Verification</p>
          
          {!account ? (
            <button onClick={connectWallet} className="connect-btn" disabled={loading}>
              {loading ? <><InlineSpinner /> Connecting...</> : '🔌 Connect Wallet'}
            </button>
          ) : (
            <div className="wallet-info">
              <div className="info-item">
                <span className="label">Account</span>
                <span className="value">{account.substring(0, 6)}...{account.substring(38)}</span>
              </div>
              <div className="info-item">
                <span className="label">Balance</span>
                <span className="value">{parseFloat(balance).toFixed(4)} ETH</span>
              </div>
              <div className="info-item">
                <span className="label">Network</span>
                <span className="value">Chain ID: {chainId}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          {!account ? (
            <div className="info-text">
              👆 Please connect your wallet to continue
            </div>
          ) : !contract ? (
            <div className="warning-text">
              ⚠️ Contract not configured. Please set REACT_APP_CONTRACT_ADDRESS in .env
            </div>
          ) : (
            <>
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
                    <span className="info-value">{(parseInt(disputeWindow) / 3600).toFixed(0)} hours</span>
                  </div>
                  <div className="info-card">
                    <span className="info-label">Total Requests</span>
                    <span className="info-value">{currentRequestId}</span>
                  </div>
                  <div className="info-card">
                    <span className="info-label">Prover Status</span>
                    <span className="info-value">{isProver ? '✅ Registered' : '❌ Not Registered'}</span>
                  </div>
                  {isProver && (
                    <div className="info-card">
                      <span className="info-label">Your Prover Stake</span>
                      <span className="info-value">{proverStake} ETH</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Status */}
              {showTxStatus && txHash && (
                <TransactionStatus
                  txHash={txHash}
                  provider={provider}
                  onSuccess={() => {
                    setShowTxStatus(false);
                    loadContractData();
                  }}
                  onError={() => setShowTxStatus(false)}
                />
              )}

              {/* Tabs */}
              <div className="tabs">
                <button 
                  className={activeTab === 'request' ? 'tab active' : 'tab'}
                  onClick={() => setActiveTab('request')}
                >
                  📝 Request Inference
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
                <button 
                  className={activeTab === 'history' ? 'tab active' : 'tab'}
                  onClick={() => setActiveTab('history')}
                >
                  📜 History
                </button>
              </div>

              {/* Tab Content */}
              <div className="tab-content">
                {/* Request Inference Tab */}
                {activeTab === 'request' && (
                  <div className="form-section">
                    <h3>Request AI Inference</h3>
                    <form onSubmit={handleRequestInference}>
                      <div className="form-group">
                        <label>Model Name</label>
                        <input
                          type="text"
                          value={modelName}
                          onChange={(e) => setModelName(e.target.value)}
                          placeholder="e.g., gpt-4, llama-2"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Input Data</label>
                        <textarea
                          value={inputData}
                          onChange={(e) => setInputData(e.target.value)}
                          placeholder="Enter your input data..."
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Stake Amount (ETH) - Min: {minStake}</label>
                        <input
                          type="number"
                          step="0.001"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          placeholder={`Minimum ${minStake} ETH`}
                          required
                        />
                      </div>
                      <button type="submit" className="action-btn" disabled={loading}>
                        {loading ? <><InlineSpinner /> Processing...</> : '📤 Submit Request'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Prover Actions Tab */}
                {activeTab === 'prover' && (
                  <div className="form-section">
                    <h3>Prover Actions</h3>
                    
                    {!isProver ? (
                      <>
                        <div className="info-text">
                          Register as a prover to post inference results and earn rewards.
                          Required stake: {minProverStake} ETH
                        </div>
                        <button onClick={handleRegisterProver} className="action-btn" disabled={loading}>
                          {loading ? <><InlineSpinner /> Processing...</> : '✅ Register as Prover'}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="success-text">
                          ✅ You are registered as a prover with {proverStake} ETH staked
                        </div>

                        <div className="divider"></div>

                        <h4>Post Inference</h4>
                        <form onSubmit={handlePostInference}>
                          <div className="form-group">
                            <label>Request ID</label>
                            <input
                              type="number"
                              value={requestId}
                              onChange={(e) => setRequestId(e.target.value)}
                              placeholder="Enter request ID"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Output Data</label>
                            <textarea
                              value={outputData}
                              onChange={(e) => setOutputData(e.target.value)}
                              placeholder="Enter inference output..."
                              required
                            />
                          </div>
                          <button type="submit" className="action-btn" disabled={loading}>
                            {loading ? <><InlineSpinner /> Processing...</> : '📝 Post Inference'}
                          </button>
                        </form>

                        <div className="divider"></div>

                        <h4>Finalize Inference</h4>
                        <div className="form-group">
                          <label>Request ID</label>
                          <input
                            type="number"
                            value={requestId}
                            onChange={(e) => setRequestId(e.target.value)}
                            placeholder="Enter request ID"
                          />
                        </div>
                        <button onClick={handleFinalizeInference} className="action-btn secondary" disabled={loading}>
                          {loading ? <><InlineSpinner /> Processing...</> : '✅ Finalize Inference'}
                        </button>

                        <div className="divider"></div>

                        <h4>Manage Stake</h4>
                        <div className="form-group">
                          <label>Additional Stake (ETH)</label>
                          <input
                            type="number"
                            step="0.001"
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                            placeholder="Amount to add"
                          />
                        </div>
                        <button onClick={handleIncreaseStake} className="action-btn secondary" disabled={loading}>
                          {loading ? <><InlineSpinner /> Processing...</> : '➕ Increase Stake'}
                        </button>

                        <div className="divider"></div>

                        <button onClick={handleUnregisterProver} className="action-btn danger" disabled={loading}>
                          {loading ? <><InlineSpinner /> Processing...</> : '❌ Unregister Prover'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Dispute Tab */}
                {activeTab === 'dispute' && (
                  <div className="form-section">
                    <h3>Dispute Inference</h3>
                    <div className="warning-text">
                      ⚠️ Disputing requires staking the combined amount of requester and prover stakes.
                      You will lose your stake if the dispute is invalid.
                    </div>
                    <form onSubmit={handleDisputeInference}>
                      <div className="form-group">
                        <label>Request ID</label>
                        <input
                          type="number"
                          value={requestId}
                          onChange={(e) => setRequestId(e.target.value)}
                          placeholder="Enter request ID"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Counter Example / Proof</label>
                        <textarea
                          value={counterExample}
                          onChange={(e) => setCounterExample(e.target.value)}
                          placeholder="Provide evidence that the inference is incorrect..."
                          required
                        />
                      </div>
                      <button type="submit" className="action-btn danger" disabled={loading}>
                        {loading ? <><InlineSpinner /> Processing...</> : '⚔️ Submit Dispute'}
                      </button>
                    </form>
                  </div>
                )}

                {/* View Request Tab */}
                {activeTab === 'view' && (
                  <div className="form-section">
                    <h3>View Request Details</h3>
                    <div className="form-group">
                      <label>Request ID</label>
                      <input
                        type="number"
                        value={requestId}
                        onChange={(e) => setRequestId(e.target.value)}
                        placeholder="Enter request ID"
                      />
                    </div>
                    <button onClick={handleViewRequest} className="action-btn" disabled={loading}>
                      {loading ? <><InlineSpinner /> Loading...</> : '🔍 View Details'}
                    </button>

                    {requestDetails && (
                      <div className="request-details">
                        <h4>Request Details</h4>
                        <div className="details-grid">
                          <div className="detail-item">
                            <span className="detail-label">Requester</span>
                            <span className="detail-value">{requestDetails.requester}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Prover</span>
                            <span className="detail-value">{requestDetails.prover}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Challenger</span>
                            <span className="detail-value">{requestDetails.challenger}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Requester Stake</span>
                            <span className="detail-value">{ethers.formatEther(requestDetails.requesterStake)} ETH</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Prover Stake</span>
                            <span className="detail-value">{ethers.formatEther(requestDetails.proverStake)} ETH</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Status</span>
                            <span className="detail-value status">
                              {['Pending', 'Posted', 'Disputed', 'Finalized', 'Settled'][requestDetails.status]}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                  <RequestHistory contract={contract} account={account} />
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>🔮 Optimistic AI Oracle - Decentralized AI Inference Platform</p>
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
