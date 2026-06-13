// Document scanner wrapper.
//
// Uses `react-native-document-scanner-plugin`, which is backed by the native
// ML Kit Document Scanner (Android) and VisionKit (iOS) — giving automatic
// edge detection, perspective crop, and clean output.
//
// This is a NATIVE module: it only works in a custom dev build / production
// build, NOT in Expo Go. We require() it defensively so the app still launches
// in Expo Go (the scanner simply reports itself unavailable there).

let DocumentScanner: { scanDocument: (opts?: Record<string, unknown>) => Promise<{ scannedImages?: string[] }> } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  DocumentScanner = require("react-native-document-scanner-plugin").default ?? null;
} catch {
  DocumentScanner = null;
}

export function isScannerAvailable(): boolean {
  return !!DocumentScanner;
}

function normalizeUri(uri: string): string {
  if (!uri) return uri;
  return uri.startsWith("file://") || uri.startsWith("content://") ? uri : `file://${uri}`;
}

/** Launch the native document scanner. Returns a local file URI, or null if cancelled/unavailable. */
export async function scanDocument(): Promise<string | null> {
  if (!DocumentScanner) return null;
  const { scannedImages } = await DocumentScanner.scanDocument({
    maxNumDocuments: 1,
    croppedImageQuality: 80,
  });
  if (scannedImages && scannedImages.length > 0) {
    return normalizeUri(scannedImages[0]);
  }
  return null;
}
