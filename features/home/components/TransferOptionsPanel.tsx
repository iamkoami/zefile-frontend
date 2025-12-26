'use client';

import React, { useState } from 'react';

interface TransferOptionsPanelProps {
  isVisible: boolean;
}

const TransferOptionsPanel: React.FC<TransferOptionsPanelProps> = ({
  isVisible,
}) => {
  const [accessControl, setAccessControl] = useState('');
  const [validityDuration, setValidityDuration] = useState('');
  const [sendLimit, setSendLimit] = useState('');
  const [password, setPassword] = useState('');

  if (!isVisible) return null;

  return (
    <div className="bg-white p-6 rounded-2xl border-2 border-gray-200 w-full max-w-md">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Paramètres du transfert
      </h2>

      <div className="space-y-4">
        {/* Access Control */}
        <div>
          <label
            htmlFor="access-control"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Contrôle d'accès
          </label>
          <select
            id="access-control"
            value={accessControl}
            onChange={(e) => setAccessControl(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Sélectionner...</option>
            <option value="public">Public</option>
            <option value="private">Privé</option>
            <option value="password">Protégé par mot de passe</option>
          </select>
        </div>

        {/* Validity Duration */}
        <div>
          <label
            htmlFor="validity-duration"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Durée de validité
          </label>
          <select
            id="validity-duration"
            value={validityDuration}
            onChange={(e) => setValidityDuration(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Sélectionner...</option>
            <option value="1">1 jour</option>
            <option value="3">3 jours</option>
            <option value="7">7 jours</option>
            <option value="14">14 jours</option>
            <option value="30">30 jours</option>
          </select>
        </div>

        {/* Send Limit */}
        <div>
          <label
            htmlFor="send-limit"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Limite de la taille d'envoie
          </label>
          <select
            id="send-limit"
            value={sendLimit}
            onChange={(e) => setSendLimit(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Sélectionner...</option>
            <option value="100">100 MB</option>
            <option value="500">500 MB</option>
            <option value="1000">1 GB</option>
            <option value="2000">2 GB</option>
          </select>
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Définir un mot de passe
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Entrer le mot de passe"
            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};

export default TransferOptionsPanel;
