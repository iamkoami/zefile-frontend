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

// Blog
export { blogApi, type BlogPostDto, type BlogListResponseDto, type SitemapSlugDto } from './blog-api';

// Transfers
export {
  transferApi,
  type CreateTransferDto,
  type TransferDto,
  type UpdateTransferDto,
} from './transfer-api';

// Invoices
export {
  invoicesApi,
  InvoiceType,
  type InvoiceDto,
  type ListInvoicesParams,
  type PaginatedInvoicesResponse,
  type DownloadInvoiceResponse,
} from './invoices-api';

// Referrals
export {
  referralsApi,
  type ReferralStats,
  type ReferralHistoryItem,
  type ReferralHistoryResponse,
  type ReferralMyCode,
  type ApplyCodeResult,
  type ShareMessage,
  type ValidateCodeResult,
} from './referrals-api';
