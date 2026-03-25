import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, ActivityIndicator, Alert, TextInput, Modal, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useGetWallet, getBaseUrl } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = getBaseUrl();

const TR_MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

type Transaction = {
  id: number;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
};

function buildChartData(transactions: Transaction[]) {
  const now = new Date();
  const months: { label: string; earning: number; expense: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    months.push({ label: TR_MONTHS[d.getMonth()], earning: 0, expense: 0, _key: key } as typeof months[0] & { _key: string });
  }

  for (const tx of transactions) {
    const d = new Date(tx.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const entry = (months as (typeof months[0] & { _key: string })[]).find(m => m._key === key);
    if (!entry) continue;
    if (tx.type === "earning") entry.earning += tx.amount;
    else if (tx.type === "withdrawal") entry.expense += tx.amount;
  }

  return months;
}

function EarningsChart({ transactions }: { transactions: Transaction[] }) {
  const data = buildChartData(transactions);
  const maxVal = Math.max(...data.flatMap(d => [d.earning, d.expense]), 100);
  const chartH = 120;

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.legend}>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: Colors.light.success }]} />
          <Text style={chartStyles.legendText}>Kazanç</Text>
        </View>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: Colors.light.accent }]} />
          <Text style={chartStyles.legendText}>Çekim</Text>
        </View>
      </View>

      <View style={chartStyles.chart}>
        {data.map((d, i) => {
          const eH = (d.earning / maxVal) * chartH;
          const xH = (d.expense / maxVal) * chartH;
          return (
            <View key={i} style={chartStyles.col}>
              <View style={[chartStyles.bars, { height: chartH }]}>
                {d.expense > 0 && (
                  <View style={[chartStyles.bar, { height: xH, backgroundColor: Colors.light.accent + "80", marginRight: 2 }]} />
                )}
                {d.earning > 0 && (
                  <View style={[chartStyles.bar, { height: eH, backgroundColor: Colors.light.success }]} />
                )}
                {d.earning === 0 && d.expense === 0 && (
                  <View style={[chartStyles.bar, { height: 3, backgroundColor: Colors.light.borderLight }]} />
                )}
              </View>
              <Text style={chartStyles.monthLabel}>{d.label}</Text>
            </View>
          );
        })}
      </View>

      <View style={chartStyles.baseline} />
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { paddingTop: 4, paddingBottom: 0 },
  legend: { flexDirection: "row", gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 6, paddingBottom: 4 },
  col: { flex: 1, alignItems: "center", gap: 4 },
  bars: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 2 },
  bar: { flex: 1, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  monthLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  baseline: { height: 1, backgroundColor: Colors.light.borderLight, marginTop: 2 },
});

function AdvertiseBanner({ hasActiveCampaign, onPress }: { hasActiveCampaign: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [adBannerStyles.card, pressed && { opacity: 0.92 }]}
      onPress={onPress}
    >
      <View style={adBannerStyles.glowDot1} />
      <View style={adBannerStyles.glowDot2} />

      <View style={adBannerStyles.left}>
        <View style={adBannerStyles.iconRow}>
          <View style={adBannerStyles.zapIcon}>
            <Feather name="zap" size={18} color="#fff" />
          </View>
          {hasActiveCampaign && (
            <View style={adBannerStyles.activePill}>
              <View style={adBannerStyles.activeDot} />
              <Text style={adBannerStyles.activePillText}>Aktif</Text>
            </View>
          )}
        </View>
        <Text style={adBannerStyles.title}>
          {hasActiveCampaign ? "Kampanyanız Yayında! 🎉" : "Daha Fazla Müşteri Kazan"}
        </Text>
        <Text style={adBannerStyles.subtitle}>
          {hasActiveCampaign
            ? "Tüm ürünleriniz listenin üstünde görünüyor"
            : "Ürünlerinizi öne çıkar, satışlarını artır"}
        </Text>

        {!hasActiveCampaign && (
          <View style={adBannerStyles.priceRow}>
            <Text style={adBannerStyles.priceFrom}>₺199'dan başlayan fiyatlarla</Text>
          </View>
        )}
      </View>

      <View style={adBannerStyles.right}>
        <View style={adBannerStyles.ctaBtn}>
          <Text style={adBannerStyles.ctaBtnText}>
            {hasActiveCampaign ? "Yönet" : "Reklam Ver"}
          </Text>
          <Feather name="arrow-right" size={14} color="#7C3AED" />
        </View>
      </View>
    </Pressable>
  );
}

const adBannerStyles = StyleSheet.create({
  card: {
    marginHorizontal: 20, borderRadius: 20, padding: 20,
    backgroundColor: "#7C3AED",
    flexDirection: "row", alignItems: "center",
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 20 },
      android: { elevation: 10 },
      web: { boxShadow: "0 8px 32px rgba(124,58,237,0.4)" },
    }),
  },
  glowDot1: {
    position: "absolute", width: 120, height: 120, borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.06)", top: -40, right: 60,
  },
  glowDot2: {
    position: "absolute", width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.08)", bottom: -30, right: 10,
  },
  left: { flex: 1, gap: 4 },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  zapIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center",
  },
  activePill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ADE80" },
  activePillText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#fff" },
  title: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff", lineHeight: 20 },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", lineHeight: 17 },
  priceRow: { marginTop: 4 },
  priceFrom: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)" },
  right: { paddingLeft: 12 },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#fff", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  ctaBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#7C3AED" },
});

export default function SellerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, updateUser } = useAuth();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: wallet, isLoading, refetch } = useGetWallet({ query: { enabled: !!user?.isSeller } });

  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryFeeInput, setDeliveryFeeInput] = useState("");
  const [savingFee, setSavingFee] = useState(false);
  const [currentDeliveryFee, setCurrentDeliveryFee] = useState<number | null>(null);
  const [uploadingStore, setUploadingStore] = useState(false);
  const [hasActiveCampaign, setHasActiveCampaign] = useState(false);

  React.useEffect(() => {
    if (!user?.isSeller || !token) return;
    fetch(`${API_BASE}/api/sellers/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.deliveryFee !== undefined) setCurrentDeliveryFee(d.deliveryFee); })
      .catch(() => {});

    fetch(`${API_BASE}/api/ads/my-campaigns`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((camps: { status: string }[]) => setHasActiveCampaign(camps.some(c => c.status === "active")))
      .catch(() => {});
  }, [user, token]);

  const handleSaveDeliveryFee = async () => {
    const fee = parseFloat(deliveryFeeInput);
    if (isNaN(fee) || fee < 0 || fee > 500) {
      Alert.alert("Hata", "Geçerli bir kargo bedeli girin (0 - 500 ₺)");
      return;
    }
    setSavingFee(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellers/delivery-fee`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ deliveryFee: fee }),
      });
      if (!res.ok) throw new Error("Güncelleme başarısız");
      setCurrentDeliveryFee(fee);
      setShowDeliveryModal(false);
      Alert.alert("Güncellendi", `Kargo bedeli ₺${fee.toFixed(0)} olarak güncellendi.`);
    } catch {
      Alert.alert("Hata", "Kargo bedeli güncellenemedi");
    } finally {
      setSavingFee(false);
    }
  };

  const pickAndUploadStoreImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("İzin Gerekli", "Fotoğraf seçmek için galeri erişimi gereklidir");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploadingStore(true);
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: asset.uri,
        type: asset.mimeType ?? "image/jpeg",
        name: asset.fileName ?? "store.jpg",
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
        body: JSON.stringify({ storeImage: url }),
      });
      if (!updateRes.ok) throw new Error("Güncelleme başarısız");
      const updatedUser = await updateRes.json();
      updateUser(updatedUser);
      Alert.alert("Güncellendi", "Mağaza fotoğrafınız başarıyla güncellendi.");
    } catch {
      Alert.alert("Hata", "Fotoğraf güncellenemedi. Lütfen tekrar deneyin.");
    } finally {
      setUploadingStore(false);
    }
  };

  if (!user?.isSeller) {
    return (
      <View style={[styles.centered, { paddingTop: topInset }]}>
        <Feather name="lock" size={48} color={Colors.light.textMuted} />
        <Text style={styles.errorText}>Sadece satıcılar bu paneli kullanabilir</Text>
        <Pressable style={styles.backBtnRed} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  const transactions: Transaction[] = (wallet?.recentTransactions ?? []) as Transaction[];
  const netProfit = (wallet?.totalEarnings ?? 0) - (wallet?.platformFeePaid ?? 0) - (wallet?.totalWithdrawn ?? 0);

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Yönetici Paneli</Text>
        <Pressable style={styles.iconBtn} onPress={() => refetch()}>
          <Feather name="refresh-cw" size={18} color={Colors.light.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
      >
        {/* Store Banner */}
        <Pressable style={styles.storeBanner} onPress={pickAndUploadStoreImage} disabled={uploadingStore}>
          {user.storeImage ? (
            <Image source={{ uri: user.storeImage }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <View style={styles.storeBannerEmpty} />
          )}
          <View style={styles.storeBannerOverlay}>
            <View style={styles.storeBannerContent}>
              <View style={styles.storeAvatarWrap}>
                {user.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.storeAvatar} />
                ) : (
                  <View style={styles.storeAvatarFallback}>
                    <Text style={styles.storeAvatarInitial}>{user.name[0]?.toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{user.name}</Text>
                <Text style={styles.storeRole}>Satıcı · %10 Komisyon</Text>
              </View>
              <View style={styles.storeCameraBtn}>
                {uploadingStore ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="camera" size={16} color="#fff" />
                )}
              </View>
            </View>
          </View>
        </Pressable>
        <Text style={styles.storeBannerHint}>Mağaza fotoğrafını değiştirmek için dokunun</Text>

        {/* Reklam Banner — HIGH VISIBILITY */}
        <View style={{ marginBottom: 24, marginTop: 4 }}>
          <AdvertiseBanner hasActiveCampaign={hasActiveCampaign} onPress={() => router.push("/advertise")} />
        </View>

        {/* Stats row */}
        {isLoading ? (
          <View style={styles.loadingRow}><ActivityIndicator color={Colors.light.primary} /></View>
        ) : (
          <>
            {/* Main balance card */}
            <View style={styles.mainCard}>
              <View style={styles.mainCardTop}>
                <View>
                  <Text style={styles.mainCardLabel}>Kullanılabilir Bakiye</Text>
                  <Text style={styles.mainCardAmount}>₺{(wallet?.availableBalance ?? 0).toFixed(2)}</Text>
                </View>
                <Pressable style={styles.withdrawBtn} onPress={() => router.push("/wallet")}>
                  <Feather name="arrow-up-right" size={14} color="#fff" />
                  <Text style={styles.withdrawBtnText}>Çek</Text>
                </Pressable>
              </View>

              <View style={styles.mainCardDivider} />

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                    <Feather name="trending-up" size={13} color="#fff" />
                  </View>
                  <Text style={styles.statLabel}>Toplam Kazanç</Text>
                  <Text style={[styles.statValue, { color: "#4ADE80" }]}>
                    ₺{(wallet?.totalEarnings ?? 0).toFixed(0)}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                    <Feather name="clock" size={13} color="#fff" />
                  </View>
                  <Text style={styles.statLabel}>Bekleyen</Text>
                  <Text style={[styles.statValue, { color: "#FCD34D" }]}>
                    ₺{(wallet?.pendingBalance ?? 0).toFixed(0)}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                    <Feather name="percent" size={13} color="#fff" />
                  </View>
                  <Text style={styles.statLabel}>Komisyon</Text>
                  <Text style={[styles.statValue, { color: "#FCA5A5" }]}>
                    ₺{(wallet?.platformFeePaid ?? 0).toFixed(0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Earnings Chart */}
            {transactions.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Gelir / Çekim Grafiği</Text>
                  <Text style={styles.sectionSub}>Son 6 ay</Text>
                </View>
                <View style={styles.card}>
                  <EarningsChart transactions={transactions} />
                </View>
              </View>
            )}

            {/* Summary cards */}
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { backgroundColor: Colors.light.success + "12", borderColor: Colors.light.success + "30" }]}>
                <Feather name="trending-up" size={18} color={Colors.light.success} />
                <Text style={styles.summaryCardLabel}>Net Kâr</Text>
                <Text style={[styles.summaryCardValue, { color: Colors.light.success }]}>
                  ₺{Math.max(0, netProfit).toFixed(0)}
                </Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: "#8B5CF620", borderColor: "#8B5CF640" }]}>
                <Feather name="arrow-up-right" size={18} color="#8B5CF6" />
                <Text style={styles.summaryCardLabel}>Toplam Çekim</Text>
                <Text style={[styles.summaryCardValue, { color: "#8B5CF6" }]}>
                  ₺{(wallet?.totalWithdrawn ?? 0).toFixed(0)}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: "package", label: "Ürünlerim", color: Colors.light.primary, route: "/my-products" },
              { icon: "shopping-bag", label: "Siparişler", color: Colors.light.success, route: "/(tabs)/orders" },
              { icon: "dollar-sign", label: "Cüzdanım", color: Colors.light.warning, route: "/wallet" },
              { icon: "message-circle", label: "Mesajlar", color: Colors.light.accent, route: "/(tabs)/messages" },
              { icon: "truck", label: "Kargo", color: "#E67E22", action: () => { setDeliveryFeeInput((currentDeliveryFee ?? 15).toString()); setShowDeliveryModal(true); } },
            ].map((item) => (
              <Pressable
                key={item.label}
                style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85 }]}
                onPress={item.route ? () => router.push(item.route as never) : item.action}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: item.color + "18" }]}>
                  <Feather name={item.icon as "package"} size={22} color={item.color} />
                </View>
                <Text style={styles.actionLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        {!isLoading && transactions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Son İşlemler</Text>
              <Pressable onPress={() => router.push("/wallet")} style={styles.seeAllInline}>
                <Text style={styles.seeAllInlineText}>Tümü</Text>
                <Feather name="arrow-right" size={13} color={Colors.light.primary} />
              </Pressable>
            </View>
            <View style={styles.card}>
              {transactions.slice().reverse().slice(0, 5).map(tx => {
                const isEarning = tx.type === "earning";
                const isPending = tx.type === "pending";
                const color = isEarning ? Colors.light.success : isPending ? Colors.light.warning : Colors.light.accent;
                return (
                  <View key={tx.id} style={styles.txRow}>
                    <View style={[styles.txIcon, { backgroundColor: color + "18" }]}>
                      <Feather
                        name={isEarning ? "arrow-down-left" : isPending ? "clock" : "arrow-up-right"}
                        size={14} color={color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                      <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString("tr-TR")}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color }]}>
                      {tx.type === "withdrawal" ? "-" : "+"}₺{tx.amount.toFixed(0)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Delivery Fee Modal */}
      <Modal visible={showDeliveryModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { paddingTop: topInset + 24 }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowDeliveryModal(false)} hitSlop={8}>
              <Feather name="x" size={22} color={Colors.light.text} />
            </Pressable>
            <Text style={styles.modalTitle}>Kargo Bedeli</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 16 }}>
            <View style={styles.infoBox}>
              <Feather name="info" size={16} color={Colors.light.primary} />
              <Text style={styles.infoText}>
                Kargo bedeli siparişlerde müşteriden ayrıca tahsil edilir. Kargo bedelinden komisyon alınmaz.
              </Text>
            </View>
            <Text style={styles.fieldLabel}>Kargo Bedeli (₺)</Text>
            <View style={styles.inputWrapper}>
              <Feather name="truck" size={18} color={Colors.light.textMuted} />
              <TextInput
                style={styles.input}
                value={deliveryFeeInput}
                onChangeText={setDeliveryFeeInput}
                keyboardType="numeric"
                placeholder="15"
                placeholderTextColor={Colors.light.textMuted}
              />
              <Text style={styles.inputSuffix}>₺</Text>
            </View>
            <View style={styles.presetRow}>
              {[0, 10, 15, 20, 25, 30].map(fee => (
                <Pressable
                  key={fee}
                  style={[styles.presetBtn, deliveryFeeInput === fee.toString() && styles.presetBtnActive]}
                  onPress={() => setDeliveryFeeInput(fee.toString())}
                >
                  <Text style={[styles.presetBtnText, deliveryFeeInput === fee.toString() && styles.presetBtnTextActive]}>
                    {fee === 0 ? "Ücretsiz" : `₺${fee}`}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.saveBtn, savingFee && { opacity: 0.7 }]}
              onPress={handleSaveDeliveryFee}
              disabled={savingFee}
            >
              {savingFee ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Kaydet</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: Colors.light.background, padding: 24 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary, textAlign: "center" },
  backBtnRed: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  backBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.surface, alignItems: "center", justifyContent: "center" },

  storeBanner: {
    height: 160, marginHorizontal: 20, borderRadius: 20, overflow: "hidden",
    backgroundColor: Colors.light.backgroundSecondary, marginBottom: 6,
  },
  storeBannerEmpty: { ...StyleSheet.absoluteFillObject, backgroundColor: `${Colors.light.primary}30` },
  storeBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "flex-end",
    padding: 16,
  },
  storeBannerContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  storeAvatarWrap: { width: 48, height: 48, borderRadius: 24, overflow: "hidden", borderWidth: 2, borderColor: "#fff" },
  storeAvatar: { width: "100%", height: "100%" },
  storeAvatarFallback: { width: "100%", height: "100%", backgroundColor: Colors.light.primary + "80", alignItems: "center", justifyContent: "center" },
  storeAvatarInitial: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  storeName: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
  storeRole: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 1 },
  storeCameraBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.4)",
  },
  storeBannerHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textAlign: "center", marginBottom: 20 },

  loadingRow: { alignItems: "center", paddingVertical: 40 },

  mainCard: {
    backgroundColor: Colors.light.primary,
    marginHorizontal: 20, borderRadius: 22, padding: 22, marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20 },
      android: { elevation: 8 },
      web: { boxShadow: `0 8px 28px ${Colors.light.primary}55` },
    }),
  },
  mainCardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  mainCardLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginBottom: 4 },
  mainCardAmount: { fontSize: 38, fontFamily: "Inter_700Bold", color: "#fff" },
  withdrawBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  withdrawBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  mainCardDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 16 },
  statsRow: { flexDirection: "row" },
  statItem: { flex: 1, alignItems: "center", gap: 5 },
  statIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", textAlign: "center" },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },

  summaryGrid: { flexDirection: "row", gap: 12, marginHorizontal: 20, marginBottom: 20 },
  summaryCard: {
    flex: 1, borderRadius: 16, padding: 16, gap: 6,
    borderWidth: 1,
  },
  summaryCardLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  summaryCardValue: { fontSize: 20, fontFamily: "Inter_700Bold" },

  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  seeAllInline: { flexDirection: "row", alignItems: "center", gap: 4 },
  seeAllInlineText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },

  card: { backgroundColor: Colors.light.surface, borderRadius: 16, padding: 16 },

  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCard: {
    width: "30%", flexGrow: 1,
    backgroundColor: Colors.light.surface, borderRadius: 16, padding: 14,
    alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: Colors.light.borderLight,
  },
  actionIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.text, textAlign: "center" },

  txRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight },
  txIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  txDesc: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text },
  txDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 1 },
  txAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },

  modal: { flex: 1, backgroundColor: Colors.light.background },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text },

  infoBox: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: Colors.light.primary + "12", borderRadius: 12, padding: 14 },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.text, lineHeight: 19 },

  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  inputWrapper: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.light.surface, borderRadius: 14, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: Colors.light.border },
  input: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.light.text },
  inputSuffix: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.textMuted },

  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.light.backgroundSecondary, borderWidth: 1, borderColor: Colors.light.border },
  presetBtnActive: { backgroundColor: Colors.light.primary + "15", borderColor: Colors.light.primary },
  presetBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  presetBtnTextActive: { color: Colors.light.primary, fontFamily: "Inter_600SemiBold" },

  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.light.primary, borderRadius: 16, paddingVertical: 17 },
  saveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17 },
});
