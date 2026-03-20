"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import LoadingPanel from "@/components/LoadingPanel";
import { contactsApi, Contact } from "@/services/contacts-api";
import { authApi } from "@/services/auth-api";
import { useDrawerStore } from "@/stores/drawer-store";
import { toast } from "@/components/shared/Toast";
import SearchInput from "@/components/shared/SearchInput";
import ContactGroup from "./ContactGroup";
import Pagination from "@/components/shared/Pagination";
import ContactModal from "./ContactModal";
import ContactActionBar from "./ContactActionBar";

const ITEMS_PER_PAGE = 10;

/**
 * Normalize contact data to ensure all fields have safe defaults
 */
const normalizeContact = (contact: Contact): Contact => {
  return {
    ...contact,
    email: contact.email || "",
    name: contact.name || "",
    organization: contact.organization || "",
  };
};

/**
 * Deduplicate contacts by ID
 */
const deduplicateContacts = (contacts: Contact[]): Contact[] => {
  const seen = new Set<string>();
  return contacts.filter((contact) => {
    if (!contact?.id || seen.has(contact.id)) {
      return false;
    }
    seen.add(contact.id);
    return true;
  });
};

/**
 * ContactsPanel - Displays user's contacts grouped alphabetically with pagination
 */
const ContactsPanel: React.FC = () => {
  const t = useTranslations("contacts");
  const { isOpen, view, closeDrawer } = useDrawerStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Selection mode states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch contacts function
  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const user = authApi.getStoredUser();
      if (!user?.id) {
        setError(t("userNotAuthenticated"));
        setIsLoading(false);
        return;
      }

      const response = await contactsApi.getContactsByUserId(user.id);

      if (response.data) {
        const data = Array.isArray(response.data) ? response.data : [];
        const normalized = data.map(normalizeContact);
        setContacts(deduplicateContacts(normalized));
      } else if (response.error) {
        console.error("[ContactsPanel] API Error:", JSON.stringify(response.error, null, 2));
        const errorMsg = typeof response.error === 'string'
          ? response.error
          : response.error.message || t("failedToLoad");
        setError(errorMsg);
      } else if (response.status === 0) {
        // Network error - backend might be unreachable
        console.error("[ContactsPanel] Network error - status 0");
        setError(t("networkError"));
      } else {
        // Unexpected response shape - treat empty/null data as empty contacts
        console.warn("[ContactsPanel] Unexpected response:", response);
        setContacts([]);
      }
    } catch (err) {
      console.error("[ContactsPanel] Error fetching contacts:", err);
      setError(t("failedToLoad"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Fetch contacts when drawer opens or view changes to contacts
  useEffect(() => {
    if (isOpen && view === "contacts") {
      fetchContacts();
    }
  }, [isOpen, view, fetchContacts]);

  // Exit selection mode when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  // Handle search change - reset page to 1
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    let filtered = [...contacts];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = contacts.filter((contact) => {
        const emailMatch = (contact.email || "").toLowerCase().includes(query);
        const nameMatch = (contact.name || "").toLowerCase().includes(query);
        const orgMatch = (contact.organization || "").toLowerCase().includes(query);
        return emailMatch || nameMatch || orgMatch;
      });
    }

    // Sort alphabetically by email
    return filtered.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
  }, [contacts, searchQuery]);

  // Calculate pagination
  const totalItems = filteredContacts.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // Get paginated contacts for current page
  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredContacts.slice(startIndex, endIndex);
  }, [filteredContacts, currentPage]);

  // Group paginated contacts by first letter
  const groupedContacts = useMemo(() => {
    const groups: Record<string, Contact[]> = {};

    paginatedContacts.forEach((contact) => {
      const email = contact.email || "";
      if (!email) return;

      const firstLetter = email[0]?.toUpperCase() || "#";
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(contact);
    });

    // Return sorted array of groups
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [paginatedContacts]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Action handlers
  const handleEdit = useCallback((contact: Contact) => {
    setEditingContact(contact);
    setIsContactModalOpen(true);
  }, []);

  // Enter selection mode and select the contact
  const handleDelete = useCallback((contact: Contact) => {
    setIsSelectionMode(true);
    setSelectedIds(new Set([contact.id]));
  }, []);

  // Toggle contact selection
  const handleToggleSelect = useCallback((contact: Contact) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contact.id)) {
        next.delete(contact.id);
      } else {
        next.add(contact.id);
      }
      // Exit selection mode if nothing selected
      if (next.size === 0) {
        setIsSelectionMode(false);
      }
      return next;
    });
  }, []);

  // Select all contacts
  const handleSelectAll = useCallback(() => {
    const allIds = new Set(filteredContacts.map((c) => c.id));
    setSelectedIds(allIds);
  }, [filteredContacts]);

  // Deselect all contacts
  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, []);

  // Cancel selection mode
  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Bulk delete selected contacts
  const handleBulkDelete = useCallback(async () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0) return;

    try {
      // Delete all selected contacts
      await Promise.all(idsToDelete.map((id) => contactsApi.deleteContact(id)));

      // Update local state
      setContacts((prev) => prev.filter((c) => !selectedIds.has(c.id)));

      // Show success message
      const count = idsToDelete.length;
      toast.success(
        count === 1
          ? t("contactDeleted")
          : t("contactsDeleted", { count })
      );

      // Exit selection mode
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to delete contacts:", err);
      toast.error(t("deleteError"));
    }
  }, [selectedIds, t]);

  const handleAddToTransfer = useCallback((contact: Contact) => {
    closeDrawer();
    window.dispatchEvent(
      new CustomEvent("add-recipient-to-transfer", {
        detail: { email: contact.email },
      })
    );
  }, [closeDrawer]);

  const handleAddContact = useCallback(() => {
    setEditingContact(null);
    setIsContactModalOpen(true);
  }, []);

  const handleSaveContact = useCallback(
    async (data: { email: string; name?: string; organization?: string }) => {
      const user = authApi.getStoredUser();
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      if (editingContact) {
        // Update existing contact (including email if changed)
        const response = await contactsApi.updateContact(editingContact.id, {
          id: editingContact.id,
          email: data.email,
          name: data.name,
          organization: data.organization,
        });
        if (response.error) {
          throw new Error(response.error.message);
        }
        // Update local state
        setContacts((prev) =>
          prev.map((c) =>
            c.id === editingContact.id
              ? { ...c, email: data.email, name: data.name || "", organization: data.organization || "" }
              : c
          )
        );
        toast.success(t("contactUpdated"));
      } else {
        // Create new contact
        const response = await contactsApi.createContact({
          user: user.id,
          email: data.email,
          name: data.name,
          organization: data.organization,
        });
        if (response.error) {
          throw new Error(response.error.message);
        }
        if (response.data) {
          setContacts((prev) => [...prev, normalizeContact(response.data!)]);
          toast.success(t("contactCreated"));
        }
      }

      setIsContactModalOpen(false);
      setEditingContact(null);
    },
    [editingContact, t]
  );

  const handleCancelContactModal = useCallback(() => {
    setIsContactModalOpen(false);
    setEditingContact(null);
  }, []);

  // Get contacts count text
  const getContactsCountText = useCallback(() => {
    const count = contacts.length;
    if (count === 0) return `0 ${t("contact")}`;
    if (count === 1) return `1 ${t("contact")}`;
    return `${count} ${t("contacts")}`;
  }, [contacts.length, t]);

  // Loading state
  if (isLoading) {
    return <LoadingPanel fullHeight />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-gray-500 dark:text-[oklch(0.75_0_0)] mb-4">{error}</p>
        <button
          onClick={() => fetchContacts()}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-[oklch(0.91_0_0)] dark:text-[oklch(0.16_0_0)] rounded-lg hover:bg-gray-800 dark:hover:bg-[oklch(0.85_0_0)] transition-colors"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with title, count, and search */}
      <div className="flex items-start justify-between mb-10">
        <div>
          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 dark:text-[oklch(0.91_0_0)] mt-12 mb-3">
            {t("title")}
          </h1>

          {/* Subtitle with count and add link */}
          <p className="text-sm text-gray-500 dark:text-[oklch(0.75_0_0)]">
            {getContactsCountText()} ·{" "}
            <button
              onClick={handleAddContact}
              className="text-gray-900 dark:text-[oklch(0.91_0_0)] underline hover:text-gray-700 dark:hover:text-[oklch(0.75_0_0)] transition-colors font-medium"
            >
              {t("addContact")}
            </button>
          </p>
        </div>

        {/* Search - aligned right */}
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder={t("searchPlaceholder")}
          className="w-96 mt-12 mb-3"
        />
      </div>

      {/* Contacts List - grouped alphabetically */}
      <div className="mt-12">
        {groupedContacts.length > 0 ? (
          groupedContacts.map(([letter, letterContacts]) => (
            <ContactGroup
              key={letter}
              letter={letter}
              contacts={letterContacts}
              isSelectionMode={isSelectionMode}
              selectedIds={selectedIds}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddToTransfer={handleAddToTransfer}
              onToggleSelect={handleToggleSelect}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center mt-10 py-16 text-center">
            <p className="text-gray-500 dark:text-[oklch(0.75_0_0)]">
              {searchQuery ? t("noResults") : t("noContacts")}
            </p>
            {!searchQuery && (
              <button
                onClick={handleAddContact}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-[oklch(0.91_0_0)] dark:text-[oklch(0.16_0_0)] rounded-lg hover:bg-gray-800 dark:hover:bg-[oklch(0.85_0_0)] transition-colors"
              >
                {t("addContact")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={handlePageChange}
        className="mt-6"
      />

      {/* Contact Modal for Add/Edit */}
      <ContactModal
        isOpen={isContactModalOpen}
        contact={editingContact}
        onSave={handleSaveContact}
        onCancel={handleCancelContactModal}
      />

      {/* Bulk Action Bar - shown when in selection mode */}
      {isSelectionMode && (
        <ContactActionBar
          selectedCount={selectedIds.size}
          totalCount={filteredContacts.length}
          onDelete={handleBulkDelete}
          onCancel={handleCancelSelection}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
        />
      )}
    </div>
  );
};

export default ContactsPanel;
