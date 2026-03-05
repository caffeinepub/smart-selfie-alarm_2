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
import { useAuth } from "./hooks/useAuth";

import AboutPage from "./pages/AboutPage";
import AlarmTriggerPage from "./pages/AlarmTriggerPage";
import AuthPage from "./pages/AuthPage";
import ContactPage from "./pages/ContactPage";
import CreateEditAlarmPage from "./pages/CreateEditAlarmPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import SettingsPage from "./pages/SettingsPage";
import StopwatchPage from "./pages/StopwatchPage";
import TimerPage from "./pages/TimerPage";
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
      "/privacy": "Privacy Policy — Smart Selfie Alarm",
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

            {/* Protected routes */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alarm/new"
              element={
                <ProtectedRoute>
                  <CreateEditAlarmPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alarm/edit/:id"
              element={
                <ProtectedRoute>
                  <CreateEditAlarmPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alarm-trigger"
              element={
                <ProtectedRoute>
                  <AlarmTriggerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/verify"
              element={
                <ProtectedRoute>
                  <VerificationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/timer"
              element={
                <ProtectedRoute>
                  <TimerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stopwatch"
              element={
                <ProtectedRoute>
                  <StopwatchPage />
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
      </AuthProvider>
    </BrowserRouter>
  );
}

// AlarmProvider needs to be inside BrowserRouter for useNavigate
function AlarmProviderWrapper({ children }: { children: ReactNode }) {
  return <AlarmProvider>{children}</AlarmProvider>;
}

export default AppWithProviders;
