import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface InitializePaymentRequest {
  transferId: string;
  userId: string;
  amount: number; // Amount in kobo (XOF minor units)
  email: string;
  currency: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface InitializePaymentResponse {
  success: boolean;
  message: string;
  data: {
    transactionId: string;
    authorizationUrl: string;
    accessCode: string;
    reference: string;
  };
}

export interface VerifyPaymentRequest {
  reference: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  data: {
    transactionId: string;
    reference: string;
    status: 'success' | 'failed' | 'pending';
    amount: number;
    currency: string;
    paidAt: string;
    channel: string;
  };
}

export interface PaymentStatusResponse {
  success: boolean;
  data: {
    transactionId: string;
    reference: string;
    status: string;
    amount: number;
    currency: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface PublicKeyResponse {
  success: boolean;
  data: {
    publicKey: string;
  };
}

export const paymentApi = {
  /**
   * Initialize a payment transaction
   */
  async initializePayment(data: InitializePaymentRequest): Promise<InitializePaymentResponse> {
    const response = await axios.post(`${API_URL}/payments/initialize`, data);
    return response.data;
  },

  /**
   * Verify a payment transaction
   */
  async verifyPayment(data: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
    const response = await axios.post(`${API_URL}/payments/verify`, data);
    return response.data;
  },

  /**
   * Get payment status by reference
   */
  async getPaymentStatus(reference: string): Promise<PaymentStatusResponse> {
    const response = await axios.get(`${API_URL}/payments/status/${reference}`);
    return response.data;
  },

  /**
   * Get Paystack public key
   */
  async getPublicKey(): Promise<PublicKeyResponse> {
    const response = await axios.get(`${API_URL}/payments/public-key`);
    return response.data;
  },
};
