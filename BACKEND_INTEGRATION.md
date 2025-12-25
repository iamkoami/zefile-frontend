# ZeFile Frontend-Backend Integration Guide

**Last Updated:** December 25, 2025
**Backend API:** http://localhost:3001 (development)
**Backend API (Prod):** https://api.zefile.io

---

## Table of Contents

1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [API Services](#api-services)
4. [Authentication Flow](#authentication-flow)
5. [File Upload/Download](#file-uploaddownload)
6. [Transfer Management](#transfer-management)
7. [Error Handling](#error-handling)
8. [Usage Examples](#usage-examples)

---

## Overview

This document describes how to integrate the ZeFile frontend with the backend API. All API services are located in the `services/` directory.

### Architecture

```
zefile-frontend/
├── services/
│   ├── api-client.ts        # Core HTTP client
│   ├── auth-api.ts           # Authentication endpoints
│   ├── storage-api.ts        # File storage operations
│   ├── transfer-api.ts       # Transfer management
│   └── index.ts              # Centralized exports
```

---

## Environment Setup

### Development (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SHORT_LINK_DOMAIN=localhost:3001
NEXT_PUBLIC_MAX_FILE_SIZE=53687091200
NEXT_PUBLIC_CHUNK_SIZE=5242880
```

### Production (.env.production)

```bash
NEXT_PUBLIC_API_URL=https://api.zefile.io
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_APP_URL=https://zefile.io
NEXT_PUBLIC_SHORT_LINK_DOMAIN=zefile.co
NEXT_PUBLIC_MAX_FILE_SIZE=53687091200
NEXT_PUBLIC_CHUNK_SIZE=5242880
```

---

## API Services

### API Client (`api-client.ts`)

Base HTTP client with authentication, timeout, and error handling.

**Key Features:**
- Automatic token management
- Request timeout (configurable)
- File upload with progress tracking
- Consistent error handling

**Methods:**
```typescript
apiClient.get<T>(endpoint: string): Promise<ApiResponse<T>>
apiClient.post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>>
apiClient.patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>>
apiClient.delete<T>(endpoint: string): Promise<ApiResponse<T>>
apiClient.upload<T>(endpoint: string, formData: FormData, onProgress?: (progress: number) => void): Promise<ApiResponse<T>>
apiClient.setAccessToken(token: string | null): void
apiClient.getAccessToken(): string | null
```

### Auth API (`auth-api.ts`)

Handles authentication operations.

**Endpoints:**
- `POST /auth/request-otp` - Request OTP
- `POST /auth/verify-otp` - Verify OTP and get tokens
- `POST /auth/refresh-token` - Refresh access token
- `POST /auth/logout` - Logout and revoke tokens
- `GET /auth/me` - Get current user

**Methods:**
```typescript
authApi.requestOTP(data: RequestOtpDto): Promise<ApiResponse<OtpResponseDto>>
authApi.verifyOTP(data: VerifyOtpDto): Promise<ApiResponse<AuthResponseDto>>
authApi.refreshToken(refreshToken: string): Promise<ApiResponse>
authApi.logout(): Promise<ApiResponse>
authApi.getCurrentUser(): Promise<ApiResponse>
authApi.isAuthenticated(): boolean
authApi.getStoredUser(): User | null
```

### Storage API (`storage-api.ts`)

Handles file upload, download, and certificate operations.

**Endpoints:**
- `POST /storage/upload` - Upload file
- `POST /storage/download/url` - Get download URL(s)
- `POST /storage/download/zip` - Get ZIP download URL
- `GET /storage/info/:shortCode` - Get transfer info
- `POST /storage/verify-certificate` - Verify file integrity
- `DELETE /storage/transfer/:shortCode` - Delete transfer
- `GET /storage/certificate/:certificateId` - Get certificate

**Methods:**
```typescript
storageApi.uploadFile(file: File, shortCode: string, userId: string, transferId: string, onProgress?: (progress: number) => void): Promise<ApiResponse>
storageApi.getDownloadUrl(data: PresignedUrlRequestDto): Promise<ApiResponse>
storageApi.getZipDownloadUrl(data: ZipDownloadRequestDto): Promise<ApiResponse>
storageApi.getTransferInfo(shortCode: string, password?: string): Promise<ApiResponse>
storageApi.verifyCertificate(certificateId: string): Promise<ApiResponse>
storageApi.deleteTransfer(shortCode: string): Promise<ApiResponse>
storageApi.getCertificate(certificateId: string): Promise<ApiResponse>
storageApi.downloadFile(url: string, filename: string): Promise<void>
storageApi.getShortLinkUrl(shortCode: string): string
```

### Transfer API (`transfer-api.ts`)

Handles transfer creation and management.

**Endpoints:**
- `POST /transfers` - Create transfer
- `POST /transfers/with-files` - Create transfer with files
- `GET /transfers` - Get all transfers
- `GET /transfers/:id` - Get transfer by ID
- `GET /transfers/user/:senderId` - Get transfers by sender
- `GET /transfers/recipient/:email` - Get transfers by recipient
- `PATCH /transfers/:id` - Update transfer
- `DELETE /transfers/:id` - Delete transfer

**Methods:**
```typescript
transferApi.createTransfer(data: CreateTransferDto): Promise<ApiResponse>
transferApi.createTransferWithFiles(data: CreateTransferWithFilesDto, onProgress?: (progress: number) => void): Promise<ApiResponse>
transferApi.getAllTransfers(): Promise<ApiResponse>
transferApi.getTransferById(id: string): Promise<ApiResponse>
transferApi.getTransfersBySender(senderId: string): Promise<ApiResponse>
transferApi.getTransfersByRecipient(email: string): Promise<ApiResponse>
transferApi.updateTransfer(id: string, data: UpdateTransferDto): Promise<ApiResponse>
transferApi.deleteTransfer(id: string): Promise<ApiResponse>
```

---

## Authentication Flow

### 1. Request OTP

```typescript
import { authApi } from '@/services';

// Request OTP
const response = await authApi.requestOTP({ email: 'user@example.com' });

if (response.data) {
  console.log('OTP sent:', response.data.message);
  console.log('Is new user:', response.data.isNewUser);
} else {
  console.error('Error:', response.error?.message);
}
```

### 2. Verify OTP

```typescript
// Verify OTP and login
const response = await authApi.verifyOTP({
  email: 'user@example.com',
  otp: '123456'
});

if (response.data) {
  // Tokens are automatically stored
  console.log('Access token:', response.data.accessToken);
  console.log('User:', response.data.user);

  // Redirect to dashboard
  router.push('/dashboard');
} else {
  console.error('Invalid OTP:', response.error?.message);
}
```

### 3. Check Authentication

```typescript
// Check if user is authenticated
if (authApi.isAuthenticated()) {
  const user = authApi.getStoredUser();
  console.log('Logged in as:', user?.email);
}
```

### 4. Refresh Token

```typescript
// Refresh access token when it expires
const refreshToken = localStorage.getItem('refresh_token');
if (refreshToken) {
  const response = await authApi.refreshToken(refreshToken);

  if (response.data) {
    console.log('Token refreshed');
  } else {
    // Refresh token expired, redirect to login
    router.push('/auth/login');
  }
}
```

### 5. Logout

```typescript
// Logout
const response = await authApi.logout();

if (response.data) {
  console.log('Logged out successfully');
  router.push('/auth/login');
}
```

---

## File Upload/Download

### Upload Files

```typescript
import { storageApi, transferApi } from '@/services';
import { useState } from 'react';

function FileUpload() {
  const [progress, setProgress] = useState(0);

  const handleUpload = async (files: File[]) => {
    const user = authApi.getStoredUser();

    // Create transfer with files
    const response = await transferApi.createTransferWithFiles(
      {
        senderId: user.id,
        recipientEmail: 'recipient@example.com',
        message: 'Here are your files!',
        files: files,
      },
      (progress) => {
        setProgress(progress);
        console.log(`Upload progress: ${progress.toFixed(2)}%`);
      }
    );

    if (response.data) {
      console.log('Transfer created:', response.data.shortCode);
      console.log('Share link:', storageApi.getShortLinkUrl(response.data.shortCode));
    }
  };

  return (
    <div>
      <input type="file" multiple onChange={(e) => handleUpload(Array.from(e.target.files || []))} />
      {progress > 0 && <div>Progress: {progress.toFixed(0)}%</div>}
    </div>
  );
}
```

### Download Files

```typescript
// Get transfer info
const response = await storageApi.getTransferInfo('ABC12345', 'optional-password');

if (response.data) {
  const transfer = response.data;
  console.log('Files:', transfer.files);

  // Download single file
  const urlResponse = await storageApi.getDownloadUrl({
    shortCode: 'ABC12345',
    fileIds: [transfer.files[0].id],
  });

  if (urlResponse.data) {
    const fileUrl = urlResponse.data.urls[0].url;
    await storageApi.downloadFile(fileUrl, transfer.files[0].filename);
  }

  // Download all files as ZIP
  const zipResponse = await storageApi.getZipDownloadUrl({
    shortCode: 'ABC12345',
  });

  if (zipResponse.data) {
    await storageApi.downloadFile(zipResponse.data.zipUrl, `transfer-${transfer.shortCode}.zip`);
  }
}
```

---

## Transfer Management

### Create Transfer (Without Files)

```typescript
const response = await transferApi.createTransfer({
  senderId: user.id,
  recipientEmail: 'recipient@example.com',
  amount: 100,
  currency: 'USD',
  message: 'Payment for services',
  password: 'secret123', // Optional
  maxDownloads: 3, // Optional
});

if (response.data) {
  console.log('Transfer created:', response.data.shortCode);
}
```

### Get User's Transfers

```typescript
// Get all transfers sent by user
const response = await transferApi.getTransfersBySender(user.id);

if (response.data) {
  response.data.forEach(transfer => {
    console.log(`${transfer.shortCode}: ${transfer.status}`);
  });
}

// Get transfers received by email
const receivedResponse = await transferApi.getTransfersByRecipient(user.email);
```

### Update Transfer Status

```typescript
await transferApi.updateTransferStatus(transferId, 'completed');
```

---

## Error Handling

All API responses follow this structure:

```typescript
interface ApiResponse<T> {
  data?: T;          // Success response data
  error?: {          // Error information
    message: string;
    statusCode: number;
    error?: string;
  };
  status: number;    // HTTP status code
}
```

### Handling Errors

```typescript
const response = await authApi.requestOTP({ email: 'invalid' });

if (response.error) {
  switch (response.error.statusCode) {
    case 400:
      console.error('Validation error:', response.error.message);
      break;
    case 401:
      console.error('Unauthorized');
      router.push('/auth/login');
      break;
    case 404:
      console.error('Not found');
      break;
    case 429:
      console.error('Rate limited, please try again later');
      break;
    case 0:
      console.error('Network error');
      break;
    default:
      console.error('Server error');
  }
}
```

---

## Usage Examples

### Complete Authentication Flow

```typescript
'use client';

import { useState } from 'react';
import { authApi } from '@/services';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const response = await authApi.requestOTP({ email });

    if (response.data) {
      setStep('otp');
    } else {
      setError(response.error?.message || 'Failed to send OTP');
    }

    setLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const response = await authApi.verifyOTP({ email, otp });

    if (response.data) {
      router.push('/dashboard');
    } else {
      setError(response.error?.message || 'Invalid OTP');
    }

    setLoading(false);
  };

  if (step === 'email') {
    return (
      <form onSubmit={handleRequestOTP}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send OTP'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyOTP}>
      <input
        type="text"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter 6-digit OTP"
        maxLength={6}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Verifying...' : 'Verify OTP'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

### Complete File Upload Flow

```typescript
'use client';

import { useState } from 'react';
import { transferApi, storageApi } from '@/services';

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [shortCode, setShortCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const user = authApi.getStoredUser();
    if (!user) return;

    const response = await transferApi.createTransferWithFiles(
      {
        senderId: user.id,
        recipientEmail,
        message,
        files,
      },
      (progress) => setProgress(progress)
    );

    if (response.data) {
      setShortCode(response.data.shortCode);
      const shareLink = storageApi.getShortLinkUrl(response.data.shortCode);
      console.log('Share this link:', shareLink);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={recipientEmail}
        onChange={(e) => setRecipientEmail(e.target.value)}
        placeholder="Recipient email"
        required
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message (optional)"
      />
      <input
        type="file"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
        required
      />
      <button type="submit" disabled={loading || files.length === 0}>
        {loading ? `Uploading ${progress.toFixed(0)}%` : 'Send Files'}
      </button>
      {shortCode && (
        <div>
          <p>Transfer created successfully!</p>
          <p>Share link: {storageApi.getShortLinkUrl(shortCode)}</p>
        </div>
      )}
    </form>
  );
}
```

---

## Rate Limiting

The backend enforces rate limiting on public endpoints:

- **OTP Request:** 5 requests per minute
- **OTP Verification:** 10 requests per minute
- **Download URL:** 20 requests per minute
- **ZIP Download:** 10 requests per minute

Handle `429 Too Many Requests` errors appropriately.

---

## CORS Configuration

The backend is configured to accept requests from:
- Development: `http://localhost:3000`
- Production: `https://zefile.io`

Ensure your frontend URL matches the backend CORS configuration.

---

## Next Steps

1. Implement authentication UI components
2. Create file upload/download components
3. Add transfer management dashboard
4. Implement error toast notifications
5. Add loading states and progress indicators
6. Set up token refresh logic
7. Add integration tests

---

**Maintained by:** ZeFile Development Team
**Backend Repository:** [zefile-backend](https://github.com/iamkoami/zefile-backend)
**Last Review:** December 25, 2025
