"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { SortUp, SortDown } from "iconoir-react";
import { useTranslations } from "next-intl";
import LoadingPanel from "@/components/LoadingPanel";
import { transferApi, TransferDto } from "@/services/transfer-api";
import { paymentApi } from "@/services/payment-api";
import { authApi } from "@/services/auth-api";
import { useDrawerStore, TransferRole } from "@/stores/drawer-store";
import { useTransferSelectionStore } from "@/stores/transfer-selection-store";
import { copyTransferLink } from "@/utils/clipboard";
import { toast } from "@/components/shared/Toast";
import SearchInput from "@/components/shared/SearchInput";
import Tabs, { Tab } from "@/components/shared/Tabs";
import TransferItem from "./TransferItem";
import Pagination from "@/components/shared/Pagination";
import BulkActionBar from "@/components/shared/BulkActionBar";

// Filter options enum
enum FilterBy {
  DATE = "date",
  SIZE = "size",
  TITLE = "title",
  EXPIRATION = "expiration",
}

// Page size options enum
enum PageSize {
  FIVE = 5,
  TEN = 10,
  TWENTY = 20,
  THIRTY = 30,
  FIFTY = 50,
  HUNDRED = 100,
}

/**
 * Normalize transfer data to ensure all fields have safe defaults
 * Handles backend field naming differences (fileName vs filename, fileSize vs size, etc.)
 */
const normalizeTransfer = (transfer: TransferDto): TransferDto => {
  return {
    ...transfer,
    title: transfer.title || "",
    files: (transfer.files || []).map((file) => {
      // Parse fileSize - backend returns string, we need number
      let fileSize = 0;
      if (file.size) {
        fileSize =
          typeof file.size === "string" ? parseInt(file.size, 10) : file.size;
      } else if (file.fileSize) {
        fileSize =
          typeof file.fileSize === "string"
            ? parseInt(file.fileSize, 10)
            : file.fileSize;
      }

      return {
        ...file,
        filename: file.filename || file.fileName || "",
        fileName: file.fileName || file.filename || "",
        size: fileSize,
        mimeType: file.mimeType || file.fileType || "",
      };
    }),
    recipientEmails: transfer.recipientEmails || [],
    downloadCount: transfer.downloadCount || 0,
    downloadPageViews: transfer.downloadPageViews || 0,
    senderNotifiedDownload: transfer.senderNotifiedDownload || false,
    senderNotifiedExpiry: transfer.senderNotifiedExpiry || false,
  };
};

/**
 * Deduplicate transfers by ID
 */
const deduplicateTransfers = (transfers: TransferDto[]): TransferDto[] => {
  const seen = new Set<string>();
  return transfers.filter((transfer) => {
    if (!transfer?.id || seen.has(transfer.id)) {
      return false;
    }
    seen.add(transfer.id);
    return true;
  });
};

/**
 * TransfersPanel - Displays user's transfers with tabs, search, pagination and sort
 */
const TransfersPanel: React.FC = () => {
  const t = useTranslations("transfers");
  const tBulk = useTranslations("bulkActions");
  const { isOpen, view, payload, pushView, currentContentView } = useDrawerStore();
  const {
    isSelectionMode,
    toggleSelection,
    selectAll,
    deselectAll,
    isSelected,
    getSelectedCount,
    getSelectedIds,
  } = useTransferSelectionStore();
  const [activeTab, setActiveTab] = useState<string>(
    payload?.preSelectedTab || "sent"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [sentTransfers, setSentTransfers] = useState<TransferDto[]>([]);
  const [receivedTransfers, setReceivedTransfers] = useState<TransferDto[]>([]);
  const [paidTransfers, setPaidTransfers] = useState<TransferDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterBy, setFilterBy] = useState<FilterBy>(FilterBy.DATE);
  const [sortAscending, setSortAscending] = useState(false); // false = descending (default)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>(PageSize.FIVE);
  const [showPageSizeDropdown, setShowPageSizeDropdown] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const pageSizeDropdownRef = useRef<HTMLDivElement>(null);

  // Build tabs with translations
  const TABS: Tab[] = useMemo(
    () => [
      { id: "sent", label: t("tabs.sent") },
      { id: "received", label: t("tabs.received") },
      { id: "paid", label: t("tabs.paid") },
    ],
    [t]
  );

  // Filter options with translations
  const FILTER_OPTIONS = useMemo(
    () => [
      { id: FilterBy.DATE, label: t("filterOptions.date") },
      { id: FilterBy.SIZE, label: t("filterOptions.size") },
      { id: FilterBy.TITLE, label: t("filterOptions.title") },
      { id: FilterBy.EXPIRATION, label: t("filterOptions.expiration") },
    ],
    [t]
  );

  // Get current filter label
  const currentFilterLabel = useMemo(() => {
    const option = FILTER_OPTIONS.find((opt) => opt.id === filterBy);
    return option?.label || t("filterOptions.date");
  }, [filterBy, FILTER_OPTIONS, t]);

  // Page size options
  const PAGE_SIZE_OPTIONS: PageSize[] = [
    PageSize.FIVE,
    PageSize.TEN,
    PageSize.TWENTY,
    PageSize.THIRTY,
    PageSize.FIFTY,
    PageSize.HUNDRED,
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFilterDropdown(false);
      }
      if (
        pageSizeDropdownRef.current &&
        !pageSizeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPageSizeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch transfers function
  const fetchTransfers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const user = authApi.getStoredUser();
      if (!user?.id) {
        setError(t("userNotAuthenticated"));
        setIsLoading(false);
        return;
      }

      // Fetch sent, received transfers, and paid transactions in parallel
      const [sentResponse, receivedResponse, paidTransactionsResponse] =
        await Promise.all([
          transferApi.getTransfersBySender(user.id),
          user.email
            ? transferApi.getTransfersByRecipient(user.email)
            : Promise.resolve({ data: [] }),
          // Fetch successful transactions (actually paid transfers)
          paymentApi.getTransactionsByUserIdAndStatus(user.id, "SUCCESS"),
        ]);

      // Normalize and deduplicate sent transfers
      const sentData = Array.isArray(sentResponse.data)
        ? sentResponse.data
        : [];
      const normalizedSent = sentData.map(normalizeTransfer);
      const deduplicatedSent = deduplicateTransfers(normalizedSent);
      setSentTransfers(deduplicatedSent);

      // Normalize and deduplicate received transfers
      const receivedData = Array.isArray(receivedResponse.data)
        ? receivedResponse.data
        : [];
      const normalizedReceived = receivedData.map(normalizeTransfer);
      const deduplicatedReceived = deduplicateTransfers(normalizedReceived);
      setReceivedTransfers(deduplicatedReceived);

      // Paid transfers come from successful transactions (transfers user actually paid for)
      const paidTransactionsData = Array.isArray(paidTransactionsResponse.data)
        ? paidTransactionsResponse.data
        : [];

      // Extract transfer data from successful transactions
      // Set isPaid: true since these come from successful payment transactions
      const paidTransferData = paidTransactionsData
        .filter((transaction) => transaction.transferId !== null)
        .map((transaction) =>
          normalizeTransfer({
            ...(transaction.transferId as TransferDto),
            isPaid: true,
          })
        );

      const deduplicatedPaid = deduplicateTransfers(paidTransferData);
      setPaidTransfers(deduplicatedPaid);
    } catch (err) {
      console.error("[TransfersPanel] Error fetching transfers:", err);
      setError(t("failedToLoad"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Fetch transfers when drawer opens, view changes to transfers, or returning to list from details
  useEffect(() => {
    if (isOpen && view === "transfers" && currentContentView === "list") {
      fetchTransfers();
    }
  }, [isOpen, view, currentContentView, fetchTransfers]);

  // Handle tab change - reset page to 1
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setSearchQuery("");
    setCurrentPage(1);
  }, []);

  // Handle search change - reset page to 1
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  // Filter transfers based on active tab and search query
  const filteredTransfers = useMemo(() => {
    let result: TransferDto[] = [];

    switch (activeTab) {
      case "sent":
        result = [...sentTransfers];
        break;
      case "received":
        result = [...receivedTransfers];
        break;
      case "paid":
        result = [...paidTransfers];
        break;
      default:
        result = [...sentTransfers];
    }

    // Apply search filter with defensive checks
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((transfer) => {
        const titleMatch = (transfer.title || "").toLowerCase().includes(query);
        const fileMatch = (transfer.files || []).some((file) => {
          const filename = file?.filename || file?.fileName || "";
          return filename.toLowerCase().includes(query);
        });
        const emailMatch = (transfer.recipientEmails || []).some((email) => {
          return (email || "").toLowerCase().includes(query);
        });
        return titleMatch || fileMatch || emailMatch;
      });
    }

    // Sort based on filterBy option and sort order
    return result.sort((a, b) => {
      let comparison = 0;

      switch (filterBy) {
        case FilterBy.DATE: {
          const dateA = new Date(a.createdAt || a.createdDate || 0).getTime();
          const dateB = new Date(b.createdAt || b.createdDate || 0).getTime();
          comparison = dateB - dateA; // Default: newest first (descending)
          break;
        }
        case FilterBy.SIZE: {
          const sizeA = (a.files || []).reduce(
            (sum, file) => {
              const size = typeof file.size === 'string' ? parseInt(file.size, 10) : (file.size || 0);
              return sum + size;
            },
            0
          );
          const sizeB = (b.files || []).reduce(
            (sum, file) => {
              const size = typeof file.size === 'string' ? parseInt(file.size, 10) : (file.size || 0);
              return sum + size;
            },
            0
          );
          comparison = sizeB - sizeA; // Default: largest first (descending)
          break;
        }
        case FilterBy.TITLE: {
          const titleA = (a.title || "").toLowerCase();
          const titleB = (b.title || "").toLowerCase();
          comparison = titleA.localeCompare(titleB); // Default: A-Z (ascending)
          break;
        }
        case FilterBy.EXPIRATION: {
          const expiryA = new Date(a.expireAt || a.expiryDate || 0).getTime();
          const expiryB = new Date(b.expireAt || b.expiryDate || 0).getTime();
          comparison = expiryA - expiryB; // Default: soonest first (ascending)
          break;
        }
      }

      // Reverse if ascending is selected (for date/size which default to descending)
      // Or reverse if descending for title/expiration which default to ascending
      return sortAscending ? -comparison : comparison;
    });
  }, [
    activeTab,
    sentTransfers,
    receivedTransfers,
    paidTransfers,
    searchQuery,
    filterBy,
    sortAscending,
  ]);

  // Calculate pagination
  const totalItems = filteredTransfers.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Get paginated transfers for current page
  const paginatedTransfers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTransfers.slice(startIndex, endIndex);
  }, [filteredTransfers, currentPage, pageSize]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Determine the role based on active tab
  const getRoleForTab = useCallback((): TransferRole => {
    return activeTab === "sent" ? "sender" : "receiver";
  }, [activeTab]);

  // Handle clicking on a transfer item (navigate to details)
  const handleTransferClick = useCallback(
    (transfer: TransferDto) => {
      const role = getRoleForTab();
      pushView("transfer-details", transfer, role);
    },
    [pushView, getRoleForTab]
  );

  // Action handlers
  const handlePreview = useCallback(
    (transfer: TransferDto) => {
      const role = getRoleForTab();
      pushView("transfer-preview", transfer, role);
    },
    [pushView, getRoleForTab]
  );

  const handleCopyLink = useCallback(
    async (transfer: TransferDto) => {
      if (!transfer.shortCode) {
        toast.error(t("noLinkAvailable"));
        return;
      }
      await copyTransferLink(
        transfer.shortCode,
        t("linkCopied"),
        t("linkCopyFailed")
      );
    },
    [t]
  );

  // Enter selection mode and select the transfer for deletion
  const handleDelete = useCallback(
    (transfer: TransferDto) => {
      selectAll([transfer.id]);
    },
    [selectAll]
  );

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    const user = authApi.getStoredUser();
    if (!user?.id) {
      toast.error(t("userNotAuthenticated"));
      return;
    }

    const ids = getSelectedIds();
    if (ids.length === 0) return;

    try {
      const response = await transferApi.batchDeleteTransfers({
        senderId: user.id,
        ids,
      });

      if (response.data?.success) {
        // Remove deleted transfers from state
        const deletedIds = new Set(ids);
        setSentTransfers((prev) => prev.filter((t) => !deletedIds.has(t.id)));
        setReceivedTransfers((prev) => prev.filter((t) => !deletedIds.has(t.id)));
        setPaidTransfers((prev) => prev.filter((t) => !deletedIds.has(t.id)));

        // Clear selection
        deselectAll();

        // Show success message
        if (response.data.failed > 0) {
          toast.warning(
            tBulk("deletePartialSuccess", {
              deleted: response.data.deleted,
              total: ids.length,
            })
          );
        } else {
          toast.success(tBulk("deleteSuccess", { count: response.data.deleted }));
        }
      } else {
        toast.error(tBulk("deleteError"));
      }
    } catch (err) {
      console.error("Failed to bulk delete transfers:", err);
      toast.error(tBulk("deleteError"));
    }
  }, [getSelectedIds, deselectAll, t, tBulk]);

  // Handle cancel selection mode
  const handleCancelSelection = useCallback(() => {
    deselectAll();
  }, [deselectAll]);

  // Handle select all filtered transfers
  const handleSelectAll = useCallback(() => {
    const allIds = filteredTransfers.map((t) => t.id);
    selectAll(allIds);
  }, [filteredTransfers, selectAll]);

  // Handle deselect all
  const handleDeselectAll = useCallback(() => {
    deselectAll();
  }, [deselectAll]);

  // Clear selection when tab changes
  useEffect(() => {
    deselectAll();
  }, [activeTab, deselectAll]);

  // Get empty state message based on active tab
  const getEmptyMessage = useCallback(() => {
    if (searchQuery) {
      return t("noResults");
    }
    switch (activeTab) {
      case "sent":
        return t("noSentTransfers");
      case "received":
        return t("noReceivedTransfers");
      case "paid":
        return t("noPaidTransfers");
      default:
        return t("noSentTransfers");
    }
  }, [activeTab, searchQuery, t]);

  // Loading state
  if (isLoading) {
    return <LoadingPanel fullHeight />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => fetchTransfers()}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Title */}
      <h1 className="text-4xl font-bold text-gray-900 mt-12 mb-18">
        {t("title")}
      </h1>

      {/* Tabs and Sort - with full-width border below */}
      <div className="relative  mt-6 mb-10">
        <div className="flex items-center justify-between pb-3">
          <Tabs
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />

          {/* Filter dropdown and sort order - aligned with tabs */}
          <div className="flex items-center gap-1">
            <div className="relative" ref={filterDropdownRef}>
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span>{t("filterBy")} :</span>
                <span className="font-semibold text-gray-900">
                  {currentFilterLabel}
                </span>
              </button>

              {showFilterDropdown && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {FILTER_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setFilterBy(option.id);
                        setShowFilterDropdown(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                        filterBy === option.id
                          ? "font-semibold text-gray-900"
                          : "text-gray-600"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort order toggle */}
            <button
              onClick={() => {
                setSortAscending(!sortAscending);
                setCurrentPage(1);
              }}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label={sortAscending ? "Sort descending" : "Sort ascending"}
            >
              {sortAscending ? (
                <SortUp className="w-5 h-5" strokeWidth={1.5} />
              ) : (
                <SortDown className="w-5 h-5" strokeWidth={1.5} />
              )}
            </button>

            {/* Separator */}
            <div className="w-px h-4 bg-gray-300 mx-2" />

            {/* Page size dropdown */}
            <div className="relative" ref={pageSizeDropdownRef}>
              <button
                onClick={() => setShowPageSizeDropdown(!showPageSizeDropdown)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span>{t("itemsPerPage")} :</span>
                <span className="font-semibold text-gray-900">{pageSize}</span>
              </button>

              {showPageSizeDropdown && (
                <div className="absolute top-full right-0 mt-2 w-24 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        setPageSize(size);
                        setShowPageSizeDropdown(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                        pageSize === size
                          ? "font-semibold text-gray-900"
                          : "text-gray-600"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Full-width border line below tabs and filter */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200" />
      </div>

      {/* Search */}
      <div className="mb-8">
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder={t("searchPlaceholder")}
          className="w-full"
        />
      </div>

      {/* Transfers List */}
      {paginatedTransfers.length > 0 ? (
        <div className="flex flex-col gap-3">
          {paginatedTransfers.map((transfer) => (
            <TransferItem
              key={transfer.id}
              transfer={transfer}
              onClick={handleTransferClick}
              onPreview={handlePreview}
              onCopyLink={handleCopyLink}
              onDelete={handleDelete}
              // Selection mode props - only enable for sent tab
              selectionMode={activeTab === "sent" && isSelectionMode}
              isSelected={isSelected(transfer.id)}
              onSelectionChange={activeTab === "sent" ? toggleSelection : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-500">{getEmptyMessage()}</p>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={pageSize}
        onPageChange={handlePageChange}
        className="mt-6"
      />

      {/* Bulk Action Bar - only show when items are selected */}
      {isSelectionMode && (
        <BulkActionBar
          selectedCount={getSelectedCount()}
          totalCount={filteredTransfers.length}
          onDelete={handleBulkDelete}
          onCancel={handleCancelSelection}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
        />
      )}
    </div>
  );
};

export default TransfersPanel;
