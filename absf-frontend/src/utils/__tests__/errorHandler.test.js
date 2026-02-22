import {
  parseError,
  handleError,
  withRetry,
  validateTransaction,
  formatError,
  isRetryableError,
  getRecoverySuggestions,
} from '../errorHandler';
import { ERROR_CODES } from '../errorMessages';
import { toast } from 'react-toastify';

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Error Handler Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseError', () => {
    test('parses user rejected error', () => {
      const error = { code: 4001, message: 'User rejected transaction' };
      const result = parseError(error);

      expect(result.code).toBe(ERROR_CODES.USER_REJECTED);
      expect(result.isUserError).toBe(true);
      expect(result.canRetry).toBe(true);
    });

    test('parses insufficient funds error', () => {
      const error = { message: 'insufficient funds for gas' };
      const result = parseError(error);

      expect(result.code).toBe(ERROR_CODES.INSUFFICIENT_FUNDS);
      expect(result.isUserError).toBe(true);
      expect(result.canRetry).toBe(false);
    });

    test('parses network error', () => {
      const error = { code: 'NETWORK_ERROR', message: 'network error' };
      const result = parseError(error);

      expect(result.code).toBe(ERROR_CODES.NETWORK_ERROR);
      expect(result.isNetworkError).toBe(true);
      expect(result.canRetry).toBe(true);
    });

    test('parses contract revert error', () => {
      const error = { message: 'execution reverted: InsufficientStake' };
      const result = parseError(error);

      expect(result.code).toBe(ERROR_CODES.CONTRACT_REVERT);
      expect(result.isContractError).toBe(true);
      expect(result.canRetry).toBe(false);
    });

    test('parses gas error', () => {
      const error = { message: 'cannot estimate gas' };
      const result = parseError(error);

      expect(result.code).toBe(ERROR_CODES.GAS_ERROR);
      expect(result.isContractError).toBe(true);
      expect(result.canRetry).toBe(true);
    });

    test('parses timeout error', () => {
      const error = { message: 'timeout exceeded' };
      const result = parseError(error);

      expect(result.code).toBe(ERROR_CODES.TIMEOUT);
      expect(result.isNetworkError).toBe(true);
      expect(result.canRetry).toBe(true);
    });

    test('handles unknown error', () => {
      const error = { message: 'some unknown error' };
      const result = parseError(error);

      expect(result.code).toBe(ERROR_CODES.UNKNOWN);
    });
  });

  describe('handleError', () => {
    test('shows toast notification', () => {
      const error = { code: 4001, message: 'User rejected' };
      handleError(error, 'Test Context');

      expect(toast.error).toHaveBeenCalled();
    });

    test('returns parsed error info', () => {
      const error = { code: 4001, message: 'User rejected' };
      const result = handleError(error, 'Test Context');

      expect(result.code).toBe(ERROR_CODES.USER_REJECTED);
    });
  });

  describe('withRetry', () => {
    test('succeeds on first try', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(fn, 3);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('retries on retryable error', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ message: 'network error' })
        .mockResolvedValue('success');

      const result = await withRetry(fn, 3, 10);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('does not retry on non-retryable error', async () => {
      const fn = jest.fn().mockRejectedValue({ message: 'insufficient funds' });

      await expect(withRetry(fn, 3, 10)).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('throws after max retries', async () => {
      const fn = jest.fn().mockRejectedValue({ message: 'network error' });

      await expect(withRetry(fn, 3, 10)).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('validateTransaction', () => {
    test('validates successful transaction', async () => {
      const params = {
        signer: {},
        contract: {},
        stake: 1,
        minStake: 0.5,
        balance: 10,
      };

      const result = await validateTransaction(params);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('detects missing wallet', async () => {
      const params = {
        signer: null,
        contract: {},
      };

      const result = await validateTransaction(params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Wallet not connected');
    });

    test('detects missing contract', async () => {
      const params = {
        signer: {},
        contract: null,
      };

      const result = await validateTransaction(params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Contract not loaded');
    });

    test('detects insufficient stake', async () => {
      const params = {
        signer: {},
        contract: {},
        stake: 0.1,
        minStake: 0.5,
      };

      const result = await validateTransaction(params);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('detects insufficient balance', async () => {
      const params = {
        signer: {},
        contract: {},
        stake: 10,
        balance: 5,
      };

      const result = await validateTransaction(params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Insufficient balance');
    });
  });

  describe('formatError', () => {
    test('formats error message', () => {
      const error = { code: 4001, message: 'User rejected' };
      const result = formatError(error);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('isRetryableError', () => {
    test('identifies retryable error', () => {
      const error = { message: 'network error' };
      const result = isRetryableError(error);

      expect(result).toBe(true);
    });

    test('identifies non-retryable error', () => {
      const error = { message: 'insufficient funds' };
      const result = isRetryableError(error);

      expect(result).toBe(false);
    });
  });

  describe('getRecoverySuggestions', () => {
    test('provides suggestions for insufficient funds', () => {
      const error = { message: 'insufficient funds' };
      const suggestions = getRecoverySuggestions(error);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('ETH'))).toBe(true);
    });

    test('provides suggestions for network error', () => {
      const error = { message: 'network error' };
      const suggestions = getRecoverySuggestions(error);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('connection'))).toBe(true);
    });

    test('provides suggestions for gas error', () => {
      const error = { message: 'cannot estimate gas' };
      const suggestions = getRecoverySuggestions(error);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('gas'))).toBe(true);
    });

    test('provides suggestions for user rejection', () => {
      const error = { code: 4001, message: 'User rejected' };
      const suggestions = getRecoverySuggestions(error);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('Approve'))).toBe(true);
    });
  });
});
