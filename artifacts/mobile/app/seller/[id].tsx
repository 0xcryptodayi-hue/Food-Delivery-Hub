import React from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, ActivityIndicator, FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGetUser, useGetUserProducts, useGetSellerReviews, useCreateConversation } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ui/ProductCard";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export default function SellerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addItem } = useCart();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const { data: seller, isLoading: sellerLoading } = useGetUser(parseInt(id ?? "0"));
  const { data: products, isLoading: productsLoading } = useGetUserProducts(parseInt(id ?? "0"));
  const { data: reviews } = useGetSellerReviews(parseInt(id ?? "0"));
  const createConv = useCreateConversation();

  const handleMessage = async () => {
    if (!user) { router.push("/auth"); return; }
    try {
      const conv = await createConv.mutateAsync({ data: { otherUserId: parseInt(id ?? "0") } });
      router.push({ pathname: "/chat/[id]", params: { id: conv.id } });
    } catch {
      router.push("/(tabs)/messages");
    }
  };

  if (sellerLoading) {
    return (
      <View style={[styles.centered, { paddingTop: topInset }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!seller) {
    return (
      <View style={[styles.centered, { paddingTop: topInset }]}>
        <Text style={styles.errorText}>Satıcı bulunamadı</Text>
        <Pressable onPress={() => router.back()}><Text style={styles.backLink}>Geri Dön</Text></Pressable>
      </View>
    );
  }

  const topReviews = (reviews ?? []).slice(0, 3);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: topInset }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Feather name="arrow-left" size={20} color={Colors.light.text} />
      </Pressable>

      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{seller.name[0]?.toUpperCase()}</Text>
        </View>
        <Text style={styles.sellerName}>{seller.name}</Text>
        {seller.address && (
          <View style={styles.addressRow}>
            <Feather name="map-pin" size={14} color={Colors.light.textMuted} />
            <Text style={styles.address}>{seller.address}</Text>
          </View>
        )}

        <View style={styles.statsRow}>
          {seller.rating != null && (
            <View style={styles.statBox}>
              <View style={styles.statIconRow}>
                <Ionicons name="star" size={16} color={Colors.light.star} />
                <Text style={styles.statValue}>{seller.rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.statLabel}>{seller.reviewCount} yorum</Text>
            </View>
          )}
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{products?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Ürün</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{seller.totalOrders}</Text>
            <Text style={styles.statLabel}>Sipariş</Text>
          </View>
        </View>

        {user?.id !== parseInt(id ?? "0") && (
          <Pressable style={styles.messageBtn} onPress={handleMessage}>
            <Feather name="message-circle" size={18} color={Colors.light.primary} />
            <Text style={styles.messageBtnText}>Mesaj Gönder</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ürünler ({products?.length ?? 0})</Text>
        {productsLoading ? (
          <ActivityIndicator color={Colors.light.primary} style={{ marginVertical: 20 }} />
        ) : (products ?? []).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Henüz ürün yok</Text>
          </View>
        ) : (
          (products ?? []).map(product => (
            <ProductCard
              key={product.id}
              {...product}
              isFavorited={false}
              onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id } })}
              onAddToCart={() => addItem({
                productId: product.id, title: product.title, price: product.price,
                imageUrl: product.imageUrl, sellerId: product.sellerId, sellerName: product.sellerName,
              })}
            />
          ))
        )}
      </View>

      {topReviews.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Değerlendirmeler</Text>
          {topReviews.map(review => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAvatar}>
                  <Text style={styles.reviewAvatarText}>{review.buyerName[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.reviewHeaderInfo}>
                  <Text style={styles.reviewerName}>{review.buyerName}</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Ionicons key={s} name="star" size={12} color={s <= review.rating ? Colors.light.star : Colors.light.border} />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewDate}>
                  {new Date(review.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                </Text>
              </View>
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.light.background },
  errorText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  backLink: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.light.primary, marginTop: 8 },
  backBtn: {
    margin: 16, width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.light.surface, alignItems: "center", justifyContent: "center",
    alignSelf: "flex-start",
    ...Platform.select({ ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 }, android: { elevation: 1 } }),
  },
  profileSection: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.light.primary + "20", alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 36, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  sellerName: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.light.text, marginBottom: 6 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  address: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  statsRow: { flexDirection: "row", gap: 16, marginBottom: 20 },
  statBox: { alignItems: "center", backgroundColor: Colors.light.backgroundSecondary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  statIconRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, marginTop: 2 },
  messageBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14,
    backgroundColor: Colors.light.primary + "15", borderWidth: 1.5, borderColor: Colors.light.primary,
  },
  messageBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.primary },
  section: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text, marginBottom: 12 },
  empty: { alignItems: "center", paddingVertical: 24 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.textMuted },
  reviewCard: {
    backgroundColor: Colors.light.surface, borderRadius: 16, padding: 14, marginBottom: 10,
    ...Platform.select({ ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 }, android: { elevation: 1 } }),
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.primary + "20", alignItems: "center", justifyContent: "center" },
  reviewAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  reviewHeaderInfo: { flex: 1 },
  reviewerName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  starsRow: { flexDirection: "row", gap: 2, marginTop: 2 },
  reviewDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  reviewComment: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, lineHeight: 20 },
});
