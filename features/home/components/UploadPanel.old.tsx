'use client';

import React, { useState, useRef } from 'react';
import { Plus, MoreHoriz } from 'iconoir-react';
import { useTranslations } from 'next-intl';
import { getFileInputAccept, validateFiles } from '@/lib/constants/supported-file-types';
import OTPVerification from './OTPVerification';
import { transferApi } from '@/services/transfer-api';

interface UploadPanelProps {
  selectedFiles: File[];
  onFilesChange: (files: File[]) => void;
  onShowOptions: () => void;
}

const UploadPanel: React.FC<UploadPanelProps> = ({ selectedFiles, onFilesChange, onShowOptions }) => {
  const t = useTranslations('upload');
  const tCurrency = useTranslations('currency');
  const [isDragging, setIsDragging] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [fileError, setFileError] = useState<string>('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [showOTP, setShowOTP] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [serviceChargePercentage, setServiceChargePercentage] = useState<number>(15);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validation = validateFiles(files);

    if (!validation.valid) {
      setFileError(validation.errors[0]);
      setTimeout(() => setFileError(''), 5000);
      return;
    }

    setFileError('');
    onFilesChange(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validation = validateFiles(files);

      if (!validation.valid) {
        setFileError(validation.errors[0]);
        setTimeout(() => setFileError(''), 5000);
        e.target.value = ''; // Reset input
        return;
      }

      setFileError('');
      onFilesChange(files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove all non-digit characters
    const numericValue = value.replace(/\D/g, '');

    if (numericValue === '') {
      setPrice('');
      return;
    }

    // Format with thousand separators
    const formattedValue = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseInt(numericValue, 10));

    setPrice(formattedValue);
  };

  const parsePriceToNumber = (formattedPrice: string): number => {
    // Remove all spaces (thousand separators in French format)
    const numericString = formattedPrice.replace(/\s/g, '');
    return parseFloat(numericString) || 0;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!sendTo.trim()) {
      errors.sendTo = t('sendToRequired');
    } else if (!validateEmail(sendTo.trim())) {
      errors.sendTo = t('invalidEmail');
    }

    if (!email.trim()) {
      errors.email = t('yourEmailRequired');
    } else if (!validateEmail(email.trim())) {
      errors.email = t('invalidEmail');
    }

    if (!price.trim()) {
      errors.price = t('priceRequired');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTransfer = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Call API to send OTP to email
      const response = await transferApi.requestTransferOTP({
        senderEmail: email,
        recipientEmail: sendTo,
        title: title || undefined,
        price: parsePriceToNumber(price),
        message: message || undefined,
      });

      if (response.error) {
        setFormErrors({ email: response.error.message });
        return;
      }

      console.log('OTP sent successfully:', response.data);

      // Store charge info for display
      if (response.data?.chargeInfo) {
        setReceivedAmount(response.data.chargeInfo.receivedAmount);
        setServiceChargePercentage(response.data.chargeInfo.serviceChargePercentage);
      }

      setShowOTP(true);
    } catch (error) {
      console.error('Failed to send OTP:', error);
      setFormErrors({ email: 'Failed to send OTP. Please try again.' });
    }
  };

  const handleOTPVerify = async (code: string) => {
    try {
      // Call API to verify OTP
      const response = await transferApi.verifyTransferOTP({
        senderEmail: email,
        otp: code,
        recipientEmail: sendTo,
        title: title || undefined,
        price: parsePriceToNumber(price),
        message: message || undefined,
        fileNames: selectedFiles.map(f => f.name),
      });

      if (response.error) {
        console.error('OTP verification failed:', response.error.message);
        throw new Error(response.error.message);
      }

      console.log('OTP verified successfully:', response.data);

      // TODO: Proceed with file upload after OTP verification
      // For now, just log success
      alert('OTP verified! Transfer creation will be implemented next.');

      // Reset form
      setShowOTP(false);
      setSendTo('');
      setEmail('');
      setTitle('');
      setPrice('');
      setMessage('');
      onFilesChange([]);
    } catch (error: any) {
      console.error('Failed to verify OTP:', error);
      throw error; // Let OTPVerification component handle the error
    }
  };

  const handleBackFromOTP = () => {
    setShowOTP(false);
  };

  return (
    <div id="ze-upload-panel" className="ze-upload-panel">
      {showOTP ? (
        <OTPVerification
          email={email}
          onBack={handleBackFromOTP}
          onVerify={handleOTPVerify}
        />
      ) : selectedFiles.length === 0 ? (
        <>
          {/* Upload Area */}
          <div
            id="ze-upload-area"
            className={`ze-upload-area ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            {/* Icon and Text - Horizontal Layout */}
            <div className="flex items-center gap-3">
              {/* Plus Icon */}
              <div
                id="ze-upload-icon"
                className="ze-upload-icon w-12 h-12 flex items-center justify-center border-2 border-[#171717] rounded flex-shrink-0"
              >
                <Plus width={24} height={24} color="#171717" strokeWidth={2} />
              </div>

              {/* Text */}
              <div id="ze-upload-text" className="ze-upload-text text-left">
                <p className="text-sm font-semibold text-black">
                  {t('addFiles')}
                </p>
                <p className="text-xs text-gray-500">{t('uploadSize')}</p>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={getFileInputAccept()}
              id="ze-file-input"
              className="ze-file-input hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Error Message */}
          {fileError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{fileError}</p>
            </div>
          )}

          {/* Description Text */}
          <p id="ze-upload-description" className="ze-upload-description text-sm font-medium mt-5 mb-12 text-center text-gray-500">
            {t('dropFilesHere')}
          </p>

          {/* Buttons */}
          <div id="ze-upload-actions" className="ze-upload-actions flex items-center gap-3">
            <button
              id="ze-transfer-button"
              className="ze-transfer-button"
              disabled={true}
            >
              {t('transfer')}
            </button>

            <button
              id="ze-options-button"
              onClick={onShowOptions}
              className="ze-options-button"
              aria-label="Options"
            >
              <MoreHoriz width={20} height={20} color="#171717" />
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Form Fields */}
          <div className="space-y-4 mb-6">
            {/* Send To */}
            <div>
              <input
                type="text"
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                placeholder={t('sendTo')}
                className={`ze-form-input ${formErrors.sendTo ? 'border-red-500' : ''}`}
              />
              {formErrors.sendTo && (
                <p className="text-sm text-red-600 mt-1">{formErrors.sendTo}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('yourEmail')}
                className={`ze-form-input ${formErrors.email ? 'border-red-500' : ''}`}
              />
              {formErrors.email && (
                <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>
              )}
            </div>

            {/* Title */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('title')}
                className="ze-form-input"
              />
            </div>

            {/* Price */}
            <div>
              <input
                type="text"
                value={price}
                onChange={handlePriceChange}
                placeholder={t('setPrice')}
                className={`ze-form-input ${formErrors.price ? 'border-red-500' : ''}`}
                inputMode="numeric"
              />
              {formErrors.price && (
                <p className="text-sm text-red-600 mt-1">{formErrors.price}</p>
              )}
            </div>

            {/* Info Text */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{t('youWillReceive')}</span>
              <span className="text-sm font-medium">
                {receivedAmount > 0
                  ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(receivedAmount)
                  : price
                    ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(parsePriceToNumber(price) * (1 - serviceChargePercentage / 100))
                    : '0'
                } {tCurrency('cfa')}
              </span>
            </div>
            <div className="flex items-center gap-1 relative">
              <p className="text-xs font-medium text-gray-500">
                {t('estimatedAmount')}
              </p>
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
                style={{ backgroundColor: '#87E64B' }}
                onClick={() => setShowInfoTooltip(!showInfoTooltip)}
              >
                <span className="text-white text-[8px]">i</span>
              </div>

              {/* Info Tooltip */}
              {showInfoTooltip && (
                <div className="absolute left-0 bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 w-64">
                  <p className="text-xs text-gray-700">
                    Service charge: {serviceChargePercentage}%
                    <br />
                    {price && `Amount: ${new Intl.NumberFormat('fr-FR').format(parsePriceToNumber(price))} ${tCurrency('cfa')}`}
                    <br />
                    {price && `Service fee: ${new Intl.NumberFormat('fr-FR').format(parsePriceToNumber(price) * serviceChargePercentage / 100)} ${tCurrency('cfa')}`}
                  </p>
                </div>
              )}
            </div>

            {/* Message */}
            <div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('message')}
                className="ze-form-input resize-none pt-4"
                rows={4}
                style={{ height: '100px' }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div id="ze-upload-actions" className="ze-upload-actions flex items-center gap-3">
            <button
              id="ze-transfer-button"
              className="ze-transfer-button"
              disabled={selectedFiles.length === 0}
              onClick={handleTransfer}
            >
              {t('transfer')}
            </button>

            <button
              id="ze-options-button"
              onClick={onShowOptions}
              className="ze-options-button"
              aria-label="Options"
            >
              <MoreHoriz width={20} height={20} color="#171717" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default UploadPanel;
