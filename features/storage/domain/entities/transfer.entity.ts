/**
 * Transfer Entity
 * Domain model for file transfers
 */

export interface FileEntity {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface TransferEntity {
  id: string;
  shortCode: string;
  recipientEmail: string;
  senderEmail: string;
  message?: string;
  expiryDate: string;
  downloadCount: number;
  maxDownloads?: number;
  files: FileEntity[];
  hasPassword: boolean;
  status: string;
}

export interface TrackingParams {
  z_exp?: string;      // Expiration timestamp
  z_sid?: string;      // Session ID
  z_src?: string;      // Source (link/email/qr)
  z_network?: string;  // Network type (direct/social/sms)
  z_ts?: string;       // Timestamp
}
