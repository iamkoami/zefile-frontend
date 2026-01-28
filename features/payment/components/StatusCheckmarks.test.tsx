import { render, screen } from '@testing-library/react';
import { StatusCheckmarks, TransferStatusLevel } from './StatusCheckmarks';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      statusSent: 'Sent',
      statusPaid: 'Paid',
      statusDownloaded: 'Downloaded',
    };
    return translations[key] || key;
  },
}));

describe('StatusCheckmarks', () => {
  describe('checkmark count', () => {
    it('renders 1 checkmark for "sent" status', () => {
      render(<StatusCheckmarks status="sent" />);
      const checkmarks = document.querySelectorAll('svg');
      expect(checkmarks).toHaveLength(1);
    });

    it('renders 2 checkmarks for "paid" status', () => {
      render(<StatusCheckmarks status="paid" />);
      const checkmarks = document.querySelectorAll('svg');
      expect(checkmarks).toHaveLength(2);
    });

    it('renders 3 checkmarks for "downloaded" status', () => {
      render(<StatusCheckmarks status="downloaded" />);
      const checkmarks = document.querySelectorAll('svg');
      expect(checkmarks).toHaveLength(3);
    });

    it('defaults to 1 checkmark for unknown status', () => {
      render(<StatusCheckmarks status={'unknown' as TransferStatusLevel} />);
      const checkmarks = document.querySelectorAll('svg');
      expect(checkmarks).toHaveLength(1);
    });
  });

  describe('colors', () => {
    it('applies gray color for "sent" status', () => {
      render(<StatusCheckmarks status="sent" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveClass('text-gray-400');
    });

    it('applies purple color for "paid" status', () => {
      render(<StatusCheckmarks status="paid" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveClass('text-[#5E53E0]');
    });

    it('applies green color for "downloaded" status', () => {
      render(<StatusCheckmarks status="downloaded" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveClass('text-[#87E64B]');
    });
  });

  describe('labels', () => {
    it('does not show labels by default', () => {
      render(<StatusCheckmarks status="sent" />);
      expect(screen.queryByText('Sent')).not.toBeInTheDocument();
    });

    it('shows label when showLabels is true', () => {
      render(<StatusCheckmarks status="sent" showLabels />);
      expect(screen.getByText('Sent')).toBeInTheDocument();
    });

    it('shows "Paid" label for paid status', () => {
      render(<StatusCheckmarks status="paid" showLabels />);
      expect(screen.getByText('Paid')).toBeInTheDocument();
    });

    it('shows "Downloaded" label for downloaded status', () => {
      render(<StatusCheckmarks status="downloaded" showLabels />);
      expect(screen.getByText('Downloaded')).toBeInTheDocument();
    });

    it('applies correct color to labels', () => {
      render(<StatusCheckmarks status="downloaded" showLabels />);
      const label = screen.getByText('Downloaded');
      expect(label).toHaveClass('text-[#87E64B]');
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <StatusCheckmarks status="sent" className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
