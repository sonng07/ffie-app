// YouTubeEmbed — an inline 16:9 YouTube player. Wraps react-native-webview
// around the privacy-friendly youtube-nocookie embed, so a film plays IN the
// app instead of opening a browser (FFIE-VIDEO-01).
//
// Captions are non-negotiable (Léa watches muted): cc_load_policy=1 turns them
// on by default. No autoplay — the player shows its poster + a play button and
// waits for a tap (mediaPlaybackRequiresUserAction). playsinline keeps playback
// inside the card on iOS; the native fullscreen button still works.
//
// react-native-webview ships inside Expo Go; a custom dev/TestFlight build needs
// a rebuild to include the native module.

import React from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { primitives } from "@tokens";

export function YouTubeEmbed({
  youtubeId,
  radius = primitives.radii.lg,
  accessibilityLabel,
}: {
  youtubeId: string;
  radius?: number;
  accessibilityLabel?: string;
}) {
  // A minimal, responsive iframe doc — the wrapper fills the WebView, the iframe
  // fills the wrapper, so the 16:9 box (set below) drives the player's size.
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { height: 100%; background: #000; overflow: hidden; }
      .frame { position: relative; width: 100%; height: 100%; }
      iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
    </style>
  </head>
  <body>
    <div class="frame">
      <iframe
        src="https://www.youtube-nocookie.com/embed/${youtubeId}?playsinline=1&rel=0&modestbranding=1&cc_load_policy=1"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
  </body>
</html>`;

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
      style={{
        width: "100%",
        aspectRatio: 16 / 9,
        borderRadius: radius,
        overflow: "hidden",
        backgroundColor: "#000",
      }}
    >
      <WebView
        source={{ html, baseUrl: "https://www.youtube-nocookie.com" }}
        originWhitelist={["*"]}
        style={{ flex: 1, backgroundColor: "#000" }}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
      />
    </View>
  );
}
