/**
 * Supported file types for ZeFile
 * Only files with preview generation capability are allowed
 */

export const SUPPORTED_FILE_TYPES = {
  // Images
  IMAGES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff',
  ],

  // Videos
  VIDEOS: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-flv',
    'video/webm',
    'video/x-matroska',
    'video/avi',
    'video/mov',
  ],

  // PDFs
  PDFS: ['application/pdf'],

  // Audio
  AUDIO: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/ogg',
    'audio/webm',
    'audio/aac',
    'audio/x-m4a',
    'audio/flac',
  ],

  // Documents
  DOCUMENTS: [
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/plain', // .txt
    'text/csv', // .csv
    'application/rtf', // .rtf
  ],

  // Archives
  ARCHIVES: [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-tar',
  ],
};

/**
 * Get all supported MIME types as a flat array
 */
export const getAllSupportedMimeTypes = (): string[] => {
  return [
    ...SUPPORTED_FILE_TYPES.IMAGES,
    ...SUPPORTED_FILE_TYPES.VIDEOS,
    ...SUPPORTED_FILE_TYPES.PDFS,
    ...SUPPORTED_FILE_TYPES.AUDIO,
    ...SUPPORTED_FILE_TYPES.DOCUMENTS,
    ...SUPPORTED_FILE_TYPES.ARCHIVES,
  ];
};

/**
 * Check if a MIME type is supported
 */
export const isSupportedMimeType = (mimeType: string): boolean => {
  const normalizedType = mimeType.toLowerCase();
  return getAllSupportedMimeTypes().includes(normalizedType);
};

/**
 * Get file extensions for supported MIME types
 */
export const SUPPORTED_EXTENSIONS = {
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  tif: 'image/tiff',

  // Videos
  mp4: 'video/mp4',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  flv: 'video/x-flv',
  webm: 'video/webm',
  mkv: 'video/x-matroska',

  // PDFs
  pdf: 'application/pdf',

  // Audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  aac: 'audio/aac',
  m4a: 'audio/x-m4a',
  flac: 'audio/flac',

  // Documents
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  rtf: 'application/rtf',

  // Archives
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
  gz: 'application/gzip',
  tar: 'application/x-tar',
};

/**
 * Get accept attribute value for file input.
 * Includes both MIME types and file extensions so browsers
 * can match files whose MIME type they don't recognise (e.g. .mkv).
 */
export const getFileInputAccept = (): string => {
  const mimeTypes = getAllSupportedMimeTypes();
  const extensions = Object.keys(SUPPORTED_EXTENSIONS).map((ext) => `.${ext}`);
  return [...mimeTypes, ...extensions].join(',');
};

/**
 * Get list of supported extensions for display
 */
export const getSupportedExtensionsDisplay = (): string => {
  const extensions = Object.keys(SUPPORTED_EXTENSIONS);
  return extensions.map(ext => `.${ext}`).join(', ');
};

/**
 * Get supported MIME type for a file extension
 */
const getMimeTypeForExtension = (filename: string): string | undefined => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return undefined;
  return (SUPPORTED_EXTENSIONS as Record<string, string>)[ext];
};

/**
 * Validate file against supported types
 * @param file - The file to validate
 * @param options - Optional validation options
 * @param options.maxSizeBytes - Maximum file size in bytes
 */
export const validateFile = (
  file: File,
  options?: { maxSizeBytes?: number }
): { valid: boolean; error?: string } => {
  // F-3.3: Check file size if maxSizeBytes is provided
  if (options?.maxSizeBytes && file.size > options.maxSizeBytes) {
    const maxSizeMB = Math.round(options.maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `File "${file.name}" exceeds the maximum size of ${maxSizeMB} MB.`,
    };
  }

  // Check MIME type
  const mimeSupported = isSupportedMimeType(file.type);

  // F-3.2: Also validate file extension alongside MIME type
  const extMime = getMimeTypeForExtension(file.name);
  const extSupported = extMime !== undefined;

  if (!mimeSupported && !extSupported) {
    return {
      valid: false,
      error: `Unsupported file type: "${file.name}". Accepted types: images, videos, PDFs, audio, documents, archives.`,
    };
  }

  return { valid: true };
};

/**
 * Validate multiple files
 */
export const validateFiles = (files: File[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  files.forEach((file) => {
    const validation = validateFile(file);
    if (!validation.valid && validation.error) {
      errors.push(validation.error);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Human-readable file type categories
 */
export const FILE_TYPE_CATEGORIES = {
  images: 'Images (JPG, PNG, GIF, WebP, BMP, TIFF)',
  videos: 'Videos (MP4, AVI, MOV, WebM, MKV, FLV)',
  pdfs: 'PDFs',
  audio: 'Audio (MP3, WAV, OGG, AAC, M4A, FLAC)',
  documents: 'Documents (Word, Excel, PowerPoint, TXT, CSV, RTF)',
  archives: 'Archives (ZIP, RAR, 7Z, TAR, GZ)',
};
