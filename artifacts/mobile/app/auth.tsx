import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<"buyer" | "seller" | null>(null);

  const handleSubmit = async () => {
    if (!email || !password || (mode === "register" && !name)) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun");
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login"
        ? { email, password }
        : { name, email, phone, password, role };
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? "Bir hata oluştu");
      await login(data.token, data.user);
      router.back();
    } catch (err: unknown) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (type: "buyer" | "seller") => {
    const demoEmail = type === "buyer" ? "buyer@demo.com" : "ayse@demo.com";
    setDemoLoading(type);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: "demo123" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Demo giriş başarısız");
      await login(data.token, data.user);
      router.back();
    } catch (err: unknown) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Demo giriş hatası");
    } finally {
      setDemoLoading(null);
    }
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: topInset + 16, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Close */}
        <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={8}>
          <Feather name="x" size={22} color={Colors.light.text} />
        </Pressable>

        {/* Logo */}
        <View style={styles.logoSection}>
          <Text style={styles.logoEmoji}>🍲</Text>
          <Text style={styles.appName}>Ev Yemekleri</Text>
          <Text style={styles.tagline}>Ev yapımı lezzetler, kapınıza kadar</Text>
        </View>

        {/* Demo Section */}
        <View style={styles.demoSection}>
          <Text style={styles.demoLabel}>Hızlı Demo Girişi</Text>
          <View style={styles.demoRow}>
            <Pressable
              style={({ pressed }) => [styles.demoCard, styles.demoCardBuyer, pressed && { opacity: 0.85 }]}
              onPress={() => demoLogin("buyer")}
              disabled={!!demoLoading || loading}
            >
              {demoLoading === "buyer" ? (
                <ActivityIndicator color={Colors.light.primary} />
              ) : (
                <>
                  <View style={[styles.demoIconCircle, { backgroundColor: Colors.light.primary + "18" }]}>
                    <Text style={styles.demoCardEmoji}>🛒</Text>
                  </View>
                  <Text style={[styles.demoCardTitle, { color: Colors.light.primary }]}>Demo Alıcı</Text>
                  <Text style={styles.demoCardDesc}>Ürünleri keşfet,{"\n"}sipariş ver</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.demoCard, styles.demoCardSeller, pressed && { opacity: 0.85 }]}
              onPress={() => demoLogin("seller")}
              disabled={!!demoLoading || loading}
            >
              {demoLoading === "seller" ? (
                <ActivityIndicator color="#E67E22" />
              ) : (
                <>
                  <View style={[styles.demoIconCircle, { backgroundColor: "#E67E2218" }]}>
                    <Text style={styles.demoCardEmoji}>🍳</Text>
                  </View>
                  <Text style={[styles.demoCardTitle, { color: "#E67E22" }]}>Demo Satıcı</Text>
                  <Text style={styles.demoCardDesc}>Ürün ekle,{"\n"}siparişleri yönet</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya e-posta ile devam et</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Mode tabs */}
        <View style={styles.modeTabs}>
          <Pressable
            style={[styles.modeTab, mode === "login" && styles.modeTabActive]}
            onPress={() => setMode("login")}
          >
            <Text style={[styles.modeTabText, mode === "login" && styles.modeTabTextActive]}>Giriş Yap</Text>
          </Pressable>
          <Pressable
            style={[styles.modeTab, mode === "register" && styles.modeTabActive]}
            onPress={() => setMode("register")}
          >
            <Text style={[styles.modeTabText, mode === "register" && styles.modeTabTextActive]}>Kayıt Ol</Text>
          </Pressable>
        </View>

        {/* Form */}
        {mode === "register" && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ad Soyad</Text>
            <View style={styles.inputWrapper}>
              <Feather name="user" size={18} color={Colors.light.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Adınız ve soyadınız"
                placeholderTextColor={Colors.light.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>E-posta</Text>
          <View style={styles.inputWrapper}>
            <Feather name="mail" size={18} color={Colors.light.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="ornek@email.com"
              placeholderTextColor={Colors.light.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {mode === "register" && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Telefon (opsiyonel)</Text>
            <View style={styles.inputWrapper}>
              <Feather name="phone" size={18} color={Colors.light.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="0530 123 4567"
                placeholderTextColor={Colors.light.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Şifre</Text>
          <View style={styles.inputWrapper}>
            <Feather name="lock" size={18} color={Colors.light.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Şifreniz"
              placeholderTextColor={Colors.light.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={Colors.light.textMuted} />
            </Pressable>
          </View>
        </View>

        {mode === "register" && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Hesap Türü</Text>
            <View style={styles.roleRow}>
              <Pressable
                style={[styles.roleBtn, role === "buyer" && styles.roleBtnActive]}
                onPress={() => setRole("buyer")}
              >
                <Text style={styles.roleBtnIcon}>🛒</Text>
                <Text style={[styles.roleBtnText, role === "buyer" && styles.roleBtnTextActive]}>Alıcı</Text>
              </Pressable>
              <Pressable
                style={[styles.roleBtn, role === "seller" && styles.roleBtnActive]}
                onPress={() => setRole("seller")}
              >
                <Text style={styles.roleBtnIcon}>🍳</Text>
                <Text style={[styles.roleBtnText, role === "seller" && styles.roleBtnTextActive]}>Satıcı</Text>
              </Pressable>
            </View>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.9 }, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading || !!demoLoading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>{mode === "login" ? "Giriş Yap" : "Kayıt Ol"}</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { paddingHorizontal: 24 },

  closeBtn: { alignSelf: "flex-start", marginBottom: 20, padding: 4 },

  logoSection: { alignItems: "center", marginBottom: 28 },
  logoEmoji: { fontSize: 52, marginBottom: 8 },
  appName: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.light.text, marginBottom: 4 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },

  /* Demo */
  demoSection: { marginBottom: 24 },
  demoLabel: {
    fontSize: 13, fontFamily: "Inter_600SemiBold",
    color: Colors.light.textMuted, textTransform: "uppercase",
    letterSpacing: 0.8, marginBottom: 12, textAlign: "center",
  },
  demoRow: { flexDirection: "row", gap: 12 },
  demoCard: {
    flex: 1, alignItems: "center", paddingVertical: 20, paddingHorizontal: 12,
    borderRadius: 18, borderWidth: 1.5, gap: 8,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  demoCardBuyer: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.primary + "30",
  },
  demoCardSeller: {
    backgroundColor: Colors.light.surface,
    borderColor: "#E67E2230",
  },
  demoIconCircle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
  },
  demoCardEmoji: { fontSize: 26 },
  demoCardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  demoCardDesc: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.light.textMuted, textAlign: "center", lineHeight: 17,
  },

  /* Divider */
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.light.borderLight },
  dividerText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },

  /* Tabs */
  modeTabs: {
    flexDirection: "row", backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 14, padding: 4, marginBottom: 24,
  },
  modeTab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  modeTabActive: { backgroundColor: Colors.light.primary },
  modeTabText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.light.textSecondary },
  modeTabTextActive: { color: "#fff", fontFamily: "Inter_600SemiBold" },

  /* Inputs */
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.light.textSecondary, marginBottom: 7 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.light.surface, borderRadius: 14, paddingHorizontal: 16, height: 52,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.light.text },

  /* Role */
  roleRow: { flexDirection: "row", gap: 12 },
  roleBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.border,
  },
  roleBtnActive: { borderColor: Colors.light.primary, backgroundColor: Colors.light.primary + "10" },
  roleBtnIcon: { fontSize: 20 },
  roleBtnText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.light.textSecondary },
  roleBtnTextActive: { color: Colors.light.primary, fontFamily: "Inter_600SemiBold" },

  /* Submit */
  submitBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: "center", marginTop: 8,
  },
  submitBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17 },
});
