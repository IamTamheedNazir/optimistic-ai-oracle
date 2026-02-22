import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RequestHistory from '../RequestHistory';

// Mock contract
const mockContract = {
  getCurrentRequestId: jest.fn(),
  getRequest: jest.fn(),
};

// Mock account
const mockAccount = '0x1234567890123456789012345678901234567890';

// Mock request data
const mockRequest = {
  requester: mockAccount,
  prover: '0x0000000000000000000000000000000000000000',
  challenger: '0x0000000000000000000000000000000000000000',
  modelHash: '0xabcdef',
  requesterStake: BigInt('100000000000000000'), // 0.1 ETH
  proverStake: BigInt('0'),
  challengerStake: BigInt('0'),
  status: 0, // Pending
  createdAt: BigInt(Math.floor(Date.now() / 1000)),
  disputeDeadline: BigInt(0),
  settledAt: BigInt(0),
};

describe('RequestHistory Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    render(<RequestHistory contract={mockContract} account={mockAccount} />);
    expect(screen.getByText('📜 Request History')).toBeInTheDocument();
  });

  test('shows loading state initially', async () => {
    mockContract.getCurrentRequestId.mockResolvedValue(BigInt(5));
    mockContract.getRequest.mockResolvedValue(mockRequest);

    render(<RequestHistory contract={mockContract} account={mockAccount} />);
    
    // Should show loading initially
    expect(screen.getByText('Loading requests...')).toBeInTheDocument();
  });

  test('displays empty state when no requests', async () => {
    mockContract.getCurrentRequestId.mockResolvedValue(BigInt(0));

    render(<RequestHistory contract={mockContract} account={mockAccount} />);

    await waitFor(() => {
      expect(screen.getByText('📭 No requests found')).toBeInTheDocument();
    });
  });

  test('loads and displays requests', async () => {
    mockContract.getCurrentRequestId.mockResolvedValue(BigInt(1));
    mockContract.getRequest.mockResolvedValue(mockRequest);

    render(<RequestHistory contract={mockContract} account={mockAccount} />);

    await waitFor(() => {
      expect(screen.getByText(/Request #/)).toBeInTheDocument();
    });
  });

  test('filters requests by status', async () => {
    mockContract.getCurrentRequestId.mockResolvedValue(BigInt(1));
    mockContract.getRequest.mockResolvedValue(mockRequest);

    render(<RequestHistory contract={mockContract} account={mockAccount} />);

    await waitFor(() => {
      expect(screen.getByText(/Request #/)).toBeInTheDocument();
    });

    // Change filter
    const filterSelect = screen.getByLabelText('Status:');
    fireEvent.change(filterSelect, { target: { value: 'pending' } });

    // Should still show the pending request
    expect(screen.getByText(/Request #/)).toBeInTheDocument();
  });

  test('sorts requests by date', async () => {
    mockContract.getCurrentRequestId.mockResolvedValue(BigInt(1));
    mockContract.getRequest.mockResolvedValue(mockRequest);

    render(<RequestHistory contract={mockContract} account={mockAccount} />);

    await waitFor(() => {
      expect(screen.getByText(/Request #/)).toBeInTheDocument();
    });

    // Change sort
    const sortSelect = screen.getByLabelText('Sort:');
    fireEvent.change(sortSelect, { target: { value: 'oldest' } });

    // Should still show requests
    expect(screen.getByText(/Request #/)).toBeInTheDocument();
  });

  test('refreshes requests when refresh button clicked', async () => {
    mockContract.getCurrentRequestId.mockResolvedValue(BigInt(1));
    mockContract.getRequest.mockResolvedValue(mockRequest);

    render(<RequestHistory contract={mockContract} account={mockAccount} />);

    await waitFor(() => {
      expect(screen.getByText(/Request #/)).toBeInTheDocument();
    });

    // Click refresh
    const refreshButton = screen.getByText('🔄 Refresh');
    fireEvent.click(refreshButton);

    // Should call contract methods again
    await waitFor(() => {
      expect(mockContract.getCurrentRequestId).toHaveBeenCalledTimes(2);
    });
  });

  test('exports to CSV when export button clicked', async () => {
    mockContract.getCurrentRequestId.mockResolvedValue(BigInt(1));
    mockContract.getRequest.mockResolvedValue(mockRequest);

    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn();
    
    // Mock createElement and click
    const mockLink = {
      click: jest.fn(),
      href: '',
      download: '',
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink);

    render(<RequestHistory contract={mockContract} account={mockAccount} />);

    await waitFor(() => {
      expect(screen.getByText(/Request #/)).toBeInTheDocument();
    });

    // Click export
    const exportButton = screen.getByText('📥 Export CSV');
    fireEvent.click(exportButton);

    // Should create download link
    expect(mockLink.click).toHaveBeenCalled();
  });

  test('displays correct status badge', async () => {
    mockContract.getCurrentRequestId.mockResolvedValue(BigInt(1));
    mockContract.getRequest.mockResolvedValue(mockRequest);

    render(<RequestHistory contract={mockContract} account={mockAccount} />);

    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  test('displays user role correctly', async () => {
    mockContract.getCurrentRequestId.mockResolvedValue(BigInt(1));
    mockContract.getRequest.mockResolvedValue(mockRequest);

    render(<RequestHistory contract={mockContract} account={mockAccount} />);

    await waitFor(() => {
      expect(screen.getByText('Requester')).toBeInTheDocument();
    });
  });

  test('formats addresses correctly', async () => {
    mockContract.getCurrentRequestId.mockResolvedValue(BigInt(1));
    mockContract.getRequest.mockResolvedValue(mockRequest);

    render(<RequestHistory contract={mockContract} account={mockAccount} />);

    await waitFor(() => {
      // Should show shortened address
      expect(screen.getByText(/0x1234...7890/)).toBeInTheDocument();
    });
  });

  test('handles pagination', async () => {
    mockContract.getCurrentRequestId.mockResolvedValue(BigInt(15));
    mockContract.getRequest.mockResolvedValue(mockRequest);

    render(<RequestHistory contract={mockContract} account={mockAccount} />);

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
    });

    // Should show next button
    const nextButton = screen.getByText('Next →');
    expect(nextButton).toBeInTheDocument();
  });

  test('handles errors gracefully', async () => {
    mockContract.getCurrentRequestId.mockRejectedValue(new Error('Network error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<RequestHistory contract={mockContract} account={mockAccount} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});
