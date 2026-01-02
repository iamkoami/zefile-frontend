import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3333';

export interface RecipientOTPRequestDto {
  email: string;
  shortCode: string;
  purpose?: string;
}

export interface RecipientOTPVerifyDto {
  email: string;
  shortCode: string;
  otp: string;
}

export interface RecipientOTPResponse {
  success: boolean;
  message: string;
  expiresIn?: number;
  cooldown?: number;
}

export interface RecipientVerifyResponse {
  success: boolean;
  message: string;
  transferId?: string;
}

export class RecipientApiService {
  private static instance: RecipientApiService;

  private constructor() {}

  public static getInstance(): RecipientApiService {
    if (!RecipientApiService.instance) {
      RecipientApiService.instance = new RecipientApiService();
    }
    return RecipientApiService.instance;
  }

  /**
   * Request OTP for recipient to access a transfer
   */
  async requestOTP(data: RecipientOTPRequestDto): Promise<RecipientOTPResponse> {
    try {
      const response = await axios.post<RecipientOTPResponse>(
        `${API_BASE_URL}/transfers/recipient/request-otp`,
        data
      );
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to request OTP');
      }
      throw new Error('Network error. Please try again.');
    }
  }

  /**
   * Verify OTP for recipient to access a transfer
   */
  async verifyOTP(data: RecipientOTPVerifyDto): Promise<RecipientVerifyResponse> {
    try {
      const response = await axios.post<RecipientVerifyResponse>(
        `${API_BASE_URL}/transfers/recipient/verify-otp`,
        data
      );
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to verify OTP');
      }
      throw new Error('Network error. Please try again.');
    }
  }
}

export const recipientApi = RecipientApiService.getInstance();
