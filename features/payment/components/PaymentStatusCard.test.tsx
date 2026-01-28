import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentStatusCard, PaymentCardStatus } from './PaymentStatusCard';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      paymentSuccessful: 'Payment Successful',
      paidOn: 'Paid on',
      amountPaid: 'Amount paid',
      downloadFiles: 'Download Files',
      paymentPending: 'Payment Pending',
      waitingForConfirmation: 'Waiting for confirmation...',
      amount: 'Amount',
      paymentFailed: 'Payment Failed',
      youWereNotCharged: 'You were NOT charged',
      tryAgain: 'Try Again',
      useDifferentMethod: 'Use Different Method',
    };
    return translations[key] || key;
  },
}));

describe('PaymentStatusCard', () => {
  const defaultProps = {
    status: 'success' as PaymentCardStatus,
    amount: 500000, // 5000.00 in minor units
    currency: 'NGN',
    currencySymbol: '₦',
  };

  describe('Success state', () => {
    it('renders success header', () => {
      render(<PaymentStatusCard {...defaultProps} />);
      expect(screen.getByText('Payment Successful')).toBeInTheDocument();
    });

    it('displays formatted amount correctly', () => {
      render(<PaymentStatusCard {...defaultProps} />);
      expect(screen.getByText('₦5,000')).toBeInTheDocument();
    });

    it('displays amount with XOF format (symbol after)', () => {
      render(
        <PaymentStatusCard
          {...defaultProps}
          currency="XOF"
          currencySymbol="FCFA"
        />
      );
      expect(screen.getByText('5,000 FCFA')).toBeInTheDocument();
    });

    it('shows payment date when paidAt is provided', () => {
      render(
        <PaymentStatusCard
          {...defaultProps}
          paidAt="2025-01-15T10:30:00Z"
        />
      );
      expect(screen.getByText(/Paid on/)).toBeInTheDocument();
    });

    it('renders download button when onDownload is provided', () => {
      const onDownload = jest.fn();
      render(<PaymentStatusCard {...defaultProps} onDownload={onDownload} />);
      expect(screen.getByText('Download Files')).toBeInTheDocument();
    });

    it('calls onDownload when download button is clicked', () => {
      const onDownload = jest.fn();
      render(<PaymentStatusCard {...defaultProps} onDownload={onDownload} />);
      fireEvent.click(screen.getByText('Download Files'));
      expect(onDownload).toHaveBeenCalledTimes(1);
    });

    it('disables download button when isDownloading is true', () => {
      const onDownload = jest.fn();
      render(
        <PaymentStatusCard
          {...defaultProps}
          onDownload={onDownload}
          isDownloading
        />
      );
      expect(screen.getByText('Download Files').closest('button')).toBeDisabled();
    });

    it('has green styling for success state', () => {
      const { container } = render(<PaymentStatusCard {...defaultProps} />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-[#F0FDF4]');
      expect(card).toHaveClass('border-[#87E64B]');
    });
  });

  describe('Pending state', () => {
    const pendingProps = { ...defaultProps, status: 'pending' as PaymentCardStatus };

    it('renders pending header', () => {
      render(<PaymentStatusCard {...pendingProps} />);
      expect(screen.getByText('Payment Pending')).toBeInTheDocument();
    });

    it('shows waiting message', () => {
      render(<PaymentStatusCard {...pendingProps} />);
      expect(screen.getByText('Waiting for confirmation...')).toBeInTheDocument();
    });

    it('displays amount', () => {
      render(<PaymentStatusCard {...pendingProps} />);
      expect(screen.getByText('₦5,000')).toBeInTheDocument();
    });

    it('has amber styling for pending state', () => {
      const { container } = render(<PaymentStatusCard {...pendingProps} />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-amber-50');
      expect(card).toHaveClass('border-amber-200');
    });

    it('shows spinner animation', () => {
      render(<PaymentStatusCard {...pendingProps} />);
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Failed state', () => {
    const failedProps = {
      ...defaultProps,
      status: 'failed' as PaymentCardStatus,
      onRetry: jest.fn(),
      onChangeMethod: jest.fn(),
    };

    it('renders failed header', () => {
      render(<PaymentStatusCard {...failedProps} />);
      expect(screen.getByText('Payment Failed')).toBeInTheDocument();
    });

    it('displays "NOT charged" reassurance', () => {
      render(<PaymentStatusCard {...failedProps} />);
      expect(screen.getByText('You were NOT charged')).toBeInTheDocument();
    });

    it('shows failure reason when provided', () => {
      render(
        <PaymentStatusCard {...failedProps} failureReason="Card declined" />
      );
      expect(screen.getByText('Card declined')).toBeInTheDocument();
    });

    it('renders retry button', () => {
      render(<PaymentStatusCard {...failedProps} />);
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      render(<PaymentStatusCard {...failedProps} />);
      fireEvent.click(screen.getByText('Try Again'));
      expect(failedProps.onRetry).toHaveBeenCalledTimes(1);
    });

    it('renders change method button', () => {
      render(<PaymentStatusCard {...failedProps} />);
      expect(screen.getByText('Use Different Method')).toBeInTheDocument();
    });

    it('calls onChangeMethod when change method button is clicked', () => {
      render(<PaymentStatusCard {...failedProps} />);
      fireEvent.click(screen.getByText('Use Different Method'));
      expect(failedProps.onChangeMethod).toHaveBeenCalledTimes(1);
    });

    it('has red styling for failed state', () => {
      const { container } = render(<PaymentStatusCard {...failedProps} />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-red-50');
      expect(card).toHaveClass('border-red-200');
    });
  });
});
