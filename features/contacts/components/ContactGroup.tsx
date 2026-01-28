'use client';

import React from 'react';
import { Contact } from '@/services/contacts-api';
import ContactRow from './ContactRow';

interface ContactGroupProps {
  letter: string;
  contacts: Contact[];
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onAddToTransfer: (contact: Contact) => void;
  onToggleSelect: (contact: Contact) => void;
}

/**
 * ContactGroup - Groups contacts by first letter of email
 * Displays letter header with divider line
 */
const ContactGroup: React.FC<ContactGroupProps> = ({
  letter,
  contacts,
  isSelectionMode,
  selectedIds,
  onEdit,
  onDelete,
  onAddToTransfer,
  onToggleSelect,
}) => {
  return (
    <div className="mb-4">
      {/* Letter header */}
      <div className="relative mb-2">
        <span className="text-lg font-medium text-gray-400">{letter}</span>
        {/* Divider line */}
        <div className="absolute bottom-0 left-0 w-full h-px bg-gray-100 mt-2" />
      </div>

      {/* Contact rows */}
      <div>
        {contacts.map((contact) => (
          <ContactRow
            key={contact.id}
            contact={contact}
            isSelectionMode={isSelectionMode}
            isSelected={selectedIds.has(contact.id)}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddToTransfer={onAddToTransfer}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default ContactGroup;
