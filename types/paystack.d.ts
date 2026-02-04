/**
 * Type declarations for @paystack/inline-js
 */
declare module '@paystack/inline-js' {
  interface PaystackCheckoutOptions {
    key: string;
    email: string;
    amount: number;
    currency?: string;
    ref?: string;
    metadata?: Record<string, unknown>;
    onSuccess?: (response: { reference: string; trans: string; status: string; message: string }) => void;
    onCancel?: () => void;
    onError?: (error: Error) => void;
    onClose?: () => void;
    onLoad?: () => void;
    channels?: ('card' | 'bank' | 'ussd' | 'qr' | 'mobile_money' | 'bank_transfer')[];
    label?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    subaccount?: string;
    transaction_charge?: number;
    bearer?: 'account' | 'subaccount';
    split_code?: string;
    split?: {
      type: 'percentage' | 'flat';
      bearer_type: 'account' | 'subaccount' | 'all' | 'all-proportional';
      bearer_subaccount?: string;
      subaccounts: Array<{
        subaccount: string;
        share: number;
      }>;
    };
  }

  class PaystackPop {
    constructor();
    checkout(options: PaystackCheckoutOptions): void;
    resumeTransaction(accessCode: string): void;
    cancelTransaction(): void;
  }

  export default PaystackPop;
}
