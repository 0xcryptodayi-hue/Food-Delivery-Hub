import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Image, Platform, ActivityIndicator, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGetProduct, useToggleFavorite, getGetFavoritesQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useQueryClient } from "@tanstack/react-query";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

type ProductReview = {
  id: number;
  rating: number;
  comment: string | null;
  buyerName: string;
  createdAt: string;
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addItem, items } = useCart();
  const queryClient = useQueryClient();
  const [qty, setQty] = useState(1);
  const [localFavorited, setLocalFavorited] = useState<boolean | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [justAdded, setJustAdded] = useState(false);
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = () => {
    setJustAdded(true);
    Animated.spring(bannerAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 200 }).start();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      Animated.timing(bannerAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setJustAdded(false));
    }, 3500);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const { data: product, isLoading } = useGetProduct(parseInt(id ?? "0"));

  useEffect(() => {
    const productId = parseInt(id ?? "0");
    if (!productId) return;
    setReviewsLoading(true);
    fetch(`${API_BASE}/reviews/product/${productId}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setReviews(d); })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [id]);
  const toggleFav = useToggleFavorite();

  const isFavorited = localFavorited !== null ? localFavorited : (product?.isFavorited ?? false);
  const cartQty = items.find(i => i.productId === parseInt(id ?? "0"))?.quantity ?? 0;

  const handleAddToCart = () => {
    if (!product) return;
    if (!user) { router.push("/auth"); return; }
    for (let i = 0; i < qty; i++) {
      addItem({
        productId: product.id, title: product.title, price: product.price,
        imageUrl: product.imageUrl, sellerId: product.sellerId, sellerName: product.sellerName,
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showBanner();
  };

  const handleFavorite = () => {
    if (!user) { router.push("/auth"); return; }
    if (!product) return;
    setLocalFavorited(!isFavorited);
    toggleFav.mutate(
      { data: { productId: product.id } },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetFavoritesQueryKey() }),
        onError: () => setLocalFavorited(isFavorited),
      }
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.centered, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) }]}>
        <Text style={styles.errorText}>Ürün bulunamadı</Text>
        <Pressable onPress={() => router.back()}><Text style={styles.backLink}>Geri Dön</Text></Pressable>
      </View>
    );
  }

  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text style={styles.placeholderEmoji}>🍲</Text>
            </View>
          )}
          <View style={[styles.headerBtns, { top: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}>
            <Pressable style={styles.iconBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={Colors.light.text} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={handleFavorite}>
              <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={20} color={isFavorited ? Colors.light.accent : Colors.light.text} />
            </Pressable>
          </View>
          {product.isSponsored && (
            <View style={styles.sponsoredBadge}>
              <Text style={styles.sponsoredText}>Öne Çıkan</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{product.title}</Text>
            <Text style={styles.price}>₺{product.price.toFixed(0)}</Text>
          </View>

          {product.rating != null && (
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <Ionicons key={s} name="star" size={16} color={s <= Math.round(product.rating!) ? Colors.light.star : Colors.light.border} />
              ))}
              <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({product.reviewCount} değerlendirme)</Text>
            </View>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Feather name="clock" size={14} color={Colors.light.primary} />
              <Text style={styles.metaText}>{product.prepTime} dk</Text>
            </View>
            <View style={styles.metaChip}>
              <Feather name="users" size={14} color={Colors.light.primary} />
              <Text style={styles.metaText}>{product.portion}</Text>
            </View>
            <View style={styles.metaChip}>
              <Feather name="package" size={14} color={product.remainingStock > 0 ? Colors.light.success : Colors.light.accent} />
              <Text style={[styles.metaText, product.remainingStock === 0 && { color: Colors.light.accent }]}>
                {product.remainingStock > 0 ? `${product.remainingStock} kaldı` : "Tükendi"}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Açıklama</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          <Pressable
            style={styles.sellerCard}
            onPress={() => router.push({ pathname: "/seller/[id]", params: { id: product.sellerId } })}
          >
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerAvatarText}>{product.sellerName[0]?.toUpperCase()}</Text>
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerLabel}>Satıcı</Text>
              <Text style={styles.sellerName}>{product.sellerName}</Text>
              {product.sellerRating != null && (
                <View style={styles.sellerRatingRow}>
                  <Ionicons name="star" size={12} color={Colors.light.star} />
                  <Text style={styles.sellerRating}>{product.sellerRating.toFixed(1)}</Text>
                </View>
              )}
            </View>
            <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
          </Pressable>

          {/* Reviews Section */}
          <View style={styles.section}>
            <View style={styles.reviewsSectionHeader}>
              <Text style={styles.sectionTitle}>Yorumlar</Text>
              {reviews.length > 0 && (
                <View style={styles.reviewsCount}>
                  <Ionicons name="star" size={14} color={Colors.light.star} />
                  <Text style={styles.reviewsCountText}>{reviews.length} yorum</Text>
                </View>
              )}
            </View>

            {reviewsLoading ? (
              <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 12 }} />
            ) : reviews.length === 0 ? (
              <View style={styles.noReviews}>
                <Ionicons name="star-outline" size={32} color={Colors.light.textMuted} />
                <Text style={styles.noReviewsText}>Henüz yorum yok</Text>
                <Text style={styles.noReviewsSubText}>Bu ürünü sipariş edip ilk yorumu siz yapın</Text>
              </View>
            ) : (
              reviews.map(review => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewCardHeader}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>{review.buyerName[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewBuyerName}>{review.buyerName}</Text>
                      <Text style={styles.reviewDate}>
                        {new Date(review.createdAt).toLocaleDateString("tr-TR")}
                      </Text>
                    </View>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Ionicons
                          key={s}
                          name="star"
                          size={12}
                          color={s <= review.rating ? Colors.light.star : Colors.light.border}
                        />
                      ))}
                    </View>
                  </View>
                  {review.comment && (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {product.remainingStock > 0 && (
        <View style={[styles.footer, { paddingBottom: bottomInset + 16 }]}>
          {/* Animated "Sepete Git" banner */}
          {justAdded && (
            <Animated.View
              style={[
                styles.addedBanner,
                {
                  opacity: bannerAnim,
                  transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
                },
              ]}
            >
              <View style={styles.addedBannerLeft}>
                <View style={styles.addedCheck}>
                  <Feather name="check" size={13} color="#fff" />
                </View>
                <Text style={styles.addedBannerText}>
                  {qty}x ürün sepete eklendi
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.goCartBtn, pressed && { opacity: 0.85 }]}
                onPress={() => router.push("/cart")}
              >
                <Text style={styles.goCartBtnText}>Sepete Git</Text>
                <Feather name="arrow-right" size={14} color={Colors.light.primary} />
              </Pressable>
            </Animated.View>
          )}

          {/* Bottom row: qty + buttons */}
          <View style={styles.footerRow}>
            <View style={styles.qtyControl}>
              <Pressable style={styles.qtyBtn} onPress={() => setQty(q => Math.max(1, q - 1))}>
                <Feather name="minus" size={18} color={Colors.light.text} />
              </Pressable>
              <Text style={styles.qtyText}>{qty}</Text>
              <Pressable style={styles.qtyBtn} onPress={() => setQty(q => Math.min(product.remainingStock, q + 1))}>
                <Feather name="plus" size={18} color={Colors.light.text} />
              </Pressable>
            </View>

            <View style={styles.btnGroup}>
              {cartQty > 0 && (
                <Pressable
                  style={({ pressed }) => [styles.viewCartBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => router.push("/cart")}
                >
                  <Feather name="shopping-cart" size={16} color={Colors.light.primary} />
                  <Text style={styles.viewCartBtnText}>{cartQty}</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.9 }]}
                onPress={handleAddToCart}
              >
                <Feather name="plus" size={16} color="#fff" />
                <Text style={styles.addBtnText}>
                  Sepete Ekle — ₺{(product.price * qty).toFixed(0)}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.light.background },
  errorText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  backLink: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.light.primary, marginTop: 8 },
  imageContainer: { position: "relative" },
  image: { width: "100%", height: 300 },
  imagePlaceholder: { backgroundColor: Colors.light.backgroundTertiary, alignItems: "center", justifyContent: "center" },
  placeholderEmoji: { fontSize: 80 },
  headerBtns: { position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center",
  },
  sponsoredBadge: { position: "absolute", bottom: 16, left: 16, backgroundColor: Colors.light.sponsored, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  sponsoredText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  body: { padding: 20 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 10 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.light.text, flex: 1 },
  price: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  ratingText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginLeft: 4 },
  reviewCount: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  metaRow: { flexDirection: "row", gap: 10, marginBottom: 24, flexWrap: "wrap" },
  metaChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.light.backgroundSecondary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
  },
  metaText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.light.text },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 8 },
  description: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, lineHeight: 24 },
  sellerCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.light.backgroundSecondary, borderRadius: 16, padding: 16,
    marginBottom: 20,
  },
  sellerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.light.primary + "20", alignItems: "center", justifyContent: "center" },
  sellerAvatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  sellerInfo: { flex: 1 },
  sellerLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  sellerName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  sellerRatingRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  sellerRating: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.text },
  footer: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.light.borderLight,
  },
  footerRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  btnGroup: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center" },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 10 },
  qtyBtn: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.light.text, minWidth: 24, textAlign: "center" },
  viewCartBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.light.primary + "15",
    borderWidth: 1.5, borderColor: Colors.light.primary,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 13,
  },
  viewCartBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.light.primary },
  addBtn: {
    flex: 1, backgroundColor: Colors.light.primary, borderRadius: 14, paddingVertical: 14,
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6,
  },
  addBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  addedBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.light.success + "40",
  },
  addedBannerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  addedCheck: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.light.success, alignItems: "center", justifyContent: "center",
  },
  addedBannerText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.light.text },
  goCartBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.light.primary + "12",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.light.primary + "30",
  },
  goCartBtnText: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.light.primary },

  reviewsSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  reviewsCount: { flexDirection: "row", alignItems: "center", gap: 4 },
  reviewsCountText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },

  noReviews: { alignItems: "center", paddingVertical: 24, gap: 8 },
  noReviewsText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  noReviewsSubText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textAlign: "center" },

  reviewCard: {
    backgroundColor: Colors.light.surface, borderRadius: 14, padding: 14,
    marginBottom: 10, gap: 8,
  },
  reviewCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.light.primary + "20", alignItems: "center", justifyContent: "center",
  },
  reviewAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  reviewBuyerName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  reviewDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 1 },
  reviewStars: { flexDirection: "row", gap: 2 },
  reviewComment: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, lineHeight: 19 },
});
