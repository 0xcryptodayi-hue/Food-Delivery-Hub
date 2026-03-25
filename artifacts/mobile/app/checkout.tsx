import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Alert, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useCreateOrder } from "@workspace/api-client-react";

const DELIVERY_FEE = 15;

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const [address, setAddress] = useState(user?.address ?? "");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [loading, setLoading] = useState(false);

  const createOrderMutation = useCreateOrder();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const sellerGroups = items.reduce<Record<number, typeof items>>((acc, item) => {
    if (!acc[item.sellerId]) acc[item.sellerId] = [];
    acc[item.sellerId].push(item);
    return acc;
  }, {});

  const numSellers = Object.keys(sellerGroups).length;
  const grandTotal = total + DELIVERY_FEE * numSellers;

  const handleOrder = async () => {
    if (!address.trim()) {
      Alert.alert("Hata", "Lütfen teslimat adresini girin");
      return;
    }
    if (items.length === 0) { Alert.alert("Hata", "Sepet boş"); return; }

    setLoading(true);
    try {
      for (const [sellerIdStr, sellerItems] of Object.entries(sellerGroups)) {
        await createOrderMutation.mutateAsync({
          data: {
            items: sellerItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
            deliveryAddress: address,
            paymentMethod,
            note: note || undefined,
            sellerId: parseInt(sellerIdStr),
          },
        });
      }
      clearCart();
      Alert.alert(
        "Sipariş Verildi! 🎉",
        numSellers > 1
          ? `${numSellers} satıcıdan siparişiniz alındı.`
          : "Siparişiniz alındı. Satıcı hazırlamaya başlayacak.",
        [{ text: "Siparişlerimi Gör", onPress: () => { router.back(); router.push("/(tabs)/orders"); } }]
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sipariş verilemedi";
      Alert.alert("Hata", message);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: topInset }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.emptyEmoji}>🛒</Text>
        <Text style={styles.emptyTitle}>Sepetiniz boş</Text>
        <Pressable style={styles.shopBtn} onPress={() => router.back()}>
          <Text style={styles.shopBtnText}>Alışverişe Başla</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="x" size={22} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Sipariş Ver</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sepet Özeti</Text>
          {Object.entries(sellerGroups).map(([sellerIdStr, sellerItems]) => (
            <View key={sellerIdStr} style={[styles.card, { marginBottom: 10 }]}>
              <Text style={styles.sellerLabel}>Satıcı: {sellerItems[0]?.sellerName}</Text>
              {sellerItems.map(item => (
                <View key={item.productId} style={styles.cartItem}>
                  <Text style={styles.itemQty}>{item.quantity}x</Text>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.itemPrice}>₺{(item.price * item.quantity).toFixed(0)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Teslimat Adresi</Text>
          <View style={styles.inputWrapper}>
            <Feather name="map-pin" size={18} color={Colors.light.primary} />
            <TextInput
              style={styles.input}
              placeholder="Teslimat adresiniz"
              placeholderTextColor={Colors.light.textMuted}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sipariş Notu (opsiyonel)</Text>
          <View style={styles.inputWrapper}>
            <Feather name="edit-3" size={18} color={Colors.light.primary} />
            <TextInput
              style={styles.input}
              placeholder="Örn: Acısız lütfen, kapıya bırakın..."
              placeholderTextColor={Colors.light.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ödeme Yöntemi</Text>
          <View style={styles.paymentRow}>
            <Pressable
              style={[styles.paymentBtn, paymentMethod === "cash" && styles.paymentBtnActive]}
              onPress={() => setPaymentMethod("cash")}
            >
              <Text style={styles.paymentIcon}>💵</Text>
              <Text style={[styles.paymentText, paymentMethod === "cash" && styles.paymentTextActive]}>Kapıda Ödeme</Text>
            </Pressable>
            <Pressable
              style={[styles.paymentBtn, paymentMethod === "online" && styles.paymentBtnActive]}
              onPress={() => setPaymentMethod("online")}
            >
              <Text style={styles.paymentIcon}>💳</Text>
              <Text style={[styles.paymentText, paymentMethod === "online" && styles.paymentTextActive]}>Online Ödeme</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Özet</Text>
          <View style={styles.card}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ara toplam</Text>
              <Text style={styles.summaryValue}>₺{total.toFixed(0)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Teslimat ({numSellers} satıcı)</Text>
              <Text style={styles.summaryValue}>₺{(DELIVERY_FEE * numSellers).toFixed(0)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Toplam</Text>
              <Text style={styles.totalValue}>₺{grandTotal.toFixed(0)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16 }]}>
        <Pressable
          style={({ pressed }) => [styles.orderBtn, pressed && { opacity: 0.9 }, loading && { opacity: 0.7 }]}
          onPress={handleOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="check-circle" size={20} color="#fff" />
              <Text style={styles.orderBtnText}>Siparişi Onayla — ₺{grandTotal.toFixed(0)}</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { alignItems: "center", justifyContent: "center", gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  backBtn: { position: "absolute", top: 0, left: 20 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  shopBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  shopBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 10 },
  card: { backgroundColor: Colors.light.surface, borderRadius: 16, padding: 16, gap: 10 },
  sellerLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.light.textSecondary, marginBottom: 4 },
  cartItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemQty: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.light.primary, width: 28 },
  itemTitle: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.light.text },
  itemPrice: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text },
  inputWrapper: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: Colors.light.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.light.text },
  paymentRow: { flexDirection: "row", gap: 12 },
  paymentBtn: {
    flex: 1, alignItems: "center", paddingVertical: 16, borderRadius: 14,
    backgroundColor: Colors.light.surface, borderWidth: 1.5, borderColor: Colors.light.border, gap: 6,
  },
  paymentBtnActive: { borderColor: Colors.light.primary, backgroundColor: Colors.light.primary + "10" },
  paymentIcon: { fontSize: 28 },
  paymentText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.light.textSecondary },
  paymentTextActive: { color: Colors.light.primary, fontFamily: "Inter_600SemiBold" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.textSecondary },
  summaryValue: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.light.text },
  divider: { height: 1, backgroundColor: Colors.light.borderLight, marginVertical: 4 },
  totalLabel: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.light.text },
  totalValue: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.light.primary },
  footer: {
    backgroundColor: Colors.light.surface, paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: Colors.light.borderLight,
  },
  orderBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 16, paddingVertical: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    width: "90%", alignSelf: "center",
  },
  orderBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17 },
});
