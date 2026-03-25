import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, ActivityIndicator, Image, Modal, TextInput, KeyboardAvoidingView, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGetUser, useGetUserProducts, useGetSellerReviews, useCreateConversation, getBaseUrl } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ui/ProductCard";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

type Review = {
  id: number;
  rating: number;
  comment?: string;
  buyerName: string;
  productTitle?: string;
  createdAt: string;
};

function StarRow({ rating, size = 14, gap = 3 }: { rating: number; size?: number; gap?: number }) {
  return (
    <View style={{ flexDirection: "row", gap }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Ionicons
          key={s}
          name={s <= Math.round(rating) ? "star" : "star-outline"}
          size={size}
          color={s <= Math.round(rating) ? Colors.light.star : Colors.light.border}
        />
      ))}
    </View>
  );
}

function RatingSummary({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const dist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  return (
    <View style={summaryStyles.card}>
      {/* Left: big rating */}
      <View style={summaryStyles.left}>
        <Text style={summaryStyles.bigRating}>{avg.toFixed(1)}</Text>
        <StarRow rating={avg} size={16} gap={3} />
        <Text style={summaryStyles.totalText}>{reviews.length} yorum</Text>
      </View>

      {/* Right: distribution bars */}
      <View style={summaryStyles.right}>
        {dist.map(({ star, count, pct }) => (
          <View key={star} style={summaryStyles.barRow}>
            <Text style={summaryStyles.barStar}>{star}</Text>
            <Ionicons name="star" size={10} color={Colors.light.star} />
            <View style={summaryStyles.barTrack}>
              <View style={[summaryStyles.barFill, { width: `${pct}%` as any }]} />
            </View>
            <Text style={summaryStyles.barCount}>{count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: Colors.light.surface,
    borderRadius: 18, padding: 18, marginBottom: 14,
    gap: 20,
    ...Platform.select({
      ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: "0 2px 12px rgba(60,30,10,0.07)" },
    }),
  },
  left: { alignItems: "center", justifyContent: "center", gap: 4, minWidth: 72 },
  bigRating: { fontSize: 42, fontFamily: "Inter_700Bold", color: Colors.light.text, lineHeight: 48 },
  totalText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2 },
  right: { flex: 1, gap: 5, justifyContent: "center" },
  barRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  barStar: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted, width: 10, textAlign: "right" },
  barTrack: { flex: 1, height: 6, backgroundColor: Colors.light.borderLight, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: Colors.light.star, borderRadius: 3 },
  barCount: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, width: 16, textAlign: "right" },
});

function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  const longComment = (review.comment?.length ?? 0) > 120;
  const displayComment = !expanded && longComment
    ? review.comment!.slice(0, 120) + "..."
    : review.comment;
  const date = new Date(review.createdAt);
  const dateStr = date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <View style={reviewStyles.card}>
      <View style={reviewStyles.header}>
        <View style={reviewStyles.avatar}>
          <Text style={reviewStyles.avatarText}>{review.buyerName[0]?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={reviewStyles.name}>{review.buyerName}</Text>
          <StarRow rating={review.rating} size={13} gap={2} />
        </View>
        <Text style={reviewStyles.date}>{dateStr}</Text>
      </View>

      {review.productTitle && (
        <View style={reviewStyles.productTag}>
          <Feather name="package" size={11} color={Colors.light.primary} />
          <Text style={reviewStyles.productTagText} numberOfLines={1}>{review.productTitle}</Text>
        </View>
      )}

      {review.comment ? (
        <View style={{ marginTop: 10 }}>
          <Text style={reviewStyles.comment}>{displayComment}</Text>
          {longComment && (
            <Pressable onPress={() => setExpanded(!expanded)} hitSlop={8}>
              <Text style={reviewStyles.expandBtn}>{expanded ? "Daha az göster" : "Devamını oku"}</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <Text style={reviewStyles.noComment}>Yorum yapılmadı</Text>
      )}

      <View style={reviewStyles.footer}>
        <View style={[reviewStyles.ratingPill, { backgroundColor: ratingColor(review.rating) + "15" }]}>
          <Ionicons name="star" size={10} color={ratingColor(review.rating)} />
          <Text style={[reviewStyles.ratingPillText, { color: ratingColor(review.rating) }]}>{review.rating}/5</Text>
        </View>
      </View>
    </View>
  );
}

function ratingColor(r: number) {
  if (r >= 4) return Colors.light.success;
  if (r >= 3) return Colors.light.warning;
  return Colors.light.accent;
}

const reviewStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16, padding: 14, marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 6 },
      android: { elevation: 1 },
      web: { boxShadow: "0 1px 8px rgba(60,30,10,0.06)" },
    }),
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  avatar: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.light.primary + "18",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 3 },
  date: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 1 },
  productTag: {
    flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8,
    backgroundColor: Colors.light.primary + "10", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start",
  },
  productTagText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.light.primary },
  comment: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, lineHeight: 21 },
  expandBtn: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.primary, marginTop: 4 },
  noComment: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, fontStyle: "italic", marginTop: 8 },
  footer: { flexDirection: "row", marginTop: 10 },
  ratingPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  ratingPillText: { fontSize: 11, fontFamily: "Inter_700Bold" },
});

type HygieneData = {
  avgScore: number | null;
  totalCount: number;
  platformScore: number | null;
  declarations: {
    wearsGloves: boolean;
    wearsBone: boolean;
    hasHealthCert: boolean;
    washesHands: boolean;
    singleUsePackaging: boolean;
    kitchenProtocol: boolean;
    note: string | null;
    updatedAt: string | null;
  } | null;
};

export default function SellerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { addItem } = useCart();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const [reviewsExpanded, setReviewsExpanded] = useState(false);
  const [hygieneData, setHygieneData] = useState<HygieneData | null>(null);
  const [showHygieneModal, setShowHygieneModal] = useState(false);
  const [hygieneRating, setHygieneRating] = useState(5);
  const [hygieneComment, setHygieneComment] = useState("");
  const [hygieneSubmitting, setHygieneSubmitting] = useState(false);
  const [hygieneRated, setHygieneRated] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const productsY = useRef(0);
  const reviewsY = useRef(0);

  const scrollTo = (y: number) => {
    scrollRef.current?.scrollTo({ y: y - 16, animated: true });
  };

  const { data: seller, isLoading: sellerLoading } = useGetUser(parseInt(id ?? "0"));
  const { data: products, isLoading: productsLoading } = useGetUserProducts(parseInt(id ?? "0"));
  const { data: reviewsRaw } = useGetSellerReviews(parseInt(id ?? "0"));

  useEffect(() => {
    const sellerId = parseInt(id ?? "0");
    if (!sellerId) return;
    fetch(`${getBaseUrl()}/api/hygiene/seller/${sellerId}`)
      .then(r => r.json())
      .then(d => setHygieneData(d))
      .catch(() => {});
  }, [id]);
  const createConv = useCreateConversation();

  const reviews = (reviewsRaw ?? []) as Review[];
  const PREVIEW_COUNT = 3;
  const displayedReviews = reviewsExpanded ? reviews : reviews.slice(0, PREVIEW_COUNT);
  const hasMore = reviews.length > PREVIEW_COUNT;

  const handleMessage = async () => {
    if (!user) { router.push("/auth"); return; }
    try {
      const conv = await createConv.mutateAsync({ data: { otherUserId: parseInt(id ?? "0") } });
      router.push({ pathname: "/chat/[id]", params: { id: conv.id } });
    } catch {
      router.push("/(tabs)/messages");
    }
  };

  const handleHygieneSubmit = async () => {
    if (!user) { router.push("/auth"); return; }
    setHygieneSubmitting(true);
    try {
      const res = await fetch(`${getBaseUrl()}/api/hygiene`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sellerId: parseInt(id ?? "0"), score: hygieneRating, comment: hygieneComment || undefined }),
      });
      if (res.status === 409) {
        Alert.alert("Zaten Değerlendirildi", "Bu satıcı için daha önce hijyen değerlendirmesi yaptınız.");
        setShowHygieneModal(false);
        setHygieneRated(true);
        return;
      }
      if (!res.ok) throw new Error("Hata");
      setHygieneRated(true);
      setShowHygieneModal(false);
      fetch(`${getBaseUrl()}/api/hygiene/seller/${parseInt(id ?? "0")}`)
        .then(r => r.json()).then(d => setHygieneData(d)).catch(() => {});
    } catch {
      Alert.alert("Hata", "Değerlendirme gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setHygieneSubmitting(false);
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

  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <Pressable style={[styles.backBtn, { position: "absolute", zIndex: 10, top: topInset + 12, left: 16 }]} onPress={() => router.back()}>
        <Feather name="arrow-left" size={20} color={Colors.light.text} />
      </Pressable>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >

      {/* Profile */}
      <View style={styles.profileSection}>
        {seller.storeImage ? (
          <Image source={{ uri: seller.storeImage }} style={styles.storeImage} />
        ) : null}

        <View style={styles.avatarWrap}>
          {seller.avatar ? (
            <Image source={{ uri: seller.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{seller.name[0]?.toUpperCase()}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sellerName}>{seller.name}</Text>

        {seller.address && (
          <View style={styles.addressRow}>
            <Feather name="map-pin" size={13} color={Colors.light.textMuted} />
            <Text style={styles.address}>{seller.address}</Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          {avg != null && (
            <Pressable
              style={({ pressed }) => [styles.statBox, pressed && styles.statBoxPressed]}
              onPress={() => scrollTo(reviewsY.current)}
            >
              <View style={styles.statTop}>
                <Ionicons name="star" size={16} color={Colors.light.star} />
                <Text style={styles.statValue}>{avg.toFixed(1)}</Text>
              </View>
              <Text style={styles.statLabel}>{reviews.length} Yorum</Text>
              <Feather name="chevron-down" size={10} color={Colors.light.textMuted} style={{ marginTop: 2 }} />
            </Pressable>
          )}
          {hygieneData != null && (
            <Pressable
              style={({ pressed }) => [styles.statBox, styles.hygieneBox, pressed && styles.statBoxPressed]}
              onPress={() => {
                if (!user) { router.push("/auth"); return; }
                if (hygieneRated) {
                  Alert.alert("Zaten Değerlendirildi", "Bu satıcı için hijyen değerlendirmesi yaptınız.");
                  return;
                }
                setShowHygieneModal(true);
              }}
            >
              <View style={styles.statTop}>
                <Feather name="shield" size={14} color="#10B981" />
                {hygieneData.platformScore != null && hygieneData.platformScore > 0 ? (
                  <Text style={[styles.statValue, { color: "#10B981" }]}>{hygieneData.platformScore.toFixed(1)}</Text>
                ) : hygieneData.avgScore != null ? (
                  <Text style={[styles.statValue, { color: "#10B981" }]}>{hygieneData.avgScore.toFixed(1)}</Text>
                ) : (
                  <Text style={[styles.statValue, { color: "#10B981", fontSize: 13 }]}>Yeni</Text>
                )}
              </View>
              <Text style={styles.statLabel}>Hijyen</Text>
              <Text style={styles.hygieneCount}>
                {hygieneRated ? "Değerlendirildi" :
                 hygieneData.platformScore != null && hygieneData.platformScore > 0 ? "Doğrulandı" :
                 hygieneData.totalCount > 0 ? `${hygieneData.totalCount} değ.` : "Puan Ver"}
              </Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.statBox, pressed && styles.statBoxPressed]}
            onPress={() => scrollTo(productsY.current)}
          >
            <Text style={styles.statValue}>{products?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Ürün</Text>
            <Feather name="chevron-down" size={10} color={Colors.light.textMuted} style={{ marginTop: 2 }} />
          </Pressable>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{seller.totalOrders}</Text>
            <Text style={styles.statLabel}>Sipariş</Text>
          </View>
        </View>

        {/* Hygiene Profile card */}
        {hygieneData != null && (hygieneData.platformScore != null || (hygieneData.declarations != null && Object.entries(hygieneData.declarations).some(([k, v]) => k !== "note" && k !== "updatedAt" && v === true))) && (
          <View style={styles.hygieneCard}>
            <View style={styles.hygieneCardHeader}>
              <View style={styles.hygieneCardIconWrap}>
                <Feather name="shield" size={18} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hygieneCardTitle}>Hijyen Profili</Text>
                <Text style={styles.hygieneCardSub}>Platform tarafından doğrulandı</Text>
              </View>
              {hygieneData.platformScore != null && (
                <View style={styles.hygieneCardScorePill}>
                  <Text style={styles.hygieneCardScore}>{hygieneData.platformScore.toFixed(1)}</Text>
                  <Text style={styles.hygieneCardScoreMax}>/5</Text>
                </View>
              )}
            </View>

            {hygieneData.declarations != null && (
              <View style={styles.hygieneTagsWrap}>
                {hygieneData.declarations.wearsGloves && (
                  <View style={styles.hygieneTag}><Feather name="shield" size={11} color="#10B981" /><Text style={styles.hygieneTagText}>Eldiven</Text></View>
                )}
                {hygieneData.declarations.wearsBone && (
                  <View style={styles.hygieneTag}><Feather name="user" size={11} color="#10B981" /><Text style={styles.hygieneTagText}>Bone/Kep</Text></View>
                )}
                {hygieneData.declarations.hasHealthCert && (
                  <View style={styles.hygieneTag}><Feather name="award" size={11} color="#10B981" /><Text style={styles.hygieneTagText}>Sağlık Belgesi</Text></View>
                )}
                {hygieneData.declarations.washesHands && (
                  <View style={styles.hygieneTag}><Feather name="droplet" size={11} color="#10B981" /><Text style={styles.hygieneTagText}>El Yıkama</Text></View>
                )}
                {hygieneData.declarations.singleUsePackaging && (
                  <View style={styles.hygieneTag}><Feather name="box" size={11} color="#10B981" /><Text style={styles.hygieneTagText}>Tek Kull. Ambalaj</Text></View>
                )}
                {hygieneData.declarations.kitchenProtocol && (
                  <View style={styles.hygieneTag}><Feather name="trash-2" size={11} color="#10B981" /><Text style={styles.hygieneTagText}>Mutfak Protokolü</Text></View>
                )}
              </View>
            )}

            {hygieneData.declarations?.note ? (
              <Text style={styles.hygieneCardNote}>"{hygieneData.declarations.note}"</Text>
            ) : null}

            {hygieneData.avgScore != null && hygieneData.totalCount > 0 && (
              <View style={styles.hygieneCardBuyerRow}>
                <Feather name="users" size={11} color={Colors.light.textMuted} />
                <Text style={styles.hygieneCardBuyerText}>
                  Alıcı hijyen puanı: {hygieneData.avgScore.toFixed(1)}/5 ({hygieneData.totalCount} değerlendirme)
                </Text>
              </View>
            )}
          </View>
        )}

        {user?.id !== parseInt(id ?? "0") && (
          <Pressable style={styles.messageBtn} onPress={handleMessage}>
            <Feather name="message-circle" size={17} color={Colors.light.primary} />
            <Text style={styles.messageBtnText}>Mesaj Gönder</Text>
          </Pressable>
        )}
      </View>

      {/* Products */}
      <View style={styles.section} onLayout={e => { productsY.current = e.nativeEvent.layout.y; }}>
        <Text style={styles.sectionTitle}>
          Ürünler <Text style={styles.sectionCount}>({products?.length ?? 0})</Text>
        </Text>
        {productsLoading ? (
          <ActivityIndicator color={Colors.light.primary} style={{ marginVertical: 20 }} />
        ) : (products ?? []).length === 0 ? (
          <View style={styles.empty}>
            <Feather name="package" size={32} color={Colors.light.textMuted} />
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

      {/* Reviews */}
      <View style={styles.section} onLayout={e => { reviewsY.current = e.nativeEvent.layout.y; }}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Değerlendirmeler <Text style={styles.sectionCount}>({reviews.length})</Text>
          </Text>
        </View>

        {reviews.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="message-square" size={32} color={Colors.light.textMuted} />
            <Text style={styles.emptyText}>Henüz değerlendirme yok</Text>
            <Text style={styles.emptySubText}>Bu satıcıdan alışveriş yapanlar yorum bırakabilir</Text>
          </View>
        ) : (
          <>
            <RatingSummary reviews={reviews} />

            {displayedReviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}

            {hasMore && (
              <Pressable
                style={styles.showMoreBtn}
                onPress={() => setReviewsExpanded(!reviewsExpanded)}
              >
                <Feather
                  name={reviewsExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={Colors.light.primary}
                />
                <Text style={styles.showMoreText}>
                  {reviewsExpanded
                    ? "Daha az göster"
                    : `${reviews.length - PREVIEW_COUNT} yorum daha göster`}
                </Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </ScrollView>

    {/* Hygiene Rating Modal */}
    <Modal
      visible={showHygieneModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowHygieneModal(false)}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable style={hygieneModalStyles.backdrop} onPress={() => setShowHygieneModal(false)} />
        <View style={hygieneModalStyles.sheet}>
          <View style={hygieneModalStyles.handle} />
          <View style={hygieneModalStyles.header}>
            <View style={hygieneModalStyles.iconWrap}>
              <Feather name="shield" size={22} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={hygieneModalStyles.title}>Hijyen Değerlendirmesi</Text>
              <Text style={hygieneModalStyles.subtitle}>{seller?.name}</Text>
            </View>
            <Pressable onPress={() => setShowHygieneModal(false)} hitSlop={10}>
              <Feather name="x" size={20} color={Colors.light.textMuted} />
            </Pressable>
          </View>

          <Text style={hygieneModalStyles.label}>Hijyen Puanı</Text>
          <View style={hygieneModalStyles.starsRow}>
            {[1, 2, 3, 4, 5].map(s => (
              <Pressable key={s} onPress={() => setHygieneRating(s)} hitSlop={8}>
                <Ionicons
                  name={s <= hygieneRating ? "star" : "star-outline"}
                  size={36}
                  color={s <= hygieneRating ? "#10B981" : Colors.light.border}
                />
              </Pressable>
            ))}
          </View>
          <Text style={hygieneModalStyles.ratingLabel}>
            {hygieneRating === 5 ? "Mükemmel" :
             hygieneRating === 4 ? "İyi" :
             hygieneRating === 3 ? "Orta" :
             hygieneRating === 2 ? "Kötü" : "Çok Kötü"}
          </Text>

          <Text style={hygieneModalStyles.label}>Yorum (isteğe bağlı)</Text>
          <TextInput
            style={hygieneModalStyles.input}
            value={hygieneComment}
            onChangeText={setHygieneComment}
            placeholder="Hijyen hakkındaki görüşlerinizi paylaşın..."
            placeholderTextColor={Colors.light.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Pressable
            style={({ pressed }) => [hygieneModalStyles.submitBtn, pressed && { opacity: 0.85 }]}
            onPress={handleHygieneSubmit}
            disabled={hygieneSubmitting}
          >
            {hygieneSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="check-circle" size={18} color="#fff" />
                <Text style={hygieneModalStyles.submitText}>Değerlendirmeyi Gönder</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </View>
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
    ...Platform.select({
      ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
      web: { boxShadow: "0 1px 6px rgba(0,0,0,0.07)" },
    }),
  },

  profileSection: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 24 },
  storeImage: { width: "100%", height: 140, borderRadius: 16, marginBottom: -40 },
  avatarWrap: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 3, borderColor: Colors.light.background,
    marginBottom: 12, overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
  avatar: { width: "100%", height: "100%" },
  avatarFallback: {
    width: "100%", height: "100%", borderRadius: 42,
    backgroundColor: Colors.light.primary + "20", alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 36, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  sellerName: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text, marginBottom: 5 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  address: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statBox: {
    alignItems: "center", backgroundColor: Colors.light.surface,
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.light.borderLight,
  },
  statBoxPressed: {
    backgroundColor: Colors.light.primary + "10",
    borderColor: Colors.light.primary + "40",
  },
  statTop: { flexDirection: "row", alignItems: "center", gap: 4 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2 },
  hygieneBox: { borderColor: "#10B98130", backgroundColor: "#10B98108" },
  hygieneCount: { fontSize: 9, fontFamily: "Inter_400Regular", color: "#10B981", marginTop: 1 },

  hygieneCard: {
    backgroundColor: "#10B98108", borderRadius: 18, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: "#10B98130", width: "100%",
  },
  hygieneCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  hygieneCardIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "#10B98120",
    alignItems: "center", justifyContent: "center",
  },
  hygieneCardTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#10B981" },
  hygieneCardSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#10B981", opacity: 0.75 },
  hygieneCardScorePill: {
    flexDirection: "row", alignItems: "baseline", gap: 1,
    backgroundColor: "#10B981", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  hygieneCardScore: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  hygieneCardScoreMax: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#fff", opacity: 0.85 },
  hygieneTagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  hygieneTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#10B98115", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: "#10B98125",
  },
  hygieneTagText: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#10B981" },
  hygieneCardNote: {
    fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary,
    fontStyle: "italic", marginBottom: 8, lineHeight: 18,
  },
  hygieneCardBuyerRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  hygieneCardBuyerText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },

  messageBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14,
    backgroundColor: Colors.light.primary + "12", borderWidth: 1.5, borderColor: Colors.light.primary,
  },
  messageBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.primary },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text, marginBottom: 12 },
  sectionCount: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },

  empty: { alignItems: "center", paddingVertical: 28, gap: 8 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.light.textSecondary },
  emptySubText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textMuted, textAlign: "center" },

  showMoreBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 13, borderRadius: 14, marginTop: 4,
    backgroundColor: Colors.light.primary + "12", borderWidth: 1, borderColor: Colors.light.primary + "30",
  },
  showMoreText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },
});

const hygieneModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20 },
      android: { elevation: 16 },
    }),
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.light.border,
    alignSelf: "center", marginBottom: 20,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: "#10B98120",
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.light.text },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, marginTop: 2 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.textSecondary, marginBottom: 12 },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 8 },
  ratingLabel: {
    fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#10B981",
    textAlign: "center", marginBottom: 24,
  },
  input: {
    backgroundColor: Colors.light.surface, borderRadius: 14, padding: 14,
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text,
    borderWidth: 1, borderColor: Colors.light.borderLight,
    minHeight: 80, marginBottom: 24,
  },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#10B981", borderRadius: 16, paddingVertical: 15,
  },
  submitText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});
