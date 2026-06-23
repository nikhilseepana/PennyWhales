import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WebView = require('react-native-webview').default as React.ComponentType<any>;

const C = {
  appBar:      '#0f172a',
  accent:      '#3b82f6',
  bg:          '#f1f5f9',
  card:        '#ffffff',
  textPrimary: '#1e293b',
  textSec:     '#64748b',
  textMuted:   '#94a3b8',
  border:      '#e2e8f0',
};

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

interface Props {
  url: string;
  title: string;
  onClose: () => void;
}

export default function InAppBrowser({ url, title, onClose }: Props) {
  const webRef = useRef<any>(null);
  const [canGoBack, setCanGoBack]       = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [currentUrl, setCurrentUrl]     = useState(url);
  const progressAnim                    = useRef(new Animated.Value(0)).current;

  const onLoadProgress = ({ nativeEvent }: { nativeEvent: { progress: number } }) => {
    Animated.timing(progressAnim, {
      toValue: nativeEvent.progress,
      duration: 100,
      useNativeDriver: false,
    }).start();
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Shorten URL for display
  const displayUrl = currentUrl
    .replace(/^https?:\/\//, '')
    .replace(/\/chart\/.*/, '/chart/…')
    .slice(0, 48);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.appBar} />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
          <Ionicons name="close" size={18} color="#ffffff" />
        </Pressable>

        <View style={styles.urlPill}>
          <Text style={styles.urlTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.urlText} numberOfLines={1}>{displayUrl}</Text>
        </View>

        {/* Reload */}
        <Pressable
          onPress={() => webRef.current?.reload()}
          style={styles.actionBtn}
          hitSlop={12}>
          <Ionicons name="refresh" size={18} color="#ffffff" />
        </Pressable>
      </View>

      {/* Progress bar */}
      {loading && (
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
      )}

      {/* ── WebView ── */}
      <WebView
        ref={webRef}
        source={{ uri: url }}
        style={styles.webview}
        onLoadStart={() => { setLoading(true); progressAnim.setValue(0); }}
        onLoadEnd={() => setLoading(false)}
        onLoadProgress={onLoadProgress}
        onNavigationStateChange={(state: { canGoBack: boolean; canGoForward: boolean; url: string }) => {
          setCanGoBack(state.canGoBack);
          setCanGoForward(state.canGoForward);
          setCurrentUrl(state.url);
        }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState={false}
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="large" color={C.accent} />
          </View>
        )}
      />

      {/* ── Bottom nav bar ── */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => webRef.current?.goBack()}
          disabled={!canGoBack}
          style={styles.navBtn}
          hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={canGoBack ? C.textPrimary : C.textMuted} />
        </Pressable>

        <Pressable
          onPress={() => webRef.current?.goForward()}
          disabled={!canGoForward}
          style={styles.navBtn}
          hitSlop={12}>
          <Ionicons name="chevron-forward" size={22} color={canGoForward ? C.textPrimary : C.textMuted} />
        </Pressable>

        <Pressable
          onPress={() => webRef.current?.reload()}
          style={styles.navBtn}
          hitSlop={12}>
          <Ionicons name="refresh" size={20} color={C.textPrimary} />
        </Pressable>

        <Pressable onPress={onClose} style={styles.closeNavBtn} hitSlop={12}>
          <Text style={styles.closeNavBtnText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.appBar,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.appBar,
    paddingTop: STATUSBAR_HEIGHT + 8,
    paddingBottom: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  urlPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  urlTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  urlText: {
    color: C.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 22,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(59,130,246,0.2)',
  },
  progressBar: {
    height: 2,
    backgroundColor: C.accent,
  },
  webview: {
    flex: 1,
    backgroundColor: C.bg,
  },
  webviewLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    gap: 8,
  },
  navBtn: {
    width: 40,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    fontSize: 20,
    color: C.textPrimary,
    fontWeight: '600',
    lineHeight: 24,
  },
  navBtnDisabled: {
    color: C.textMuted,
  },
  closeNavBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  closeNavBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
