import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Platform, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGetSellers } from "@workspace/api-client-react";

type Seller = {
  id: number;
  name: string;
  avatar?: string | null;
  rating?: number | null;
  reviewCount: number;
  address?: string | null;
  distance?: number | null;
  productCount: number;
  isSponsored: boolean;
  hygieneAvg?: number | null;
  hygieneCount?: number;
};

function SellerCard({ seller, onPress }: { seller: Seller; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.sellerCard, pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] }]}
      onPress={onPress}
    >
      <View style={styles.sellerAvatar}>
        {seller.avatar ? (
          <Image source={{ uri: seller.avatar }} style={styles.sellerAvatarImage} />
        ) : (
          <Text style={styles.sellerAvatarText}>{seller.name[0]?.toUpperCase()}</Text>
        )}
      </View>

      <View style={styles.sellerInfo}>
        <View style={styles.sellerNameRow}>
          <Text style={styles.sellerName} numberOfLines={1}>{seller.name}</Text>
          {seller.isSponsored && (
            <View style={styles.sponsoredBadge}>
              <Text style={styles.sponsoredText}>Öne Çıkan</Text>
            </View>
          )}
        </View>

        {seller.address && (
          <View style={styles.addressRow}>
            <Feather name="map-pin" size={12} color={Colors.light.textMuted} />
            <Text style={styles.addressText} numberOfLines={1}>{seller.address}</Text>
          </View>
        )}

        <View style={styles.sellerMeta}>
          {seller.rating != null && (
            <View style={styles.ratingChip}>
              <Ionicons name="star" size={12} color={Colors.light.star} />
              <Text style={styles.ratingText}>{seller.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({seller.reviewCount})</Text>
            </View>
          )}
          {seller.hygieneAvg != null && (
            <View style={styles.hygieneChip}>
              <Feather name="shield" size={12} color="#10B981" />
              <Text style={styles.hygieneText}>{seller.hygieneAvg.toFixed(1)}</Text>
            </View>
          )}
          <View style={styles.productChip}>
            <Feather name="package" size={12} color={Colors.light.primary} />
            <Text style={styles.productCount}>{seller.productCount} ürün</Text>
          </View>
        </View>
      </View>

      <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
    </Pressable>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const { data: sellers, isLoading } = useGetSellers({});

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Satıcılar</Text>
        <Text style={styles.subtitle}>Yakınızdaki ev yemekçileri</Text>
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {[1, 2, 3].map(i => <View key={i} style={styles.skeletonCard} />)}
        </View>
      ) : (
        <FlatList
          data={(sellers ?? []) as Seller[]}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <SellerCard
              seller={item}
              onPress={() => router.push({ pathname: "/seller/[id]", params: { id: item.id } })}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏪</Text>
              <Text style={styles.emptyTitle}>Satıcı bulunamadı</Text>
              <Text style={styles.emptyText}>Yakında daha fazla satıcı gelecek!</Text>
            </View>
          }
          ListHeaderComponent={
            sellers && sellers.length > 0 ? (
              <Text style={styles.countText}>{sellers.length} satıcı mevcut</Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: "#FEF3E2",
    borderBottomWidth: 1, borderBottomColor: "#F0D9B5",
    ...Platform.select({
      ios: { shadowColor: "rgba(180,80,10,0.12)", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 3 },
      web: { boxShadow: "0 3px 10px rgba(180,80,10,0.10)" },
    }),
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#C4521A" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, marginTop: 2 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  countText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginBottom: 12 },
  sellerCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.light.surface, borderRadius: 16,
    padding: 14, marginBottom: 10,
    ...Platform.select({ ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 }, android: { elevation: 2 } }),
  },
  sellerAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.light.primary + "20", alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  sellerAvatarImage: { width: 56, height: 56, borderRadius: 28 },
  sellerAvatarText: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  sellerInfo: { flex: 1 },
  sellerNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  sellerName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.light.text, flex: 1 },
  sponsoredBadge: { backgroundColor: Colors.light.sponsored + "20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sponsoredText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.light.sponsored },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  addressText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, flex: 1 },
  sellerMeta: { flexDirection: "row", gap: 12 },
  ratingChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  reviewCount: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  hygieneChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#10B98115", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  hygieneText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#10B981" },
  productChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  productCount: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.primary },
  skeletonCard: { height: 90, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 16, marginBottom: 10 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center" },
});
