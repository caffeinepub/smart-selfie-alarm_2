import { Toaster } from "@/components/ui/sonner";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { Layout } from "./components/Layout";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { AlarmProvider } from "./context/AlarmContext";
import { AuthProvider } from "./context/AuthContext";
import { SubscriptionProvider } from "./context/SubscriptionContext";
import { useSubscriptionContext } from "./context/SubscriptionContext";
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
import StopwatchPage from "./pages/StopwatchPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import TermsAndConditionsPage from "./pages/TermsAndConditionsPage";
import TimerPage from "./pages/TimerPage";
import ToolsPage from "./pages/ToolsPage";
import VerificationPage from "./pages/VerificationPage";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * SubscriptionGuard — wraps authenticated routes that require an active plan.
 * If the subscription is still loading we show a spinner.
 * If there is no active subscription the user is redirected to /subscription.
 */
function SubscriptionGuard({ children }: { children: ReactNode }) {
  const { isActive, loading } = useSubscriptionContext();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isActive) {
    return <Navigate to="/subscription" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Update document title on route change
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
      "/timer": "Timer — Smart Selfie Alarm",
      "/stopwatch": "Stopwatch — Smart Selfie Alarm",
      "/tools": "Tools — Smart Selfie Alarm",
      "/privacy": "Privacy Policy — Smart Selfie Alarm",
      "/terms": "Terms & Conditions — Smart Selfie Alarm",
      "/refund": "Refund Policy — Smart Selfie Alarm",
      "/subscription": "Subscription — Smart Selfie Alarm",
    };
    document.title = titles[location.pathname] ?? "Smart Selfie Alarm";
  }, [location.pathname]);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

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
            {/* Public routes */}
            <Route
              path="/"
              element={user ? <Navigate to="/home" replace /> : <AuthPage />}
            />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsAndConditionsPage />} />
            <Route path="/refund" element={<RefundPolicyPage />} />

            {/* Subscription page — requires login but NOT an active subscription
                (user lands here to subscribe) */}
            <Route
              path="/subscription"
              element={
                <ProtectedRoute>
                  <SubscriptionPage />
                </ProtectedRoute>
              }
            />

            {/* Protected + subscription-gated routes */}
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
            <Route
              path="/timer"
              element={
                <ProtectedRoute>
                  <SubscriptionGuard>
                    <TimerPage />
                  </SubscriptionGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/stopwatch"
              element={
                <ProtectedRoute>
                  <SubscriptionGuard>
                    <StopwatchPage />
                  </SubscriptionGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tools"
              element={
                <ProtectedRoute>
                  <SubscriptionGuard>
                    <ToolsPage />
                  </SubscriptionGuard>
                </ProtectedRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

function AppWithProviders() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProviderWrapper>
          <AlarmProviderWrapper>
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
          </AlarmProviderWrapper>
        </SubscriptionProviderWrapper>
      </AuthProvider>
    </BrowserRouter>
  );
}

// SubscriptionProvider must be inside BrowserRouter and AuthProvider
function SubscriptionProviderWrapper({ children }: { children: ReactNode }) {
  return <SubscriptionProvider>{children}</SubscriptionProvider>;
}

// AlarmProvider needs to be inside BrowserRouter for useNavigate
function AlarmProviderWrapper({ children }: { children: ReactNode }) {
  return <AlarmProvider>{children}</AlarmProvider>;
}

export default AppWithProviders;
