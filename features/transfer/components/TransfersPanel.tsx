"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { SortUp, SortDown, SendDiagonal, Download, HandCash, GitFork, NavArrowRight } from "iconoir-react";
import { useTranslations } from "next-intl";
import LoadingPanel from "@/components/LoadingPanel";
import { transferApi, TransferDto } from "@/services/transfer-api";
import { paymentApi } from "@/services/payment-api";
import { authApi } from "@/services/auth-api";
import { useDrawerStore, TransferRole } from "@/stores/drawer-store";
import { useTransferSelectionStore } from "@/stores/transfer-selection-store";
import { copyTransferLink, copyToClipboard } from "@/utils/clipboard";
import { toast } from "@/components/shared/Toast";
import SearchInput from "@/components/shared/SearchInput";
import Tabs, { Tab } from "@/components/shared/Tabs";
import TransferItem from "./TransferItem";
import Pagination from "@/components/shared/Pagination";
import BulkActionBar from "@/components/shared/BulkActionBar";
import FirstFreeBanner from "@/components/shared/FirstFreeBanner";
import OnboardingChecklistCard from "./OnboardingChecklistCard";
import ConfirmationModal from "@/components/shared/ConfirmationModal";
import { platformApi } from "@/services/platform-api";
import { fileRequestApi, type FileRequestDto } from "@/services/file-request-api";
import { formatCurrencyAmount, type CurrencyCode } from "@/lib/currency";

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

// Status color mapping for file requests
const REQUEST_STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  funded: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  delivered: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  revision_requested: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  expired: "bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400",
  refunded: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400",
};

/**
 * RequestItem - Displays a single file request in the list
 * Matches TransferItem style with hover actions crossfade
 */
const RequestItem: React.FC<{
  request: FileRequestDto & { _role?: "client" | "creative" };
  t: ReturnType<typeof useTranslations>;
  onSelect: (request: FileRequestDto & { _role?: "client" | "creative" }) => void;
  onCopyLink: (request: FileRequestDto & { _role?: "client" | "creative" }) => void;
  onCancel: (request: FileRequestDto & { _role?: "client" | "creative" }) => void;
}> = ({ request, t, onSelect, onCopyLink, onCancel }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isActive = isHovered || isFocused;

  const user = authApi.getStoredUser();
  const isClient = request._role === "client" || request.clientEmail === user?.email;
  const isTerminal = request.status === "expired" || request.status === "cancelled" || request.status === "refunded" || request.status === "completed";
  const statusColor = REQUEST_STATUS_COLORS[request.status] || "bg-gray-100 text-gray-600";
  const budgetMajor = request.budgetMinorUnits / 100;
  const formattedBudget = formatCurrencyAmount(budgetMajor, request.currency as CurrencyCode);
  const counterpartyEmail = isClient ? request.creativeEmail : request.clientEmail;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div
      className={`relative flex items-center justify-between px-6 py-5 cursor-pointer rounded-xl transition-all duration-300 ease-out ${
        isActive
          ? "bg-gray-900 scale-[1.01] shadow-lg dark:shadow-black/30"
          : "bg-[#F9F9FA] dark:bg-[oklch(0.22_0_0)] hover:bg-gray-200 dark:hover:bg-[oklch(0.28_0_0)] scale-100"
      }`}
      onClick={() => onSelect(request)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      tabIndex={0}
      role="button"
      aria-label={`Request: ${request.title}`}
    >
      <div className="flex-1 min-w-0">
        {/* Title + status badge */}
        <div className="flex items-center gap-2">
          <h4
            className={`text-base font-bold truncate transition-colors duration-200 ${
              isActive ? "text-white" : "text-gray-900 dark:text-[oklch(0.91_0_0)]"
            }`}
          >
            {request.title}
          </h4>
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 transition-all duration-200 ${
            isTerminal
              ? (isActive ? "opacity-100 bg-gray-700 text-gray-300" : "opacity-0")
              : statusColor
          }`}>
            {t(`requestStatus.${request.status}`)}
          </span>
        </div>

        {/* Metadata + Actions crossfade */}
        <div className="relative h-6 mt-1">
          {/* Metadata - fades out on hover */}
          <p
            className={`absolute inset-0 text-sm truncate transition-all duration-200 flex items-center gap-1 text-gray-500 dark:text-[oklch(0.65_0_0)] ${
              isActive ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
            }`}
          >
            <span>
              {isClient ? t("requestSent") : t("requestReceived")} - {counterpartyEmail} - {formattedBudget} - {formatDate(request.createdAt)}
            </span>
            {isTerminal && (
              <>
                <span>-</span>
                <span className="text-red-500">{t(`requestStatus.${request.status}`)}</span>
              </>
            )}
          </p>

          {/* Actions - fades in on hover */}
          <div
            className={`absolute inset-0 flex items-center gap-1 transition-all duration-200 ${
              isActive ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
            }`}
            aria-hidden={!isActive}
          >
            {!isTerminal && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(request);
                  }}
                  className="text-sm text-[#87E64B] hover:text-[#9ef55e] underline transition-colors focus:outline-none"
                  tabIndex={isActive ? 0 : -1}
                >
                  {isClient ? t("review") : t("deliver")}
                </button>
                <span className="text-gray-500 mx-1">-</span>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyLink(request);
              }}
              className="text-sm text-white hover:text-gray-200 underline transition-colors focus:outline-none"
              tabIndex={isActive ? 0 : -1}
            >
              {t("copyLink")}
            </button>
            {isClient && (request.status === "pending_payment" || request.status === "funded") && (
              <>
                <span className="text-gray-500 mx-1">-</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel(request);
                  }}
                  className="text-sm text-red-400 hover:text-red-300 underline transition-colors focus:outline-none"
                  tabIndex={isActive ? 0 : -1}
                >
                  {t("cancel")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Arrow indicator */}
      <NavArrowRight
        className={`w-5 h-5 flex-shrink-0 ml-4 transition-all duration-200 ${
          isActive
            ? "text-white translate-x-1"
            : "text-gray-400 dark:text-[oklch(0.50_0_0)] translate-x-0"
        }`}
        strokeWidth={1.5}
      />
    </div>
  );
};

/**
 * TransfersPanel - Displays user's transfers with tabs, search, pagination and sort
 */
const TransfersPanel: React.FC = () => {
  const t = useTranslations("transfers");
  const tBulk = useTranslations("bulkActions");
  const { isOpen, view, payload, pushView, currentContentView, closeDrawer, setSelectedFileRequest } = useDrawerStore();
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
  const [fileRequests, setFileRequests] = useState<FileRequestDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterBy, setFilterBy] = useState<FilterBy>(FilterBy.DATE);
  const [sortAscending, setSortAscending] = useState(false); // false = descending (default)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>(PageSize.FIVE);
  const [showPageSizeDropdown, setShowPageSizeDropdown] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const pageSizeDropdownRef = useRef<HTMLDivElement>(null);
  const [isFirstPaidTransferUsed, setIsFirstPaidTransferUsed] = useState(true);

  // Build tabs with translations
  const TABS: Tab[] = useMemo(
    () => [
      { id: "sent", label: t("tabs.sent") },
      { id: "received", label: t("tabs.received") },
      { id: "paid", label: t("tabs.paid") },
      { id: "requests", label: t("tabs.requests") },
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

      // Fetch sent, received transfers, paid transactions, and file requests in parallel
      const [sentResponse, receivedResponse, paidTransactionsResponse, myRequestsResponse, myDeliveriesResponse] =
        await Promise.all([
          transferApi.getTransfersBySender(user.id),
          user.email
            ? transferApi.getTransfersByRecipient(user.email)
            : Promise.resolve({ data: [] }),
          // Fetch successful transactions (actually paid transfers)
          paymentApi.getTransactionsByUserIdAndStatus(user.id, "SUCCESS"),
          // Fetch file requests (sent as client + received as creative)
          fileRequestApi.getMyRequests(1, 100).catch(() => ({ data: { data: [] } })),
          fileRequestApi.getMyDeliveries(1, 100).catch(() => ({ data: { data: [] } })),
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

      // Merge file requests (sent + received), tag with role, deduplicate by id
      const sentRequests = (myRequestsResponse.data?.data || []).map((r: FileRequestDto) => ({ ...r, _role: "client" as const }));
      const receivedRequests = (myDeliveriesResponse.data?.data || []).map((r: FileRequestDto) => ({ ...r, _role: "creative" as const }));
      const allRequests = [...sentRequests, ...receivedRequests];
      const seenRequestIds = new Set<string>();
      const dedupedRequests = allRequests.filter((r) => {
        if (seenRequestIds.has(r.id)) return false;
        seenRequestIds.add(r.id);
        return true;
      });
      setFileRequests(dedupedRequests);
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

  // Check first-free status when panel opens
  useEffect(() => {
    if (isOpen && view === "transfers") {
      platformApi.getUserConfig().then((res) => {
        if (res.data) {
          setIsFirstPaidTransferUsed(res.data.isFirstPaidTransferUsed ?? true);
        }
      }).catch(() => {
        // Non-critical, default to true (hidden)
      });
    }
  }, [isOpen, view]);

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

  // Filtered file requests for the requests tab
  const filteredRequests = useMemo(() => {
    if (activeTab !== "requests") return [];

    let result = [...fileRequests];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((req) => {
        const titleMatch = (req.title || "").toLowerCase().includes(query);
        const emailMatch = (req.clientEmail || "").toLowerCase().includes(query) ||
          (req.creativeEmail || "").toLowerCase().includes(query);
        return titleMatch || emailMatch;
      });
    }

    // Sort by date (most recent first)
    return result.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortAscending ? dateA - dateB : dateB - dateA;
    });
  }, [activeTab, fileRequests, searchQuery, sortAscending]);

  // Calculate pagination
  const totalItems = activeTab === "requests" ? filteredRequests.length : filteredTransfers.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Get paginated transfers for current page
  const paginatedTransfers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTransfers.slice(startIndex, endIndex);
  }, [filteredTransfers, currentPage, pageSize]);

  // Get paginated requests for current page
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredRequests.slice(startIndex, endIndex);
  }, [filteredRequests, currentPage, pageSize]);

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

  // Handle clicking on a request item (navigate to request details)
  const handleRequestClick = useCallback(
    (request: FileRequestDto & { _role?: "client" | "creative" }) => {
      setSelectedFileRequest(request);
      pushView("request-details");
    },
    [setSelectedFileRequest, pushView]
  );

  // Copy request review/deliver link
  const handleRequestCopyLink = useCallback(
    async (request: FileRequestDto & { _role?: "client" | "creative" }) => {
      if (!request.shortCode) {
        toast.error(t("noLinkAvailable"));
        return;
      }
      const user = authApi.getStoredUser();
      const isClient = request._role === "client" || request.clientEmail === user?.email;
      const path = isClient ? `/review/${request.shortCode}` : `/deliver/${request.shortCode}`;
      const url = `${window.location.origin}${path}`;
      await copyToClipboard(url, {
        successMessage: t("linkCopied"),
        errorMessage: t("linkCopyFailed"),
      });
    },
    [t]
  );

  // Cancel request state
  const [cancellingRequest, setCancellingRequest] = useState<(FileRequestDto & { _role?: "client" | "creative" }) | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleRequestCancel = useCallback(
    (request: FileRequestDto & { _role?: "client" | "creative" }) => {
      setCancellingRequest(request);
    },
    []
  );

  const confirmCancelRequest = useCallback(async () => {
    if (!cancellingRequest) return;
    setIsCancelling(true);
    try {
      const response = await fileRequestApi.cancel(cancellingRequest.id);
      if (response.error) {
        const errorMsg =
          typeof response.error.message === "string"
            ? response.error.message
            : t("genericError");
        toast.error(errorMsg);
        return;
      }
      toast.success(t("requestCancelled"));
      setCancellingRequest(null);
      // Refresh the list
      fetchTransfers();
    } catch {
      toast.error(t("genericError"));
    } finally {
      setIsCancelling(false);
    }
  }, [cancellingRequest, t, fetchTransfers]);

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
      if (transfer.customDomainUrl) {
        await copyToClipboard(transfer.customDomainUrl, {
          successMessage: t("linkCopied"),
          errorMessage: t("linkCopyFailed"),
        });
      } else {
        await copyTransferLink(
          transfer.shortCode,
          t("linkCopied"),
          t("linkCopyFailed")
        );
      }
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

  // Clear selection when drawer closes
  useEffect(() => {
    if (!isOpen) {
      deselectAll();
    }
  }, [isOpen, deselectAll]);

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
      case "requests":
        return t("noRequests");
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
        <p className="text-gray-500 dark:text-[oklch(0.65_0_0)] mb-4">{error}</p>
        <button
          onClick={() => fetchTransfers()}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-[oklch(0.28_0_0)] rounded-lg hover:bg-gray-800 dark:hover:bg-[oklch(0.32_0_0)] transition-colors"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Title */}
      <h1 className="text-4xl font-bold text-gray-900 dark:text-[oklch(0.91_0_0)] mt-12 mb-18">
        {t("title")}
      </h1>

      {/* Onboarding Checklist */}
      <OnboardingChecklistCard />

      {/* First-Free Banner */}
      {!isFirstPaidTransferUsed && (
        <FirstFreeBanner variant="compact" className="mb-4" />
      )}

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
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] hover:text-gray-700 dark:hover:text-[oklch(0.75_0_0)] transition-colors"
              >
                <span>{t("filterBy")} :</span>
                <span className="font-bold text-gray-900 dark:text-[oklch(0.91_0_0)]">
                  {currentFilterLabel}
                </span>
              </button>

              {showFilterDropdown && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-card rounded-lg shadow-lg dark:shadow-black/30 border border-gray-200 dark:border-border py-1 z-50">
                  {FILTER_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setFilterBy(option.id);
                        setShowFilterDropdown(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] transition-colors ${
                        filterBy === option.id
                          ? "font-bold text-gray-900 dark:text-[oklch(0.91_0_0)]"
                          : "text-gray-600 dark:text-[oklch(0.65_0_0)]"
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
              className="p-1 text-gray-500 dark:text-[oklch(0.65_0_0)] hover:text-gray-700 dark:hover:text-[oklch(0.75_0_0)] transition-colors"
              aria-label={sortAscending ? "Sort descending" : "Sort ascending"}
            >
              {sortAscending ? (
                <SortUp className="w-5 h-5" strokeWidth={1.5} />
              ) : (
                <SortDown className="w-5 h-5" strokeWidth={1.5} />
              )}
            </button>

            {/* Separator */}
            <div className="w-px h-4 bg-gray-300 dark:bg-[oklch(0.40_0_0)] mx-2" />

            {/* Page size dropdown */}
            <div className="relative" ref={pageSizeDropdownRef}>
              <button
                onClick={() => setShowPageSizeDropdown(!showPageSizeDropdown)}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] hover:text-gray-700 dark:hover:text-[oklch(0.75_0_0)] transition-colors"
              >
                <span>{t("itemsPerPage")} :</span>
                <span className="font-bold text-gray-900 dark:text-[oklch(0.91_0_0)]">{pageSize}</span>
              </button>

              {showPageSizeDropdown && (
                <div className="absolute top-full right-0 mt-2 w-24 bg-white dark:bg-card rounded-lg shadow-lg dark:shadow-black/30 border border-gray-200 dark:border-border py-1 z-50">
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        setPageSize(size);
                        setShowPageSizeDropdown(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] transition-colors ${
                        pageSize === size
                          ? "font-bold text-gray-900 dark:text-[oklch(0.91_0_0)]"
                          : "text-gray-600 dark:text-[oklch(0.65_0_0)]"
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
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-border" />
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

      {/* Content List */}
      {activeTab === "requests" ? (
        // Requests tab content
        paginatedRequests.length > 0 ? (
          <div className="flex flex-col gap-3">
            {paginatedRequests.map((request) => (
              <RequestItem key={request.id} request={request} t={t} onSelect={handleRequestClick} onCopyLink={handleRequestCopyLink} onCancel={handleRequestCancel} />
            ))}
          </div>
        ) : searchQuery ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-500 dark:text-[oklch(0.65_0_0)]">{t("noResults")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <GitFork className="w-12 h-12 text-gray-200 dark:text-[oklch(0.40_0_0)] mb-4" strokeWidth={1.5} />
            <p className="text-base font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-1">{t("emptyState.requests.title")}</p>
            <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] mb-6">{t("emptyState.requests.subtitle")}</p>
            <button
              onClick={closeDrawer}
              className="px-6 py-2.5 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors text-sm"
            >
              {t("emptyState.requests.cta")}
            </button>
          </div>
        )
      ) : (
        // Transfers tab content (sent, received, paid)
        paginatedTransfers.length > 0 ? (
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
        ) : searchQuery ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-500 dark:text-[oklch(0.65_0_0)]">{t("noResults")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            {activeTab === "sent" && (
              <>
                <SendDiagonal className="w-12 h-12 text-gray-200 dark:text-[oklch(0.40_0_0)] mb-4" strokeWidth={1.5} />
                <p className="text-base font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-1">{t("emptyState.sent.title")}</p>
                <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] mb-6">{t("emptyState.sent.subtitle")}</p>
                <button
                  onClick={closeDrawer}
                  className="px-6 py-2.5 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors text-sm"
                >
                  {t("emptyState.sent.cta")}
                </button>
              </>
            )}
            {activeTab === "received" && (
              <>
                <Download className="w-12 h-12 text-gray-200 dark:text-[oklch(0.40_0_0)] mb-4" strokeWidth={1.5} />
                <p className="text-base font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-1">{t("emptyState.received.title")}</p>
                <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)]">{t("emptyState.received.subtitle")}</p>
              </>
            )}
            {activeTab === "paid" && (
              <>
                <HandCash className="w-12 h-12 text-gray-200 dark:text-[oklch(0.40_0_0)] mb-4" strokeWidth={1.5} />
                <p className="text-base font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-1">{t("emptyState.paid.title")}</p>
                <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)]">{t("emptyState.paid.subtitle")}</p>
              </>
            )}
          </div>
        )
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

      {/* Cancel request confirmation modal */}
      <ConfirmationModal
        isOpen={!!cancellingRequest}
        type="warning"
        title={t("cancelRequestTitle")}
        message={
          cancellingRequest?.status === "funded"
            ? t("cancelRequestMessageFunded")
            : t("cancelRequestMessage")
        }
        confirmLabel={t("cancelRequestConfirm")}
        isLoading={isCancelling}
        onConfirm={confirmCancelRequest}
        onCancel={() => setCancellingRequest(null)}
      />
    </div>
  );
};

export default TransfersPanel;
