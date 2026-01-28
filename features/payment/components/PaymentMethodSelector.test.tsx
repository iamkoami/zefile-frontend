import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentMethodSelector } from './PaymentMethodSelector';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      payFor: 'Pay for',
      choosePaymentMethod: 'Choose payment method',
      paymentMethods: 'Payment methods',
      payWithCard: 'Pay with Card',
      continue: 'Continue',
      cancel: 'Cancel',
    };
    return translations[key] || key;
  },
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock createPortal to render in the same container
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

describe('PaymentMethodSelector', () => {
  const defaultProps = {
    isOpen: true,
    amount: 500000, // 5000.00 in minor units
    currency: 'NGN',
    currencySymbol: '₦',
    transferTitle: 'Test Transfer',
    transferId: 'test-transfer-id',
    onMethodSelect: jest.fn(),
    onCancel: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    // Default mock response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        countryCode: 'GH',
        mobileMoney: [
          { provider: 'mtn_momo', name: 'MTN Mobile Money', icon: 'mtn' },
          { provider: 'vodafone_cash', name: 'Vodafone Cash', icon: 'vodafone' },
        ],
        card: { enabled: true, providers: ['visa', 'mastercard'] },
      }),
    });
  });

  it('displays Mobile Money options before card option', async () => {
    render(<PaymentMethodSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('MTN Mobile Money')).toBeInTheDocument();
    });

    const options = screen.getAllByRole('radio');

    // Mobile Money options should come before card
    expect(options[0]).toHaveAttribute('aria-label', 'MTN Mobile Money');
    expect(options[options.length - 1]).toHaveAttribute('aria-label', 'Pay with Card');
  });

  it('shows country-specific providers based on detected country', async () => {
    render(<PaymentMethodSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('MTN Mobile Money')).toBeInTheDocument();
      expect(screen.getByText('Vodafone Cash')).toBeInTheDocument();
    });

    // These are Ghana-specific providers returned by mock
    expect(screen.queryByText('M-Pesa')).not.toBeInTheDocument(); // Kenya-specific
  });

  it('enables Continue button only when method is selected', async () => {
    render(<PaymentMethodSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('MTN Mobile Money')).toBeInTheDocument();
    });

    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).toBeDisabled();

    // Select a method
    fireEvent.click(screen.getByText('MTN Mobile Money'));
    expect(continueButton).not.toBeDisabled();
  });

  it('calls onMethodSelect with correct provider on Continue', async () => {
    const onMethodSelect = jest.fn();
    render(<PaymentMethodSelector {...defaultProps} onMethodSelect={onMethodSelect} />);

    await waitFor(() => {
      expect(screen.getByText('MTN Mobile Money')).toBeInTheDocument();
    });

    // Select MTN Mobile Money
    fireEvent.click(screen.getByText('MTN Mobile Money'));

    // Click Continue
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(onMethodSelect).toHaveBeenCalledWith({
      type: 'mobile_money',
      provider: 'mtn_momo',
    });
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = jest.fn();
    render(<PaymentMethodSelector {...defaultProps} onCancel={onCancel} />);

    await waitFor(() => {
      expect(screen.getByText('Choose payment method')).toBeInTheDocument();
    });

    // Click the cancel button in footer
    const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButtons[cancelButtons.length - 1]); // Footer cancel button

    expect(onCancel).toHaveBeenCalled();
  });

  it('handles keyboard navigation correctly', async () => {
    const user = userEvent.setup();
    render(<PaymentMethodSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('MTN Mobile Money')).toBeInTheDocument();
    });

    // Focus first option
    const firstOption = screen.getByRole('radio', { name: 'MTN Mobile Money' });
    firstOption.focus();

    // Press ArrowDown to move to next option
    await user.keyboard('{ArrowDown}');

    const secondOption = screen.getByRole('radio', { name: 'Vodafone Cash' });
    expect(document.activeElement).toBe(secondOption);
  });

  it('closes on Escape key', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<PaymentMethodSelector {...defaultProps} onCancel={onCancel} />);

    await waitFor(() => {
      expect(screen.getByText('Choose payment method')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalled();
  });

  it('shows fallback providers when API fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<PaymentMethodSelector {...defaultProps} />);

    await waitFor(() => {
      // Should show fallback providers
      expect(screen.getByText('MTN Mobile Money')).toBeInTheDocument();
      expect(screen.getByText('M-Pesa')).toBeInTheDocument();
      expect(screen.getByText('Wave')).toBeInTheDocument();
    });
  });

  it('caches country detection result in localStorage', async () => {
    render(<PaymentMethodSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('MTN Mobile Money')).toBeInTheDocument();
    });

    expect(localStorage.getItem('zefile_detected_country')).toBe('GH');
  });

  it('uses cached country from localStorage', async () => {
    localStorage.setItem('zefile_detected_country', 'KE');

    render(<PaymentMethodSelector {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Should call with country code in URL
    const fetchCall = mockFetch.mock.calls[0][0];
    expect(fetchCall).toContain('/v2/payments/methods/KE');
  });

  it('displays correct amount with currency symbol', async () => {
    render(<PaymentMethodSelector {...defaultProps} />);

    await waitFor(() => {
      // 500000 minor units = 5000 major units
      expect(screen.getByText('₦5,000')).toBeInTheDocument();
    });
  });

  it('shows card option for all countries', async () => {
    // Nigeria response (no mobile money)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        countryCode: 'NG',
        mobileMoney: [],
        card: { enabled: true, providers: ['visa', 'mastercard'] },
      }),
    });

    render(<PaymentMethodSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Pay with Card')).toBeInTheDocument();
    });

    // No mobile money options for Nigeria
    expect(screen.queryByText('MTN Mobile Money')).not.toBeInTheDocument();
  });

  it('returns null when not open', () => {
    const { container } = render(<PaymentMethodSelector {...defaultProps} isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
