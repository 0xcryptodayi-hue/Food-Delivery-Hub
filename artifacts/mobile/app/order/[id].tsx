import React from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGetOrder, useUpdateOrderStatus } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

const STATUS_STEPS = ["received", "preparing", "ready", "on_the_way", "delivered"];
const STATUS_LABELS: Record<string, string> = {
  received: "Alındı", preparing: "Hazırlanıyor", ready: "Hazır",
  on_the_way: "Yolda", delivered: "Teslim Edildi", cancelled: "İptal",
};
const STATUS_ICONS: Record<string, string> = {
  received: "check-circle", preparing: "loader", ready: "package",
  on_the_way: "truck", delivered: "home", cancelled: "x-circle",
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const { data: order, isLoading, refetch } = useGetOrder(parseInt(id ?? "0"));
  const updateStatus = useUpdateOrderStatus();

  const isSeller = user?.id === order?.sellerId;

  const NEXT_STATUS: Record<string, string> = {
    received: "preparing",
    preparing: "ready",
    ready: "on_the_way",
    on_the_way: "delivered",
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return;
    Alert.alert("Durum Güncelle", `"${STATUS_LABELS[newStatus]}" olarak güncellensin mi?`, [
      { text: "İptal", style: "cancel" },
      {
        text: "Güncelle",
        onPress: async () => {
          try {
            await updateStatus.mutateAsync({ id: order.id, data: { status: newStatus as "received" | "preparing" | "ready" | "on_the_way" | "delivered" | "cancelled" } });
            refetch();
          } catch {
            Alert.alert("Hata", "Durum güncellenemedi");
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: topInset }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.centered, { paddingTop: topInset }]}>
        <Text style={styles.errorText}>Sipariş bulunamadı</Text>
        <Pressable onPress={() => router.back()}><Text style={styles.backLink}>Geri Dön</Text></Pressable>
      </View>
    );
  }

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);
  const nextStatus = isSeller ? NEXT_STATUS[order.status] : null;

  const items = order.items as Array<{ productTitle: string; price: number; quantity: number }>;
  const statusHistory = (order.statusHistory ?? []) as Array<{ status: string; timestamp: string }>;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Sipariş #{order.id}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.statusCard}>
          <View style={styles.stepTrack}>
            {STATUS_STEPS.filter(s => s !== "cancelled").map((step, i) => (
              <React.Fragment key={step}>
                <View style={[styles.stepDot, i <= currentStepIndex && styles.stepDotActive]}>
                  {i <= currentStepIndex ? (
                    <Feather name="check" size={12} color="#fff" />
                  ) : (
                    <View style={styles.stepDotInner} />
                  )}
                </View>
                {i < STATUS_STEPS.length - 2 && (
                  <View style={[styles.stepLine, i < currentStepIndex && styles.stepLineActive]} />
                )}
              </React.Fragment>
            ))}
          </View>
          <Text style={styles.currentStatus}>
            {STATUS_LABELS[order.status] ?? order.status}
          </Text>
          {order.estimatedTime && order.status !== "delivered" && order.status !== "cancelled" && (
            <Text style={styles.etaText}>Tahmini süre: {order.estimatedTime} dakika</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sipariş Detayları</Text>
          <View style={styles.card}>
            <InfoRow icon="user" label={isSeller ? "Alıcı" : "Satıcı"} value={isSeller ? order.buyerName : order.sellerName} />
            <InfoRow icon="map-pin" label="Adres" value={order.deliveryAddress} />
            <InfoRow icon="credit-card" label="Ödeme" value={order.paymentMethod === "cash" ? "Kapıda Ödeme" : "Online"} />
            {order.note && <InfoRow icon="edit-3" label="Not" value={order.note} />}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ürünler</Text>
          <View style={styles.card}>
            {items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={styles.itemQtyBox}>
                  <Text style={styles.itemQty}>{item.quantity}</Text>
                </View>
                <Text style={styles.itemTitle} numberOfLines={2}>{item.productTitle}</Text>
                <Text style={styles.itemPrice}>₺{(item.price * item.quantity).toFixed(0)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Teslimat</Text>
              <Text style={styles.summaryValue}>₺{order.deliveryFee.toFixed(0)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Toplam</Text>
              <Text style={styles.totalValue}>₺{order.totalAmount.toFixed(0)}</Text>
            </View>
          </View>
        </View>

        {isSeller && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kazanç</Text>
            <View style={styles.card}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Toplam satış</Text>
                <Text style={styles.summaryValue}>₺{(order.totalAmount - order.deliveryFee).toFixed(0)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Platform komisyonu (%10)</Text>
                <Text style={[styles.summaryValue, { color: Colors.light.accent }]}>-₺{order.platformFee.toFixed(0)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Net kazanç</Text>
                <Text style={[styles.totalValue, { color: Colors.light.success }]}>₺{order.sellerAmount.toFixed(0)}</Text>
              </View>
            </View>
          </View>
        )}

        {statusHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Durum Geçmişi</Text>
            <View style={styles.card}>
              {statusHistory.map((h, i) => (
                <View key={i} style={styles.historyRow}>
                  <Feather name={STATUS_ICONS[h.status] as "circle" ?? "circle"} size={16} color={Colors.light.primary} />
                  <View style={styles.historyContent}>
                    <Text style={styles.historyStatus}>{STATUS_LABELS[h.status] ?? h.status}</Text>
                    <Text style={styles.historyTime}>
                      {new Date(h.timestamp).toLocaleString("tr-TR")}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {isSeller && nextStatus && order.status !== "cancelled" && (
        <View style={[styles.footer, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16 }]}>
          <Pressable
            style={({ pressed }) => [styles.updateBtn, pressed && { opacity: 0.9 }]}
            onPress={() => handleStatusUpdate(nextStatus)}
          >
            <Feather name="arrow-right-circle" size={20} color="#fff" />
            <Text style={styles.updateBtnText}>
              "{STATUS_LABELS[nextStatus]}" olarak güncelle
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Feather name={icon as "home"} size={14} color={Colors.light.primary} />
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.light.background },
  errorText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  backLink: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.light.primary, marginTop: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.surface, alignItems: "center", justifyContent: "center" },
  statusCard: {
    backgroundColor: Colors.light.primary, marginHorizontal: 20, borderRadius: 20,
    padding: 24, marginBottom: 20, alignItems: "center",
  },
  stepTrack: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
  stepDotActive: { backgroundColor: "#fff" },
  stepDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.5)" },
  stepLine: { flex: 1, height: 2, backgroundColor: "rgba(255,255,255,0.3)", marginHorizontal: 4 },
  stepLineActive: { backgroundColor: "#fff" },
  currentStatus: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  etaText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  section: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 10 },
  card: { backgroundColor: Colors.light.surface, borderRadius: 16, padding: 16, gap: 10 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.light.textSecondary, width: 64 },
  infoValue: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.text },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemQtyBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.light.primary + "15", alignItems: "center", justifyContent: "center" },
  itemQty: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.light.primary },
  itemTitle: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.text },
  itemPrice: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.text },
  divider: { height: 1, backgroundColor: Colors.light.borderLight },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary },
  summaryValue: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.light.text },
  totalLabel: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.light.text },
  totalValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.light.primary },
  historyRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  historyContent: { flex: 1 },
  historyStatus: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.light.text },
  historyTime: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  footer: { backgroundColor: Colors.light.surface, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.light.borderLight },
  updateBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 16, paddingVertical: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  updateBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
});
