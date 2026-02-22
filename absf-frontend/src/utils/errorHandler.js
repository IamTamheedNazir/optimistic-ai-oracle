/**
 * Comprehensive Error Handling Utility
 * Handles blockchain errors, network errors, and user errors
 */

import { toast } from 'react-toastify';
import { ERROR_MESSAGES, ERROR_CODES } from './errorMessages';

/**
 * Main error handler
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred
 * @returns {Object} Parsed error information
 */
export const handleError = (error, context = 'Unknown') => {
  console.error(`[${context}]`, error);

  const errorInfo = parseError(error);
  
  // Show toast notification
  toast.error(errorInfo.userMessage, {
    position: 'top-right',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });

  // Log to analytics (if configured)
  logErrorToAnalytics(errorInfo, context);

  return errorInfo;
};

/**
 * Parse error and extract useful information
 * @param {Error} error - The error object
 * @returns {Object} Parsed error details
 */
export const parseError = (error) => {
  // Default error info
  let errorInfo = {
    code: ERROR_CODES.UNKNOWN,
    message: error.message || 'Unknown error',
    userMessage: ERROR_MESSAGES.UNKNOWN,
    isUserError: false,
    isNetworkError: false,
    isContractError: false,
    canRetry: false,
    details: null,
  };

  // MetaMask/Wallet errors
  if (error.code === 4001 || error.message?.includes('User rejected')) {
    errorInfo = {
      ...errorInfo,
      code: ERROR_CODES.USER_REJECTED,
      userMessage: ERROR_MESSAGES.USER_REJECTED,
      isUserError: true,
      canRetry: true,
    };
  }
  
  // Insufficient funds
  else if (error.message?.includes('insufficient funds')) {
    errorInfo = {
      ...errorInfo,
      code: ERROR_CODES.INSUFFICIENT_FUNDS,
      userMessage: ERROR_MESSAGES.INSUFFICIENT_FUNDS,
      isUserError: true,
      canRetry: false,
    };
  }
  
  // Network errors
  else if (error.message?.includes('network') || error.code === 'NETWORK_ERROR') {
    errorInfo = {
      ...errorInfo,
      code: ERROR_CODES.NETWORK_ERROR,
      userMessage: ERROR_MESSAGES.NETWORK_ERROR,
      isNetworkError: true,
      canRetry: true,
    };
  }
  
  // Contract revert errors
  else if (error.message?.includes('revert')) {
    const revertReason = extractRevertReason(error.message);
    errorInfo = {
      ...errorInfo,
      code: ERROR_CODES.CONTRACT_REVERT,
      userMessage: getContractErrorMessage(revertReason),
      isContractError: true,
      canRetry: false,
      details: revertReason,
    };
  }
  
  // Gas estimation errors
  else if (error.message?.includes('gas')) {
    errorInfo = {
      ...errorInfo,
      code: ERROR_CODES.GAS_ERROR,
      userMessage: ERROR_MESSAGES.GAS_ERROR,
      isContractError: true,
      canRetry: true,
    };
  }
  
  // Nonce errors
  else if (error.message?.includes('nonce')) {
    errorInfo = {
      ...errorInfo,
      code: ERROR_CODES.NONCE_ERROR,
      userMessage: ERROR_MESSAGES.NONCE_ERROR,
      isNetworkError: true,
      canRetry: true,
    };
  }
  
  // Timeout errors
  else if (error.message?.includes('timeout')) {
    errorInfo = {
      ...errorInfo,
      code: ERROR_CODES.TIMEOUT,
      userMessage: ERROR_MESSAGES.TIMEOUT,
      isNetworkError: true,
      canRetry: true,
    };
  }

  return errorInfo;
};

/**
 * Extract revert reason from error message
 * @param {string} message - Error message
 * @returns {string} Revert reason
 */
const extractRevertReason = (message) => {
  // Try to extract custom error
  const customErrorMatch = message.match(/reverted with custom error '([^']+)'/);
  if (customErrorMatch) {
    return customErrorMatch[1];
  }

  // Try to extract reason string
  const reasonMatch = message.match(/reverted with reason string '([^']+)'/);
  if (reasonMatch) {
    return reasonMatch[1];
  }

  // Try to extract panic code
  const panicMatch = message.match(/reverted with panic code (0x[0-9a-fA-F]+)/);
  if (panicMatch) {
    return `Panic: ${panicMatch[1]}`;
  }

  return 'Unknown revert reason';
};

/**
 * Get user-friendly message for contract errors
 * @param {string} revertReason - The revert reason
 * @returns {string} User-friendly message
 */
const getContractErrorMessage = (revertReason) => {
  const errorMap = {
    'InsufficientStake': 'Insufficient stake amount. Please increase your stake.',
    'NotRegisteredProver': 'You must register as a prover first.',
    'AlreadyRegisteredProver': 'You are already registered as a prover.',
    'RequestNotFound': 'Request not found. Please check the request ID.',
    'RequestAlreadyPosted': 'Inference already posted for this request.',
    'NotProver': 'Only the assigned prover can post inference.',
    'DisputeWindowExpired': 'Dispute window has expired.',
    'DisputeWindowNotExpired': 'Cannot finalize yet. Dispute window still active.',
    'RequestNotPosted': 'Inference not posted yet.',
    'RequestAlreadyDisputed': 'Request already disputed.',
    'InsufficientDisputeStake': 'Insufficient stake for dispute.',
    'RequestNotFinalized': 'Request not finalized yet.',
    'Unauthorized': 'You are not authorized to perform this action.',
    'Paused': 'Contract is currently paused.',
  };

  return errorMap[revertReason] || `Contract error: ${revertReason}`;
};

/**
 * Log error to analytics service
 * @param {Object} errorInfo - Parsed error information
 * @param {string} context - Error context
 */
const logErrorToAnalytics = (errorInfo, context) => {
  // Only log in production
  if (process.env.NODE_ENV !== 'production') return;

  try {
    // Send to analytics service (e.g., Sentry, LogRocket)
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: errorInfo.message,
        fatal: false,
        context: context,
        error_code: errorInfo.code,
      });
    }
  } catch (err) {
    console.error('Failed to log error to analytics:', err);
  }
};

/**
 * Handle async errors with automatic retry
 * @param {Function} fn - Async function to execute
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} delay - Delay between retries (ms)
 * @returns {Promise} Result of function execution
 */
export const withRetry = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorInfo = parseError(error);
      
      // Don't retry if it's a user error or non-retryable error
      if (!errorInfo.canRetry) {
        throw error;
      }
      
      // Wait before retrying
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        toast.info(`Retrying... (${i + 1}/${maxRetries})`, { autoClose: 2000 });
      }
    }
  }
  
  throw lastError;
};

/**
 * Validate transaction before sending
 * @param {Object} params - Transaction parameters
 * @returns {Object} Validation result
 */
export const validateTransaction = async (params) => {
  const errors = [];

  // Check if wallet is connected
  if (!params.signer) {
    errors.push('Wallet not connected');
  }

  // Check if contract is loaded
  if (!params.contract) {
    errors.push('Contract not loaded');
  }

  // Check stake amount
  if (params.stake && params.stake <= 0) {
    errors.push('Stake amount must be greater than 0');
  }

  // Check minimum stake
  if (params.stake && params.minStake && params.stake < params.minStake) {
    errors.push(`Stake must be at least ${params.minStake} ETH`);
  }

  // Check balance
  if (params.balance && params.stake && params.stake > params.balance) {
    errors.push('Insufficient balance');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Format error for display
 * @param {Error} error - The error object
 * @returns {string} Formatted error message
 */
export const formatError = (error) => {
  const errorInfo = parseError(error);
  return errorInfo.userMessage;
};

/**
 * Check if error is retryable
 * @param {Error} error - The error object
 * @returns {boolean} Whether error can be retried
 */
export const isRetryableError = (error) => {
  const errorInfo = parseError(error);
  return errorInfo.canRetry;
};

/**
 * Get error recovery suggestions
 * @param {Error} error - The error object
 * @returns {Array} Array of recovery suggestions
 */
export const getRecoverySuggestions = (error) => {
  const errorInfo = parseError(error);
  const suggestions = [];

  if (errorInfo.code === ERROR_CODES.INSUFFICIENT_FUNDS) {
    suggestions.push('Add more ETH to your wallet');
    suggestions.push('Reduce the stake amount');
  } else if (errorInfo.code === ERROR_CODES.NETWORK_ERROR) {
    suggestions.push('Check your internet connection');
    suggestions.push('Try switching to a different RPC endpoint');
    suggestions.push('Refresh the page and try again');
  } else if (errorInfo.code === ERROR_CODES.GAS_ERROR) {
    suggestions.push('Increase gas limit');
    suggestions.push('Wait for network congestion to decrease');
    suggestions.push('Try again with higher gas price');
  } else if (errorInfo.code === ERROR_CODES.USER_REJECTED) {
    suggestions.push('Approve the transaction in your wallet');
  } else if (errorInfo.isContractError) {
    suggestions.push('Check contract requirements');
    suggestions.push('Verify your inputs');
    suggestions.push('Contact support if issue persists');
  }

  return suggestions;
};

export default {
  handleError,
  parseError,
  withRetry,
  validateTransaction,
  formatError,
  isRetryableError,
  getRecoverySuggestions,
};
