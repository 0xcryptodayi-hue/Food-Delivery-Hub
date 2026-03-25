import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, Platform, ScrollView, Alert, Image, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getBaseUrl } from "@workspace/api-client-react";

const API_BASE = getBaseUrl();

function MenuItem({ icon, label, value, onPress, danger }: {
  icon: string; label: string; value?: string; onPress: () => void; danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: Colors.light.backgroundSecondary }]}
      onPress={onPress}
    >
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Feather name={icon as "home"} size={18} color={danger ? Colors.light.accent : Colors.light.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
        {value && <Text style={styles.menuValue}>{value}</Text>}
      </View>
      <Feather name="chevron-right" size={16} color={Colors.light.textMuted} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, updateUser, logout } = useAuth();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleLogout = () => {
    Alert.alert("Çıkış Yap", "Hesabınızdan çıkmak istediğinizden emin misiniz?", [
      { text: "İptal", style: "cancel" },
      { text: "Çıkış", style: "destructive", onPress: logout },
    ]);
  };

  const pickAndUploadAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("İzin Gerekli", "Fotoğraf seçmek için galeri erişimi gereklidir");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: asset.uri,
        type: asset.mimeType ?? "image/jpeg",
        name: asset.fileName ?? "avatar.jpg",
      } as unknown as Blob);

      const uploadRes = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Yükleme başarısız");
      const { url } = await uploadRes.json();

      const updateRes = await fetch(`${API_BASE}/api/auth/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar: url }),
      });
      if (!updateRes.ok) throw new Error("Güncelleme başarısız");
      const updatedUser = await updateRes.json();
      updateUser(updatedUser);
      Alert.alert("Güncellendi", "Profil fotoğrafınız başarıyla güncellendi.");
    } catch {
      Alert.alert("Hata", "Fotoğraf güncellenemedi. Lütfen tekrar deneyin.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: topInset }]}>
        <View style={styles.loggedOutIcon}>
          <Feather name="user" size={40} color={Colors.light.primary} />
        </View>
        <Text style={styles.loggedOutTitle}>Hesabınıza giriş yapın</Text>
        <Text style={styles.loggedOutText}>Profil, siparişler ve daha fazlasına erişin</Text>
        <Pressable style={styles.loginBtn} onPress={() => router.push("/auth")}>
          <Text style={styles.loginBtnText}>Giriş Yap / Kayıt Ol</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: topInset }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 80 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <Pressable style={styles.avatarWrapper} onPress={pickAndUploadAvatar} disabled={uploadingAvatar}>
          {uploadingAvatar ? (
            <View style={[styles.avatar, styles.avatarLoading]}>
              <ActivityIndicator color={Colors.light.primary} />
            </View>
          ) : user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{user.name[0]?.toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Feather name="camera" size={12} color="#fff" />
          </View>
          {user.isSeller && (
            <View style={styles.sellerBadge}>
              <Feather name="star" size={10} color="#fff" />
            </View>
          )}
        </Pressable>

        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          {user.isSeller ? (
            <View style={styles.sellerTag}>
              <Feather name="award" size={12} color={Colors.light.primary} />
              <Text style={styles.sellerTagText}>Satıcı</Text>
            </View>
          ) : null}
        </View>

        {user.rating && user.rating > 0 ? (
          <View style={styles.ratingBox}>
            <Ionicons name="star" size={16} color={Colors.light.star} />
            <Text style={styles.ratingText}>{user.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({user.reviewCount})</Text>
          </View>
        ) : null}
      </View>

      {/* Avatar hint */}
      <Text style={styles.avatarHint}>Profil fotoğrafını değiştirmek için avatara dokun</Text>

      {/* Account section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hesap</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="shopping-bag" label="Siparişlerim" onPress={() => router.push("/(tabs)/orders")} />
          <View style={styles.menuDivider} />
          <MenuItem icon="heart" label="Favorilerim" onPress={() => router.push("/favorites")} />
          <View style={styles.menuDivider} />
          <MenuItem icon="message-circle" label="Mesajlarım" onPress={() => router.push("/(tabs)/messages")} />
        </View>
      </View>

      {/* Seller section */}
      {user.isSeller && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Satıcı</Text>
          <View style={styles.menuCard}>
            <MenuItem icon="grid" label="Yönetici Paneli" value="Ürünler, reklam, kazanç ve hijyen" onPress={() => router.push("/seller-dashboard")} />
            <View style={styles.menuDivider} />
            <MenuItem icon="dollar-sign" label="Cüzdanım" onPress={() => router.push("/wallet")} />
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Destek</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="help-circle" label="Müşteri Hizmetleri" value="S.S.S. ve destek talepleri" onPress={() => router.push("/support")} />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.menuCard}>
          <MenuItem icon="log-out" label="Çıkış Yap" onPress={handleLogout} danger />
        </View>
      </View>

      <Text style={styles.version}>Ev Yemekleri Marketplace v1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { alignItems: "center", justifyContent: "center", gap: 16 },
  header: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
    backgroundColor: "#FEF3E2",
    borderBottomWidth: 1, borderBottomColor: "#F0D9B5",
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: "rgba(180,80,10,0.12)", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 3 },
      web: { boxShadow: "0 3px 10px rgba(180,80,10,0.10)" },
    }),
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.light.text },

  profileCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.light.surface, marginHorizontal: 20, borderRadius: 20,
    padding: 18, marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  avatarWrapper: { position: "relative" },
  avatar: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.light.primary + "25", alignItems: "center", justifyContent: "center",
  },
  avatarLoading: { backgroundColor: Colors.light.backgroundSecondary },
  avatarImage: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: Colors.light.primary + "30" },
  avatarInitial: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  avatarEditBadge: {
    position: "absolute", bottom: 0, left: 0,
    backgroundColor: Colors.light.primary, borderRadius: 12,
    width: 22, height: 22, alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#fff",
  },
  sellerBadge: {
    position: "absolute", bottom: 0, right: 0,
    backgroundColor: Colors.light.primary, borderRadius: 10,
    width: 20, height: 20, alignItems: "center", justifyContent: "center",
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.light.text },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, marginTop: 2 },
  sellerTag: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  sellerTagText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.primary },
  ratingBox: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.light.text },
  reviewCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },

  avatarHint: {
    fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted,
    textAlign: "center", marginBottom: 20,
  },

  section: { marginHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.textSecondary, marginBottom: 8, paddingLeft: 4 },
  menuCard: {
    backgroundColor: Colors.light.surface, borderRadius: 16,
    ...Platform.select({
      ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.light.primary + "15", alignItems: "center", justifyContent: "center" },
  menuIconDanger: { backgroundColor: Colors.light.accent + "15" },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.light.text },
  menuLabelDanger: { color: Colors.light.accent },
  menuValue: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: Colors.light.borderLight, marginHorizontal: 16 },

  loggedOutIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.light.primary + "15", alignItems: "center", justifyContent: "center" },
  loggedOutTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text, textAlign: "center" },
  loggedOutText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center", paddingHorizontal: 40 },
  loginBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 40, paddingVertical: 16, borderRadius: 16, marginTop: 8 },
  loginBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  version: { textAlign: "center", fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 8, paddingBottom: 20 },
});
