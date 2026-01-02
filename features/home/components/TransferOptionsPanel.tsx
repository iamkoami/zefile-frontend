'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

interface TransferOptionsPanelProps {
  isVisible: boolean;
  hasFilesSelected?: boolean;
}

const TransferOptionsPanel: React.FC<TransferOptionsPanelProps> = ({
  isVisible,
  hasFilesSelected = false,
}) => {
  const t = useTranslations('transferOptions');
  const [accessControl, setAccessControl] = useState('');
  const [validityDuration, setValidityDuration] = useState('');
  const [sendLimit, setSendLimit] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div
      id="ze-options-panel"
      className={`ze-options-panel ${isVisible ? 'visible' : ''} ${hasFilesSelected ? 'has-files-selected' : ''}`}
    >
      <div id="ze-options-panel-content" className="ze-options-panel-content">
        <h2 id="ze-options-title" className="ze-options-title text-lg font-bold mb-6 text-black">
          {t('title')}
        </h2>

        <div id="ze-options-form" className="ze-options-form space-y-4">
          {/* Access Control */}
          <div className="ze-form-field">
            <select
              id="ze-access-control"
              value={accessControl}
              onChange={(e) => setAccessControl(e.target.value)}
              className="ze-form-select"
            >
              <option value="">{t('accessControl')}</option>
              <option value="public">{t('accessPublic')}</option>
              <option value="private">{t('accessPrivate')}</option>
              <option value="password">{t('accessPassword')}</option>
            </select>
          </div>

          {/* Validity Duration */}
          <div className="ze-form-field">
            <select
              id="ze-validity-duration"
              value={validityDuration}
              onChange={(e) => setValidityDuration(e.target.value)}
              className="ze-form-select"
            >
              <option value="">{t('validityDuration')}</option>
              <option value="1">1 {t('day')}</option>
              <option value="3">3 {t('days')}</option>
              <option value="7">7 {t('days')}</option>
              <option value="14">14 {t('days')}</option>
              <option value="30">30 {t('days')}</option>
            </select>
          </div>

          {/* Send Limit */}
          <div className="ze-form-field">
            <select
              id="ze-send-limit"
              value={sendLimit}
              onChange={(e) => setSendLimit(e.target.value)}
              className="ze-form-select"
            >
              <option value="">{t('sendSizeLimit')}</option>
              <option value="100">100 MB</option>
              <option value="500">500 MB</option>
              <option value="1000">1 GB</option>
              <option value="2000">2 GB</option>
            </select>
          </div>

          {/* Password */}
          <div className="ze-form-field">
            <input
              type="password"
              id="ze-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('setPassword')}
              className="ze-form-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferOptionsPanel;
