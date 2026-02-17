'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Flag from 'react-flagpack';
import { Upload, Check, NavArrowDown, Trash } from 'iconoir-react';
import {
  kycApi,
  DocumentType,
  IdDocumentType,
  KycDocumentResponse,
  PendingDocumentsResponse,
} from '@/services/kyc-api';
import { toast } from '@/components/shared/Toast';

interface KYCUploadPanelProps {
  /** Callback when submission is complete */
  onSubmitSuccess?: () => void;
  /** Additional class names */
  className?: string;
}

// Supported countries for KYC
const COUNTRIES = [
  { code: 'CI', name: 'Côte d\'Ivoire', nameFr: 'Côte d\'Ivoire', flagCode: 'CI' },
  { code: 'GH', name: 'Ghana', nameFr: 'Ghana', flagCode: 'GH' },
  { code: 'KE', name: 'Kenya', nameFr: 'Kenya', flagCode: 'KE' },
  { code: 'NG', name: 'Nigeria', nameFr: 'Nigeria', flagCode: 'NG' },
  { code: 'SN', name: 'Senegal', nameFr: 'Sénégal', flagCode: 'SN' },
  { code: 'ZA', name: 'South Africa', nameFr: 'Afrique du Sud', flagCode: 'ZA' },
];

// Document types for KYC
const DOCUMENT_TYPES: { value: IdDocumentType; labelKey: string }[] = [
  { value: 'national_id', labelKey: 'nationalId' },
  { value: 'passport', labelKey: 'passport' },
  { value: 'drivers_license', labelKey: 'driversLicense' },
  { value: 'residence_permit', labelKey: 'residencePermit' },
];

// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * KYCUploadPanel - Document upload panel for KYC verification
 *
 * Story 4.2: KYC Document Submission
 */
export function KYCUploadPanel({
  onSubmitSuccess,
  className = '',
}: KYCUploadPanelProps) {
  const t = useTranslations('kyc');

  // Form state
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedDocType, setSelectedDocType] = useState<IdDocumentType | ''>('');
  const [idNumber, setIdNumber] = useState<string>('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Dropdown state
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isDocTypeDropdownOpen, setIsDocTypeDropdownOpen] = useState(false);

  // Upload state
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocumentsResponse | null>(null);
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<DocumentType, number>>({
    id_front: 0,
    id_back: 0,
    selfie: 0,
  });

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for dropdowns
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const docTypeDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch pending documents on mount
  useEffect(() => {
    const fetchPendingDocuments = async () => {
      try {
        const response = await kycApi.getPendingDocuments();
        if (response.data) {
          setPendingDocuments(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch pending documents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPendingDocuments();
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
      if (docTypeDropdownRef.current && !docTypeDropdownRef.current.contains(event.target as Node)) {
        setIsDocTypeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Validate file
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return t('invalidFileType');
    }
    if (file.size > MAX_FILE_SIZE) {
      return t('fileTooLarge');
    }
    return null;
  };

  // Handle file upload
  const handleFileUpload = async (file: File, type: DocumentType) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    // Validate country and doc type are selected for ID documents
    if ((type === 'id_front' || type === 'id_back') && (!selectedCountry || !selectedDocType)) {
      toast.error(t('selectCountryAndDocType'));
      return;
    }

    setUploadingType(type);
    setUploadProgress(prev => ({ ...prev, [type]: 10 }));

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => ({
          ...prev,
          [type]: Math.min(prev[type] + 10, 90),
        }));
      }, 200);

      const response = await kycApi.uploadDocument(
        file,
        type,
        type !== 'selfie' ? (selectedDocType as IdDocumentType) : undefined,
        selectedCountry || undefined,
        type !== 'selfie' ? idNumber || undefined : undefined,
      );

      clearInterval(progressInterval);

      if (response.error) {
        toast.error(response.error.message || t('uploadFailed'));
        setUploadProgress(prev => ({ ...prev, [type]: 0 }));
      } else {
        setUploadProgress(prev => ({ ...prev, [type]: 100 }));
        toast.success(t('documentUploaded'));

        // Refresh pending documents
        const pendingResponse = await kycApi.getPendingDocuments();
        if (pendingResponse.data) {
          setPendingDocuments(pendingResponse.data);
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(t('uploadFailed'));
      setUploadProgress(prev => ({ ...prev, [type]: 0 }));
    } finally {
      setUploadingType(null);
    }
  };

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent, type: DocumentType) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileUpload(file, type);
      }
    },
    [selectedCountry, selectedDocType],
  );

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: DocumentType) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, type);
    }
    // Reset input
    e.target.value = '';
  };

  // Handle document deletion
  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await kycApi.deleteDocument(documentId);
      if (response.error) {
        toast.error(response.error.message || t('deleteFailed'));
      } else {
        toast.success(t('documentDeleted'));
        // Refresh pending documents
        const pendingResponse = await kycApi.getPendingDocuments();
        if (pendingResponse.data) {
          setPendingDocuments(pendingResponse.data);
        }
      }
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(t('deleteFailed'));
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isConfirmed) {
      toast.error(t('pleaseConfirm'));
      return;
    }

    if (!pendingDocuments?.isComplete) {
      toast.error(t('uploadRequiredDocuments'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await kycApi.submitForReview();
      if (response.error) {
        toast.error(response.error.message || t('submissionFailed'));
      } else {
        toast.success(t('submissionSuccess'));
        onSubmitSuccess?.();
      }
    } catch (error) {
      console.error('Submission failed:', error);
      toast.error(t('submissionFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get uploaded document by type
  const getDocumentByType = (type: DocumentType): KycDocumentResponse | undefined => {
    return pendingDocuments?.documents.find(d => d.type === type);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Render upload zone
  const renderUploadZone = (type: DocumentType, labelKey: string) => {
    const document = getDocumentByType(type);
    const isUploading = uploadingType === type;
    const progress = uploadProgress[type];

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#171717]">{t(labelKey)}</label>

        {document ? (
          // Uploaded document display
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#87E64B]/20 rounded flex items-center justify-center">
                <Check className="w-4 h-4 text-[#87E64B]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#171717] truncate max-w-[200px]">
                  {document.originalFilename}
                </p>
                <p className="text-xs text-gray-500">{formatFileSize(document.fileSize)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDeleteDocument(document.id)}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title={t('delete')}
            >
              <Trash className="w-4 h-4" />
            </button>
          </div>
        ) : (
          // Upload zone
          <div
            className={`relative border-2 border-dashed rounded p-6 text-center transition-colors ${
              isUploading
                ? 'border-[#5E53E0] bg-[#5E53E0]/5'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, type)}
          >
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={e => handleFileChange(e, type)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />

            {isUploading ? (
              <div className="space-y-2">
                <p className="text-sm text-[#5E53E0]">{t('uploading')}...</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#5E53E0] h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{progress}%</p>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-[#171717]">
                  <span className="font-medium text-[#5E53E0]">{t('clickToUpload')}</span>{' '}
                  {t('orDragDrop')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, JPG, JPEG, PNG {t('lessThan')} 10 MB
                </p>
                <p className="text-xs text-gray-400 mt-1">{t('ensureReadable')}</p>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="animate-spin w-8 h-8 border-2 border-[#5E53E0] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-[#171717]">{t('identityVerification')}</h2>
      </div>

      {/* Section: Upload ID */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-[#171717]">{t('uploadIdentityProof')}</h3>
          <p className="text-sm text-gray-600 mt-1">{t('uploadDescription')}</p>
        </div>

        {/* Country and Document Type dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Country Selector */}
          <div className="relative" ref={countryDropdownRef}>
            <label className="block text-sm font-medium text-[#171717] mb-1">
              {t('yourCountry')}
            </label>
            <button
              type="button"
              onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded text-sm text-left hover:border-gray-400 transition-colors"
            >
              <span className={`flex items-center gap-2 ${selectedCountry ? 'text-[#171717]' : 'text-gray-400'}`}>
                {selectedCountry ? (
                  <>
                    <Flag code={COUNTRIES.find(c => c.code === selectedCountry)?.flagCode || selectedCountry} size="s" hasBorder={false} />
                    {COUNTRIES.find(c => c.code === selectedCountry)?.name}
                  </>
                ) : (
                  t('selectCountry')
                )}
              </span>
              <NavArrowDown
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  isCountryDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isCountryDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-y-auto">
                {COUNTRIES.map(country => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(country.code);
                      setIsCountryDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                      country.code === selectedCountry ? 'bg-gray-50 font-medium' : ''
                    }`}
                  >
                    <Flag code={country.flagCode} size="s" hasBorder={false} />
                    {country.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Document Type Selector */}
          <div className="relative" ref={docTypeDropdownRef}>
            <label className="block text-sm font-medium text-[#171717] mb-1">
              {t('documentType')}
            </label>
            <button
              type="button"
              onClick={() => setIsDocTypeDropdownOpen(!isDocTypeDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded text-sm text-left hover:border-gray-400 transition-colors"
            >
              <span className={selectedDocType ? 'text-[#171717]' : 'text-gray-400'}>
                {selectedDocType
                  ? t(DOCUMENT_TYPES.find(d => d.value === selectedDocType)?.labelKey || '')
                  : t('selectDocumentType')}
              </span>
              <NavArrowDown
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  isDocTypeDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isDocTypeDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg">
                {DOCUMENT_TYPES.map(docType => (
                  <button
                    key={docType.value}
                    type="button"
                    onClick={() => {
                      setSelectedDocType(docType.value);
                      setIsDocTypeDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors ${
                      docType.value === selectedDocType ? 'bg-gray-50 font-medium' : ''
                    }`}
                  >
                    {t(docType.labelKey)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ID Number input */}
        <div>
          <label className="block text-sm font-medium text-[#171717] mb-1">
            {t('idNumber')}
          </label>
          <input
            type="text"
            value={idNumber}
            onChange={e => setIdNumber(e.target.value)}
            placeholder={t('idNumberPlaceholder')}
            maxLength={50}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded text-sm placeholder-gray-400 hover:border-gray-400 focus:border-[#5E53E0] focus:ring-1 focus:ring-[#5E53E0] outline-none transition-colors"
          />
          <p className="text-xs text-gray-500 mt-1">{t('idNumberHint')}</p>
        </div>

        {/* Upload zones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderUploadZone('id_front', 'documentFront')}
          {renderUploadZone('id_back', 'documentBack')}
        </div>

        {/* Selfie upload */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-lg font-medium text-[#171717] mb-2">{t('selfieVerification')}</h3>
          <p className="text-sm text-gray-600 mb-4">{t('selfieDescription')}</p>
          {renderUploadZone('selfie', 'selfieWithId')}
        </div>
      </div>

      {/* Confirmation checkbox */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="kyc-confirmation"
          checked={isConfirmed}
          onChange={e => setIsConfirmed(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-gray-300 text-[#5E53E0] focus:ring-[#5E53E0]"
        />
        <label htmlFor="kyc-confirmation" className="text-sm text-gray-600">
          {t('confirmationText')}
        </label>
      </div>

      {/* Submit button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isConfirmed || !pendingDocuments?.isComplete || isSubmitting}
          className="px-8 py-3 bg-[#87E64B] text-[#171717] font-semibold rounded hover:bg-[#78d43f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? t('submitting') : t('confirm')}
        </button>
      </div>
    </div>
  );
}

export default KYCUploadPanel;
