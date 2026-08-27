/**
 * Transfer feature components
 *
 * This module exports all transfer-related components including:
 * - Transfer list and detail views
 * - File preview components
 * - Transfer creation/completion panels
 * - Version history management
 */

// Transfer list components
export { default as TransfersPanel } from './TransfersPanel';
export { default as TransferItem } from './TransferItem';

// Transfer detail components
export { default as TransferDetailsPanel } from './TransferDetailsPanel';
export { default as TransferPreviewPanel } from './TransferPreviewPanel';
export { default as TransferInsightsSection } from './TransferInsightsSection';

// Transfer creation/completion components
export { default as TransferOptionsPanel } from './TransferOptionsPanel';
export { default as TransferCompletePanel } from './TransferCompletePanel';
export { default as TransferPreviewModal } from './TransferPreviewModal';

// File preview components
export { default as FilePreviewPanel } from './FilePreviewPanel';
export { default as FilePreviewView } from './FilePreviewView';

// Version management components
export { default as VersionHistorySection } from './VersionHistorySection';
export { default as VersionUploadModal } from './VersionUploadModal';

// Reuse transfer modal
export { default as ReuseTransferModal } from './ReuseTransferModal';

// Stream playback components (Story 135.6)
//
// ⚠ `StreamPlayer` IS DELIBERATELY ABSENT FROM THIS BARREL AND MUST STAY ABSENT.
//
// A static re-export here would put it in the import graph of every module that touches this
// barrel — including drawer components rendered on ordinary pages — and webpack would then pull
// 748 KB of Shaka Player into the server graph, which is precisely what the `ssr: false` dynamic
// import on the sale page exists to prevent. The deploy would break with a green `npm run build`.
// Import it as `dynamic(() => import('@/features/transfer/components/StreamPlayer'), { ssr: false })`
// at its use site, never from here.
//
// `PlaybackStatePanel` carries no such weight and exports normally.
export { default as PlaybackStatePanel } from './PlaybackStatePanel';
export type { PlaybackState, PlaybackStatePanelProps } from './PlaybackStatePanel';

// `StreamWatermarkOverlay` (story 135.7) is safe to export here for the same reason as
// `PlaybackStatePanel`: it pulls in no media library, so it adds nothing to the edge bundle. Its
// ONLY render site is inside `StreamPlayer` — AC8 turns on that being true, because mounting it on
// the free trailer would put a buyer's identity in front of a signed-out visitor.
export { default as StreamWatermarkOverlay, maskEmail } from './StreamWatermarkOverlay';
export type { StreamWatermarkOverlayProps } from './StreamWatermarkOverlay';

// `StreamAccessBanner` (story 135.11). Safe here for the same reason as the two above: it pulls in
// no media library and adds nothing to the edge bundle. Its only render site is the sale page's
// `sale-preview` block, where it replaces the purchase action for a buyer who already owns the film.
export { default as StreamAccessBanner } from './StreamAccessBanner';
export type { StreamAccessBannerProps, StreamAccessBannerState } from './StreamAccessBanner';
