import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, ActivityIndicator, Alert, Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

interface AdPackage {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  description: string;
  features: string[];
  color: string;
  popular?: boolean;
}

interface Campaign {
  id: number;
  packageType: string;
  durationDays: number;
  price: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export default function AdvertiseScreen() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [tab, setTab] = useState<"new" | "campaigns">("new");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const [pkgRes, campRes] = await Promise.all([
        fetch(`${API_BASE}/ads/packages`),
        fetch(`${API_BASE}/ads/my-campaigns`, { headers }),
      ]);

      if (pkgRes.ok) setPackages(await pkgRes.json());
      if (campRes.ok) setCampaigns(await campRes.json());
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const hasActiveCampaign = campaigns.some(c => c.status === "active");

  const handleSubmit = async () => {
    if (!selectedPackage) {
      Alert.alert("Hata", "Lütfen bir kampanya paketi seçin");
      return;
    }
    if (!agreedToTerms) {
      Alert.alert("Hata", "Kampanya koşullarını kabul etmeniz gerekmektedir");
      return;
    }

    const pkg = packages.find(p => p.id === selectedPackage);
    if (!pkg) return;

    Alert.alert(
      "Kampanya Başlat",
      `${pkg.name} paketi ₺${pkg.price} tutarında olup ${pkg.durationDays} gün boyunca tüm ürünlerinizi öne çıkaracaktır.\n\nDevam etmek istiyor musunuz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Onayla",
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await fetch(`${API_BASE}/ads/apply`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  packageType: selectedPackage,
                  note,
                  agreedToTerms: true,
                }),
              });
              const data = await res.json();
              if (!res.ok) {
                Alert.alert("Hata", data.error ?? "Kampanya başlatılamadı");
              } else {
                Alert.alert(
                  "Kampanya Başlatıldı!",
                  "Tüm ürünleriniz artık öne çıkanlar arasında görünecek.",
                  [{ text: "Tamam", onPress: () => { fetchData(); setTab("campaigns"); } }]
                );
                setSelectedPackage(null);
                setNote("");
                setAgreedToTerms(false);
              }
            } catch {
              Alert.alert("Hata", "Bir sorun oluştu, lütfen tekrar deneyin");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const selectedPkg = packages.find(p => p.id === selectedPackage);

  const statusLabel = (s: string) => {
    if (s === "active") return { label: "Aktif", color: Colors.light.success };
    if (s === "pending") return { label: "Beklemede", color: Colors.light.warning };
    if (s === "expired") return { label: "Sona Erdi", color: Colors.light.textMuted };
    return { label: "İptal", color: Colors.light.accent };
  };

  if (!user?.isSeller) {
    return (
      <View style={[styles.centered, { paddingTop: topInset }]}>
        <Feather name="lock" size={48} color={Colors.light.textMuted} />
        <Text style={styles.errorText}>Sadece satıcılar reklam verebilir</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Reklam Ver</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === "new" && styles.tabActive]}
          onPress={() => setTab("new")}
        >
          <Feather name="zap" size={15} color={tab === "new" ? Colors.light.primary : Colors.light.textMuted} />
          <Text style={[styles.tabText, tab === "new" && styles.tabTextActive]}>Yeni Kampanya</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "campaigns" && styles.tabActive]}
          onPress={() => setTab("campaigns")}
        >
          <Feather name="list" size={15} color={tab === "campaigns" ? Colors.light.primary : Colors.light.textMuted} />
          <Text style={[styles.tabText, tab === "campaigns" && styles.tabTextActive]}>
            Kampanyalarım {campaigns.length > 0 ? `(${campaigns.length})` : ""}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : tab === "new" ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24 }}
        >
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <View style={styles.infoBannerIcon}>
              <Feather name="trending-up" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoBannerTitle}>Tüm Mağazanızı Öne Çıkarın</Text>
              <Text style={styles.infoBannerDesc}>
                Kampanya başlattığınızda mağazanızdaki tüm ürünler listenin üstünde görünür
              </Text>
            </View>
          </View>

          {hasActiveCampaign && (
            <View style={[styles.infoBanner, { backgroundColor: Colors.light.success, marginBottom: 0, marginTop: 0, marginHorizontal: 20, marginBottom: 20 }]}>
              <Feather name="check-circle" size={20} color="#fff" />
              <Text style={[styles.infoBannerDesc, { flex: 1 }]}>Aktif bir kampanyanız bulunuyor. Tüm ürünleriniz öne çıkarılmış.</Text>
            </View>
          )}

          {/* Package Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kampanya Paketi Seçin</Text>
            {packages.map((pkg) => (
              <Pressable
                key={pkg.id}
                style={({ pressed }) => [
                  styles.packageCard,
                  selectedPackage === pkg.id && { borderColor: pkg.color, borderWidth: 2 },
                  pressed && { opacity: 0.9 },
                ]}
                onPress={() => setSelectedPackage(pkg.id)}
              >
                {pkg.popular && (
                  <View style={[styles.popularBadge, { backgroundColor: pkg.color }]}>
                    <Text style={styles.popularBadgeText}>En Popüler</Text>
                  </View>
                )}
                <View style={styles.packageHeader}>
                  <View style={[styles.packageIcon, { backgroundColor: pkg.color + "18" }]}>
                    <Feather name="zap" size={20} color={pkg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.packageName}>{pkg.name}</Text>
                    <Text style={styles.packageDuration}>{pkg.durationDays} gün · Tüm ürünler</Text>
                  </View>
                  <View style={styles.packagePriceBox}>
                    <Text style={[styles.packagePrice, { color: pkg.color }]}>₺{pkg.price}</Text>
                  </View>
                  <View style={[
                    styles.radioOuter,
                    selectedPackage === pkg.id && { borderColor: pkg.color },
                  ]}>
                    {selectedPackage === pkg.id && (
                      <View style={[styles.radioInner, { backgroundColor: pkg.color }]} />
                    )}
                  </View>
                </View>
                <View style={styles.packageFeatures}>
                  {pkg.features.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Feather name="check" size={13} color={pkg.color} />
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            ))}
          </View>

          {/* Terms */}
          <View style={styles.section}>
            <View style={styles.termsCard}>
              <Feather name="file-text" size={16} color={Colors.light.textSecondary} />
              <Text style={styles.termsText}>
                Kampanya bedelinin 3 iş günü içinde belirtilen hesaba ödenmesi gerekmektedir.
                Ödeme yapılmayan kampanyalar otomatik olarak iptal edilir.
                Reklam içeriği platform kurallarına uygun olmalıdır.
              </Text>
            </View>
            <Pressable
              style={styles.agreeRow}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              hitSlop={8}
            >
              <Switch
                value={agreedToTerms}
                onValueChange={setAgreedToTerms}
                trackColor={{ false: Colors.light.border, true: Colors.light.primary + "80" }}
                thumbColor={agreedToTerms ? Colors.light.primary : "#f4f3f4"}
              />
              <Text style={styles.agreeText}>Kampanya koşullarını okudum ve kabul ediyorum</Text>
            </Pressable>
          </View>

          {/* Summary */}
          {selectedPkg && (
            <View style={styles.section}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Kampanya Özeti</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Paket</Text>
                  <Text style={styles.summaryValue}>{selectedPkg.name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Süre</Text>
                  <Text style={styles.summaryValue}>{selectedPkg.durationDays} gün</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Kapsam</Text>
                  <Text style={styles.summaryValue}>Tüm ürünleriniz</Text>
                </View>
                <View style={[styles.summaryRow, { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.light.borderLight }]}>
                  <Text style={[styles.summaryLabel, { fontFamily: "Inter_700Bold", fontSize: 15 }]}>Toplam</Text>
                  <Text style={[styles.summaryValue, { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.light.primary }]}>
                    ₺{selectedPkg.price}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ paddingHorizontal: 20 }}>
            <Pressable
              style={({ pressed }) => [styles.submitBtn, (submitting || !agreedToTerms || hasActiveCampaign) && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
              onPress={handleSubmit}
              disabled={submitting || !agreedToTerms || hasActiveCampaign}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="zap" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>
                    {hasActiveCampaign ? "Aktif Kampanya Var" : "Kampanyayı Başlat"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24 }}
        >
          {campaigns.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="zap-off" size={48} color={Colors.light.textMuted} />
              <Text style={styles.emptyTitle}>Henüz kampanyanız yok</Text>
              <Text style={styles.emptyDesc}>İlk reklam kampanyanızı başlatmak için "Yeni Kampanya" sekmesini kullanın</Text>
              <Pressable style={styles.emptyBtn} onPress={() => setTab("new")}>
                <Feather name="plus" size={16} color="#fff" />
                <Text style={styles.emptyBtnText}>Kampanya Oluştur</Text>
              </Pressable>
            </View>
          ) : (
            campaigns.map((camp) => {
              const { label, color } = statusLabel(camp.status);
              const pkg = packages.find(p => p.id === camp.packageType);
              return (
                <View key={camp.id} style={styles.campaignCard}>
                  <View style={styles.campaignHeader}>
                    <View style={[styles.campaignIcon, { backgroundColor: (pkg?.color ?? Colors.light.primary) + "18" }]}>
                      <Feather name="zap" size={18} color={pkg?.color ?? Colors.light.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.campaignProduct}>{pkg?.name ?? camp.packageType} Paketi</Text>
                      <Text style={styles.campaignPackage}>Tüm ürünler · {camp.durationDays} gün</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: color + "18" }]}>
                      <Text style={[styles.statusText, { color }]}>{label}</Text>
                    </View>
                  </View>
                  <View style={styles.campaignDivider} />
                  <View style={styles.campaignMeta}>
                    <View style={styles.campaignMetaItem}>
                      <Feather name="calendar" size={13} color={Colors.light.textMuted} />
                      <Text style={styles.campaignMetaText}>
                        {camp.startDate ? new Date(camp.startDate).toLocaleDateString("tr-TR") : "-"}
                      </Text>
                    </View>
                    <Text style={styles.campaignMetaSep}>→</Text>
                    <View style={styles.campaignMetaItem}>
                      <Feather name="calendar" size={13} color={Colors.light.textMuted} />
                      <Text style={styles.campaignMetaText}>
                        {camp.endDate ? new Date(camp.endDate).toLocaleDateString("tr-TR") : "-"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    <Text style={styles.campaignPrice}>₺{camp.price}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: Colors.light.background, padding: 24 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary, textAlign: "center" },
  backBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  backBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.surface, alignItems: "center", justifyContent: "center" },

  tabs: { flexDirection: "row", marginHorizontal: 20, marginBottom: 16, backgroundColor: Colors.light.surface, borderRadius: 14, padding: 4 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: Colors.light.primary + "18" },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  tabTextActive: { color: Colors.light.primary, fontFamily: "Inter_600SemiBold" },

  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },

  infoBanner: {
    flexDirection: "row", alignItems: "center", gap: 14,
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: Colors.light.primary, borderRadius: 18, padding: 18,
  },
  infoBannerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  infoBannerTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 3 },
  infoBannerDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.9)", lineHeight: 17 },

  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 12 },

  packageCard: {
    backgroundColor: Colors.light.surface, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.light.border,
    overflow: "hidden",
  },
  popularBadge: { position: "absolute", top: 0, right: 0, paddingHorizontal: 12, paddingVertical: 5, borderBottomLeftRadius: 12 },
  popularBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#fff" },
  packageHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  packageIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  packageName: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.light.text },
  packageDuration: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2 },
  packagePriceBox: { marginRight: 10 },
  packagePrice: { fontSize: 22, fontFamily: "Inter_700Bold" },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.light.border, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  packageFeatures: { gap: 6 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },

  termsCard: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: Colors.light.backgroundSecondary, borderRadius: 12, padding: 14, marginBottom: 14,
  },
  termsText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, lineHeight: 18 },
  agreeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  agreeText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text },

  summaryCard: { backgroundColor: Colors.light.surface, borderRadius: 16, padding: 16 },
  summaryTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 3 },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  summaryValue: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.text },

  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.light.primary, borderRadius: 16, paddingVertical: 17,
  },
  submitBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17 },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textAlign: "center", lineHeight: 20 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.light.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  emptyBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },

  campaignCard: { backgroundColor: Colors.light.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  campaignHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  campaignIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  campaignProduct: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  campaignPackage: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  campaignDivider: { height: 1, backgroundColor: Colors.light.borderLight, marginVertical: 12 },
  campaignMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  campaignMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  campaignMetaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  campaignMetaSep: { fontSize: 12, color: Colors.light.textMuted },
  campaignPrice: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.light.primary },
});
