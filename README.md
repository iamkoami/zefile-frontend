# ZeFile Frontend

**Secure File Transfer Application - Frontend**

A modern, user-friendly file transfer application built with Next.js 15, featuring passwordless authentication, encrypted file transfers, and real-time progress tracking.

![Next.js](https://img.shields.io/badge/Next.js-15.3.4-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-19.0-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8)

---

## Features

✨ **Passwordless Authentication** - OTP-based secure login via email
📁 **Secure File Transfers** - End-to-end encrypted file uploads
📊 **Progress Tracking** - Real-time upload/download progress
🔗 **Short Links** - Easy-to-share transfer links
🔒 **Password Protection** - Optional password protection for transfers
📦 **ZIP Downloads** - Download multiple files as ZIP
📜 **File Certificates** - Integrity verification with SHA-256
⚡ **Fast & Responsive** - Built with Next.js App Router
🎨 **Modern UI** - Beautiful interface with Radix UI & Tailwind

---

## Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Environment Setup](#environment-setup)
- [API Integration](#api-integration)
- [Development](#development)
- [Deployment](#deployment)
- [Tech Stack](#tech-stack)

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see [zefile-backend](https://github.com/iamkoami/zefile-backend))

### Installation

```bash
# Clone the repository
git clone https://github.com/iamkoami/zefile-frontend.git
cd zefile-frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

---

## Project Structure

```
zefile-frontend/
├── app/                        # Next.js App Router
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home page
│   ├── api/                   # API routes
│   └── presentation/          # UI components
│       ├── auth/              # Authentication pages
│       ├── home/              # Home page components
│       └── components/        # Reusable UI components
│
├── services/                   # API Integration Layer
│   ├── api-client.ts          # Core HTTP client
│   ├── auth-api.ts            # Authentication API
│   ├── storage-api.ts         # File storage API
│   ├── transfer-api.ts        # Transfer management API
│   └── index.ts               # Service exports
│
├── features/                   # Feature modules
│   ├── auth/                  # Authentication feature
│   │   ├── data/              # Data layer
│   │   └── domain/            # Business logic
│   └── transfer/              # Transfer feature
│
├── core/                       # Core utilities
│   ├── constants/             # App constants
│   ├── utils/                 # Utility functions
│   └── errors/                # Error handling
│
├── hooks/                      # Custom React hooks
├── lib/                        # Third-party lib configs
├── public/                     # Static assets
├── styles/                     # Global styles
└── types/                      # TypeScript types
```

---

## Environment Setup

### Development (.env.local)

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_TIMEOUT=30000

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SHORT_LINK_DOMAIN=localhost:3001

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG=true

# File Upload
NEXT_PUBLIC_MAX_FILE_SIZE=53687091200
NEXT_PUBLIC_CHUNK_SIZE=5242880
```

### Production (.env.production)

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://api.zefile.io
NEXT_PUBLIC_API_TIMEOUT=30000

# Application URLs
NEXT_PUBLIC_APP_URL=https://zefile.io
NEXT_PUBLIC_SHORT_LINK_DOMAIN=zefile.co

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_DEBUG=false

# File Upload
NEXT_PUBLIC_MAX_FILE_SIZE=53687091200
NEXT_PUBLIC_CHUNK_SIZE=5242880
```

---

## API Integration

The frontend connects to the ZeFile backend API. All API services are located in the `services/` directory.

### Authentication Flow

```typescript
import { authApi } from '@/services';

// 1. Request OTP
const response = await authApi.requestOTP({ email: 'user@example.com' });

// 2. Verify OTP
const auth = await authApi.verifyOTP({ email: 'user@example.com', otp: '123456' });

// 3. User is logged in
console.log(auth.data.user);
```

### File Upload

Upload is three steps, not one: create the transfer, upload each file via multipart, then finalize
(finalize is what sends the notification emails). See `features/home/components/UploadPanel.tsx` for
the production implementation.

```typescript
import { transferApi } from '@/services';
import { multipartUploadService } from '@/services/multipart-upload.service';

// 1. Create the transfer. `priceMajorUnits` is the amount a person types —
//    the server owns the conversion to the minor units the gateway charges in.
const transfer = await transferApi.createTransfer({
  senderId: user.id,
  recipientEmails: ['recipient@example.com'],
  title: 'Project files',
  message: 'Here are your files!',
  priceMajorUnits: 5000,
  currency: 'XOF',
});

// 2. Upload each file in chunks, with progress
for (const file of selectedFiles) {
  await multipartUploadService.uploadFile(
    file,
    transfer.data.shortCode,
    user.id,
    transfer.data.id,
    (progress) => {
      console.log(`Upload progress: ${progress.progress}%`);
    }
  );
}

// 3. Finalize — this is what notifies the sender and recipients
await transferApi.finalizeTransfer(transfer.data.id);

console.log('Share link:', transfer.data.shortCode);
```

> There used to be a single-call `transferApi.createTransferWithFiles()` posting to
> `POST /transfers/with-files`. It was removed by story 144.14: it bypassed the minimum-price floor,
> the minor-unit price scaling and the platform fee, and no component had called it since the
> multipart flow shipped.

### Download Files

```typescript
import { storageApi } from '@/services';

// Get transfer info
const transfer = await storageApi.getTransferInfo('ABC12345');

// Download as ZIP
const zipUrl = await storageApi.getZipDownloadUrl({
  shortCode: 'ABC12345',
});

await storageApi.downloadFile(zipUrl.data.zipUrl, 'transfer.zip');
```

For complete API documentation, see [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md).

---

## Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Development Workflow

1. **Start Backend API**
   ```bash
   cd ../zefile-backend
   npm run start:dev
   ```

2. **Start Frontend**
   ```bash
   npm run dev
   ```

3. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Code Style

This project uses:
- **ESLint** for code linting
- **Prettier** for code formatting (via ESLint)
- **TypeScript** for type safety

---

## Deployment

### Vercel (Recommended)

The easiest way to deploy is using [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/iamkoami/zefile-frontend)

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy!

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

Or use PM2:

```bash
pm2 start npm --name "zefile-frontend" -- start
```

### Environment Variables

Make sure to set these in your deployment platform:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_APP_URL` - Frontend URL
- `NEXT_PUBLIC_SHORT_LINK_DOMAIN` - Short link domain
- All other environment variables from `.env.production`

---

## Tech Stack

### Frontend Framework
- **Next.js 15.3** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type safety

### Styling
- **TailwindCSS 4** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide Icons** - Beautiful icon set

### API Integration
- **Fetch API** - HTTP requests
- **XMLHttpRequest** - File uploads with progress

### Development Tools
- **ESLint** - Code linting
- **Turbopack** - Fast development builds

---

## Related Repositories

- **Backend API**: [zefile-backend](https://github.com/iamkoami/zefile-backend)
- **Documentation**: See BACKEND_INTEGRATION.md for API docs

---

## Features Roadmap

- [ ] Authentication UI components
- [ ] File upload with drag & drop
- [ ] Transfer dashboard
- [ ] Download page with password input
- [ ] Transfer history
- [ ] File preview (images, PDFs)
- [ ] Dark mode
- [ ] Multi-language support
- [ ] Mobile app (React Native)

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Support

For issues and questions:
- Open an [issue](https://github.com/iamkoami/zefile-frontend/issues)
- Contact: [@iamkoami](https://github.com/iamkoami)

---

**Built with ❤️ using Next.js**
