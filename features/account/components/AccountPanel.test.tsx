import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AccountPanel from "./AccountPanel";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: "Account",
      settings: "Account Settings",
      subscription: "Subscription",
      transactions: "Transactions",
      payouts: "Payouts",
      analytics: "Analytics",
      verification: "Identity Verification",
      customDomain: "Custom Domain",
      help: "Help Center",
      analyticsUpgradeTitle: "See how your transfers perform",
      analyticsUpgradeDescription:
        "Download trends, revenue insights, and transfer performance — all in one place. Available on Starter and Pro plans.",
      analyticsUpgradeCta: "View plans",
    };
    return translations[key] || key;
  },
}));

// Mock drawer store
const mockSetActiveAccountMenu = jest.fn();
let mockActiveAccountMenu = "settings";

jest.mock("@/stores/drawer-store", () => ({
  useDrawerStore: () => ({
    activeAccountMenu: mockActiveAccountMenu,
    setActiveAccountMenu: mockSetActiveAccountMenu,
  }),
  // Re-export types so TS is happy
}));

// Mock subscription API
let mockTier = "starter";
jest.mock("@/services/subscription-api", () => ({
  subscriptionApi: {
    getCurrentSubscription: jest.fn(() =>
      Promise.resolve({ data: { tier: mockTier } })
    ),
  },
}));

// Mock child components to isolate AccountPanel testing
jest.mock("./TransactionsPanel", () => () => (
  <div data-testid="transactions-panel">TransactionsPanel</div>
));
jest.mock("./PayoutsPanel", () => () => (
  <div data-testid="payouts-panel">PayoutsPanel</div>
));
jest.mock("./SubscriptionSettingsPanel", () => () => (
  <div data-testid="subscription-panel">SubscriptionSettingsPanel</div>
));
jest.mock("./AccountSettingsContent", () => () => (
  <div data-testid="account-settings">AccountSettingsContent</div>
));
jest.mock("@/features/kyc/components/KYCFlowPanel", () => ({
  KYCFlowPanel: () => <div data-testid="kyc-panel">KYCFlowPanel</div>,
}));
jest.mock("./CustomDomainPanel", () => () => (
  <div data-testid="custom-domain-panel">CustomDomainPanel</div>
));
jest.mock("@/features/analytics/components/AnalyticsPanel", () => () => (
  <div data-testid="analytics-panel">AnalyticsPanel</div>
));
jest.mock("@/components/LoadingPanel", () => ({ className }: { className?: string }) => (
  <div data-testid="loading-panel" className={className}>Loading...</div>
));

// Mock iconoir-react
jest.mock("iconoir-react", () => ({
  Settings: () => <span data-testid="icon-settings" />,
  Page: () => <span data-testid="icon-page" />,
  Wallet: () => <span data-testid="icon-wallet" />,
  ShieldCheck: () => <span data-testid="icon-shield" />,
  InfoCircle: () => <span data-testid="icon-info" />,
  RefreshDouble: () => <span data-testid="icon-refresh" />,
  Globe: () => <span data-testid="icon-globe" />,
  GraphUp: () => <span data-testid="icon-graph-up" />,
}));

describe("AccountPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveAccountMenu = "settings";
    mockTier = "starter";
  });

  describe("Analytics menu item visible for STARTER/PRO users", () => {
    it("shows analytics menu item for STARTER users", async () => {
      mockTier = "starter";
      render(<AccountPanel />);

      await waitFor(() => {
        expect(screen.getByText("Analytics")).toBeInTheDocument();
      });
    });

    it("shows analytics menu item for PRO users", async () => {
      mockTier = "pro";
      render(<AccountPanel />);

      await waitFor(() => {
        expect(screen.getByText("Analytics")).toBeInTheDocument();
      });
    });

    it("positions analytics after payouts and before verification", async () => {
      mockTier = "starter";
      render(<AccountPanel />);

      await waitFor(() => {
        expect(screen.getByText("Analytics")).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole("button");
      const labels = buttons.map((btn) => btn.textContent);

      const payoutsIndex = labels.indexOf("Payouts");
      const analyticsIndex = labels.indexOf("Analytics");
      const verificationIndex = labels.indexOf("Identity Verification");

      expect(analyticsIndex).toBeGreaterThan(payoutsIndex);
      expect(analyticsIndex).toBeLessThan(verificationIndex);
    });
  });

  describe("Clicking renders AnalyticsPanel in content area", () => {
    it("renders AnalyticsPanel when analytics is active menu", async () => {
      mockTier = "starter";
      mockActiveAccountMenu = "analytics";
      render(<AccountPanel />);

      await waitFor(() => {
        expect(screen.getByTestId("analytics-panel")).toBeInTheDocument();
      });
    });

    it("calls setActiveAccountMenu when analytics menu item is clicked", async () => {
      mockTier = "starter";
      render(<AccountPanel />);

      await waitFor(() => {
        expect(screen.getByText("Analytics")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Analytics"));
      expect(mockSetActiveAccountMenu).toHaveBeenCalledWith("analytics");
    });
  });

  describe("Menu item hidden for FREE users", () => {
    it("hides analytics menu item for FREE users", async () => {
      mockTier = "free";
      render(<AccountPanel />);

      await waitFor(() => {
        // Verify other menu items are present but analytics is not
        expect(screen.getByText("Transactions")).toBeInTheDocument();
      });

      expect(screen.queryByText("Analytics")).not.toBeInTheDocument();
    });
  });

  describe("Upgrade prompt for FREE users on direct navigation", () => {
    it("shows upgrade prompt when FREE user navigates to analytics", async () => {
      mockTier = "free";
      mockActiveAccountMenu = "analytics";
      render(<AccountPanel />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Download trends, revenue insights, and transfer performance \u2014 all in one place. Available on Starter and Pro plans."
          )
        ).toBeInTheDocument();
      });

      expect(screen.getByText("View plans")).toBeInTheDocument();
    });

    it("upgrade CTA navigates to subscription panel", async () => {
      mockTier = "free";
      mockActiveAccountMenu = "analytics";
      render(<AccountPanel />);

      await waitFor(() => {
        expect(screen.getByText("View plans")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("View plans"));
      expect(mockSetActiveAccountMenu).toHaveBeenCalledWith("subscription");
    });
  });

  describe("Loading state", () => {
    it("shows loading panel while tier is being fetched", () => {
      mockTier = "starter";
      // The component shows loading initially before the API resolves
      render(<AccountPanel />);

      // On first render, tierLoading is true
      expect(screen.getByTestId("loading-panel")).toBeInTheDocument();
    });
  });
});
