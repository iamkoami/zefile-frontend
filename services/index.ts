/**
 * API Services Index
 * Central export for all API services
 */

// Core API Client
export { apiClient, type ApiResponse, type ApiError } from './api-client';

// Authentication
export { authApi, type RequestOtpDto, type OtpResponseDto, type VerifyOtpDto, type AuthResponseDto, type RefreshTokenDto } from './auth-api';

// Storage
export {
  storageApi,
  type UploadFileDto,
  type UploadResultDto,
  type FileCertificateDto,
  type PresignedUrlRequestDto,
  type PresignedUrlResponseDto,
  type ZipDownloadRequestDto,
  type ZipDownloadResponseDto,
  type TransferInfoDto,
  type VerifyCertificateDto,
  type CertificateVerificationDto,
} from './storage-api';

// Transfers
export {
  transferApi,
  type CreateTransferDto,
  type CreateTransferWithFilesDto,
  type TransferDto,
  type UpdateTransferDto,
} from './transfer-api';
