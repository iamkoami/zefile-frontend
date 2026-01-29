/**
 * Icon System - Iconoir React
 *
 * This file provides a centralized icon export for the application.
 * All icons are from iconoir-react: https://iconoir.com/docs/packages/iconoir-react
 *
 * Migration from lucide-react to iconoir-react mapping:
 * - X → Xmark
 * - Check → Check
 * - ChevronDown/Left/Right/Up → NavArrowDown/Left/Right/Up
 * - AlertCircle → WarningCircle
 * - AlertTriangle → WarningTriangle
 * - FileText → PageEdit
 * - Image → MediaImage
 * - Film → VideoCamera
 * - Music → MusicDoubleNote
 * - Archive → Archive
 * - File → Page
 * - RefreshCw → Refresh
 * - Sparkles → Sparks
 * - CheckCircle/CheckCircle2 → CheckCircle
 * - XCircle → XmarkCircle
 */

// Re-export all icons from iconoir-react with consistent naming
export {
  // Close/Dismiss
  Xmark,

  // Checkmarks
  Check,
  CheckCircle,

  // Navigation arrows
  NavArrowDown,
  NavArrowLeft,
  NavArrowRight,
  NavArrowUp,

  // Alerts & Warnings
  WarningCircle,
  WarningTriangle,
  InfoCircle,

  // File types
  PageEdit,       // Document/FileText
  MediaImage,     // Image
  VideoCamera,    // Video/Film
  MusicDoubleNote, // Audio/Music
  Archive,        // ZIP/Archive
  Page,           // Generic file
  MultiplePages,  // Multiple files

  // Actions
  Download,
  Search,
  Refresh,
  Eye,
  EyeClosed,
  SendDiagonal,   // Send
  Trash,
  Plus,
  Minus,

  // Payment
  CreditCard,
  SmartphoneDevice, // Smartphone
  Lock,

  // Users & Contacts
  User,
  Building,
  Mail,
  Phone,
  Globe,

  // Time
  Clock,
  Calendar,

  // Subscription tiers
  Crown,
  Sparks,         // Sparkles
  Flash,          // Zap/Lightning

  // Status
  XmarkCircle,

  // Sort
  SortUp,
  SortDown,
  Sort,

  // Arrows
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,

  // Media
  PlaySolid,

  // Report/Flag
  ReportColumns,
  WhiteFlag,
  TriangleFlag,
  TriangleFlagCircle,

  // Social Media
  Tiktok,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Twitter,
} from 'iconoir-react';

// Icon size constants for consistency
export const ICON_SIZES = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

// Default icon props for consistency
export const defaultIconProps = {
  strokeWidth: 1.5,
  width: ICON_SIZES.md,
  height: ICON_SIZES.md,
} as const;

// Helper to get file type icon component
// Returns the icon component for rendering
import { MediaImage, VideoCamera, MusicDoubleNote, Archive, PageEdit, Page } from 'iconoir-react';
import type { ComponentType, SVGProps } from 'react';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const fileTypeIconMap: Record<string, IconComponent> = {
  image: MediaImage,
  video: VideoCamera,
  audio: MusicDoubleNote,
  archive: Archive,
  document: PageEdit,
  pdf: PageEdit,
  default: Page,
};

export const getFileTypeIcon = (fileType: string): IconComponent => {
  return fileTypeIconMap[fileType] || fileTypeIconMap.default;
};
