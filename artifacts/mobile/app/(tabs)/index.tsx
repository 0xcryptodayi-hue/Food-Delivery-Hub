import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  ScrollView, RefreshControl, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGetProducts, useGetCategories, useToggleFavorite } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ui/ProductCard";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

const CATEGORIES = [
  { slug: "all", name: "Tümü", icon: "🏠" },
  { slug: "main-dish", name: "Ana Yemek", icon: "🍛" },
  { slug: "soup", name: "Çorba", icon: "🥣" },
  { slug: "dessert", name: "Tatlı", icon: "🍮" },
  { slug: "breakfast", name: "Kahvaltı", icon: "🥞" },
  { slug: "salad", name: "Salata", icon: "🥗" },
  { slug: "pastry", name: "Börek", icon: "🥐" },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addItem, itemCount } = useCart();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useGetProducts({
    search: search || undefined,
    category: selectedCategory === "all" ? undefined : selectedCategory,
    limit: 20,
  });

  const toggleFavoriteMutation = useToggleFavorite();

  const products = data?.products ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleAddToCart = (product: typeof products[0]) => {
    addItem({
      productId: product.id,
      title: product.title,
      price: product.price,
      imageUrl: product.imageUrl,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
    });
  };

  const handleFavorite = (productId: number) => {
    if (!user) { router.push("/auth"); return; }
    toggleFavoriteMutation.mutate({ data: { productId } });
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Merhaba{user ? `, ${user.name.split(" ")[0]}` : ""}! 👋</Text>
          <Text style={styles.subtitle}>Ne yemek istersiniz?</Text>
        </View>
        <Pressable
          style={styles.cartBtn}
          onPress={() => user ? router.push("/checkout") : router.push("/auth")}
        >
          <Feather name="shopping-cart" size={22} color={Colors.light.text} />
          {itemCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{itemCount > 9 ? "9+" : itemCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color={Colors.light.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Yemek veya satıcı ara..."
          placeholderTextColor={Colors.light.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={18} color={Colors.light.textMuted} />
          </Pressable>
        )}
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
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map(i => (
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
              onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } })}
              onFavoritePress={() => handleFavorite(item.id)}
              onAddToCart={() => handleAddToCart(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
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
              <Text style={styles.resultCount}>{products.length} yemek bulundu</Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  greeting: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.light.text },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, marginTop: 2 },
  cartBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.light.surface, alignItems: "center", justifyContent: "center",
    ...Platform.select({ ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6 }, android: { elevation: 2 } }),
  },
  cartBadge: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: Colors.light.primary, borderRadius: 10,
    minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  cartBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  searchContainer: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 16,
    backgroundColor: Colors.light.surface, borderRadius: 16, paddingHorizontal: 14, height: 48,
    borderWidth: 1, borderColor: Colors.light.borderLight,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.light.text },
  categoryScroll: { maxHeight: 56, marginBottom: 8 },
  categoryContent: { paddingHorizontal: 20, gap: 8 },
  categoryChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24,
    backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.border,
  },
  categoryChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  categoryIcon: { fontSize: 16 },
  categoryText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.light.textSecondary },
  categoryTextActive: { color: "#fff" },
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
  resultCount: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginBottom: 12 },
  loadingContainer: { paddingHorizontal: 20, gap: 12, flex: 1 },
  skeletonCard: { height: 260, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 16 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center" },
});
