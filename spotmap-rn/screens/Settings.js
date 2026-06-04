import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Animated,
  Pressable,
  Image,
  ScrollView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabase";
import { SUPPORTED_LANGUAGES } from "../localization/i18n";

const CREAM = "#FAF7F2";
const NAVY = "#0D1F3C";
const MUTED = "rgba(28,23,20,0.38)";
const BORDER = "rgba(28,23,20,0.09)";
const RED = "rgba(192,57,43,0.90)";
const RED_BG = "rgba(192,57,43,0.08)";
const VERSION = "1.0.0";

// ─── Row ─────────────────────────────────────────────────────────────────────
function Row({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  value,
  onPress,
  destructive,
  disabled,
}) {
  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.rowDisabled]}
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.72}
      disabled={disabled || !onPress}
    >
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: iconBg ?? "rgba(13,31,60,0.06)" },
        ]}
      >
        <Ionicons name={icon} size={17} color={iconColor ?? NAVY} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.rowTitle, destructive && styles.rowTitleDestructive]}
        >
          {title}
        </Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {!destructive && !disabled && onPress ? (
        <Ionicons name="chevron-forward" size={15} color={MUTED} />
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Language bottom sheet ───────────────────────────────────────────────────
function LanguageSheet({ visible, currentLang, onSelect, onClose }) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(320)).current;

  useEffect(() => {
    if (!visible) return;
    slideAnim.setValue(320);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 2,
      speed: 16,
    }).start();
  }, [visible]);

  const close = () => {
    Animated.timing(slideAnim, {
      toValue: 340,
      duration: 210,
      useNativeDriver: true,
    }).start(onClose);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={close}
    >
      <Pressable style={ls.overlay} onPress={close} />
      <Animated.View
        style={[
          ls.sheet,
          {
            paddingBottom: insets.bottom + 12,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={ls.handle} />
        <Text style={ls.title}>Language</Text>
        <View style={ls.list}>
          {SUPPORTED_LANGUAGES.map((lang, i) => (
            <TouchableOpacity
              key={lang.code}
              style={[ls.langRow, i > 0 && ls.langRowBorder]}
              onPress={() => {
                onSelect(lang.code);
                close();
              }}
              activeOpacity={0.72}
            >
              <View style={{ flex: 1 }}>
                <Text style={ls.langLabel}>{lang.label}</Text>
                <Text style={ls.langNative}>{lang.nativeLabel}</Text>
              </View>
              {currentLang === lang.code ? (
                <Ionicons name="checkmark-circle" size={20} color={NAVY} />
              ) : (
                <View style={ls.uncheck} />
              )}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={ls.cancelLink}
          onPress={close}
          activeOpacity={0.75}
        >
          <Text style={ls.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const ls = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: BORDER,
    alignSelf: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: NAVY,
    letterSpacing: -0.4,
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  list: {
    marginHorizontal: 16,
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    marginBottom: 10,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  langRowBorder: { borderTopWidth: 1, borderTopColor: BORDER },
  langLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: NAVY,
    letterSpacing: -0.1,
  },
  langNative: { fontSize: 12, color: MUTED, marginTop: 2 },
  uncheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  cancelLink: { alignItems: "center", paddingVertical: 14 },
  cancelText: { fontSize: 15, fontWeight: "500", color: MUTED },
});

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function Settings({ navigation, user, theme, toggleTheme }) {
  const { i18n } = useTranslation();
  const [langSheetVisible, setLangSheetVisible] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return;
      supabase
        .from("profiles")
        .select("display_name, handle, avatar_url")
        .eq("id", authUser.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    });
  }, []);

  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ??
    SUPPORTED_LANGUAGES[0];
  const isDark = theme === "dark";

  const displayName = profile?.display_name ?? user?.displayName ?? "";
  const handle = profile?.handle ? `@${profile.handle}` : null;
  const avatarUrl = profile?.avatar_url ?? user?.photoURL ?? null;

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  };

  const showReportingSafety = () => {
    Alert.alert(
      "Reporting & Safety",
      "See something that doesn't belong?\n\nYou can report any gem from the ··· menu on any post. Reports help us keep Gem useful, honest, and welcoming.\n\nFor now, reports are reviewed by the Gem creators — Eva, Yujen, and Gil.",
      [{ text: "Got it" }],
    );
  };

  const showAbout = () => {
    Alert.alert(
      "About Gem",
      "Gem is a place to discover meaningful spots saved by real people, not algorithms.\n\nMade with care by Eva, Yujen, and Gil.\n\nA CS 278 project for discovering meaningful places.",
      [{ text: "Close" }],
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: CREAM }}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={20} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>settings</Text>
          <View style={{ width: 34 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile card ─────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.82}
          onPress={() =>
            user &&
            navigation.navigate("Profile", {
              user: {
                uid: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL,
              },
              isOwnProfile: true,
            })
          }
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.profileAvatar} />
          ) : (
            <View style={styles.profileAvatarFallback}>
              <Ionicons name="person" size={22} color={MUTED} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            {displayName ? (
              <Text style={styles.profileName}>{displayName}</Text>
            ) : null}
            {handle ? <Text style={styles.profileHandle}>{handle}</Text> : null}
            <Text style={styles.profileSub}>Manage your Gem experience</Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={MUTED} />
        </TouchableOpacity>

        {/* ── Preferences ──────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.card}>
          <Row
            icon="language-outline"
            iconColor="#7A9FC2"
            iconBg="rgba(122,159,194,0.14)"
            title="Language"
            value={currentLang.label}
            onPress={() => setLangSheetVisible(true)}
          />
          <View style={styles.divider} />
          <Row
            icon="sunny-outline"
            iconColor="#C4A882"
            iconBg="rgba(196,168,130,0.14)"
            title="Appearance"
            value={isDark ? "Dark" : "Light"}
            onPress={toggleTheme}
          />
          <View style={styles.divider} />
          <Row
            icon="notifications-outline"
            iconColor={MUTED}
            iconBg="rgba(28,23,20,0.06)"
            title="Notifications"
            subtitle="Coming soon"
            disabled
          />
        </View>

        {/* ── Learn & Safety ───────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>LEARN & SAFETY</Text>
        <View style={styles.card}>
          <Row
            icon="play-circle-outline"
            iconColor="#7A9FC2"
            iconBg="rgba(122,159,194,0.14)"
            title="How gem works"
            subtitle="Replay the onboarding"
            onPress={() => navigation.navigate("OnboardingReview")}
          />
          <View style={styles.divider} />
          <Row
            icon="compass-outline"
            iconColor="#A98BBE"
            iconBg="rgba(169,139,190,0.14)"
            title="Community Guide"
            subtitle="Principles, examples, and norms"
            onPress={() => navigation.navigate("CommunityGuide")}
          />
          <View style={styles.divider} />
          <Row
            icon="shield-checkmark-outline"
            iconColor="#3A7D44"
            iconBg="rgba(58,125,68,0.12)"
            title="Reporting & Safety"
            subtitle="What to do when something's off"
            onPress={showReportingSafety}
          />
        </View>

        {/* ── About ────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <Row
            icon="diamond-outline"
            iconColor="#C4828A"
            iconBg="rgba(196,130,138,0.14)"
            title="About Gem"
            subtitle={`Version ${VERSION} · Made by Eva, Yujen & Gil`}
            onPress={showAbout}
          />
        </View>

        {/* ── Account ──────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <Row
            icon="log-out-outline"
            iconColor={RED}
            iconBg={RED_BG}
            title="Sign out"
            onPress={handleSignOut}
            destructive
          />
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>

      <LanguageSheet
        visible={langSheetVisible}
        currentLang={i18n.language}
        onSelect={(code) => i18n.changeLanguage(code)}
        onClose={() => setLangSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(13,31,60,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: NAVY,
    letterSpacing: -0.3,
  },

  scroll: { flex: 1 },
  content: { padding: 20, gap: 6 },

  // ── Profile card ───────────────────────────────────────────────────────────
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 14,
    marginBottom: 6,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    flexShrink: 0,
  },
  profileAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(13,31,60,0.07)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  profileName: {
    fontSize: 15,
    fontWeight: "700",
    color: NAVY,
    letterSpacing: -0.2,
  },
  profileHandle: { fontSize: 13, color: MUTED, marginTop: 1 },
  profileSub: { fontSize: 12, color: MUTED, marginTop: 3 },

  // ── Section label ──────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: MUTED,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
    paddingHorizontal: 4,
  },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },

  // ── Row ────────────────────────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDisabled: { opacity: 0.45 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: NAVY,
    letterSpacing: -0.1,
  },
  rowTitleDestructive: { color: RED },
  rowSub: { fontSize: 12, color: MUTED, marginTop: 1 },
  rowValue: { fontSize: 13, color: MUTED, marginRight: 4 },
});
