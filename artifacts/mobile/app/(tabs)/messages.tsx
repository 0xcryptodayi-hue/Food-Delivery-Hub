import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Platform, Image, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGetConversations } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

type Conversation = {
  id: number;
  otherUser: { id: number; name: string; avatar?: string | null };
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
};

function ConversationItem({ conv, onPress }: { conv: Conversation; onPress: () => void }) {
  const timeStr = conv.lastMessageAt
    ? new Date(conv.lastMessageAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <Pressable
      style={({ pressed }) => [styles.convItem, pressed && { backgroundColor: Colors.light.backgroundSecondary }]}
      onPress={onPress}
    >
      <View style={styles.avatar}>
        {conv.otherUser.avatar ? (
          <Image source={{ uri: conv.otherUser.avatar }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{conv.otherUser.name[0]?.toUpperCase()}</Text>
          </View>
        )}
        {conv.unreadCount > 0 && (
          <View style={styles.unreadDot} />
        )}
      </View>

      <View style={styles.convContent}>
        <View style={styles.convHeader}>
          <Text style={[styles.convName, conv.unreadCount > 0 && styles.convNameUnread]}>
            {conv.otherUser.name}
          </Text>
          <Text style={styles.convTime}>{timeStr}</Text>
        </View>
        <View style={styles.convFooter}>
          <Text
            style={[styles.lastMessage, conv.unreadCount > 0 && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {conv.lastMessage ?? "Henüz mesaj yok"}
          </Text>
          {conv.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{conv.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const { data: conversations, isLoading, refetch } = useGetConversations({
    query: { enabled: !!user },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: topInset }]}>
        <Feather name="message-circle" size={48} color={Colors.light.textMuted} />
        <Text style={styles.emptyTitle}>Giriş yapın</Text>
        <Text style={styles.emptyText}>Mesajlarınızı görmek için giriş yapın</Text>
        <Pressable style={styles.loginBtn} onPress={() => router.push("/auth")}>
          <Text style={styles.loginBtnText}>Giriş Yap</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mesajlar</Text>
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: 20, gap: 1 }}>
          {[1, 2, 3, 4].map(i => <View key={i} style={styles.skeletonRow} />)}
        </View>
      ) : (
        <FlatList
          data={(conversations ?? []) as Conversation[]}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <ConversationItem
              conv={item}
              onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.id } })}
            />
          )}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.primary} colors={[Colors.light.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <View style={styles.emptyIconCircle}>
                  <Feather name="message-circle" size={36} color={Colors.light.primary} />
                </View>
                <View style={styles.emptyIconBadge}>
                  <Feather name="plus" size={12} color="#fff" />
                </View>
              </View>
              <Text style={styles.emptyTitle}>Henüz mesaj yok</Text>
              <Text style={styles.emptyText}>Satıcılarla iletişime geçin,{"\n"}siparişlerinizi takip edin</Text>
              <Pressable style={styles.emptyBtn} onPress={() => router.push("/(tabs)/explore")}>
                <Feather name="search" size={15} color="#fff" />
                <Text style={styles.emptyBtnText}>Satıcıları Keşfet</Text>
              </Pressable>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { alignItems: "center", justifyContent: "center", gap: 12 },
  header: {
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10,
    backgroundColor: "#FEF3E2",
    borderBottomWidth: 1, borderBottomColor: "#F0D9B5",
    ...Platform.select({
      ios: { shadowColor: "rgba(180,80,10,0.12)", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 3 },
      web: { boxShadow: "0 3px 10px rgba(180,80,10,0.10)" },
    }),
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#C4521A" },
  convItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  avatar: { position: "relative" },
  avatarImage: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { backgroundColor: Colors.light.primary + "30", alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  unreadDot: {
    position: "absolute", bottom: 0, right: 0,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.light.primary, borderWidth: 2, borderColor: Colors.light.background,
  },
  convContent: { flex: 1 },
  convHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  convName: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.light.text, flex: 1 },
  convNameUnread: { fontFamily: "Inter_700Bold" },
  convTime: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textMuted },
  convFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lastMessage: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary, flex: 1 },
  lastMessageUnread: { fontFamily: "Inter_500Medium", color: Colors.light.text },
  unreadBadge: {
    backgroundColor: Colors.light.primary, borderRadius: 12,
    minWidth: 22, height: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
  },
  unreadBadgeText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 11 },
  skeletonRow: { height: 80, backgroundColor: Colors.light.backgroundSecondary, marginBottom: 1 },
  emptyContainer: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyIconWrap: { position: "relative", marginBottom: 8 },
  emptyIconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "#FFF7ED",
    borderWidth: 2, borderColor: "#FED7AA",
    alignItems: "center", justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12 },
      android: { elevation: 4 },
      web: { boxShadow: "0 4px 16px rgba(232,101,26,0.18)" },
    }),
  },
  emptyIconBadge: {
    position: "absolute", bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.light.primary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.light.background,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#C4521A" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#D97706", textAlign: "center", lineHeight: 22 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 14, marginTop: 8,
    ...Platform.select({
      ios: { shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: "0 4px 12px rgba(232,101,26,0.3)" },
    }),
  },
  emptyBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  loginBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  loginBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
});
