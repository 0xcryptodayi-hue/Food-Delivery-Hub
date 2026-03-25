import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  ScrollView, RefreshControl, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGetProducts, useGetFavorites, useToggleFavorite } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ui/ProductCard";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES = [
  { slug: "all", name: "Tümü", icon: "🏠" },
  { slug: "main-dish", name: "Ana Yemek", icon: "🍛" },
  { slug: "soup", name: "Çorba", icon: "🥣" },
  { slug: "dessert", name: "Tatlı", icon: "🍮" },
  { slug: "breakfast", name: "Kahvaltı", icon: "🥞" },
  { slug: "salad", name: "Salata", icon: "🥗" },
  { slug: "pastry", name: "Börek", icon: "🥐" },
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addItem, itemCount } = useCart();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useGetProducts({
    search: search || undefined,
    category: selectedCategory === "all" ? undefined : selectedCategory,
    limit: 30,
  });

  const { data: favorites } = useGetFavorites({ query: { enabled: !!user } });
  const toggleFav = useToggleFavorite();

  const favoriteIds = new Set((favorites ?? []).map((f: { id: number }) => f.id));

  const products = (data?.products ?? []) as Product[];

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
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }) }
    );
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            {user ? `Merhaba, ${user.name.split(" ")[0]}! 👋` : "Merhaba! 👋"}
          </Text>
          <Text style={styles.subtitle}>Bugün ne yemek istersiniz?</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => user ? router.push("/notifications") : router.push("/auth")}
          >
            <Feather name="bell" size={20} color={Colors.light.text} />
          </Pressable>
          <Pressable
            style={styles.cartBtn}
            onPress={() => user ? router.push("/checkout") : router.push("/auth")}
          >
            <Feather name="shopping-cart" size={20} color={itemCount > 0 ? Colors.light.primary : Colors.light.text} />
            {itemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount > 9 ? "9+" : itemCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat.slug}
            style={[styles.categoryChip, selectedCategory === cat.slug && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat.slug)}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text style={[styles.categoryText, selectedCategory === cat.slug && styles.categoryTextActive]}>
              {cat.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading && products.length === 0 ? (
        <View style={styles.skeletonContainer}>
          {[1, 2].map(i => (
            <View key={i} style={styles.skeletonCard} />
          ))}
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
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>Yemek bulunamadı</Text>
              <Text style={styles.emptyText}>Farklı bir kategori veya arama deneyin</Text>
            </View>
          }
          ListHeaderComponent={
            products.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.resultCount}>
                  {selectedCategory === "all" ? "Tüm Yemekler" : CATEGORIES.find(c => c.slug === selectedCategory)?.name}
                </Text>
                <Text style={styles.resultCountSub}>{products.length} seçenek</Text>
              </View>
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
  searchRow: { paddingHorizontal: 20, marginBottom: 14 },
  searchContainer: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.light.surface, borderRadius: 16,
    paddingHorizontal: 16, height: 48,
    borderWidth: 1, borderColor: Colors.light.borderLight,
  },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.light.text },
  categoryScroll: { maxHeight: 52, marginBottom: 12 },
  categoryContent: { paddingHorizontal: 20, gap: 8, alignItems: "center" },
  categoryChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24,
    backgroundColor: Colors.light.surface,
    borderWidth: 1, borderColor: Colors.light.borderLight,
  },
  categoryChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  categoryIcon: { fontSize: 16 },
  categoryText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.light.textSecondary },
  categoryTextActive: { color: "#fff" },
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
});
