import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { handleError } from '../utils/errorHandler';
import './AnalyticsDashboard.css';

/**
 * AnalyticsDashboard Component
 * Comprehensive analytics and metrics for the oracle platform
 * 
 * Features:
 * - Platform statistics
 * - Request trends
 * - Prover performance
 * - Dispute analytics
 * - Financial metrics
 * - Network health
 */
const AnalyticsDashboard = ({ contract, provider }) => {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('7d'); // 24h, 7d, 30d, all
  const [analytics, setAnalytics] = useState({
    platform: {
      totalRequests: 0,
      totalProvers: 0,
      totalStaked: '0',
      totalDisputes: 0,
      activeRequests: 0,
      successRate: 0,
    },
    requests: {
      pending: 0,
      posted: 0,
      disputed: 0,
      finalized: 0,
      settled: 0,
    },
    financial: {
      totalVolume: '0',
      averageStake: '0',
      totalRewards: '0',
      disputeRate: 0,
    },
    trends: {
      requestsOverTime: [],
      disputesOverTime: [],
      stakingOverTime: [],
    },
    topProvers: [],
  });

  useEffect(() => {
    if (contract && provider) {
      loadAnalytics();
    }
  }, [contract, provider, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      await Promise.all([
        loadPlatformStats(),
        loadRequestStats(),
        loadFinancialStats(),
        loadTrends(),
        loadTopProvers(),
      ]);
    } catch (error) {
      handleError(error, 'Load Analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadPlatformStats = async () => {
    try {
      const currentRequestId = await contract.getCurrentRequestId();
      
      let totalProvers = 0;
      let totalStaked = BigInt(0);
      let totalDisputes = 0;
      let activeRequests = 0;
      let successfulRequests = 0;
      
      const provers = new Set();
      
      for (let i = 0; i < currentRequestId; i++) {
        try {
          const request = await contract.getRequest(i);
          
          // Count provers
          if (request.prover !== ethers.ZeroAddress) {
            provers.add(request.prover.toLowerCase());
            totalStaked += request.proverStake;
          }
          
          // Count disputes
          if (request.status === 2 || request.status === 4) {
            totalDisputes++;
          }
          
          // Count active
          if (request.status === 0 || request.status === 1) {
            activeRequests++;
          }
          
          // Count successful
          if (request.status === 3) {
            successfulRequests++;
          }
        } catch (err) {
          continue;
        }
      }
      
      totalProvers = provers.size;
      const successRate = currentRequestId > 0 
        ? (successfulRequests / Number(currentRequestId)) * 100 
        : 0;
      
      setAnalytics(prev => ({
        ...prev,
        platform: {
          totalRequests: Number(currentRequestId),
          totalProvers,
          totalStaked: ethers.formatEther(totalStaked),
          totalDisputes,
          activeRequests,
          successRate: successRate.toFixed(2),
        },
      }));
    } catch (error) {
      console.error('Error loading platform stats:', error);
    }
  };

  const loadRequestStats = async () => {
    try {
      const currentRequestId = await contract.getCurrentRequestId();
      
      const stats = {
        pending: 0,
        posted: 0,
        disputed: 0,
        finalized: 0,
        settled: 0,
      };
      
      for (let i = 0; i < currentRequestId; i++) {
        try {
          const request = await contract.getRequest(i);
          
          switch (request.status) {
            case 0: stats.pending++; break;
            case 1: stats.posted++; break;
            case 2: stats.disputed++; break;
            case 3: stats.finalized++; break;
            case 4: stats.settled++; break;
          }
        } catch (err) {
          continue;
        }
      }
      
      setAnalytics(prev => ({
        ...prev,
        requests: stats,
      }));
    } catch (error) {
      console.error('Error loading request stats:', error);
    }
  };

  const loadFinancialStats = async () => {
    try {
      const currentRequestId = await contract.getCurrentRequestId();
      
      let totalVolume = BigInt(0);
      let totalRewards = BigInt(0);
      let totalRequests = 0;
      let disputes = 0;
      
      for (let i = 0; i < currentRequestId; i++) {
        try {
          const request = await contract.getRequest(i);
          
          totalVolume += request.requesterStake;
          totalRequests++;
          
          if (request.status === 3) {
            totalRewards += request.proverStake + request.requesterStake;
          }
          
          if (request.status === 2 || request.status === 4) {
            disputes++;
          }
        } catch (err) {
          continue;
        }
      }
      
      const averageStake = totalRequests > 0 
        ? totalVolume / BigInt(totalRequests) 
        : BigInt(0);
      
      const disputeRate = totalRequests > 0 
        ? (disputes / totalRequests) * 100 
        : 0;
      
      setAnalytics(prev => ({
        ...prev,
        financial: {
          totalVolume: ethers.formatEther(totalVolume),
          averageStake: ethers.formatEther(averageStake),
          totalRewards: ethers.formatEther(totalRewards),
          disputeRate: disputeRate.toFixed(2),
        },
      }));
    } catch (error) {
      console.error('Error loading financial stats:', error);
    }
  };

  const loadTrends = async () => {
    try {
      const currentRequestId = await contract.getCurrentRequestId();
      const now = Date.now() / 1000;
      
      // Calculate time range
      let startTime;
      switch (timeRange) {
        case '24h': startTime = now - 86400; break;
        case '7d': startTime = now - 604800; break;
        case '30d': startTime = now - 2592000; break;
        default: startTime = 0;
      }
      
      const requestsOverTime = [];
      const disputesOverTime = [];
      const stakingOverTime = [];
      
      // Group by day
      const dayBuckets = new Map();
      
      for (let i = 0; i < currentRequestId; i++) {
        try {
          const request = await contract.getRequest(i);
          const timestamp = Number(request.createdAt);
          
          if (timestamp < startTime) continue;
          
          const day = Math.floor(timestamp / 86400) * 86400;
          
          if (!dayBuckets.has(day)) {
            dayBuckets.set(day, {
              requests: 0,
              disputes: 0,
              staked: BigInt(0),
            });
          }
          
          const bucket = dayBuckets.get(day);
          bucket.requests++;
          bucket.staked += request.requesterStake;
          
          if (request.status === 2 || request.status === 4) {
            bucket.disputes++;
          }
        } catch (err) {
          continue;
        }
      }
      
      // Convert to arrays
      const sortedDays = Array.from(dayBuckets.keys()).sort();
      
      sortedDays.forEach(day => {
        const bucket = dayBuckets.get(day);
        const date = new Date(day * 1000).toLocaleDateString();
        
        requestsOverTime.push({ date, count: bucket.requests });
        disputesOverTime.push({ date, count: bucket.disputes });
        stakingOverTime.push({ 
          date, 
          amount: parseFloat(ethers.formatEther(bucket.staked)) 
        });
      });
      
      setAnalytics(prev => ({
        ...prev,
        trends: {
          requestsOverTime,
          disputesOverTime,
          stakingOverTime,
        },
      }));
    } catch (error) {
      console.error('Error loading trends:', error);
    }
  };

  const loadTopProvers = async () => {
    try {
      const currentRequestId = await contract.getCurrentRequestId();
      const proverStats = new Map();
      
      for (let i = 0; i < currentRequestId; i++) {
        try {
          const request = await contract.getRequest(i);
          
          if (request.prover !== ethers.ZeroAddress) {
            const prover = request.prover.toLowerCase();
            
            if (!proverStats.has(prover)) {
              proverStats.set(prover, {
                address: request.prover,
                total: 0,
                successful: 0,
                disputed: 0,
                earnings: BigInt(0),
              });
            }
            
            const stats = proverStats.get(prover);
            stats.total++;
            
            if (request.status === 3) {
              stats.successful++;
              stats.earnings += request.proverStake + request.requesterStake;
            } else if (request.status === 2 || request.status === 4) {
              stats.disputed++;
            }
          }
        } catch (err) {
          continue;
        }
      }
      
      // Convert to array and sort by earnings
      const topProvers = Array.from(proverStats.values())
        .map(stats => ({
          ...stats,
          earnings: ethers.formatEther(stats.earnings),
          successRate: stats.total > 0 
            ? ((stats.successful / stats.total) * 100).toFixed(2) 
            : 0,
        }))
        .sort((a, b) => parseFloat(b.earnings) - parseFloat(a.earnings))
        .slice(0, 10);
      
      setAnalytics(prev => ({
        ...prev,
        topProvers,
      }));
    } catch (error) {
      console.error('Error loading top provers:', error);
    }
  };

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h2>📊 Analytics Dashboard</h2>
        <div className="time-range-selector">
          <button 
            className={timeRange === '24h' ? 'active' : ''}
            onClick={() => setTimeRange('24h')}
          >
            24H
          </button>
          <button 
            className={timeRange === '7d' ? 'active' : ''}
            onClick={() => setTimeRange('7d')}
          >
            7D
          </button>
          <button 
            className={timeRange === '30d' ? 'active' : ''}
            onClick={() => setTimeRange('30d')}
          >
            30D
          </button>
          <button 
            className={timeRange === 'all' ? 'active' : ''}
            onClick={() => setTimeRange('all')}
          >
            ALL
          </button>
        </div>
      </div>

      {/* Platform Overview */}
      <div className="analytics-section">
        <h3>🌐 Platform Overview</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">📝</div>
            <div className="metric-content">
              <div className="metric-label">Total Requests</div>
              <div className="metric-value">{analytics.platform.totalRequests}</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">👥</div>
            <div className="metric-content">
              <div className="metric-label">Total Provers</div>
              <div className="metric-value">{analytics.platform.totalProvers}</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">🔒</div>
            <div className="metric-content">
              <div className="metric-label">Total Staked</div>
              <div className="metric-value">
                {parseFloat(analytics.platform.totalStaked).toFixed(2)} ETH
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">⚔️</div>
            <div className="metric-content">
              <div className="metric-label">Total Disputes</div>
              <div className="metric-value">{analytics.platform.totalDisputes}</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">⚡</div>
            <div className="metric-content">
              <div className="metric-label">Active Requests</div>
              <div className="metric-value">{analytics.platform.activeRequests}</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">📈</div>
            <div className="metric-content">
              <div className="metric-label">Success Rate</div>
              <div className="metric-value">{analytics.platform.successRate}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Request Distribution */}
      <div className="analytics-section">
        <h3>📊 Request Distribution</h3>
        <div className="distribution-chart">
          <div className="chart-bar">
            <div className="bar-label">Pending</div>
            <div className="bar-container">
              <div 
                className="bar pending" 
                style={{ 
                  width: `${(analytics.requests.pending / analytics.platform.totalRequests * 100) || 0}%` 
                }}
              ></div>
              <span className="bar-value">{analytics.requests.pending}</span>
            </div>
          </div>

          <div className="chart-bar">
            <div className="bar-label">Posted</div>
            <div className="bar-container">
              <div 
                className="bar posted" 
                style={{ 
                  width: `${(analytics.requests.posted / analytics.platform.totalRequests * 100) || 0}%` 
                }}
              ></div>
              <span className="bar-value">{analytics.requests.posted}</span>
            </div>
          </div>

          <div className="chart-bar">
            <div className="bar-label">Disputed</div>
            <div className="bar-container">
              <div 
                className="bar disputed" 
                style={{ 
                  width: `${(analytics.requests.disputed / analytics.platform.totalRequests * 100) || 0}%` 
                }}
              ></div>
              <span className="bar-value">{analytics.requests.disputed}</span>
            </div>
          </div>

          <div className="chart-bar">
            <div className="bar-label">Finalized</div>
            <div className="bar-container">
              <div 
                className="bar finalized" 
                style={{ 
                  width: `${(analytics.requests.finalized / analytics.platform.totalRequests * 100) || 0}%` 
                }}
              ></div>
              <span className="bar-value">{analytics.requests.finalized}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="analytics-section">
        <h3>💰 Financial Metrics</h3>
        <div className="financial-grid">
          <div className="financial-card">
            <div className="financial-label">Total Volume</div>
            <div className="financial-value">
              {parseFloat(analytics.financial.totalVolume).toFixed(4)} ETH
            </div>
          </div>

          <div className="financial-card">
            <div className="financial-label">Average Stake</div>
            <div className="financial-value">
              {parseFloat(analytics.financial.averageStake).toFixed(4)} ETH
            </div>
          </div>

          <div className="financial-card">
            <div className="financial-label">Total Rewards</div>
            <div className="financial-value">
              {parseFloat(analytics.financial.totalRewards).toFixed(4)} ETH
            </div>
          </div>

          <div className="financial-card">
            <div className="financial-label">Dispute Rate</div>
            <div className="financial-value">
              {analytics.financial.disputeRate}%
            </div>
          </div>
        </div>
      </div>

      {/* Top Provers */}
      <div className="analytics-section">
        <h3>🏆 Top Provers</h3>
        {analytics.topProvers.length === 0 ? (
          <div className="empty-state">No prover data available</div>
        ) : (
          <div className="top-provers-list">
            {analytics.topProvers.map((prover, index) => (
              <div key={prover.address} className="prover-item">
                <div className="prover-rank">#{index + 1}</div>
                <div className="prover-details">
                  <div className="prover-address">
                    {prover.address.substring(0, 10)}...{prover.address.substring(38)}
                  </div>
                  <div className="prover-stats">
                    <span>{prover.total} inferences</span>
                    <span>•</span>
                    <span>{prover.successRate}% success</span>
                  </div>
                </div>
                <div className="prover-earnings">
                  {parseFloat(prover.earnings).toFixed(4)} ETH
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
