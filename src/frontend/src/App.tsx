import { Toaster } from "@/components/ui/sonner";
import { Crown, Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { Layout } from "./components/Layout";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { AlarmProvider } from "./context/AlarmContext";
import { AuthProvider } from "./context/AuthContext";
import {
  SubscriptionProvider,
  useSubscriptionContext,
} from "./context/SubscriptionContext";
import { useAuth } from "./hooks/useAuth";

import AboutPage from "./pages/AboutPage";
import AlarmTriggerPage from "./pages/AlarmTriggerPage";
import AuthPage from "./pages/AuthPage";
import ContactPage from "./pages/ContactPage";
import CreateEditAlarmPage from "./pages/CreateEditAlarmPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import RefundPolicyPage from "./pages/RefundPolicyPage";
import SettingsPage from "./pages/SettingsPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import TermsAndConditionsPage from "./pages/TermsAndConditionsPage";
import VerificationPage from "./pages/VerificationPage";

// ─── Paywall popup ────────────────────────────────────────────────────────────

function PaywallModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-8"
      style={{ background: "rgba(0,0,0,0.70)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm rounded-[26px] p-6 text-center"
        style={{
          background: "linear-gradient(160deg, #12121e 0%, #0d0d18 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
        data-ocid="subscription.paywall_modal"
      >
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-[18px] flex items-center justify-center mx-auto mb-4"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            boxShadow: "0 6px 24px rgba(124,58,237,0.40)",
          }}
        >
          <Lock className="w-7 h-7 text-white" />
        </div>

        <h2
          className="text-lg font-bold text-white mb-1"
          style={{ letterSpacing: "-0.02em" }}
        >
          Select a plan to continue
        </h2>
        <p className="text-sm mb-5" style={{ color: "#64748b" }}>
          This feature requires an active subscription.
        </p>

        {/* CTA */}
        <button
          type="button"
          className="w-full h-12 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 mb-3"
          style={{
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            boxShadow: "0 4px 20px rgba(245,158,11,0.35)",
          }}
          onClick={() => {
            onClose();
            navigate("/subscription");
          }}
          data-ocid="subscription.paywall_cta_button"
        >
          <Crown className="w-4 h-4" />
          View Plans
        </button>

        <button
          type="button"
          className="w-full h-10 rounded-xl text-sm font-medium"
          style={{ color: "#475569" }}
          onClick={onClose}
          data-ocid="subscription.paywall_dismiss_button"
        >
          Not now
        </button>
      </motion.div>
    </div>
  );
}

// ─── Route guards ─────────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * SubscriptionGuard — shows a paywall popup instead of silently redirecting.
 * The user stays on the current page and sees: "Select a plan to continue".
 */
function SubscriptionGuard({ children }: { children: ReactNode }) {
  const { isActive, loading } = useSubscriptionContext();
  const navigate = useNavigate();
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (!loading && !isActive) {
      setShowPaywall(true);
    } else {
      setShowPaywall(false);
    }
  }, [isActive, loading]);

  if (loading) return <LoadingSpinner fullScreen />;

  if (!isActive) {
    return (
      <>
        {/* Blurred locked content preview */}
        <div className="pointer-events-none opacity-20 blur-sm select-none">
          {children}
        </div>
        <AnimatePresence>
          {showPaywall && (
            <PaywallModal
              open={showPaywall}
              onClose={() => navigate("/subscription")}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return <>{children}</>;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Smart Selfie Alarm — Sign In",
      "/home": "Home — Smart Selfie Alarm",
      "/dashboard": "Alarms — Smart Selfie Alarm",
      "/alarm/new": "New Alarm — Smart Selfie Alarm",
      "/alarm-trigger": "Wake Up! — Smart Selfie Alarm",
      "/verify": "Verify Awake — Smart Selfie Alarm",
      "/settings": "Settings — Smart Selfie Alarm",
      "/about": "About — Smart Selfie Alarm",
      "/contact": "Contact — Smart Selfie Alarm",
      "/privacy": "Privacy Policy — Smart Selfie Alarm",
      "/terms": "Terms & Conditions — Smart Selfie Alarm",
      "/refund": "Refund Policy — Smart Selfie Alarm",
      "/subscription": "Premium — Smart Selfie Alarm",
    };
    document.title = titles[location.pathname] ?? "Smart Selfie Alarm";
  }, [location.pathname]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          <Routes location={location}>
            {/* Public */}
            <Route
              path="/"
              element={user ? <Navigate to="/home" replace /> : <AuthPage />}
            />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsAndConditionsPage />} />
            <Route path="/refund" element={<RefundPolicyPage />} />

            {/* Subscription — requires login, NOT an active sub */}
            <Route
              path="/subscription"
              element={
                <ProtectedRoute>
                  <SubscriptionPage />
                </ProtectedRoute>
              }
            />

            {/* Premium-gated routes */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <SubscriptionGuard>
                    <HomePage />
                  </SubscriptionGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <SubscriptionGuard>
                    <DashboardPage />
                  </SubscriptionGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/alarm/new"
              element={
                <ProtectedRoute>
                  <SubscriptionGuard>
                    <CreateEditAlarmPage />
                  </SubscriptionGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/alarm/edit/:id"
              element={
                <ProtectedRoute>
                  <SubscriptionGuard>
                    <CreateEditAlarmPage />
                  </SubscriptionGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/alarm-trigger"
              element={
                <ProtectedRoute>
                  <SubscriptionGuard>
                    <AlarmTriggerPage />
                  </SubscriptionGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/verify"
              element={
                <ProtectedRoute>
                  <SubscriptionGuard>
                    <VerificationPage />
                  </SubscriptionGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SubscriptionGuard>
                    <SettingsPage />
                  </SubscriptionGuard>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────

function AppWithProviders() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <AlarmProvider>
            <AppRoutes />
            <Toaster
              position="top-center"
              theme="dark"
              toastOptions={{
                style: {
                  background: "rgba(20, 20, 35, 0.95)",
                  border: "1px solid rgba(124,58,237,0.2)",
                  color: "#f8fafc",
                  backdropFilter: "blur(12px)",
                },
              }}
            />
          </AlarmProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default AppWithProviders;
