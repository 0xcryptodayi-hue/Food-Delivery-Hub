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

const STATUS_META: Record<string, {
  label: string; color: string; bg: string;
  icon: string; step: number; accent: string;
}> = {
  received:   { label: "Alındı",        color: "#2563EB", bg: "#EFF6FF", accent: "#BFDBFE", icon: "check-circle", step: 1 },
  preparing:  { label: "Hazırlanıyor",  color: "#D97706", bg: "#FFFBEB", accent: "#FDE68A", icon: "loader",       step: 2 },
  ready:      { label: "Hazır",         color: "#059669", bg: "#ECFDF5", accent: "#A7F3D0", icon: "package",      step: 3 },
  on_the_way: { label: "Yolda",         color: "#E8651A", bg: "#FFF7ED", accent: "#FED7AA", icon: "truck",        step: 4 },
  delivered:  { label: "Teslim Edildi", color: "#6B7280", bg: "#F9FAFB", accent: "#E5E7EB", icon: "home",         step: 5 },
  cancelled:  { label: "İptal",         color: "#DC2626", bg: "#FEF2F2", accent: "#FECACA", icon: "x-circle",     step: 0 },
};

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

const STEPS = [
  { icon: "check-circle", label: "Alındı"       },
  { icon: "clock",        label: "Hazırlanıyor" },
  { icon: "package",      label: "Hazır"        },
  { icon: "truck",        label: "Yolda"        },
  { icon: "home",         label: "Teslim"       },
];

function ProgressBar({ status }: { status: string }) {
  const meta = STATUS_META[status];
  if (!meta || meta.step === 0) return null;
  const progress = ((meta.step - 1) / (STEPS.length - 1)) * 100;

  return (
    <View style={progressStyles.wrap}>
      <View style={progressStyles.track}>
        <View style={[progressStyles.fill, { width: `${progress}%` as any, backgroundColor: meta.color }]} />
      </View>
      <View style={progressStyles.steps}>
        {STEPS.map((step, i) => {
          const done = i + 1 <= meta.step;
          const active = i + 1 === meta.step;
          return (
            <View key={i} style={progressStyles.stepItem}>
              <View style={[
                progressStyles.dot,
                done && { backgroundColor: meta.color, borderColor: meta.color },
                active && progressStyles.dotActive,
              ]}>
                {active && <View style={[progressStyles.dotInner, { backgroundColor: meta.color }]} />}
                {done && !active && (
                  <Feather name="check" size={8} color="#fff" />
                )}
              </View>
              <Text style={[progressStyles.stepLabel, done && { color: meta.color }]} numberOfLines={1}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  wrap: { paddingTop: 6, paddingBottom: 4 },
  track: {
    height: 3, backgroundColor: "#F3F4F6", borderRadius: 2,
    marginHorizontal: 22, marginBottom: 6, overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 2 },
  steps: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10 },
  stepItem: { alignItems: "center", gap: 3, width: 44 },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  dotActive: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#fff", borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  dotInner: { width: 7, height: 7, borderRadius: 4 },
  stepLabel: { fontSize: 8, fontFamily: "Inter_500Medium", color: "#D1D5DB", textAlign: "center" },
});

function OrderCard({ order, isSeller, onPress }: { order: Order; isSeller: boolean; onPress: () => void }) {
  const meta = STATUS_META[order.status] ?? {
    label: order.status, color: "#6B7280", bg: "#F9FAFB", accent: "#E5E7EB", icon: "circle", step: 0,
  };
  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const items = order.items as Array<{ productTitle: string; quantity: number }>;
  const isActive = ACTIVE_STATUSES.includes(order.status);

  return (
    <Pressable
      style={({ pressed }) => [cardStyles.card, pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] }]}
      onPress={onPress}
    >
      {/* Left accent bar */}
      <View style={[cardStyles.accentBar, { backgroundColor: meta.color }]} />

      <View style={cardStyles.inner}>
        {/* Header row */}
        <View style={cardStyles.headerRow}>
          <View style={cardStyles.headerLeft}>
            <View style={[cardStyles.statusBadge, { backgroundColor: meta.bg, borderColor: meta.accent }]}>
              <Feather name={meta.icon as "circle"} size={12} color={meta.color} />
              <Text style={[cardStyles.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {isActive && (
              <View style={cardStyles.liveChip}>
                <View style={[cardStyles.liveDot, { backgroundColor: meta.color }]} />
                <Text style={[cardStyles.liveText, { color: meta.color }]}>Canlı</Text>
              </View>
            )}
          </View>
          <View style={cardStyles.headerRight}>
            <Text style={cardStyles.orderId}>#{order.id}</Text>
            <Feather name="chevron-right" size={16} color="#9CA3AF" />
          </View>
        </View>

        {/* Divider */}
        <View style={cardStyles.divider} />

        {/* Body */}
        <View style={cardStyles.body}>
          {/* Party info */}
          <View style={cardStyles.partyRow}>
            <View style={[cardStyles.partyAvatar, { backgroundColor: meta.bg }]}>
              <Feather name={isSeller ? "user" : "home"} size={15} color={meta.color} />
            </View>
            <View style={cardStyles.partyInfo}>
              <Text style={cardStyles.partyRole}>{isSeller ? "Alıcı" : "Satıcı"}</Text>
              <Text style={cardStyles.partyName} numberOfLines={1}>
                {isSeller ? order.buyerName : order.sellerName}
              </Text>
            </View>
            <View style={cardStyles.priceBlock}>
              <Text style={[cardStyles.priceValue, { color: meta.color }]}>
                ₺{order.totalAmount.toFixed(0)}
              </Text>
              <Text style={cardStyles.priceLabel}>Toplam</Text>
            </View>
          </View>

          {/* Items */}
          <View style={[cardStyles.itemsBox, { backgroundColor: meta.bg }]}>
            <Feather name="shopping-bag" size={12} color={meta.color} style={{ marginTop: 1 }} />
            <Text style={[cardStyles.itemsText, { color: meta.color === "#6B7280" ? "#374151" : meta.color }]} numberOfLines={2}>
              {items.map(it => `${it.productTitle} × ${it.quantity}`).join("  ·  ")}
            </Text>
          </View>

          {/* Date row */}
          <View style={cardStyles.dateRow}>
            <Feather name="calendar" size={11} color="#9CA3AF" />
            <Text style={cardStyles.dateText}>{dateStr} · {timeStr}</Text>
          </View>
        </View>

        {/* Progress / Cancelled */}
        {order.status === "cancelled" ? (
          <View style={[cardStyles.cancelledBox, { backgroundColor: meta.bg, borderColor: meta.accent }]}>
            <Feather name="x-octagon" size={14} color={meta.color} />
            <Text style={[cardStyles.cancelledText, { color: meta.color }]}>Sipariş iptal edildi</Text>
          </View>
        ) : (
          <View style={cardStyles.progressWrap}>
            <ProgressBar status={order.status} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 14,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12 },
      android: { elevation: 3 },
      web: { boxShadow: "0 2px 16px rgba(0,0,0,0.07)" },
    }),
  },
  accentBar: { width: 4, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
  inner: { flex: 1, padding: 14 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },

  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1,
  },
  statusText: { fontSize: 12, fontFamily: "Inter_700Bold" },

  liveChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F0FDF4", borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3 },
  liveText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  orderId: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#6B7280" },

  divider: { height: 1, backgroundColor: "#F3F4F6", marginBottom: 12 },

  body: { gap: 10 },

  partyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  partyAvatar: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  partyInfo: { flex: 1 },
  partyRole: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#9CA3AF" },
  partyName: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#111827", marginTop: 1 },

  priceBlock: { alignItems: "flex-end" },
  priceValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  priceLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#9CA3AF", marginTop: 1 },

  itemsBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 7,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
  },
  itemsText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },

  dateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#9CA3AF" },

  progressWrap: {
    borderTopWidth: 1, borderTopColor: "#F3F4F6", marginTop: 6, paddingTop: 10,
  },

  cancelledBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1,
  },
  cancelledText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});

function SummaryCard({ icon, label, value, color, bg, onPress, active }: {
  icon: string; label: string; value: number;
  color: string; bg: string; onPress: () => void; active: boolean;
}) {
  return (
    <Pressable
      style={[summaryStyles.card, active && { borderColor: color, backgroundColor: bg }]}
      onPress={onPress}
    >
      <View style={[summaryStyles.iconWrap, { backgroundColor: active ? color + "20" : "#F9FAFB" }]}>
        <Feather name={icon as "circle"} size={14} color={active ? color : "#9CA3AF"} />
      </View>
      <Text style={[summaryStyles.value, active && { color }]}>{value}</Text>
      <Text style={[summaryStyles.label, active && { color }]}>{label}</Text>
    </Pressable>
  );
}

const summaryStyles = StyleSheet.create({
  card: {
    flex: 1, alignItems: "center", gap: 4,
    paddingVertical: 12, paddingHorizontal: 6,
    borderRadius: 14, borderWidth: 1.5, borderColor: "#F3F4F6",
    backgroundColor: "#fff",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
      web: { boxShadow: "0 1px 6px rgba(0,0,0,0.05)" },
    }),
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: "center", justifyContent: "center", marginBottom: 2,
  },
  value: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#111827" },
  label: { fontSize: 9, fontFamily: "Inter_500Medium", color: "#9CA3AF", textAlign: "center" },
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

  const stats = useMemo(() => ({
    total: allOrders.length,
    active: allOrders.filter(o => ACTIVE_STATUSES.includes(o.status)).length,
    delivered: allOrders.filter(o => o.status === "delivered").length,
    cancelled: allOrders.filter(o => o.status === "cancelled").length,
  }), [allOrders]);

  const filteredOrders = useMemo(() => {
    if (filter === "all") return allOrders;
    if (filter === "active") return allOrders.filter(o => ACTIVE_STATUSES.includes(o.status));
    if (filter === "delivered") return allOrders.filter(o => o.status === "delivered");
    if (filter === "cancelled") return allOrders.filter(o => o.status === "cancelled");
    return allOrders;
  }, [allOrders, filter]);

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Feather name="shopping-bag" size={32} color={Colors.light.primary} />
          </View>
          <Text style={styles.emptyTitle}>Giriş Yapın</Text>
          <Text style={styles.emptyText}>Siparişlerinizi görmek için giriş yapın</Text>
          <Pressable style={styles.loginBtn} onPress={() => router.push("/auth")}>
            <Text style={styles.loginBtnText}>Giriş Yap</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Siparişlerim</Text>
          <Text style={styles.pageSubtitle}>
            {role === "buyer" ? "Verdiğiniz siparişler" : "Gelen siparişler"}
          </Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={onRefresh} hitSlop={8}>
          <Feather name="refresh-cw" size={15} color={Colors.light.text} />
        </Pressable>
      </View>

      {/* ── Role switcher (only sellers) ── */}
      {user.isSeller && (
        <View style={styles.roleWrap}>
          {(["buyer", "seller"] as const).map(r => (
            <Pressable
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => { setRole(r); setFilter("all"); }}
            >
              <Feather
                name={r === "buyer" ? "shopping-cart" : "package"}
                size={14}
                color={role === r ? "#fff" : Colors.light.textSecondary}
              />
              <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                {r === "buyer" ? "Aldıklarım" : "Sattıklarım"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* ── Summary cards ── */}
      {!isLoading && allOrders.length > 0 && (
        <View style={styles.summaryRow}>
          <SummaryCard
            icon="list" label="Tümü" value={stats.total}
            color="#374151" bg="#F9FAFB"
            onPress={() => setFilter("all")} active={filter === "all"}
          />
          <SummaryCard
            icon="clock" label="Aktif" value={stats.active}
            color="#D97706" bg="#FFFBEB"
            onPress={() => setFilter("active")} active={filter === "active"}
          />
          <SummaryCard
            icon="home" label="Tamamlandı" value={stats.delivered}
            color="#059669" bg="#ECFDF5"
            onPress={() => setFilter("delivered")} active={filter === "delivered"}
          />
          <SummaryCard
            icon="x-circle" label="İptal" value={stats.cancelled}
            color="#DC2626" bg="#FEF2F2"
            onPress={() => setFilter("cancelled")} active={filter === "cancelled"}
          />
        </View>
      )}

      {/* ── Active filter banner ── */}
      {!isLoading && filter !== "all" && (
        <View style={styles.filterBanner}>
          <Text style={styles.filterBannerText}>
            {filter === "active" && "Aktif siparişler"}
            {filter === "delivered" && "Tamamlanan siparişler"}
            {filter === "cancelled" && "İptal edilen siparişler"}
            {"  ·  "}{filteredOrders.length} sipariş
          </Text>
          <Pressable onPress={() => setFilter("all")} hitSlop={10}>
            <Feather name="x" size={14} color={Colors.light.primary} />
          </Pressable>
        </View>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.skeletonCard, { opacity: 1 - i * 0.2 }]}>
              <View style={styles.skeletonAccent} />
              <View style={styles.skeletonBody}>
                <View style={styles.skeletonLine1} />
                <View style={styles.skeletonLine2} />
                <View style={styles.skeletonLine3} />
              </View>
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
          contentContainerStyle={[styles.list, filteredOrders.length === 0 && { flex: 1 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
              tintColor={Colors.light.primary} colors={[Colors.light.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Feather name="inbox" size={32} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyTitle}>
                {filter !== "all" ? "Bu filtrede sipariş yok" : "Henüz sipariş yok"}
              </Text>
              <Text style={styles.emptyText}>
                {filter !== "all"
                  ? "Farklı bir filtre seçin"
                  : role === "buyer"
                  ? "İlk siparişinizi verin!"
                  : "Gelen siparişler burada görünür"}
              </Text>
              {filter !== "all" && (
                <Pressable style={styles.clearBtn} onPress={() => setFilter("all")}>
                  <Text style={styles.clearBtnText}>Tümünü Göster</Text>
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
  container: { flex: 1, backgroundColor: "#F8F9FB" },

  header: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#111827", letterSpacing: -0.3 },
  pageSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#9CA3AF", marginTop: 2 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#F9FAFB", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#F3F4F6",
  },

  roleWrap: {
    flexDirection: "row", marginHorizontal: 16, marginTop: 14, marginBottom: 4,
    backgroundColor: "#F3F4F6", borderRadius: 14, padding: 4,
  },
  roleBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 10, borderRadius: 10,
  },
  roleBtnActive: { backgroundColor: Colors.light.primary },
  roleBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.textSecondary },
  roleBtnTextActive: { color: "#fff" },

  summaryRow: {
    flexDirection: "row", gap: 8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },

  filterBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 16, marginTop: 10,
    backgroundColor: Colors.light.primary + "0F",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
    borderLeftWidth: 3, borderLeftColor: Colors.light.primary,
  },
  filterBannerText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },

  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 120 },

  skeletons: { paddingHorizontal: 16, paddingTop: 14, gap: 14 },
  skeletonCard: {
    backgroundColor: "#fff", borderRadius: 18, flexDirection: "row",
    overflow: "hidden", borderWidth: 1, borderColor: "#F3F4F6",
    height: 140,
  },
  skeletonAccent: { width: 4, backgroundColor: "#E5E7EB" },
  skeletonBody: { flex: 1, padding: 14, gap: 10 },
  skeletonLine1: { height: 24, backgroundColor: "#F3F4F6", borderRadius: 8, width: "55%" },
  skeletonLine2: { height: 40, backgroundColor: "#F3F4F6", borderRadius: 8 },
  skeletonLine3: { height: 16, backgroundColor: "#F3F4F6", borderRadius: 8, width: "40%" },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40, paddingTop: 60 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#111827" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#9CA3AF", textAlign: "center", lineHeight: 20 },

  clearBtn: {
    marginTop: 4, backgroundColor: Colors.light.primary,
    paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12,
  },
  clearBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },

  loginBtn: {
    backgroundColor: Colors.light.primary, paddingHorizontal: 36,
    paddingVertical: 14, borderRadius: 14, marginTop: 4,
  },
  loginBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
});
