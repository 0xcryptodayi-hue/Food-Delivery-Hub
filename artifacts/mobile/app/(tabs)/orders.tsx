import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Platform, RefreshControl, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGetOrders } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string; step: number }> = {
  received:   { label: "Alındı",         color: "#3B82F6", bg: "#3B82F610", icon: "check-circle",  step: 1 },
  preparing:  { label: "Hazırlanıyor",   color: "#F59E0B", bg: "#F59E0B10", icon: "loader",        step: 2 },
  ready:      { label: "Hazır",          color: "#10B981", bg: "#10B98110", icon: "package",       step: 3 },
  on_the_way: { label: "Yolda",          color: Colors.light.primary, bg: Colors.light.primary + "10", icon: "truck", step: 4 },
  delivered:  { label: "Teslim Edildi",  color: "#6B7280", bg: "#6B728010", icon: "check-square",  step: 5 },
  cancelled:  { label: "İptal",          color: Colors.light.accent, bg: Colors.light.accent + "10", icon: "x-circle", step: 0 },
};

const FILTER_TABS = [
  { id: "all",       label: "Tümü"       },
  { id: "active",    label: "Aktif"      },
  { id: "delivered", label: "Tamamlandı" },
  { id: "cancelled", label: "İptal"      },
];

const ACTIVE_STATUSES = ["received", "preparing", "ready", "on_the_way"];

type Order = {
  id: number;
  status: string;
  totalAmount: number;
  items: Array<{ productTitle: string; quantity: number }>;
  sellerName: string;
  buyerName: string;
  createdAt: string;
  deliveryAddress?: string;
};

const STEPS: { icon: string; label: string }[] = [
  { icon: "check-circle", label: "Alındı"       },
  { icon: "clock",        label: "Hazırlanıyor" },
  { icon: "package",      label: "Hazır"        },
  { icon: "truck",        label: "Yolda"        },
  { icon: "home",         label: "Teslim"       },
];

function StepDots({ status }: { status: string }) {
  const meta = STATUS_META[status];
  if (!meta || meta.step === 0) return null;
  return (
    <View style={stepStyles.row}>
      {STEPS.map((step, i) => {
        const done = i + 1 <= meta.step;
        const active = i + 1 === meta.step;
        const iconColor = done ? meta.color : Colors.light.borderLight;
        const bgColor = done ? meta.color + "18" : Colors.light.backgroundSecondary;
        return (
          <React.Fragment key={i}>
            <View style={stepStyles.stepCol}>
              <View style={[stepStyles.iconCircle, { backgroundColor: bgColor }, active && { borderWidth: 1.5, borderColor: meta.color }]}>
                <Feather name={step.icon as "home"} size={13} color={iconColor} />
              </View>
              <Text style={[stepStyles.stepLabel, done && { color: meta.color }]} numberOfLines={1}>
                {step.label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[stepStyles.line, i + 1 < meta.step && { backgroundColor: meta.color }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", flex: 1 },
  stepCol: { alignItems: "center", gap: 3, width: 44 },
  iconCircle: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  stepLabel: {
    fontSize: 8, fontFamily: "Inter_500Medium",
    color: Colors.light.borderLight, textAlign: "center",
  },
  line: { flex: 1, height: 2, backgroundColor: Colors.light.borderLight, marginTop: 14, marginHorizontal: -2 },
});

function OrderCard({ order, isSeller, onPress }: { order: Order; isSeller: boolean; onPress: () => void }) {
  const meta = STATUS_META[order.status] ?? { label: order.status, color: "#666", bg: "#66666610", icon: "circle", step: 0 };
  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  const timeStr = date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const items = order.items as Array<{ productTitle: string; quantity: number }>;
  const firstItem = items[0];
  const moreCount = items.length - 1;
  const isActive = ACTIVE_STATUSES.includes(order.status);

  return (
    <Pressable
      style={({ pressed }) => [cardStyles.card, pressed && { opacity: 0.93 }]}
      onPress={onPress}
    >
      {/* Top strip: order id + status */}
      <View style={cardStyles.topRow}>
        <View style={cardStyles.orderIdWrap}>
          <Text style={cardStyles.orderId}>#{order.id}</Text>
          {isActive && <View style={cardStyles.activePulse} />}
        </View>
        <Text style={cardStyles.dateText}>{dateStr} · {timeStr}</Text>
        <View style={[cardStyles.statusPill, { backgroundColor: meta.bg }]}>
          <Feather name={meta.icon as "circle"} size={11} color={meta.color} />
          <Text style={[cardStyles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      {/* Middle: party + items */}
      <View style={cardStyles.bodyRow}>
        <View style={[cardStyles.partyIcon, { backgroundColor: meta.bg }]}>
          <Feather name={isSeller ? "user" : "home"} size={16} color={meta.color} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={cardStyles.partyLabel}>{isSeller ? "Alıcı" : "Satıcı"}</Text>
          <Text style={cardStyles.partyName} numberOfLines={1}>{isSeller ? order.buyerName : order.sellerName}</Text>
          <View style={cardStyles.itemsRow}>
            {firstItem && (
              <Text style={cardStyles.itemText} numberOfLines={1}>
                {firstItem.productTitle} × {firstItem.quantity}
              </Text>
            )}
            {moreCount > 0 && (
              <Text style={cardStyles.moreText}>+{moreCount} ürün</Text>
            )}
          </View>
        </View>
        <View style={cardStyles.amountBlock}>
          <Text style={cardStyles.amountValue}>₺{order.totalAmount.toFixed(0)}</Text>
          <Text style={cardStyles.amountLabel}>Toplam</Text>
        </View>
      </View>

      {/* Progress steps (only for non-cancelled) */}
      {order.status !== "cancelled" && (
        <View style={cardStyles.progressRow}>
          <StepDots status={order.status} />
          <Feather name="chevron-right" size={16} color={Colors.light.textMuted} />
        </View>
      )}

      {order.status === "cancelled" && (
        <View style={[cardStyles.cancelledBar, { backgroundColor: meta.bg }]}>
          <Feather name="x-circle" size={13} color={meta.color} />
          <Text style={[cardStyles.cancelledText, { color: meta.color }]}>Bu sipariş iptal edildi</Text>
        </View>
      )}
    </Pressable>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    marginBottom: 12,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 10 },
      android: { elevation: 3 },
      web: { boxShadow: "0 2px 14px rgba(60,30,10,0.07)" },
    }),
  },
  topRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10,
  },
  orderIdWrap: { flexDirection: "row", alignItems: "center", gap: 5 },
  orderId: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.light.text },
  activePulse: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.light.success, marginBottom: 1,
  },
  dateText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  statusPillText: { fontSize: 11, fontFamily: "Inter_700Bold" },

  bodyRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    paddingHorizontal: 14, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: Colors.light.borderLight, paddingTop: 12,
  },
  partyIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    marginTop: 2,
  },
  partyLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  partyName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  itemsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  itemText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, flex: 1 },
  moreText: {
    fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.light.primary,
    backgroundColor: Colors.light.primary + "12", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  amountBlock: { alignItems: "flex-end", justifyContent: "center", minWidth: 60 },
  amountValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  amountLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 1 },

  progressRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingBottom: 12, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: Colors.light.borderLight,
    gap: 6,
  },
  cancelledBar: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: Colors.light.borderLight,
  },
  cancelledText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});

function StatPill({ label, value, color, bg, onPress, active }: {
  label: string; value: number; color: string; bg: string; onPress: () => void; active: boolean;
}) {
  return (
    <Pressable
      style={[pillStyles.pill, active && { borderColor: color, backgroundColor: bg }]}
      onPress={onPress}
    >
      <Text style={[pillStyles.value, active && { color }]}>{value}</Text>
      <Text style={[pillStyles.label, active && { color }]}>{label}</Text>
    </Pressable>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    alignItems: "center", paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface, minWidth: 64,
  },
  value: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.light.text },
  label: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 1 },
});

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [filter, setFilter] = useState<string>("all");
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

  const allOrders = (orders ?? []) as Order[];

  const stats = useMemo(() => {
    const active = allOrders.filter(o => ACTIVE_STATUSES.includes(o.status)).length;
    const delivered = allOrders.filter(o => o.status === "delivered").length;
    const cancelled = allOrders.filter(o => o.status === "cancelled").length;
    const total = allOrders.length;
    return { total, active, delivered, cancelled };
  }, [allOrders]);

  const filteredOrders = useMemo(() => {
    if (filter === "all") return allOrders;
    if (filter === "active") return allOrders.filter(o => ACTIVE_STATUSES.includes(o.status));
    if (filter === "delivered") return allOrders.filter(o => o.status === "delivered");
    if (filter === "cancelled") return allOrders.filter(o => o.status === "cancelled");
    return allOrders;
  }, [allOrders, filter]);

  if (!user) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: topInset }]}>
        <View style={styles.emptyIconWrap}>
          <Feather name="shopping-bag" size={36} color={Colors.light.primary} />
        </View>
        <Text style={styles.emptyTitle}>Giriş yapın</Text>
        <Text style={styles.emptyText}>Siparişlerinizi görmek için giriş yapın</Text>
        <Pressable style={styles.loginBtn} onPress={() => router.push("/auth")}>
          <Text style={styles.loginBtnText}>Giriş Yap</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Siparişler</Text>
          <Text style={styles.subtitle}>
            {role === "buyer" ? "Verdiğiniz siparişler" : "Gelen siparişler"}
          </Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={onRefresh}>
          <Feather name="refresh-cw" size={16} color={Colors.light.text} />
        </Pressable>
      </View>

      {/* Role tabs (only for sellers) */}
      {user.isSeller && (
        <View style={styles.roleTabs}>
          <Pressable
            style={[styles.roleTab, role === "buyer" && styles.roleTabActive]}
            onPress={() => { setRole("buyer"); setFilter("all"); }}
          >
            <Feather name="shopping-cart" size={14} color={role === "buyer" ? "#fff" : Colors.light.textSecondary} />
            <Text style={[styles.roleTabText, role === "buyer" && styles.roleTabTextActive]}>Aldıklarım</Text>
          </Pressable>
          <Pressable
            style={[styles.roleTab, role === "seller" && styles.roleTabActive]}
            onPress={() => { setRole("seller"); setFilter("all"); }}
          >
            <Feather name="package" size={14} color={role === "seller" ? "#fff" : Colors.light.textSecondary} />
            <Text style={[styles.roleTabText, role === "seller" && styles.roleTabTextActive]}>Sattıklarım</Text>
          </Pressable>
        </View>
      )}

      {/* Stats strip */}
      {!isLoading && allOrders.length > 0 && (
        <View style={styles.statsStrip}>
          <StatPill
            label="Toplam" value={stats.total}
            color={Colors.light.text} bg={Colors.light.backgroundSecondary}
            onPress={() => setFilter("all")} active={filter === "all"}
          />
          <StatPill
            label="Aktif" value={stats.active}
            color={Colors.light.primary} bg={Colors.light.primary + "10"}
            onPress={() => setFilter("active")} active={filter === "active"}
          />
          <StatPill
            label="Tamamlandı" value={stats.delivered}
            color={Colors.light.success} bg={Colors.light.success + "10"}
            onPress={() => setFilter("delivered")} active={filter === "delivered"}
          />
          <StatPill
            label="İptal" value={stats.cancelled}
            color={Colors.light.accent} bg={Colors.light.accent + "10"}
            onPress={() => setFilter("cancelled")} active={filter === "cancelled"}
          />
        </View>
      )}

      {/* Filter label */}
      {!isLoading && filter !== "all" && (
        <View style={styles.filterLabel}>
          <Text style={styles.filterLabelText}>
            {FILTER_TABS.find(f => f.id === filter)?.label} · {filteredOrders.length} sipariş
          </Text>
          <Pressable onPress={() => setFilter("all")} hitSlop={8}>
            <Feather name="x" size={14} color={Colors.light.textMuted} />
          </Pressable>
        </View>
      )}

      {isLoading ? (
        <View style={styles.skeletons}>
          {[1, 2, 3].map(i => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonTop} />
              <View style={styles.skeletonBody} />
              <View style={styles.skeletonFoot} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              isSeller={role === "seller"}
              onPress={() => router.push({ pathname: "/order/[id]", params: { id: item.id } })}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.light.primary}
              colors={[Colors.light.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Feather name="shopping-bag" size={36} color={Colors.light.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {filter !== "all" ? "Bu filtrede sipariş yok" : "Henüz sipariş yok"}
              </Text>
              <Text style={styles.emptyText}>
                {filter !== "all"
                  ? "Farklı bir filtre deneyin"
                  : role === "buyer"
                  ? "İlk siparişinizi verin!"
                  : "İlk siparişiniz burada görünecek"}
              </Text>
              {filter !== "all" && (
                <Pressable style={styles.clearFilterBtn} onPress={() => setFilter("all")}>
                  <Text style={styles.clearFilterBtnText}>Filtreyi Temizle</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },

  header: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.light.text },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.light.surface, alignItems: "center", justifyContent: "center",
    ...Platform.select({ web: { boxShadow: "0 2px 6px rgba(0,0,0,0.05)" } }),
  },

  roleTabs: {
    flexDirection: "row", marginHorizontal: 20, marginBottom: 14,
    backgroundColor: Colors.light.backgroundSecondary, borderRadius: 14, padding: 4,
  },
  roleTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  roleTabActive: { backgroundColor: Colors.light.primary },
  roleTabText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.textSecondary },
  roleTabTextActive: { color: "#fff" },

  statsStrip: {
    flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 12,
  },

  filterLabel: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: Colors.light.primary + "10", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  filterLabelText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },

  skeletons: { paddingHorizontal: 20, gap: 12 },
  skeletonCard: { backgroundColor: Colors.light.surface, borderRadius: 18, overflow: "hidden", marginBottom: 0 },
  skeletonTop: { height: 42, backgroundColor: Colors.light.backgroundSecondary, margin: 14, borderRadius: 8 },
  skeletonBody: { height: 54, backgroundColor: Colors.light.backgroundSecondary, marginHorizontal: 14, marginBottom: 10, borderRadius: 8 },
  skeletonFoot: { height: 24, backgroundColor: Colors.light.backgroundSecondary, marginHorizontal: 14, marginBottom: 14, borderRadius: 8 },

  listContent: { paddingHorizontal: 16, paddingBottom: 110 },

  emptyContainer: { alignItems: "center", paddingTop: 70, gap: 10 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: Colors.light.primary + "15", alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center" },
  clearFilterBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10, marginTop: 6,
  },
  clearFilterBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },

  loginBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 4 },
  loginBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
});
