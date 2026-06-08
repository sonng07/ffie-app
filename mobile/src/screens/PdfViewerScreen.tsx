// In-app PDF reader — renders a document's real PDF inside the app instead of
// handing it to an external browser (FFIE-DOC-02: "documents can be opened in
// the application"). Same react-native-webview that powers YouTubeEmbed, so it
// works in Expo Go; a custom dev/TestFlight build needs a rebuild to include the
// native module.
//
// Platform note (honest, not a bug): iOS WKWebView renders a remote PDF inline,
// so we load the file URL directly. Android's system WebView can't, so we wrap
// the URL in Google's hosted document viewer — which only works for PUBLICLY
// reachable PDFs. Today exactly one FFIE doc exposes a public file URL (the
// electrification plan); the rest are HTML detail pages and never reach here
// (DocDetailScreen sends those to the in-app browser instead). When the backend
// starts syncing real member-doc file URLs, they all flow through this reader.
//
// No dead end (Principle 2): if the embed fails (offline, 404, a member file
// behind auth), we fall back to a clear card with a "open in browser" action.

import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { ChevronLeft, FileText, Share2 } from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import { themes, type ThemeName } from "@tokens";
import { GUTTER, useGroupedColors } from "@/components/ui/ios";

export function PdfViewerScreen({
  uri,
  title,
  themeName = "light",
  onBack,
  onShare,
}: {
  /** The document's real PDF file URL (doc.sourceUrl). */
  uri: string;
  /** Document title — shown in the nav bar and used as the back affordance. */
  title: string;
  themeName?: ThemeName;
  onBack: () => void;
  /** Optional share action, mirrored from the detail screen. */
  onShare?: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Android can't render a remote PDF inline — route it through Google's viewer
  // (public PDFs only). iOS loads the file directly.
  const displayUri =
    Platform.OS === "android"
      ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(uri)}`
      : uri;

  const openInBrowser = () => {
    WebBrowser.openBrowserAsync(uri, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    }).catch(() => {
      // browser unavailable — no-op
    });
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
      {/* Slim nav bar: back + (optional) share — matches DocDetailScreen. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: GUTTER - 4,
          height: 44,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer le document"
          onPress={onBack}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            columnGap: 1,
            opacity: pressed ? 0.5 : 1,
            paddingVertical: 6,
            paddingRight: 8,
            flexShrink: 1,
          })}
        >
          <ChevronLeft size={26} color={t.brand.accent} />
          <Text numberOfLines={1} style={{ color: t.brand.accent, fontSize: 16, flexShrink: 1 }}>
            {title}
          </Text>
        </Pressable>

        {onShare ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Partager ce document"
            onPress={onShare}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Share2 size={20} color={t.brand.accent} />
          </Pressable>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {/* Reader, or the honest fallback if the embed can't load. */}
      {failed ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, rowGap: 14 }}>
          <View
            style={{
              width: 56,
              height: 68,
              borderRadius: 8,
              backgroundColor: t.brand.institutional,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileText size={28} color="#FFFFFF" />
          </View>
          <Text
            accessibilityRole="header"
            style={{ color: t.text.body, fontSize: 17, fontWeight: "600", textAlign: "center" }}
          >
            Aperçu indisponible
          </Text>
          <Text style={{ color: t.text.muted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
            Impossible d'afficher ce PDF ici. Vous pouvez l'ouvrir dans le navigateur.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ouvrir le document dans le navigateur"
            onPress={openInBrowser}
            style={({ pressed }) => ({
              marginTop: 4,
              paddingHorizontal: 22,
              height: 48,
              borderRadius: 24,
              backgroundColor: pressed ? t.action.primary.bgPressed : t.action.primary.bg,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>
              Ouvrir dans le navigateur
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <WebView
            source={{ uri: displayUri }}
            originWhitelist={["*"]}
            onLoadEnd={() => setLoading(false)}
            onError={() => setFailed(true)}
            onHttpError={() => setFailed(true)}
            style={{ flex: 1, backgroundColor: c.pageBg }}
            // PDFs are static — JS off keeps the reader lean; gview needs it on.
            javaScriptEnabled={Platform.OS === "android"}
            domStorageEnabled={Platform.OS === "android"}
            setSupportMultipleWindows={false}
          />

          {/* Loading overlay until the first paint. */}
          {loading ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                { alignItems: "center", justifyContent: "center", backgroundColor: c.pageBg },
              ]}
            >
              <ActivityIndicator color={t.brand.accent} />
              <Text style={{ color: t.text.muted, fontSize: 13, marginTop: 10 }}>
                Chargement du document…
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}
