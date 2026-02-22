import React, { useState, useEffect } from 'react';
import './RequestHistory.css';

const RequestHistory = ({ contract, account }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, posted, disputed, finalized
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    if (contract && account) {
      loadRequests();
    }
  }, [contract, account, filter, sortBy, currentPage]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      // Get total request count
      const currentRequestId = await contract.getCurrentRequestId();
      setTotalRequests(Number(currentRequestId));

      // Load requests
      const requestPromises = [];
      const start = Math.max(1, Number(currentRequestId) - (currentPage * itemsPerPage) + 1);
      const end = Math.max(1, Number(currentRequestId) - ((currentPage - 1) * itemsPerPage) + 1);

      for (let i = end; i >= start && i >= 1; i--) {
        requestPromises.push(loadRequest(i));
      }

      let loadedRequests = await Promise.all(requestPromises);

      // Filter by user's requests
      loadedRequests = loadedRequests.filter(req => 
        req.requester.toLowerCase() === account.toLowerCase() ||
        req.prover.toLowerCase() === account.toLowerCase() ||
        req.challenger.toLowerCase() === account.toLowerCase()
      );

      // Apply status filter
      if (filter !== 'all') {
        loadedRequests = loadedRequests.filter(req => {
          const statusMap = {
            'pending': 0,
            'posted': 1,
            'disputed': 2,
            'finalized': 3,
            'settled': 4
          };
          return req.status === statusMap[filter];
        });
      }

      // Apply sorting
      if (sortBy === 'oldest') {
        loadedRequests.reverse();
      }

      setRequests(loadedRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRequest = async (requestId) => {
    try {
      const request = await contract.getRequest(requestId);
      return {
        id: requestId,
        requester: request.requester,
        prover: request.prover,
        challenger: request.challenger,
        modelHash: request.modelHash,
        requesterStake: request.requesterStake,
        proverStake: request.proverStake,
        challengerStake: request.challengerStake,
        status: request.status,
        createdAt: request.createdAt,
        disputeDeadline: request.disputeDeadline,
        settledAt: request.settledAt
      };
    } catch (error) {
      console.error(`Error loading request ${requestId}:`, error);
      return null;
    }
  };

  const getStatusName = (status) => {
    const statuses = ['Pending', 'Posted', 'Disputed', 'Finalized', 'Settled'];
    return statuses[status] || 'Unknown';
  };

  const getStatusClass = (status) => {
    const classes = ['status-pending', 'status-posted', 'status-disputed', 'status-finalized', 'status-settled'];
    return classes[status] || 'status-unknown';
  };

  const getUserRole = (request) => {
    const addr = account.toLowerCase();
    if (request.requester.toLowerCase() === addr) return 'Requester';
    if (request.prover.toLowerCase() === addr) return 'Prover';
    if (request.challenger.toLowerCase() === addr) return 'Challenger';
    return 'Unknown';
  };

  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === 0n) return 'N/A';
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const formatAddress = (address) => {
    if (!address || address === '0x0000000000000000000000000000000000000000') return 'None';
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Role', 'Status', 'Requester Stake', 'Prover Stake', 'Created At'];
    const rows = requests.map(req => [
      req.id,
      getUserRole(req),
      getStatusName(req.status),
      `${Number(req.requesterStake) / 1e18} ETH`,
      `${Number(req.proverStake) / 1e18} ETH`,
      formatDate(req.createdAt)
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `requests_${Date.now()}.csv`;
    a.click();
  };

  const totalPages = Math.ceil(totalRequests / itemsPerPage);

  return (
    <div className="request-history">
      <div className="history-header">
        <h2>📜 Request History</h2>
        <button onClick={exportToCSV} className="export-btn" disabled={requests.length === 0}>
          📥 Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="history-filters">
        <div className="filter-group">
          <label>Status:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="posted">Posted</option>
            <option value="disputed">Disputed</option>
            <option value="finalized">Finalized</option>
            <option value="settled">Settled</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        <button onClick={loadRequests} className="refresh-btn" disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {/* Request List */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <p>📭 No requests found</p>
          <p className="empty-subtitle">Your requests will appear here</p>
        </div>
      ) : (
        <>
          <div className="request-list">
            {requests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-card-header">
                  <div className="request-id">
                    <span className="label">Request #</span>
                    <span className="value">{request.id.toString()}</span>
                  </div>
                  <div className={`request-status ${getStatusClass(request.status)}`}>
                    {getStatusName(request.status)}
                  </div>
                </div>

                <div className="request-card-body">
                  <div className="request-info-grid">
                    <div className="info-item">
                      <span className="info-label">Your Role:</span>
                      <span className="info-value role">{getUserRole(request)}</span>
                    </div>

                    <div className="info-item">
                      <span className="info-label">Requester:</span>
                      <span className="info-value">{formatAddress(request.requester)}</span>
                    </div>

                    <div className="info-item">
                      <span className="info-label">Prover:</span>
                      <span className="info-value">{formatAddress(request.prover)}</span>
                    </div>

                    <div className="info-item">
                      <span className="info-label">Requester Stake:</span>
                      <span className="info-value">{(Number(request.requesterStake) / 1e18).toFixed(4)} ETH</span>
                    </div>

                    <div className="info-item">
                      <span className="info-label">Prover Stake:</span>
                      <span className="info-value">{(Number(request.proverStake) / 1e18).toFixed(4)} ETH</span>
                    </div>

                    <div className="info-item">
                      <span className="info-label">Created:</span>
                      <span className="info-value">{formatDate(request.createdAt)}</span>
                    </div>

                    {request.disputeDeadline > 0 && (
                      <div className="info-item">
                        <span className="info-label">Dispute Deadline:</span>
                        <span className="info-value">{formatDate(request.disputeDeadline)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="request-card-footer">
                  <button 
                    className="view-details-btn"
                    onClick={() => window.location.hash = `#view-${request.id}`}
                  >
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ← Previous
              </button>

              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RequestHistory;
