import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentFailureCard, PaymentErrorCode } from './PaymentFailureCard';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      // Error titles
      errorInsufficientFunds: 'Insufficient Funds',
      errorCardDeclined: 'Card Declined',
      errorExpiredCard: 'Expired Card',
      errorInvalidCard: 'Invalid Card',
      errorTimeout: 'Transaction Timed Out',
      errorCancelled: 'Transaction Cancelled',
      errorAbandoned: 'Transaction Abandoned',
      errorBankError: 'Bank Error',
      errorNetworkError: 'Network Error',
      errorDefault: 'Payment Failed',
      // Error descriptions
      errorInsufficientFundsDesc: 'Please ensure sufficient balance.',
      errorCardDeclinedDesc: 'Your card was declined by the bank.',
      errorExpiredCardDesc: 'Your card has expired.',
      errorInvalidCardDesc: 'Please check your card details.',
      errorTimeoutDesc: 'The transaction took too long.',
      errorCancelledDesc: 'You cancelled the transaction.',
      errorAbandonedDesc: 'You left before completing.',
      errorBankErrorDesc: 'An error occurred at your bank.',
      errorNetworkErrorDesc: 'Please check your connection.',
      errorDefaultDesc: 'An unexpected error occurred.',
      // Other
      youWereNotCharged: 'You were NOT charged',
      noChargeExplanation: 'No money was deducted from your account.',
      attemptedAmount: 'Attempted amount',
      tryAgain: 'Try Again',
      useDifferentMethod: 'Use Different Method',
    };
    return translations[key] || key;
  },
}));

describe('PaymentFailureCard', () => {
  const defaultProps = {
    errorCode: 'default' as PaymentErrorCode,
    amount: 500000, // 5000.00 in minor units
    currency: 'NGN',
    currencySymbol: '₦',
    onRetry: jest.fn(),
    onChangeMethod: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error code mapping', () => {
    const errorCodes: PaymentErrorCode[] = [
      'insufficient_funds',
      'card_declined',
      'expired_card',
      'invalid_card',
      'timeout',
      'cancelled',
      'abandoned',
      'bank_error',
      'network_error',
      'default',
    ];

    const expectedTitles: Record<PaymentErrorCode, string> = {
      insufficient_funds: 'Insufficient Funds',
      card_declined: 'Card Declined',
      expired_card: 'Expired Card',
      invalid_card: 'Invalid Card',
      timeout: 'Transaction Timed Out',
      cancelled: 'Transaction Cancelled',
      abandoned: 'Transaction Abandoned',
      bank_error: 'Bank Error',
      network_error: 'Network Error',
      default: 'Payment Failed',
    };

    errorCodes.forEach((code) => {
      it(`displays correct title for "${code}" error`, () => {
        render(<PaymentFailureCard {...defaultProps} errorCode={code} />);
        expect(screen.getByText(expectedTitles[code])).toBeInTheDocument();
      });
    });

    it('handles hyphenated error codes (e.g., "insufficient-funds")', () => {
      render(<PaymentFailureCard {...defaultProps} errorCode="insufficient-funds" />);
      expect(screen.getByText('Insufficient Funds')).toBeInTheDocument();
    });

    it('handles uppercase error codes', () => {
      render(<PaymentFailureCard {...defaultProps} errorCode="CARD_DECLINED" />);
      expect(screen.getByText('Card Declined')).toBeInTheDocument();
    });

    it('falls back to default for unknown error codes', () => {
      render(<PaymentFailureCard {...defaultProps} errorCode="unknown_error" />);
      expect(screen.getByText('Payment Failed')).toBeInTheDocument();
    });

    it('handles undefined error code', () => {
      render(<PaymentFailureCard {...defaultProps} errorCode={undefined} />);
      expect(screen.getByText('Payment Failed')).toBeInTheDocument();
    });
  });

  describe('Not charged reassurance', () => {
    it('displays prominent "NOT charged" message', () => {
      render(<PaymentFailureCard {...defaultProps} />);
      expect(screen.getByText('You were NOT charged')).toBeInTheDocument();
    });

    it('displays explanation about no money deducted', () => {
      render(<PaymentFailureCard {...defaultProps} />);
      expect(
        screen.getByText('No money was deducted from your account.')
      ).toBeInTheDocument();
    });

    it('has green styling for reassurance section', () => {
      render(<PaymentFailureCard {...defaultProps} />);
      const reassurance = screen.getByText('You were NOT charged').closest('div')?.parentElement;
      expect(reassurance).toHaveClass('bg-green-50');
    });
  });

  describe('Amount display', () => {
    it('displays attempted amount correctly', () => {
      render(<PaymentFailureCard {...defaultProps} />);
      expect(screen.getByText('₦5,000')).toBeInTheDocument();
    });

    it('displays XOF amount with symbol after', () => {
      render(
        <PaymentFailureCard
          {...defaultProps}
          currency="XOF"
          currencySymbol="FCFA"
        />
      );
      expect(screen.getByText('5,000 FCFA')).toBeInTheDocument();
    });

    it('shows "Attempted amount" label', () => {
      render(<PaymentFailureCard {...defaultProps} />);
      expect(screen.getByText('Attempted amount')).toBeInTheDocument();
    });
  });

  describe('Action buttons', () => {
    it('renders Try Again button', () => {
      render(<PaymentFailureCard {...defaultProps} />);
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('calls onRetry when Try Again is clicked', () => {
      const onRetry = jest.fn();
      render(<PaymentFailureCard {...defaultProps} onRetry={onRetry} />);
      fireEvent.click(screen.getByText('Try Again'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('renders Use Different Method button', () => {
      render(<PaymentFailureCard {...defaultProps} />);
      expect(screen.getByText('Use Different Method')).toBeInTheDocument();
    });

    it('calls onChangeMethod when Use Different Method is clicked', () => {
      const onChangeMethod = jest.fn();
      render(<PaymentFailureCard {...defaultProps} onChangeMethod={onChangeMethod} />);
      fireEvent.click(screen.getByText('Use Different Method'));
      expect(onChangeMethod).toHaveBeenCalledTimes(1);
    });

    it('Try Again button has primary styling', () => {
      render(<PaymentFailureCard {...defaultProps} />);
      const button = screen.getByText('Try Again').closest('button');
      expect(button).toHaveClass('bg-[#87E64B]');
    });

    it('Use Different Method button has secondary styling', () => {
      render(<PaymentFailureCard {...defaultProps} />);
      const button = screen.getByText('Use Different Method').closest('button');
      expect(button).toHaveClass('border-2');
      expect(button).toHaveClass('border-gray-300');
    });
  });

  describe('Icons', () => {
    it('renders X icon in error header', () => {
      const { container } = render(<PaymentFailureCard {...defaultProps} />);
      // Check for the red circle with X
      const redCircle = container.querySelector('.bg-red-500.rounded-full');
      expect(redCircle).toBeInTheDocument();
    });

    it('renders RefreshCw icon in Try Again button', () => {
      render(<PaymentFailureCard {...defaultProps} />);
      const button = screen.getByText('Try Again').closest('button');
      expect(button?.querySelector('svg')).toBeInTheDocument();
    });

    it('renders CreditCard icon in Use Different Method button', () => {
      render(<PaymentFailureCard {...defaultProps} />);
      const button = screen.getByText('Use Different Method').closest('button');
      expect(button?.querySelector('svg')).toBeInTheDocument();
    });
  });
});
