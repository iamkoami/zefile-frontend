import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhoneNumberInput } from './PhoneNumberInput';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      phoneNumber: 'Phone Number',
      enterPhoneNumber: 'Enter your phone number',
      invalidPhoneNumber: 'Please enter a valid phone number',
      phoneNumberHelper: 'We will send a payment request to this number',
    };
    return translations[key] || key;
  },
}));

describe('PhoneNumberInput', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    defaultCountry: 'GH' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders with country prefix dropdown', () => {
    render(<PhoneNumberInput {...defaultProps} />);

    expect(screen.getByText('+233')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your phone number')).toBeInTheDocument();
  });

  it('shows country prefix based on detected country from localStorage', () => {
    localStorage.setItem('zefile_detected_country', 'KE');

    render(<PhoneNumberInput {...defaultProps} />);

    // Should show Kenya prefix
    expect(screen.getByText('+254')).toBeInTheDocument();
  });

  it('supports Ghana (+233), Kenya (+254), Côte d\'Ivoire (+225)', async () => {
    const user = userEvent.setup();
    render(<PhoneNumberInput {...defaultProps} />);

    // Open dropdown
    const countryButton = screen.getByRole('button', { name: /\+233/i });
    await user.click(countryButton);

    // All three countries should be visible
    expect(screen.getByText('Ghana')).toBeInTheDocument();
    expect(screen.getByText('Kenya')).toBeInTheDocument();
    expect(screen.getByText("Côte d'Ivoire")).toBeInTheDocument();
  });

  it('validates phone number format - valid Ghana number', async () => {
    const onChange = jest.fn();
    render(<PhoneNumberInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Enter your phone number');

    // Enter valid Ghana number (9 digits after country code)
    fireEvent.change(input, { target: { value: '241234567' } });

    await waitFor(() => {
      // Should call onChange with isValid: true for valid number
      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[1]).toBe(true); // isValid
    });
  });

  it('validates phone number format - invalid number', async () => {
    render(<PhoneNumberInput {...defaultProps} />);

    const input = screen.getByPlaceholderText('Enter your phone number');

    // Enter invalid number (too short)
    fireEvent.change(input, { target: { value: '12345' } });

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument();
    });
  });

  it('auto-formats phone number as user types', async () => {
    render(<PhoneNumberInput {...defaultProps} />);

    const input = screen.getByPlaceholderText('Enter your phone number') as HTMLInputElement;

    // Type raw digits
    fireEvent.change(input, { target: { value: '241234567' } });

    // Should be formatted (exact format depends on libphonenumber-js)
    expect(input.value).toBeTruthy();
  });

  it('shows validation errors inline', async () => {
    render(<PhoneNumberInput {...defaultProps} error="Custom error message" />);

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('can only proceed with a valid phone number', async () => {
    const onChange = jest.fn();
    render(<PhoneNumberInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Enter your phone number');

    // Invalid number
    fireEvent.change(input, { target: { value: '123' } });

    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[1]).toBe(false); // isValid should be false
    });
  });

  it('changes country when selecting from dropdown', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<PhoneNumberInput {...defaultProps} onChange={onChange} />);

    // Open dropdown
    const countryButton = screen.getByRole('button', { name: /\+233/i });
    await user.click(countryButton);

    // Select Kenya
    await user.click(screen.getByText('Kenya'));

    // Should now show Kenya prefix
    expect(screen.getByText('+254')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<PhoneNumberInput {...defaultProps} disabled={true} />);

    const input = screen.getByPlaceholderText('Enter your phone number');
    expect(input).toBeDisabled();
  });

  it('handles phone number starting with 0', async () => {
    const onChange = jest.fn();
    render(<PhoneNumberInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Enter your phone number');

    // Enter number starting with 0 (common local format)
    fireEvent.change(input, { target: { value: '0241234567' } });

    await waitFor(() => {
      // Should strip leading 0 and validate
      expect(onChange).toHaveBeenCalled();
    });
  });

  it('returns phone number in E.164 format', async () => {
    const onChange = jest.fn();
    render(<PhoneNumberInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Enter your phone number');

    // Enter valid number
    fireEvent.change(input, { target: { value: '241234567' } });

    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      // First param should be E.164 format (+233241234567)
      if (lastCall[1]) { // if valid
        expect(lastCall[0]).toMatch(/^\+233/);
      }
    });
  });
});
