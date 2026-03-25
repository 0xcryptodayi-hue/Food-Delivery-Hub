import React, { useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Platform, ActivityIndicator, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getBaseUrl } from "@workspace/api-client-react";

type Notification = {
  id: number;
  title: string;
  body: string;
  type: string;
  referenceId?: number | null;
  isRead: boolean;
  createdAt: string;
};

function useNotifications() {
  const { token } = useAuth();
  const [data, setData] = React.useState<Notification[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetch_ = useCallback(async () => {
    if (!token) { setIsLoading(false); return; }
    try {
      const res = await fetch(`${getBaseUrl()}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch {}
    setIsLoading(false);
  }, [token]);

  React.useEffect(() => { fetch_(); }, [fetch_]);

  const markRead = async (id: number) => {
    if (!token) return;
    await fetch(`${getBaseUrl()}/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setData(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    if (!token) return;
    await fetch(`${getBaseUrl()}/api/notifications/read-all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setData(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return { data, isLoading, refetch: fetch_, markRead, markAllRead };
}

const TYPE_ICONS: Record<string, string> = {
  order: "shopping-bag",
  message: "message-circle",
  review: "star",
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const [refreshing, setRefreshing] = React.useState(false);

  const { data, isLoading, refetch, markRead, markAllRead } = useNotifications();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePress = (notif: Notification) => {
    markRead(notif.id);
    if (notif.type === "order" && notif.referenceId) {
      router.push({ pathname: "/order/[id]", params: { id: notif.referenceId } });
    }
  };

  const unreadCount = data.filter(n => !n.isRead).length;

  if (!user) {
    return (
      <View style={[styles.centered, { paddingTop: topInset }]}>
        <Text style={styles.emptyTitle}>Giriş yapmanız gerekiyor</Text>
        <Pressable style={styles.btn} onPress={() => router.push("/auth")}>
          <Text style={styles.btnText}>Giriş Yap</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Bildirimler</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text style={styles.markAllText}>Tümünü Oku</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.notifItem, !item.isRead && styles.notifUnread]}
              onPress={() => handlePress(item)}
            >
              <View style={[styles.iconBox, { backgroundColor: item.isRead ? Colors.light.backgroundSecondary : Colors.light.primary + "15" }]}>
                <Feather
                  name={(TYPE_ICONS[item.type] ?? "bell") as "bell"}
                  size={20}
                  color={item.isRead ? Colors.light.textMuted : Colors.light.primary}
                />
              </View>
              <View style={styles.notifContent}>
                <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]}>{item.title}</Text>
                <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.notifTime}>
                  {new Date(item.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
              {!item.isRead && <View style={styles.unreadDot} />}
            </Pressable>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.primary} colors={[Colors.light.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyTitle}>Bildirim yok</Text>
              <Text style={styles.emptyText}>Sipariş ve mesaj bildirimleri burada görünecek</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.surface, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  markAllText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.primary },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  notifItem: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: Colors.light.surface, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.light.borderLight,
  },
  notifUnread: { borderColor: Colors.light.primary + "30", backgroundColor: Colors.light.primary + "05" },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary, marginBottom: 2 },
  notifTitleUnread: { fontFamily: "Inter_700Bold", color: Colors.light.text },
  notifBody: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.light.primary, marginTop: 4 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center", paddingHorizontal: 20 },
  btn: { backgroundColor: Colors.light.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
});
