import { renderHook, act, waitFor } from '@testing-library/react';
import { usePaymentStatus } from './usePaymentStatus';
import { paymentApi } from '@/services/payment-api';

// Mock payment API
jest.mock('@/services/payment-api', () => ({
  paymentApi: {
    getPaymentStatusV2: jest.fn(),
  },
}));

const mockGetPaymentStatusV2 = paymentApi.getPaymentStatusV2 as jest.Mock;

describe('usePaymentStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => usePaymentStatus());

    expect(result.current.pollingStatus).toBe('idle');
    expect(result.current.paymentData).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('transitions to polling state when startPolling is called', async () => {
    mockGetPaymentStatusV2.mockResolvedValue({
      data: { status: 'PENDING' },
    });

    const { result } = renderHook(() => usePaymentStatus());

    act(() => {
      result.current.startPolling('test-reference');
    });

    expect(result.current.pollingStatus).toBe('polling');
  });

  it('polls /v2/payments/:reference/status every 3 seconds', async () => {
    mockGetPaymentStatusV2.mockResolvedValue({
      data: { status: 'PENDING' },
    });

    const { result } = renderHook(() => usePaymentStatus({ interval: 3000 }));

    act(() => {
      result.current.startPolling('test-reference');
    });

    // First call immediately
    await waitFor(() => {
      expect(mockGetPaymentStatusV2).toHaveBeenCalledWith('test-reference');
    });

    // Advance 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(mockGetPaymentStatusV2).toHaveBeenCalledTimes(2);
    });
  });

  it('stops polling on terminal state SUCCESS', async () => {
    mockGetPaymentStatusV2.mockResolvedValue({
      data: {
        status: 'SUCCESS',
        reference: 'test-reference',
        pricingAmountMinorUnits: 50000,
      },
    });

    const onSuccess = jest.fn();
    const { result } = renderHook(() => usePaymentStatus({ onSuccess }));

    act(() => {
      result.current.startPolling('test-reference');
    });

    await waitFor(() => {
      expect(result.current.pollingStatus).toBe('success');
    });

    expect(onSuccess).toHaveBeenCalled();

    // Advance time - should not poll again
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Should still only have been called once (or twice for initial + one poll)
    expect(mockGetPaymentStatusV2.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('stops polling on terminal state FAILED', async () => {
    mockGetPaymentStatusV2.mockResolvedValue({
      data: {
        status: 'FAILED',
        failureReason: 'Insufficient funds',
      },
    });

    const onFailed = jest.fn();
    const { result } = renderHook(() => usePaymentStatus({ onFailed }));

    act(() => {
      result.current.startPolling('test-reference');
    });

    await waitFor(() => {
      expect(result.current.pollingStatus).toBe('failed');
    });

    expect(onFailed).toHaveBeenCalled();
    expect(result.current.error).toBe('Insufficient funds');
  });

  it('handles timeout (60 seconds total wait)', async () => {
    mockGetPaymentStatusV2.mockResolvedValue({
      data: { status: 'PENDING' },
    });

    const onTimeout = jest.fn();
    const { result } = renderHook(() =>
      usePaymentStatus({ timeout: 60000, onTimeout })
    );

    act(() => {
      result.current.startPolling('test-reference');
    });

    // Advance past timeout
    act(() => {
      jest.advanceTimersByTime(61000);
    });

    await waitFor(() => {
      expect(result.current.pollingStatus).toBe('timeout');
    });

    expect(onTimeout).toHaveBeenCalled();
  });

  it('cleans up polling on unmount', async () => {
    mockGetPaymentStatusV2.mockResolvedValue({
      data: { status: 'PENDING' },
    });

    const { result, unmount } = renderHook(() => usePaymentStatus());

    act(() => {
      result.current.startPolling('test-reference');
    });

    unmount();

    // Advance time after unmount
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Should not throw or continue polling
    expect(mockGetPaymentStatusV2.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('reset returns to idle state', async () => {
    mockGetPaymentStatusV2.mockResolvedValue({
      data: { status: 'PENDING' },
    });

    const { result } = renderHook(() => usePaymentStatus());

    act(() => {
      result.current.startPolling('test-reference');
    });

    expect(result.current.pollingStatus).toBe('polling');

    act(() => {
      result.current.reset();
    });

    expect(result.current.pollingStatus).toBe('idle');
    expect(result.current.paymentData).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('stopPolling stops active polling', async () => {
    mockGetPaymentStatusV2.mockResolvedValue({
      data: { status: 'PENDING' },
    });

    const { result } = renderHook(() => usePaymentStatus());

    act(() => {
      result.current.startPolling('test-reference');
    });

    act(() => {
      result.current.stopPolling();
    });

    const callCount = mockGetPaymentStatusV2.mock.calls.length;

    // Advance time
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Should not have polled more
    expect(mockGetPaymentStatusV2.mock.calls.length).toBe(callCount);
  });

  it('continues polling on network errors', async () => {
    mockGetPaymentStatusV2
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue({ data: { status: 'PENDING' } });

    const { result } = renderHook(() => usePaymentStatus({ interval: 3000 }));

    act(() => {
      result.current.startPolling('test-reference');
    });

    // First call fails
    await waitFor(() => {
      expect(mockGetPaymentStatusV2).toHaveBeenCalledTimes(1);
    });

    // Should still be polling
    expect(result.current.pollingStatus).toBe('polling');

    // Advance time for retry
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(mockGetPaymentStatusV2).toHaveBeenCalledTimes(2);
    });
  });
});
