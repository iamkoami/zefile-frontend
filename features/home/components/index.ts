/**
 * Home feature components
 *
 * Upload flow components for the main page
 */

// Upload flow components
export { default as UploadPanel } from './UploadPanel';
export { default as UploadProgressPanel } from './UploadProgressPanel';
export { default as OTPVerification } from './OTPVerification';
export { default as CancelConfirmationPanel } from './CancelConfirmationPanel';
export { default as MultiEmailInput } from './MultiEmailInput';
export { default as GlobalDragDropOverlay } from './GlobalDragDropOverlay';
export { default as CelebrationModal } from './CelebrationModal';
export { default as PaperPlaneAnimation } from '@/components/shared/PaperPlaneAnimation';
export { default as HeroText } from '@/components/shared/HeroText';
export { default as TimeOfDayBackground } from '@/components/shared/TimeOfDayBackground';

// Re-export transfer components for backwards compatibility
export { TransferOptionsPanel } from '@/features/transfer/components';
export { TransferCompletePanel } from '@/features/transfer/components';
export { FilePreviewPanel } from '@/features/transfer/components';
export { TransferPreviewModal } from '@/features/transfer/components';
