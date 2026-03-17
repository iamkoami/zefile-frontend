import { render, screen, waitFor } from "@testing-library/react";
import TransferCompletePanel from "./TransferCompletePanel";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      transferSent: "Transfer sent!",
      copyLinkOrShareTransfer: "Copy the link or share your transfer",
      previewTransfer: "Preview transfer",
      sendAnother: "Send another",
      sendSameFiles: "Send same files to others",
      tellAFriend: "Tell a friend about ZeFile",
      copyLink: "Copy link",
      linkCopied: "Link copied!",
      copyError: "Failed to copy link",
    };
    return translations[key] || key;
  },
}));

// Mock drawer store
jest.mock("@/stores/drawer-store", () => ({
  useDrawerStore: () => ({
    openDrawerToView: jest.fn(),
  }),
}));

// Mock referrals API
const mockGetMyCode = jest.fn();
jest.mock("@/services/referrals-api", () => ({
  referralsApi: {
    getMyCode: (...args: unknown[]) => mockGetMyCode(...args),
  },
}));

// Mock clipboard utility
jest.mock("@/utils/clipboard", () => ({
  copyToClipboard: jest.fn().mockResolvedValue(true),
}));

// Mock Lottie
jest.mock("lottie-react", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return {
    __esModule: true,
    default: React.forwardRef(() => <div data-testid="lottie" />),
  };
});

// Mock child components
jest.mock("@/features/home/components/CelebrationModal", () => () => null);
jest.mock("./QuickShareButtons", () => () => (
  <div data-testid="quick-share-buttons" />
));
jest.mock("@/components/shared/OnboardingTooltip", () => {
  const component = () => null;
  return { __esModule: true, default: component };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baseTransfer: any = {
  id: "test-id",
  shortCode: "abc123",
  title: "Test Transfer",
  message: "",
  files: [],
  price: 5000,
  currency: "XOF",
  status: "ACTIVE",
  recipientEmails: ["test@example.com"],
};

const defaultProps = {
  transferLink: "https://zefile.io/transfers/test-id",
  shortLink: "zefile.co/z-abc123",
  transfer: baseTransfer,
  onSendAnother: jest.fn(),
};

describe("TransferCompletePanel — Referral Prompt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMyCode.mockResolvedValue({
      data: { code: "REF123", shareUrl: "https://zefile.io/r/REF123" },
    });
  });

  it("renders referral prompt when myCode loads for a paid transfer", async () => {
    render(<TransferCompletePanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Tell a friend about ZeFile")).toBeInTheDocument();
    });
    expect(screen.getByText("https://zefile.io/r/REF123")).toBeInTheDocument();
    expect(screen.getByText("Copy link")).toBeInTheDocument();
  });

  it("does NOT render referral prompt for free transfers (price = 0)", async () => {
    const freeTransfer = { ...baseTransfer, price: 0 };
    render(
      <TransferCompletePanel {...defaultProps} transfer={freeTransfer} />
    );

    // Wait a tick for any effects to settle
    await new Promise((r) => setTimeout(r, 50));

    expect(mockGetMyCode).not.toHaveBeenCalled();
    expect(screen.queryByText("Tell a friend about ZeFile")).not.toBeInTheDocument();
  });

  it("does NOT render referral prompt for transfers with no price", async () => {
    const noPriceTransfer = { ...baseTransfer, price: undefined };
    render(
      <TransferCompletePanel {...defaultProps} transfer={noPriceTransfer} />
    );

    await new Promise((r) => setTimeout(r, 50));

    expect(mockGetMyCode).not.toHaveBeenCalled();
    expect(screen.queryByText("Tell a friend about ZeFile")).not.toBeInTheDocument();
  });

  it("hides referral prompt when API call fails", async () => {
    mockGetMyCode.mockRejectedValue(new Error("Network error"));
    render(<TransferCompletePanel {...defaultProps} />);

    await new Promise((r) => setTimeout(r, 50));

    expect(screen.queryByText("Tell a friend about ZeFile")).not.toBeInTheDocument();
  });

  it("hides referral prompt when API returns no data", async () => {
    mockGetMyCode.mockResolvedValue({ data: null });
    render(<TransferCompletePanel {...defaultProps} />);

    await new Promise((r) => setTimeout(r, 50));

    expect(screen.queryByText("Tell a friend about ZeFile")).not.toBeInTheDocument();
  });

  it("calls referralsApi.getMyCode() on mount for paid transfers", async () => {
    render(<TransferCompletePanel {...defaultProps} />);

    await waitFor(() => {
      expect(mockGetMyCode).toHaveBeenCalledTimes(1);
    });
  });

  it("renders transfer success UI immediately without waiting for referral code", () => {
    // Make API hang indefinitely
    mockGetMyCode.mockReturnValue(new Promise(() => {}));
    render(<TransferCompletePanel {...defaultProps} />);

    // Success UI renders immediately
    expect(screen.getByText("Transfer sent!")).toBeInTheDocument();
    expect(screen.getByText("Send another")).toBeInTheDocument();
    // Referral prompt not visible yet
    expect(screen.queryByText("Tell a friend about ZeFile")).not.toBeInTheDocument();
  });
});
