import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { InlineSpinner } from './LoadingSpinner';
import { handleError } from '../utils/errorHandler';
import './ProverDashboard.css';

/**
 * ProverDashboard Component
 * Comprehensive dashboard for provers to manage their operations
 * 
 * Features:
 * - Real-time statistics
 * - Pending requests queue
 * - Active inferences
 * - Earnings tracker
 * - Performance metrics
 * - Quick actions
 */
const ProverDashboard = ({ contract, account, isProver, proverStake }) => {
  // State
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalInferences: 0,
    successfulInferences: 0,
    disputedInferences: 0,
    totalEarnings: '0',
    successRate: 0,
    averageResponseTime: 0,
  });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeInferences, setActiveInferences] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Load dashboard data
  useEffect(() => {
    if (contract && account && isProver) {
      loadDashboardData();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(loadDashboardData, 30000);
      setRefreshInterval(interval);
      
      return () => clearInterval(interval);
    }
  }, [contract, account, isProver]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      await Promise.all([
        loadStats(),
        loadPendingRequests(),
        loadActiveInferences(),
        loadEarnings(),
      ]);
    } catch (error) {
      handleError(error, 'Load Dashboard Data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const currentRequestId = await contract.getCurrentRequestId();
      
      let totalInferences = 0;
      let successfulInferences = 0;
      let disputedInferences = 0;
      let totalEarnings = BigInt(0);
      let totalResponseTime = 0;
      
      // Scan through all requests
      for (let i = 0; i < currentRequestId; i++) {
        try {
          const request = await contract.getRequest(i);
          
          // Check if this prover was involved
          if (request.prover.toLowerCase() === account.toLowerCase()) {
            totalInferences++;
            
            if (request.status === 3) { // Finalized
              successfulInferences++;
              totalEarnings += request.proverStake + request.requesterStake;
            } else if (request.status === 2) { // Disputed
              disputedInferences++;
            }
            
            // Calculate response time
            if (request.settledAt > 0) {
              const responseTime = Number(request.settledAt - request.createdAt);
              totalResponseTime += responseTime;
            }
          }
        } catch (err) {
          // Skip invalid requests
          continue;
        }
      }
      
      const successRate = totalInferences > 0 
        ? (successfulInferences / totalInferences) * 100 
        : 0;
      
      const averageResponseTime = totalInferences > 0
        ? totalResponseTime / totalInferences
        : 0;
      
      setStats({
        totalInferences,
        successfulInferences,
        disputedInferences,
        totalEarnings: ethers.formatEther(totalEarnings),
        successRate: successRate.toFixed(2),
        averageResponseTime: Math.floor(averageResponseTime / 3600), // Convert to hours
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const currentRequestId = await contract.getCurrentRequestId();
      const pending = [];
      
      // Get last 20 requests
      const startId = Math.max(0, Number(currentRequestId) - 20);
      
      for (let i = startId; i < currentRequestId; i++) {
        try {
          const request = await contract.getRequest(i);
          
          // Only show pending requests (status 0)
          if (request.status === 0) {
            pending.push({
              id: i,
              requester: request.requester,
              modelHash: request.modelHash,
              stake: ethers.formatEther(request.requesterStake),
              createdAt: new Date(Number(request.createdAt) * 1000),
              inputData: request.inputData,
            });
          }
        } catch (err) {
          continue;
        }
      }
      
      setPendingRequests(pending.reverse()); // Newest first
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const loadActiveInferences = async () => {
    try {
      const currentRequestId = await contract.getCurrentRequestId();
      const active = [];
      
      for (let i = 0; i < currentRequestId; i++) {
        try {
          const request = await contract.getRequest(i);
          
          // Show requests where this prover is involved and not finalized
          if (
            request.prover.toLowerCase() === account.toLowerCase() &&
            request.status !== 3 && // Not finalized
            request.status !== 4    // Not settled
          ) {
            active.push({
              id: i,
              requester: request.requester,
              status: ['Pending', 'Posted', 'Disputed'][request.status],
              stake: ethers.formatEther(request.proverStake),
              deadline: new Date(Number(request.disputeDeadline) * 1000),
              canFinalize: request.status === 1 && Date.now() / 1000 > Number(request.disputeDeadline),
            });
          }
        } catch (err) {
          continue;
        }
      }
      
      setActiveInferences(active);
    } catch (error) {
      console.error('Error loading active inferences:', error);
    }
  };

  const loadEarnings = async () => {
    try {
      const currentRequestId = await contract.getCurrentRequestId();
      const earningsData = [];
      
      for (let i = 0; i < currentRequestId; i++) {
        try {
          const request = await contract.getRequest(i);
          
          // Show finalized requests where this prover earned
          if (
            request.prover.toLowerCase() === account.toLowerCase() &&
            request.status === 3 // Finalized
          ) {
            const reward = request.proverStake + request.requesterStake;
            earningsData.push({
              id: i,
              amount: ethers.formatEther(reward),
              date: new Date(Number(request.settledAt) * 1000),
            });
          }
        } catch (err) {
          continue;
        }
      }
      
      setEarnings(earningsData.reverse().slice(0, 10)); // Last 10 earnings
    } catch (error) {
      console.error('Error loading earnings:', error);
    }
  };

  const handleQuickPost = async (requestId) => {
    try {
      setLoading(true);
      
      // In production, this would call your AI model
      const outputData = ethers.toUtf8Bytes('AI inference result for request ' + requestId);
      
      const tx = await contract.postInference(requestId, outputData);
      toast.info('Transaction submitted...');
      
      await tx.wait();
      toast.success('Inference posted successfully!');
      
      await loadDashboardData();
    } catch (error) {
      handleError(error, 'Quick Post');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFinalize = async (requestId) => {
    try {
      setLoading(true);
      
      const tx = await contract.finalizeInference(requestId);
      toast.info('Transaction submitted...');
      
      await tx.wait();
      toast.success('Inference finalized successfully!');
      
      await loadDashboardData();
    } catch (error) {
      handleError(error, 'Quick Finalize');
    } finally {
      setLoading(false);
    }
  };

  if (!isProver) {
    return (
      <div className="prover-dashboard">
        <div className="not-prover-message">
          <h2>👨‍💻 Prover Dashboard</h2>
          <p>You are not registered as a prover.</p>
          <p>Register to start earning rewards by providing AI inferences!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="prover-dashboard">
      <div className="dashboard-header">
        <h2>👨‍💻 Prover Dashboard</h2>
        <button 
          onClick={loadDashboardData} 
          className="refresh-btn"
          disabled={loading}
        >
          {loading ? <InlineSpinner /> : '🔄'} Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Total Inferences</div>
            <div className="stat-value">{stats.totalInferences}</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">Successful</div>
            <div className="stat-value">{stats.successfulInferences}</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">⚔️</div>
          <div className="stat-content">
            <div className="stat-label">Disputed</div>
            <div className="stat-value">{stats.disputedInferences}</div>
          </div>
        </div>

        <div className="stat-card primary">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Total Earnings</div>
            <div className="stat-value">{parseFloat(stats.totalEarnings).toFixed(4)} ETH</div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-label">Success Rate</div>
            <div className="stat-value">{stats.successRate}%</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-label">Avg Response Time</div>
            <div className="stat-value">{stats.averageResponseTime}h</div>
          </div>
        </div>

        <div className="stat-card stake">
          <div className="stat-icon">🔒</div>
          <div className="stat-content">
            <div className="stat-label">Your Stake</div>
            <div className="stat-value">{parseFloat(proverStake).toFixed(4)} ETH</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-label">Pending Requests</div>
            <div className="stat-value">{pendingRequests.length}</div>
          </div>
        </div>
      </div>

      {/* Pending Requests Queue */}
      <div className="dashboard-section">
        <h3>📋 Pending Requests Queue</h3>
        {pendingRequests.length === 0 ? (
          <div className="empty-state">No pending requests available</div>
        ) : (
          <div className="requests-list">
            {pendingRequests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-header">
                  <span className="request-id">Request #{request.id}</span>
                  <span className="request-stake">{request.stake} ETH</span>
                </div>
                <div className="request-details">
                  <div className="detail-row">
                    <span className="label">Requester:</span>
                    <span className="value">{request.requester.substring(0, 10)}...</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Created:</span>
                    <span className="value">{request.createdAt.toLocaleString()}</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleQuickPost(request.id)}
                  className="action-btn small"
                  disabled={loading}
                >
                  {loading ? <InlineSpinner /> : '📝 Post Inference'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Inferences */}
      <div className="dashboard-section">
        <h3>⚡ Active Inferences</h3>
        {activeInferences.length === 0 ? (
          <div className="empty-state">No active inferences</div>
        ) : (
          <div className="inferences-list">
            {activeInferences.map((inference) => (
              <div key={inference.id} className="inference-card">
                <div className="inference-header">
                  <span className="inference-id">Request #{inference.id}</span>
                  <span className={`status-badge ${inference.status.toLowerCase()}`}>
                    {inference.status}
                  </span>
                </div>
                <div className="inference-details">
                  <div className="detail-row">
                    <span className="label">Stake:</span>
                    <span className="value">{inference.stake} ETH</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Deadline:</span>
                    <span className="value">{inference.deadline.toLocaleString()}</span>
                  </div>
                </div>
                {inference.canFinalize && (
                  <button 
                    onClick={() => handleQuickFinalize(inference.id)}
                    className="action-btn small success"
                    disabled={loading}
                  >
                    {loading ? <InlineSpinner /> : '✅ Finalize Now'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Earnings */}
      <div className="dashboard-section">
        <h3>💰 Recent Earnings</h3>
        {earnings.length === 0 ? (
          <div className="empty-state">No earnings yet</div>
        ) : (
          <div className="earnings-list">
            {earnings.map((earning, index) => (
              <div key={index} className="earning-item">
                <div className="earning-icon">💵</div>
                <div className="earning-details">
                  <div className="earning-amount">{earning.amount} ETH</div>
                  <div className="earning-date">{earning.date.toLocaleDateString()}</div>
                </div>
                <div className="earning-request">Request #{earning.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProverDashboard;
