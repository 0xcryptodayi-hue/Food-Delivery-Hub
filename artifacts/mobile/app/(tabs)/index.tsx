import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  RefreshControl, Platform, Modal, Animated, ScrollView, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGetProducts, useGetFavorites, useToggleFavorite, getGetFavoritesQueryKey } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ui/ProductCard";
import { AppHeader } from "@/components/ui/AppHeader";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES = [
  { slug: "borek",      name: "Börek",        subcategories: ["Sigara böreği", "Paçanga böreği", "Su böreği", "Ispanaklı börek", "Kıymalı börek", "Patatesli börek"] },
  { slug: "pogaca",     name: "Poğaça",       subcategories: ["Peynirli poğaça", "Zeytinli poğaça", "Patatesli poğaça", "Sucuklu poğaça", "Sade poğaça"] },
  { slug: "baklava",    name: "Baklava",      subcategories: ["Fıstıklı baklava", "Cevizli baklava", "Sütlü baklava", "Fındıklı baklava", "Burma baklava"] },
  { slug: "kurabiye",   name: "Kurabiye",     subcategories: ["Tereyağlı kurabiye", "Cevizli kurabiye", "Limonlu kurabiye", "Çikolatalı kurabiye", "Nohut unu kurabiyesi"] },
  { slug: "sarma",      name: "Sarma / Dolma", subcategories: ["Zeytinyağlı yaprak sarma", "Etli yaprak sarma", "Biber dolması", "Patlıcan dolması", "Kabak dolması"] },
  { slug: "icli-kofte", name: "İçli Köfte",   subcategories: ["Kızartma içli köfte", "Haşlama içli köfte", "Fırın içli köfte"] },
  { slug: "manti",      name: "Mantı",        subcategories: ["Kayseri mantısı", "Sulu mantı", "Kızartma mantı", "Fırın mantı"] },
  { slug: "dessert",    name: "Tatlılar",     subcategories: ["Sütlaç", "Kazandibi", "Lokma", "Revani", "Kadayıf", "Şekerpare"] },
];

type Product = {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string | null;
  sellerName: string;
  sellerRating?: number | null;
  rating?: number | null;
  reviewCount: number;
  prepTime: number;
  remainingStock: number;
  isSponsored: boolean;
  sellerId: number;
};

function VitrinCard({ product, onPress }: { product: Product; onPress: () => void }) {
  return (
    <TouchableOpacity style={vitrinStyles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={vitrinStyles.badge}>
        <Feather name="zap" size={9} color="#fff" />
        <Text style={vitrinStyles.badgeText}>Öne Çıkan</Text>
      </View>
      <View style={vitrinStyles.imageBox}>
        <Text style={vitrinStyles.imageEmoji}>🍽️</Text>
      </View>
      <View style={vitrinStyles.info}>
        <Text style={vitrinStyles.title} numberOfLines={2}>{product.title}</Text>
        <Text style={vitrinStyles.seller} numberOfLines={1}>🏪 {product.sellerName}</Text>
        <View style={vitrinStyles.priceRow}>
          <Text style={vitrinStyles.price}>₺{product.price}</Text>
          {product.rating != null && (
            <View style={vitrinStyles.ratingPill}>
              <Text style={vitrinStyles.ratingText}>★ {product.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function VitrinSection({
  products,
  onProductPress,
  isSeller,
}: {
  products: Product[];
  onProductPress: (id: number) => void;
  isSeller: boolean;
}) {
  if (products.length === 0) return null;
  return (
    <View style={vitrinStyles.section}>
      <View style={vitrinStyles.sectionHeader}>
        <View style={vitrinStyles.sectionTitleRow}>
          <View style={vitrinStyles.sectionIcon}>
            <Feather name="zap" size={14} color="#fff" />
          </View>
          <Text style={vitrinStyles.sectionTitle}>Öne Çıkanlar</Text>
          <View style={vitrinStyles.sponsorBadge}>
            <Text style={vitrinStyles.sponsorBadgeText}>Sponsorlu</Text>
          </View>
        </View>
        {isSeller && (
          <Text style={vitrinStyles.sectionSub}>Öne çıkmak için reklam verin →</Text>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={vitrinStyles.scroll}
      >
        {products.map(p => (
          <VitrinCard key={p.id} product={p} onPress={() => onProductPress(p.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

const vitrinStyles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#E8651A",
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#1A1008",
    letterSpacing: 0.3,
  },
  sponsorBadge: {
    backgroundColor: "#E8651A20",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sponsorBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#C4521A",
  },
  sectionSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#A09080",
  },
  scroll: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  card: {
    width: 150,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#F5D78E",
    ...Platform.select({
      ios: { shadowColor: "rgba(180,100,0,0.15)", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 3 },
      web: { boxShadow: "0 3px 10px rgba(180,100,0,0.12)" },
    }),
  },
  badge: {
    position: "absolute",
    top: 8, left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#E8651A",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    zIndex: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  imageBox: {
    height: 100,
    backgroundColor: "#FFF5E8",
    alignItems: "center",
    justifyContent: "center",
  },
  imageEmoji: {
    fontSize: 44,
  },
  info: {
    padding: 10,
  },
  title: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#1A1008",
    marginBottom: 4,
    lineHeight: 18,
  },
  seller: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#A09080",
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  price: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#E8651A",
  },
  ratingPill: {
    backgroundColor: "#FFF5E8",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#C4521A",
  },
});

function CategoryModal({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string;
  onSelect: (slug: string) => void;
  onClose: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 500, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
      setExpanded(null);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16 },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.sheetHandle} />

        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Kategoriler</Text>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <Feather name="x" size={18} color={Colors.light.textSecondary} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {CATEGORIES.map((cat, index) => {
            const isActive = selected === cat.slug;
            const hasSubcats = !!(cat as any).subcategories;
            const isExpanded = expanded === cat.slug;

            return (
              <View key={cat.slug}>
                <Pressable
                  style={({ pressed }) => [
                    styles.catRow,
                    isActive && styles.catRowActive,
                    pressed && { backgroundColor: Colors.light.backgroundSecondary },
                    index === CATEGORIES.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => {
                    if (hasSubcats) {
                      setExpanded(isExpanded ? null : cat.slug);
                    } else {
                      onSelect(cat.slug);
                      onClose();
                    }
                  }}
                >
                  <Text style={[styles.catRowText, isActive && styles.catRowTextActive]}>
                    {cat.name}
                  </Text>
                  <View style={styles.catRowRight}>
                    {isActive && <Feather name="check" size={16} color={Colors.light.primary} style={{ marginRight: 6 }} />}
                    {hasSubcats && (
                      <Feather
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={Colors.light.textMuted}
                      />
                    )}
                  </View>
                </Pressable>

                {hasSubcats && isExpanded && (
                  <View style={styles.subcatList}>
                    {(cat as any).subcategories.map((sub: string) => (
                      <Pressable
                        key={sub}
                        style={({ pressed }) => [styles.subcatRow, pressed && { backgroundColor: Colors.light.backgroundSecondary }]}
                        onPress={() => { onSelect(cat.slug); onClose(); }}
                      >
                        <Text style={styles.subcatText}>{sub}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addItem, itemCount } = useCart();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const { data, isLoading, refetch } = useGetProducts({
    search: search || undefined,
    category: selectedCategory === "all" ? undefined : selectedCategory,
    limit: 30,
  });

  const { data: favorites } = useGetFavorites({ query: { enabled: !!user } });
  const toggleFav = useToggleFavorite();

  const favoriteIds = new Set((favorites ?? []).map((f: { id: number }) => f.id));
  const products = (data?.products ?? []) as Product[];
  const sponsoredProducts = products.filter(p => p.isSponsored);

  const activeCat = CATEGORIES.find(c => c.slug === selectedCategory) ?? CATEGORIES[0];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleAddToCart = (product: Product) => {
    addItem({
      productId: product.id,
      title: product.title,
      price: product.price,
      imageUrl: product.imageUrl,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
    });
  };

  const handleFavorite = (product: Product) => {
    if (!user) { router.push("/auth"); return; }
    toggleFav.mutate(
      { data: { productId: product.id } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetFavoritesQueryKey() }) }
    );
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <AppHeader
        onCategoryPress={() => setShowCategories(true)}
        categoryActive={selectedCategory !== "all"}
      />

      {/* ── Arama Barı (header altında) ── */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={Colors.light.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Yemek veya satıcı ara..."
            placeholderTextColor={Colors.light.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={10}>
              <Feather name="x-circle" size={15} color={Colors.light.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Active filter pill ── */}
      {selectedCategory !== "all" && (
        <View style={styles.filterRow}>
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>{activeCat!.name}</Text>
            <Pressable onPress={() => setSelectedCategory("all")} hitSlop={6} style={styles.pillClose}>
              <Feather name="x" size={13} color="#fff" />
            </Pressable>
          </View>
          <Text style={styles.filterCount}>
            {isLoading ? "..." : `${products.length} sonuç`}
          </Text>
        </View>
      )}

      {/* ── Product list ── */}
      {isLoading && products.length === 0 ? (
        <View style={styles.skeletonContainer}>
          {[1, 2].map(i => <View key={i} style={styles.skeletonCard} />)}
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <ProductCard
              {...item}
              isFavorited={favoriteIds.has(item.id)}
              onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } })}
              onAddToCart={() => handleAddToCart(item)}
              onFavoritePress={() => handleFavorite(item)}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset + 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.light.primary}
              colors={[Colors.light.primary]}
            />
          }
          ListHeaderComponent={
            <>
              {/* Vitrin — yalnızca "tümü" görünümünde ve arama yoksa */}
              {selectedCategory === "all" && !search && (
                <VitrinSection
                  products={sponsoredProducts}
                  onProductPress={id => router.push({ pathname: "/product/[id]", params: { id } })}
                  isSeller={!!user?.isSeller}
                />
              )}

              {/* Bölüm başlığı */}
              {products.length > 0 && (
                <View style={styles.listHeader}>
                  <Text style={styles.resultCount}>
                    {selectedCategory === "all" ? "Tüm Yemekler" : activeCat?.name}
                  </Text>
                  <Text style={styles.resultCountSub}>{products.length} seçenek</Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>Yemek bulunamadı</Text>
              <Text style={styles.emptyText}>Farklı bir kategori veya arama deneyin</Text>
              {selectedCategory !== "all" && (
                <Pressable style={styles.clearFilterBtn} onPress={() => setSelectedCategory("all")}>
                  <Text style={styles.clearFilterBtnText}>Filtreyi Temizle</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      {/* ── Category bottom sheet ── */}
      <CategoryModal
        visible={showCategories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        onClose={() => setShowCategories(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },


  /* Search bar (below header) */
  searchBarWrap: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 16, height: 44,
    paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: "rgba(196,82,26,0.18)",
    ...Platform.select({
      ios: { shadowColor: "rgba(180,80,10,0.12)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: "0 2px 8px rgba(180,80,10,0.08)" },
    }),
  },
  searchInput: {
    flex: 1, fontFamily: "Inter_400Regular",
    fontSize: 14, color: Colors.light.text,
  },

  headerActions: { flexDirection: "row", gap: 2, alignItems: "center" },
  headerIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.65)",
    alignItems: "center", justifyContent: "center",
  },
  headerIconBtnActive: {
    backgroundColor: "rgba(232,101,26,0.15)",
  },
  activeDot: {
    position: "absolute", top: 8, right: 8,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: Colors.light.primary,
  },
  cartBadge: {
    position: "absolute", top: 4, right: 4,
    backgroundColor: Colors.light.primary, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  cartBadgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },


  /* Active filter pill */
  filterRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, marginBottom: 10,
  },
  activePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 20, paddingVertical: 6, paddingLeft: 12, paddingRight: 8,
    backgroundColor: Colors.light.primary,
  },
  activePillText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  pillClose: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center", marginLeft: 2,
  },
  filterCount: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },

  /* List */
  listContent: { paddingHorizontal: 20, paddingTop: 4 },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  resultCount: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.light.text },
  resultCountSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  skeletonContainer: { paddingHorizontal: 20, gap: 16 },
  skeletonCard: { height: 280, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 20 },
  empty: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyIcon: { fontSize: 72 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center" },
  clearFilterBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.light.primary, borderRadius: 14 },
  clearFilterBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },

  /* Bottom sheet */
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 10,
  },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, zIndex: 11,
    maxHeight: "80%",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 20 },
    }),
  },
  sheetHandle: {
    alignSelf: "center", width: 40, height: 4,
    borderRadius: 2, backgroundColor: Colors.light.border, marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, marginBottom: 8,
  },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: "center", justifyContent: "center",
  },

  /* Category rows */
  catRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight,
  },
  catRowActive: {
    backgroundColor: "#FFF5F5",
  },
  catRowText: {
    fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.text,
  },
  catRowTextActive: {
    color: Colors.light.primary, fontFamily: "Inter_600SemiBold",
  },
  catRowRight: { flexDirection: "row", alignItems: "center" },

  /* Subcategory rows */
  subcatList: {
    backgroundColor: Colors.light.backgroundSecondary,
  },
  subcatRow: {
    paddingHorizontal: 36, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight,
  },
  subcatText: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary,
  },
});
