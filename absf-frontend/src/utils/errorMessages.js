/**
 * Error Codes and User-Friendly Messages
 */

export const ERROR_CODES = {
  // User errors
  USER_REJECTED: 'USER_REJECTED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  NONCE_ERROR: 'NONCE_ERROR',
  
  // Contract errors
  CONTRACT_REVERT: 'CONTRACT_REVERT',
  GAS_ERROR: 'GAS_ERROR',
  
  // Application errors
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  WRONG_NETWORK: 'WRONG_NETWORK',
  CONTRACT_NOT_LOADED: 'CONTRACT_NOT_LOADED',
  
  // Unknown
  UNKNOWN: 'UNKNOWN',
};

export const ERROR_MESSAGES = {
  // User errors
  USER_REJECTED: '❌ Transaction rejected. Please approve the transaction in your wallet to continue.',
  INSUFFICIENT_FUNDS: '💰 Insufficient funds. You don\'t have enough ETH to complete this transaction.',
  INVALID_INPUT: '⚠️ Invalid input. Please check your inputs and try again.',
  
  // Network errors
  NETWORK_ERROR: '🌐 Network error. Please check your internet connection and try again.',
  TIMEOUT: '⏱️ Request timed out. The network might be congested. Please try again.',
  NONCE_ERROR: '🔄 Transaction nonce error. Please refresh the page and try again.',
  
  // Contract errors
  CONTRACT_REVERT: '⛔ Transaction failed. The contract rejected your transaction.',
  GAS_ERROR: '⛽ Gas estimation failed. The transaction might fail or require more gas.',
  
  // Application errors
  WALLET_NOT_CONNECTED: '🔌 Wallet not connected. Please connect your wallet first.',
  WRONG_NETWORK: '🌐 Wrong network. Please switch to the correct network.',
  CONTRACT_NOT_LOADED: '📄 Contract not loaded. Please refresh the page.',
  
  // Unknown
  UNKNOWN: '❓ An unexpected error occurred. Please try again or contact support.',
};

export const SUCCESS_MESSAGES = {
  WALLET_CONNECTED: '✅ Wallet connected successfully!',
  TRANSACTION_SUBMITTED: '📤 Transaction submitted! Waiting for confirmation...',
  TRANSACTION_CONFIRMED: '✅ Transaction confirmed successfully!',
  PROVER_REGISTERED: '✅ Successfully registered as a prover!',
  INFERENCE_REQUESTED: '✅ Inference request submitted successfully!',
  INFERENCE_POSTED: '✅ Inference posted successfully!',
  DISPUTE_SUBMITTED: '✅ Dispute submitted successfully!',
  INFERENCE_FINALIZED: '✅ Inference finalized successfully!',
  STAKE_INCREASED: '✅ Stake increased successfully!',
  PROVER_UNREGISTERED: '✅ Successfully unregistered as prover!',
};

export const INFO_MESSAGES = {
  CONNECTING_WALLET: '🔄 Connecting to wallet...',
  LOADING_CONTRACT: '📄 Loading contract...',
  PROCESSING_TRANSACTION: '⏳ Processing transaction...',
  WAITING_CONFIRMATION: '⏳ Waiting for confirmation...',
  CHECKING_NETWORK: '🌐 Checking network...',
};

export const WARNING_MESSAGES = {
  HIGH_GAS: '⚠️ Gas price is high. You might want to wait for lower gas prices.',
  DISPUTE_WINDOW_EXPIRING: '⏰ Dispute window expiring soon!',
  INSUFFICIENT_STAKE: '⚠️ Stake amount is below recommended minimum.',
  UNVERIFIED_CONTRACT: '⚠️ Contract is not verified. Proceed with caution.',
};

// Contract-specific error messages
export const CONTRACT_ERROR_MESSAGES = {
  InsufficientStake: '💰 Insufficient stake amount. Please increase your stake to meet the minimum requirement.',
  NotRegisteredProver: '👨‍💻 You must register as a prover before posting inferences.',
  AlreadyRegisteredProver: '✅ You are already registered as a prover.',
  RequestNotFound: '🔍 Request not found. Please verify the request ID.',
  RequestAlreadyPosted: '📝 Inference has already been posted for this request.',
  NotProver: '⛔ Only the assigned prover can post inference for this request.',
  DisputeWindowExpired: '⏰ Dispute window has expired. Cannot dispute this inference.',
  DisputeWindowNotExpired: '⏳ Cannot finalize yet. Dispute window is still active.',
  RequestNotPosted: '📭 Inference has not been posted yet for this request.',
  RequestAlreadyDisputed: '⚔️ This request has already been disputed.',
  InsufficientDisputeStake: '💰 Insufficient stake for dispute. You need to stake the combined amount of requester and prover stakes.',
  RequestNotFinalized: '⏳ Request has not been finalized yet.',
  Unauthorized: '🔒 You are not authorized to perform this action.',
  Paused: '⏸️ Contract is currently paused. Please try again later.',
  ZeroAddress: '⚠️ Invalid address. Address cannot be zero.',
  ZeroAmount: '⚠️ Amount cannot be zero.',
  InvalidModelHash: '⚠️ Invalid model hash provided.',
  InvalidInputData: '⚠️ Invalid input data provided.',
  InvalidOutputData: '⚠️ Invalid output data provided.',
  NoStakeToWithdraw: '💰 No stake available to withdraw.',
  TransferFailed: '❌ Transfer failed. Please try again.',
};

// Network-specific messages
export const NETWORK_MESSAGES = {
  1: 'Ethereum Mainnet',
  5: 'Goerli Testnet',
  11155111: 'Sepolia Testnet',
  137: 'Polygon Mainnet',
  80001: 'Mumbai Testnet',
  42161: 'Arbitrum One',
  421613: 'Arbitrum Goerli',
  10: 'Optimism',
  420: 'Optimism Goerli',
  31337: 'Localhost',
};

export const getNetworkName = (chainId) => {
  return NETWORK_MESSAGES[chainId] || `Unknown Network (${chainId})`;
};

export const isTestnet = (chainId) => {
  return [5, 11155111, 80001, 421613, 420, 31337].includes(chainId);
};

export const isSupportedNetwork = (chainId) => {
  return Object.keys(NETWORK_MESSAGES).map(Number).includes(chainId);
};

export default {
  ERROR_CODES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  INFO_MESSAGES,
  WARNING_MESSAGES,
  CONTRACT_ERROR_MESSAGES,
  NETWORK_MESSAGES,
  getNetworkName,
  isTestnet,
  isSupportedNetwork,
};
