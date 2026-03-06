/**
 * Detects if the app is running inside a Median.co (or generic) webview.
 * Used to choose between signInWithPopup (browser) and external browser flow (webview).
 */
export function isInWebView(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  // Median.co sets a custom userAgent segment
  if (/Median/i.test(ua)) return true;
  // Android webview marker
  if (/wv\)/.test(ua) && /Android/i.test(ua)) return true;
  // Generic WebView
  if (/WebView/i.test(ua)) return true;
  // iOS standalone / WKWebView
  if (
    (window.navigator as unknown as Record<string, unknown>).standalone === true
  )
    return true;
  // Median JS bridge object
  if (
    typeof (window as unknown as Record<string, unknown>).MedianBridge !==
    "undefined"
  )
    return true;
  return false;
}

/** Builds the Firebase Google OAuth URL that can be opened in external browser */
export function getGoogleAuthUrl(): string {
  const authDomain = "smart-selfie-alarm.firebaseapp.com";
  return `https://${authDomain}/__/auth/handler`;
}
