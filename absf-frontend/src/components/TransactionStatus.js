import React, { useState, useEffect } from 'react';
import { InlineSpinner } from './LoadingSpinner';
import './TransactionStatus.css';

/**
 * Transaction Status Tracker
 * Shows real-time status of blockchain transactions
 */
const TransactionStatus = ({ 
  txHash, 
  provider, 
  onSuccess, 
  onError,
  confirmations = 1 
}) => {
  const [status, setStatus] = useState('pending'); // pending, confirming, success, error
  const [currentConfirmations, setCurrentConfirmations] = useState(0);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    if (!txHash || !provider) return;

    let isMounted = true;

    const trackTransaction = async () => {
      try {
        setStatus('pending');
        
        // Wait for transaction receipt
        const txReceipt = await provider.waitForTransaction(txHash, confirmations);
        
        if (!isMounted) return;

        if (txReceipt.status === 1) {
          setStatus('success');
          setReceipt(txReceipt);
          setCurrentConfirmations(confirmations);
          if (onSuccess) onSuccess(txReceipt);
        } else {
          setStatus('error');
          setError('Transaction failed');
          if (onError) onError(new Error('Transaction failed'));
        }
      } catch (err) {
        if (!isMounted) return;
        setStatus('error');
        setError(err.message);
        if (onError) onError(err);
      }
    };

    trackTransaction();

    return () => {
      isMounted = false;
    };
  }, [txHash, provider, confirmations, onSuccess, onError]);

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'confirming':
        return '🔄';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'pending':
        return 'Transaction submitted, waiting for confirmation...';
      case 'confirming':
        return `Confirming... (${currentConfirmations}/${confirmations})`;
      case 'success':
        return 'Transaction confirmed successfully!';
      case 'error':
        return error || 'Transaction failed';
      default:
        return 'Processing transaction...';
    }
  };

  const getEtherscanLink = () => {
    // Detect network from provider (simplified)
    const baseUrl = 'https://sepolia.etherscan.io';
    return `${baseUrl}/tx/${txHash}`;
  };

  return (
    <div className={`transaction-status tx-status-${status}`}>
      <div className="tx-status-icon">
        {status === 'pending' || status === 'confirming' ? (
          <InlineSpinner size="medium" />
        ) : (
          <span>{getStatusIcon()}</span>
        )}
      </div>

      <div className="tx-status-content">
        <div className="tx-status-title">
          {status === 'pending' && 'Processing Transaction'}
          {status === 'confirming' && 'Confirming Transaction'}
          {status === 'success' && 'Transaction Successful'}
          {status === 'error' && 'Transaction Failed'}
        </div>
        <div className="tx-status-message">{getStatusMessage()}</div>
        
        {txHash && (
          <div className="tx-hash">
            <span className="tx-hash-label">Transaction Hash:</span>
            <a 
              href={getEtherscanLink()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="tx-hash-link"
            >
              {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
            </a>
          </div>
        )}

        {receipt && (
          <div className="tx-details">
            <div className="tx-detail-item">
              <span className="label">Block:</span>
              <span className="value">{receipt.blockNumber}</span>
            </div>
            <div className="tx-detail-item">
              <span className="label">Gas Used:</span>
              <span className="value">{receipt.gasUsed.toString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Simple Transaction Toast
 * Lightweight notification for transaction status
 */
export const TransactionToast = ({ status, message, txHash }) => {
  const getIcon = () => {
    switch (status) {
      case 'pending': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`tx-toast tx-toast-${status}`}>
      <span className="tx-toast-icon">{getIcon()}</span>
      <div className="tx-toast-content">
        <div className="tx-toast-message">{message}</div>
        {txHash && (
          <div className="tx-toast-hash">
            {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Transaction Progress Steps
 * Shows multi-step transaction progress
 */
export const TransactionSteps = ({ steps, currentStep }) => {
  return (
    <div className="tx-steps">
      {steps.map((step, index) => (
        <div 
          key={index} 
          className={`tx-step ${index < currentStep ? 'completed' : ''} ${index === currentStep ? 'active' : ''}`}
        >
          <div className="tx-step-number">
            {index < currentStep ? '✓' : index + 1}
          </div>
          <div className="tx-step-content">
            <div className="tx-step-title">{step.title}</div>
            <div className="tx-step-description">{step.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionStatus;
