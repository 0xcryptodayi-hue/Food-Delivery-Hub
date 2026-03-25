import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, ActivityIndicator, Alert, TextInput, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGetWallet } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export default function SellerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const { data: wallet, isLoading, refetch } = useGetWallet({ query: { enabled: !!user?.isSeller } });

  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryFeeInput, setDeliveryFeeInput] = useState("");
  const [savingFee, setSavingFee] = useState(false);
  const [currentDeliveryFee, setCurrentDeliveryFee] = useState<number | null>(null);

  React.useEffect(() => {
    if (!user?.isSeller || !token) return;
    fetch(`${API_BASE}/sellers/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.deliveryFee !== undefined) setCurrentDeliveryFee(d.deliveryFee); })
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
      const res = await fetch(`${API_BASE}/sellers/delivery-fee`, {
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

  if (!user?.isSeller) {
    return (
      <View style={[styles.centered, { paddingTop: topInset }]}>
        <Feather name="lock" size={48} color={Colors.light.textMuted} />
        <Text style={styles.errorText}>Sadece satıcılar bu paneli kullanabilir</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Yönetici Paneli</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24 }}
      >
        {/* Seller greeting */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingAvatar}>
            <Text style={styles.greetingInitial}>{user.name[0]?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingName}>{user.name}</Text>
            <Text style={styles.greetingRole}>Satıcı Hesabı</Text>
          </View>
          <View style={styles.commissionBadge}>
            <Text style={styles.commissionBadgeText}>%10 Komisyon</Text>
          </View>
        </View>

        {/* Earnings Cards */}
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.light.primary} />
          </View>
        ) : (
          <>
            <View style={styles.mainCard}>
              <Text style={styles.mainCardLabel}>Kullanılabilir Bakiye</Text>
              <Text style={styles.mainCardAmount}>₺{(wallet?.availableBalance ?? 0).toFixed(2)}</Text>
              <View style={styles.mainCardDivider} />
              <View style={styles.mainCardRow}>
                <View style={styles.mainCardStat}>
                  <Feather name="trending-up" size={14} color={Colors.light.success} />
                  <Text style={styles.mainCardStatLabel}>Toplam Kazanç</Text>
                  <Text style={[styles.mainCardStatValue, { color: Colors.light.success }]}>
                    ₺{(wallet?.totalEarnings ?? 0).toFixed(0)}
                  </Text>
                </View>
                <View style={styles.mainCardStatDivider} />
                <View style={styles.mainCardStat}>
                  <Feather name="clock" size={14} color={Colors.light.warning} />
                  <Text style={styles.mainCardStatLabel}>Bekleyen</Text>
                  <Text style={[styles.mainCardStatValue, { color: Colors.light.warning }]}>
                    ₺{(wallet?.pendingBalance ?? 0).toFixed(0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Commission Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Komisyon Özeti</Text>
              <View style={styles.card}>
                <View style={styles.commissionRow}>
                  <View style={styles.commissionIcon}>
                    <Feather name="percent" size={18} color={Colors.light.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commissionTitle}>Platform Komisyonu</Text>
                    <Text style={styles.commissionDesc}>Her satıştan %10 komisyon kesilir</Text>
                  </View>
                  <Text style={styles.commissionRate}>%10</Text>
                </View>
                <View style={styles.cardDivider} />
                <View style={styles.commissionSummaryRow}>
                  <Text style={styles.commissionSummaryLabel}>Toplam ödenen komisyon</Text>
                  <Text style={[styles.commissionSummaryValue, { color: Colors.light.accent }]}>
                    ₺{(wallet?.platformFeePaid ?? 0).toFixed(0)}
                  </Text>
                </View>
                <View style={styles.commissionSummaryRow}>
                  <Text style={styles.commissionSummaryLabel}>Çekilen miktar</Text>
                  <Text style={styles.commissionSummaryValue}>
                    ₺{(wallet?.totalWithdrawn ?? 0).toFixed(0)}
                  </Text>
                </View>
                <View style={styles.cardDivider} />
                <View style={[styles.commissionSummaryRow, { marginTop: 4 }]}>
                  <Text style={[styles.commissionSummaryLabel, { fontFamily: "Inter_600SemiBold" }]}>
                    Net kazanç
                  </Text>
                  <Text style={[styles.commissionSummaryValue, { color: Colors.light.success, fontFamily: "Inter_700Bold", fontSize: 16 }]}>
                    ₺{(wallet?.availableBalance ?? 0).toFixed(0)}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Delivery Fee Setting */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kargo Ayarları</Text>
          <View style={styles.card}>
            <View style={styles.deliveryRow}>
              <View style={styles.deliveryIcon}>
                <Feather name="truck" size={18} color="#E67E22" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.deliveryTitle}>Kargo Bedeli</Text>
                <Text style={styles.deliveryDesc}>Müşterilerinizden alınacak kargo ücreti</Text>
              </View>
              <View style={styles.deliveryFeeBox}>
                <Text style={styles.deliveryFeeAmount}>
                  ₺{(currentDeliveryFee ?? 15).toFixed(0)}
                </Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.editDeliveryBtn, pressed && { opacity: 0.85 }]}
              onPress={() => {
                setDeliveryFeeInput((currentDeliveryFee ?? 15).toString());
                setShowDeliveryModal(true);
              }}
            >
              <Feather name="edit-2" size={16} color="#E67E22" />
              <Text style={styles.editDeliveryBtnText}>Kargo Bedelini Düzenle</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
          <View style={styles.actionsGrid}>
            <Pressable
              style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85 }]}
              onPress={() => router.push("/my-products")}
            >
              <Feather name="package" size={24} color={Colors.light.primary} />
              <Text style={styles.actionLabel}>Ürünlerim</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85 }]}
              onPress={() => router.push("/(tabs)/orders")}
            >
              <Feather name="shopping-bag" size={24} color={Colors.light.success} />
              <Text style={styles.actionLabel}>Siparişler</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85 }]}
              onPress={() => router.push("/wallet")}
            >
              <Feather name="dollar-sign" size={24} color={Colors.light.warning} />
              <Text style={styles.actionLabel}>Cüzdanım</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85 }]}
              onPress={() => router.push("/(tabs)/messages")}
            >
              <Feather name="message-circle" size={24} color={Colors.light.accent} />
              <Text style={styles.actionLabel}>Mesajlar</Text>
            </Pressable>
          </View>
        </View>

        {/* Recent Transactions */}
        {!isLoading && (wallet?.recentTransactions ?? []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Son İşlemler</Text>
            <View style={styles.card}>
              {(wallet?.recentTransactions ?? []).slice().reverse().slice(0, 5).map(tx => {
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
              <Pressable style={styles.seeAllBtn} onPress={() => router.push("/wallet")}>
                <Text style={styles.seeAllText}>Tümünü Gör</Text>
                <Feather name="arrow-right" size={14} color={Colors.light.primary} />
              </Pressable>
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
            <Text style={styles.modalTitle}>Kargo Bedelini Düzenle</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 16 }}>
            <View style={styles.infoBox}>
              <Feather name="info" size={16} color={Colors.light.primary} />
              <Text style={styles.infoText}>
                Belirlediğiniz kargo bedeli, siparişlerde müşteriden ayrıca tahsil edilir.
                Ürün fiyatından komisyon hesaplanır, kargo bedelinden komisyon alınmaz.
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
              {savingFee ? (
                <ActivityIndicator color="#fff" />
              ) : (
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: Colors.light.background },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary, textAlign: "center" },
  backBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  backBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.surface, alignItems: "center", justifyContent: "center" },

  greetingCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: Colors.light.surface, borderRadius: 16, padding: 16,
  },
  greetingAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.light.primary + "20", alignItems: "center", justifyContent: "center" },
  greetingInitial: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  greetingName: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.light.text },
  greetingRole: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2 },
  commissionBadge: { backgroundColor: Colors.light.accent + "18", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  commissionBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.accent },

  loadingRow: { alignItems: "center", paddingVertical: 32 },

  mainCard: {
    backgroundColor: Colors.light.primary, marginHorizontal: 20, borderRadius: 20,
    padding: 24, marginBottom: 20,
  },
  mainCardLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginBottom: 4 },
  mainCardAmount: { fontSize: 40, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 16 },
  mainCardDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 16 },
  mainCardRow: { flexDirection: "row" },
  mainCardStat: { flex: 1, alignItems: "center", gap: 4 },
  mainCardStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  mainCardStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 2 },
  mainCardStatValue: { fontSize: 18, fontFamily: "Inter_700Bold" },

  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 10 },

  card: { backgroundColor: Colors.light.surface, borderRadius: 16, padding: 16 },
  cardDivider: { height: 1, backgroundColor: Colors.light.borderLight, marginVertical: 10 },

  commissionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  commissionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.light.primary + "15", alignItems: "center", justifyContent: "center" },
  commissionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  commissionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2 },
  commissionRate: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  commissionSummaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2 },
  commissionSummaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  commissionSummaryValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text },

  deliveryRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  deliveryIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#E67E2215", alignItems: "center", justifyContent: "center" },
  deliveryTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  deliveryDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2 },
  deliveryFeeBox: { backgroundColor: "#E67E2215", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  deliveryFeeAmount: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#E67E22" },
  editDeliveryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#E67E2212", borderRadius: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: "#E67E2230",
  },
  editDeliveryBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#E67E22" },

  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionCard: {
    flex: 1, minWidth: "45%", backgroundColor: Colors.light.surface,
    borderRadius: 16, padding: 16, alignItems: "center", gap: 8,
  },
  actionLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text, textAlign: "center" },

  txRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  txIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  txDesc: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text },
  txDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 1 },
  txAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  seeAllBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.light.borderLight,
  },
  seeAllText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },

  modal: { flex: 1, backgroundColor: Colors.light.background },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text },

  infoBox: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: Colors.light.primary + "12", borderRadius: 12, padding: 14,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.text, lineHeight: 19 },

  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.light.surface, borderRadius: 14, paddingHorizontal: 16, height: 52,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  input: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.light.text },
  inputSuffix: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.textMuted },

  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  presetBtn: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: Colors.light.backgroundSecondary, borderWidth: 1, borderColor: Colors.light.border,
  },
  presetBtnActive: { backgroundColor: Colors.light.primary + "15", borderColor: Colors.light.primary },
  presetBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  presetBtnTextActive: { color: Colors.light.primary, fontFamily: "Inter_600SemiBold" },

  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.light.primary, borderRadius: 16, paddingVertical: 17,
  },
  saveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17 },
});
