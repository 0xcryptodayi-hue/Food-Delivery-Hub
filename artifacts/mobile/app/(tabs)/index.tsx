import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  RefreshControl, Platform, Modal, Animated, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGetProducts, useGetFavorites, useToggleFavorite, getGetFavoritesQueryKey } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ui/ProductCard";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES = [
  { slug: "all",         name: "Tümü" },
  { slug: "borek",       name: "Börek", subcategories: ["Sigara böreği", "Paçanga böreği", "Su böreği", "Ispanaklı börek", "Kıymalı börek"] },
  { slug: "pogaca",      name: "Poğaça" },
  { slug: "baklava",     name: "Baklava" },
  { slug: "kurabiye",    name: "Kurabiye" },
  { slug: "sarma",       name: "Sarma / Dolma" },
  { slug: "icli-kofte",  name: "İçli Köfte" },
  { slug: "manti",       name: "Mantı" },
  { slug: "soup",        name: "Çorba" },
  { slug: "main-dish",   name: "Ana Yemek" },
  { slug: "breakfast",   name: "Kahvaltılık" },
  { slug: "dessert",     name: "Diğer Tatlılar" },
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
    <View style={[styles.container, { paddingTop: topInset }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            {user ? `Merhaba, ${user.name.split(" ")[0]}! 👋` : "Merhaba! 👋"}
          </Text>
          <Text style={styles.subtitle}>Bugün ne yemek istersiniz?</Text>
        </View>
        <View style={styles.headerActions}>
          {/* Kategori simgesi */}
          <Pressable
            style={[styles.iconBtn, selectedCategory !== "all" && styles.iconBtnActive]}
            onPress={() => setShowCategories(true)}
          >
            <Feather
              name="grid"
              size={20}
              color={selectedCategory !== "all" ? Colors.light.primary : Colors.light.text}
            />
            {selectedCategory !== "all" && <View style={styles.activeDot} />}
          </Pressable>

          {/* Bildirim */}
          <Pressable
            style={styles.iconBtn}
            onPress={() => user ? router.push("/notifications") : router.push("/auth")}
          >
            <Feather name="bell" size={20} color={Colors.light.text} />
          </Pressable>

          {/* Sepet */}
          <Pressable style={styles.cartBtn} onPress={() => router.push("/cart")}>
            <Feather
              name="shopping-cart"
              size={20}
              color={itemCount > 0 ? Colors.light.primary : Colors.light.text}
            />
            {itemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount > 9 ? "9+" : itemCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
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
              <Feather name="x-circle" size={16} color={Colors.light.textMuted} />
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
            products.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.resultCount}>
                  {selectedCategory === "all" ? "Tüm Yemekler" : activeCat?.name}
                </Text>
                <Text style={styles.resultCountSub}>{products.length} seçenek</Text>
              </View>
            ) : null
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

  /* Header */
  header: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14,
  },
  headerLeft: { flex: 1 },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  greeting: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, marginTop: 2 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.light.surface,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.light.borderLight,
  },
  iconBtnActive: {
    borderColor: Colors.light.primary,
    backgroundColor: "#FFF0F0",
  },
  activeDot: {
    position: "absolute", top: 8, right: 8,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: Colors.light.primary,
  },
  cartBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.light.surface,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.light.borderLight,
    ...Platform.select({
      ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  cartBadge: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: Colors.light.primary, borderRadius: 10,
    minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  cartBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },

  /* Search */
  searchRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 10, alignItems: "center" },
  searchContainer: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.light.surface, borderRadius: 16,
    paddingHorizontal: 16, height: 48,
    borderWidth: 1, borderColor: Colors.light.borderLight,
  },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.light.text },

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
