/**
 * Get Transfer By Short Code Use Case
 * Fetches transfer information using the short code
 */

import { TransferEntity } from '../entities/transfer.entity';
import { storageApi } from '@/services/storage-api';

export interface GetTransferByCodeParams {
  shortCode: string;
  password?: string;
}

export class GetTransferByCodeUseCase {
  async execute(params: GetTransferByCodeParams): Promise<TransferEntity> {
    const { shortCode, password } = params;

    const response = await storageApi.getTransferInfo(shortCode, password);

    if (response.error) {
      throw new Error(response.error.message || 'Failed to fetch transfer information');
    }

    if (!response.data) {
      throw new Error('No transfer data received');
    }

    // Map API response to domain entity
    const transfer: TransferEntity = {
      id: response.data.id,
      shortCode: response.data.shortCode,
      recipientEmail: response.data.recipientEmail,
      senderEmail: response.data.senderEmail,
      message: response.data.message,
      expiryDate: response.data.expiryDate,
      downloadCount: response.data.downloadCount,
      maxDownloads: response.data.maxDownloads,
      files: response.data.files,
      hasPassword: response.data.hasPassword,
      status: response.data.status,
    };

    return transfer;
  }
}

// Export singleton instance
export const getTransferByCodeUseCase = new GetTransferByCodeUseCase();
