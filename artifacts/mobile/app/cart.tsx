import React from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Platform, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const DELIVERY_FEE = 15;
const CATEGORY_EMOJI: Record<string, string> = {
  "main-dish": "🍛", soup: "🥣", dessert: "🍮",
  breakfast: "🥞", salad: "🥗", pastry: "🥐",
};

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { items, updateQuantity, removeItem, clearCart, total, itemCount } = useCart();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const sellerGroups = items.reduce<Record<number, typeof items>>((acc, item) => {
    if (!acc[item.sellerId]) acc[item.sellerId] = [];
    acc[item.sellerId].push(item);
    return acc;
  }, {});
  const numSellers = Object.keys(sellerGroups).length;
  const grandTotal = total + DELIVERY_FEE * numSellers;

  if (items.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Sepetim</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.emptyContent}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Sepetiniz boş</Text>
          <Text style={styles.emptyText}>Favori yemekleri sepetinize ekleyin</Text>
          <Pressable style={styles.shopBtn} onPress={() => router.push("/(tabs)")}>
            <Text style={styles.shopBtnText}>Alışverişe Başla</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Sepetim ({itemCount})</Text>
        <Pressable onPress={clearCart} hitSlop={8}>
          <Text style={styles.clearText}>Temizle</Text>
        </Pressable>
      </View>

      <FlatList
        data={Object.entries(sellerGroups)}
        keyExtractor={([sellerId]) => sellerId}
        renderItem={({ item: [_, sellerItems] }) => (
          <View style={styles.sellerBlock}>
            <View style={styles.sellerHeader}>
              <View style={styles.sellerDot} />
              <Text style={styles.sellerName}>{sellerItems[0]?.sellerName}</Text>
              <View style={styles.deliveryBadge}>
                <Feather name="truck" size={11} color={Colors.light.primary} />
                <Text style={styles.deliveryBadgeText}>₺{DELIVERY_FEE} teslimat</Text>
              </View>
            </View>
            {sellerItems.map(item => (
              <View key={item.productId} style={styles.cartItem}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                    <Text style={styles.itemEmoji}>{CATEGORY_EMOJI["main-dish"]}</Text>
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.itemPrice}>₺{(item.price * item.quantity).toFixed(0)}</Text>
                  <Text style={styles.itemUnitPrice}>
                    {item.quantity > 1 ? `₺${item.price.toFixed(0)} x ${item.quantity}` : ""}
                  </Text>
                </View>
                <View style={styles.qtyControl}>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                    hitSlop={4}
                  >
                    <Feather
                      name={item.quantity === 1 ? "trash-2" : "minus"}
                      size={16}
                      color={item.quantity === 1 ? Colors.light.accent : Colors.light.text}
                    />
                  </Pressable>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <Pressable
                    style={[styles.qtyBtn, styles.qtyBtnAdd]}
                    onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                    hitSlop={4}
                  >
                    <Feather name="plus" size={16} color="#fff" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Sipariş Özeti</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ara toplam ({itemCount} ürün)</Text>
              <Text style={styles.summaryValue}>₺{total.toFixed(0)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Teslimat ücreti ({numSellers} satıcı)</Text>
              <Text style={styles.summaryValue}>₺{(DELIVERY_FEE * numSellers).toFixed(0)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Toplam</Text>
              <Text style={styles.totalValue}>₺{grandTotal.toFixed(0)}</Text>
            </View>
          </View>
        }
      />

      <View style={[styles.footer, { paddingBottom: bottomInset + 16 }]}>
        {!user ? (
          <Pressable
            style={styles.checkoutBtn}
            onPress={() => router.push("/auth")}
          >
            <Feather name="log-in" size={20} color="#fff" />
            <Text style={styles.checkoutBtnText}>Sipariş için Giriş Yap</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.checkoutBtn, pressed && { opacity: 0.9 }]}
            onPress={() => router.push("/checkout")}
          >
            <Feather name="arrow-right-circle" size={20} color="#fff" />
            <Text style={styles.checkoutBtnText}>Siparişe Geç — ₺{grandTotal.toFixed(0)}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: {},
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.light.surface, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text },
  clearText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.accent },
  emptyContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 80 },
  emptyEmoji: { fontSize: 80 },
  emptyTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center" },
  shopBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, marginTop: 8 },
  shopBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  sellerBlock: {
    backgroundColor: Colors.light.surface, borderRadius: 16, marginBottom: 12,
    overflow: "hidden", borderWidth: 1, borderColor: Colors.light.borderLight,
  },
  sellerHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: Colors.light.backgroundSecondary,
    borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight,
  },
  sellerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.light.primary },
  sellerName: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  deliveryBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  deliveryBadgeText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.primary },
  cartItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight,
  },
  itemImage: { width: 56, height: 56, borderRadius: 10 },
  itemImagePlaceholder: { backgroundColor: Colors.light.backgroundSecondary, alignItems: "center", justifyContent: "center" },
  itemEmoji: { fontSize: 28 },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.text, marginBottom: 4, lineHeight: 20 },
  itemPrice: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  itemUnitPrice: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2 },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.light.border,
  },
  qtyBtnAdd: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  qtyText: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.light.text, minWidth: 20, textAlign: "center" },
  summaryCard: {
    backgroundColor: Colors.light.surface, borderRadius: 16, padding: 18, gap: 10,
    borderWidth: 1, borderColor: Colors.light.borderLight, marginBottom: 8,
  },
  summaryTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.light.text, marginBottom: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  summaryValue: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.text },
  divider: { height: 1, backgroundColor: Colors.light.borderLight },
  totalLabel: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.light.text },
  totalValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  footer: {
    backgroundColor: Colors.light.surface, paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: Colors.light.borderLight,
  },
  checkoutBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 16, paddingVertical: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  checkoutBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17 },
});
