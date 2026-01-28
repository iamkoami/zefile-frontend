// Base drawer components
export { default as SideDrawer } from './SideDrawer';
export { default as DrawerFooter } from './DrawerFooter';

// Re-export shared utilities for backwards compatibility
export { default as SearchInput } from '@/components/shared/SearchInput';
export { default as Tabs } from '@/components/shared/Tabs';
export type { Tab } from '@/components/shared/Tabs';
export { default as Pagination } from '@/components/shared/Pagination';
export { default as BulkActionBar } from '@/components/shared/BulkActionBar';

// Re-export moved components from their new locations for backwards compatibility
export { default as TransferItem } from '@/features/transfer/components/TransferItem';
export { default as TransfersPanel } from '@/features/transfer/components/TransfersPanel';
export { default as TransferDetailsPanel } from '@/features/transfer/components/TransferDetailsPanel';
export { default as TransferPreviewPanel } from '@/features/transfer/components/TransferPreviewPanel';
export { default as FilePreviewView } from '@/features/transfer/components/FilePreviewView';
export { default as ContactRow } from '@/features/contacts/components/ContactRow';
export { default as ContactGroup } from '@/features/contacts/components/ContactGroup';
export { default as ContactsPanel } from '@/features/contacts/components/ContactsPanel';
