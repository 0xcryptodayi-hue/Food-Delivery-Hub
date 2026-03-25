import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Platform, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGetOrders } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { AppHeader } from "@/components/ui/AppHeader";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  received: { label: "Alındı", color: "#3B82F6", icon: "check-circle" },
  preparing: { label: "Hazırlanıyor", color: "#F59E0B", icon: "loader" },
  ready: { label: "Hazır", color: "#10B981", icon: "package" },
  on_the_way: { label: "Yolda", color: Colors.light.primary, icon: "truck" },
  delivered: { label: "Teslim Edildi", color: "#6B7280", icon: "check-square" },
  cancelled: { label: "İptal", color: Colors.light.accent, icon: "x-circle" },
};

type Order = {
  id: number;
  status: string;
  totalAmount: number;
  items: Array<{ productTitle: string; quantity: number }>;
  sellerName: string;
  buyerName: string;
  createdAt: string;
};

function OrderCard({ order, isSeller, onPress }: { order: Order; isSeller: boolean; onPress: () => void }) {
  const statusInfo = STATUS_LABELS[order.status] ?? { label: order.status, color: "#666", icon: "circle" };
  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const itemSummary = (order.items as Array<{ productTitle: string; quantity: number }>).slice(0, 2).map(i => `${i.productTitle} x${i.quantity}`).join(", ");

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.95 }]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.orderNum}>Sipariş #{order.id}</Text>
          <Text style={styles.orderDate}>{dateStr}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + "20" }]}>
          <Feather name={statusInfo.icon as "circle"} size={12} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBody}>
        <Text style={styles.partyLabel}>{isSeller ? "Alıcı" : "Satıcı"}</Text>
        <Text style={styles.partyName}>{isSeller ? order.buyerName : order.sellerName}</Text>
        <Text style={styles.itemsSummary} numberOfLines={1}>{itemSummary}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.totalLabel}>Toplam</Text>
        <Text style={styles.totalAmount}>₺{order.totalAmount.toFixed(0)}</Text>
        <Feather name="chevron-right" size={16} color={Colors.light.textMuted} />
      </View>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [refreshing, setRefreshing] = useState(false);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const { data: orders, isLoading, refetch } = useGetOrders(
    { role },
    { query: { enabled: !!user } }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <AppHeader />
        <Feather name="shopping-bag" size={48} color={Colors.light.textMuted} />
        <Text style={styles.emptyTitle}>Giriş yapın</Text>
        <Text style={styles.emptyText}>Siparişlerinizi görmek için giriş yapın</Text>
        <Pressable style={styles.loginBtn} onPress={() => router.push("/auth")}>
          <Text style={styles.loginBtnText}>Giriş Yap</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader />
      <Text style={styles.title}>Siparişler</Text>

      {user.isSeller && (
        <View style={styles.roleTabs}>
          <Pressable
            style={[styles.roleTab, role === "buyer" && styles.roleTabActive]}
            onPress={() => setRole("buyer")}
          >
            <Text style={[styles.roleTabText, role === "buyer" && styles.roleTabTextActive]}>Aldıklarım</Text>
          </Pressable>
          <Pressable
            style={[styles.roleTab, role === "seller" && styles.roleTabActive]}
            onPress={() => setRole("seller")}
          >
            <Text style={[styles.roleTabText, role === "seller" && styles.roleTabTextActive]}>Sattıklarım</Text>
          </Pressable>
        </View>
      )}

      {isLoading ? (
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {[1, 2, 3].map(i => <View key={i} style={styles.skeletonCard} />)}
        </View>
      ) : (
        <FlatList
          data={orders ?? []}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <OrderCard
              order={item as Order}
              isSeller={role === "seller"}
              onPress={() => router.push({ pathname: "/order/[id]", params: { id: item.id } })}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.primary} colors={[Colors.light.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIconText}>📦</Text>
              <Text style={styles.emptyTitle}>Henüz sipariş yok</Text>
              <Text style={styles.emptyText}>{role === "buyer" ? "İlk siparişinizi verin!" : "İlk siparişiniz burada görünecek"}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { alignItems: "center", justifyContent: "center", gap: 12 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.light.text, paddingHorizontal: 20, marginBottom: 16 },
  roleTabs: {
    flexDirection: "row", marginHorizontal: 20, marginBottom: 16,
    backgroundColor: Colors.light.backgroundSecondary, borderRadius: 14, padding: 4,
  },
  roleTab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  roleTabActive: { backgroundColor: Colors.light.primary },
  roleTabText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.light.textSecondary },
  roleTabTextActive: { color: "#fff" },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.light.surface, borderRadius: 16, marginBottom: 12,
    ...Platform.select({ ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 }, android: { elevation: 2 } }),
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: 14, paddingBottom: 12 },
  cardHeaderLeft: { flex: 1 },
  orderNum: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.text },
  orderDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  divider: { height: 1, backgroundColor: Colors.light.borderLight, marginHorizontal: 14 },
  cardBody: { padding: 14, paddingBottom: 10 },
  partyLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.textMuted },
  partyName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text, marginBottom: 4 },
  itemsSummary: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary },
  cardFooter: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4 },
  totalLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textMuted, flex: 1 },
  totalAmount: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.light.primary, marginRight: 6 },
  skeletonCard: { height: 160, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 16, marginBottom: 12 },
  emptyContainer: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyIconText: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center" },
  loginBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  loginBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
});
