import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  Platform, ActivityIndicator, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getBaseUrl } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ui/ProductCard";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

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

type Seller = {
  id: number;
  name: string;
  avatar?: string | null;
  rating?: number | null;
  reviewCount: number;
  address?: string | null;
  productCount: number;
};

type Tab = "all" | "products" | "sellers";

export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { user } = useAuth();
  const { addItem } = useCart();

  const [query, setQuery] = useState(q ?? "");
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setProducts([]);
      setSellers([]);
      return;
    }
    setLoading(true);
    try {
      const [prodRes, sellRes] = await Promise.all([
        fetch(`${getBaseUrl()}/api/products?search=${encodeURIComponent(term)}&limit=30`),
        fetch(`${getBaseUrl()}/api/sellers?search=${encodeURIComponent(term)}`),
      ]);
      const prodData = prodRes.ok ? await prodRes.json() : { products: [] };
      const sellData = sellRes.ok ? await sellRes.json() : [];
      setProducts(prodData.products ?? []);
      setSellers(sellData ?? []);
    } catch {
      setProducts([]);
      setSellers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  useEffect(() => {
    if (q) doSearch(q);
  }, []);

  const displayedProducts = activeTab === "sellers" ? [] : products;
  const displayedSellers = activeTab === "products" ? [] : sellers;
  const totalResults = products.length + sellers.length;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "Tümü", count: totalResults },
    { key: "products", label: "Yemekler", count: products.length },
    { key: "sellers", label: "Satıcılar", count: sellers.length },
  ];

  const ListHeader = () => (
    <>
      {/* Tab bar */}
      <View style={styles.tabRow}>
        {tabs.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {query.trim().length > 0 && (
              <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* Sellers section when tab is "all" or "sellers" */}
      {displayedSellers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Satıcılar</Text>
          {displayedSellers.map(seller => (
            <Pressable
              key={seller.id}
              style={({ pressed }) => [styles.sellerCard, pressed && { opacity: 0.9 }]}
              onPress={() => router.push({ pathname: "/seller/[id]", params: { id: seller.id } })}
            >
              <View style={styles.sellerAvatar}>
                {seller.avatar ? (
                  <Image source={{ uri: seller.avatar }} style={styles.sellerAvatarImage} />
                ) : (
                  <Text style={styles.sellerAvatarText}>{seller.name[0]?.toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{seller.name}</Text>
                {seller.address && (
                  <View style={styles.sellerAddressRow}>
                    <Feather name="map-pin" size={11} color={Colors.light.textMuted} />
                    <Text style={styles.sellerAddress} numberOfLines={1}>{seller.address}</Text>
                  </View>
                )}
                <View style={styles.sellerMeta}>
                  {seller.rating != null && (
                    <View style={styles.ratingChip}>
                      <Ionicons name="star" size={11} color={Colors.light.star} />
                      <Text style={styles.ratingText}>{seller.rating.toFixed(1)}</Text>
                      <Text style={styles.reviewCount}>({seller.reviewCount})</Text>
                    </View>
                  )}
                  <View style={styles.productChip}>
                    <Feather name="package" size={11} color={Colors.light.primary} />
                    <Text style={styles.productCount}>{seller.productCount} ürün</Text>
                  </View>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      {/* Products section header */}
      {displayedProducts.length > 0 && (
        <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginBottom: 4 }]}>Yemekler</Text>
      )}
    </>
  );

  const EmptyComponent = () => {
    if (loading) return null;
    if (!query.trim()) {
      return (
        <View style={styles.empty}>
          <Feather name="search" size={48} color={Colors.light.textMuted} />
          <Text style={styles.emptyTitle}>Arama yapın</Text>
          <Text style={styles.emptyText}>Yemek adı veya satıcı ismi yazın</Text>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>Sonuç bulunamadı</Text>
        <Text style={styles.emptyText}>"{query}" için sonuç yok, farklı bir kelime deneyin</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* Search header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <View style={styles.searchBar}>
          <Feather name="search" size={15} color={Colors.light.textMuted} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Yemek veya satıcı ara..."
            placeholderTextColor={Colors.light.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => doSearch(query)}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={10}>
              <Feather name="x-circle" size={15} color={Colors.light.textMuted} />
            </Pressable>
          )}
        </View>
        {loading && <ActivityIndicator size="small" color={Colors.light.primary} style={{ marginLeft: 4 }} />}
      </View>

      <FlatList
        data={displayedProducts}
        keyExtractor={item => `product-${item.id}`}
        renderItem={({ item }) => (
          <ProductCard
            {...item}
            isFavorited={false}
            onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } })}
            onAddToCart={() => addItem({
              productId: item.id,
              title: item.title,
              price: item.price,
              imageUrl: item.imageUrl,
              sellerId: item.sellerId,
              sellerName: item.sellerName,
            })}
          />
        )}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={displayedSellers.length === 0 ? <EmptyComponent /> : null}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingBottom: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.light.surface, alignItems: "center", justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  searchBar: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.light.surface, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.light.borderLight,
  },
  searchInput: {
    flex: 1, fontSize: 15, fontFamily: "Inter_400Regular",
    color: Colors.light.text, padding: 0,
  },
  tabRow: {
    flexDirection: "row", gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.light.borderLight,
    backgroundColor: Colors.light.surface,
  },
  tabActive: {
    backgroundColor: Colors.light.primary, borderColor: Colors.light.primary,
  },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  tabTextActive: { color: "#fff" },
  tabBadge: {
    backgroundColor: Colors.light.backgroundSecondary, borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1,
    minWidth: 18, alignItems: "center",
  },
  tabBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  tabBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.light.textSecondary },
  tabBadgeTextActive: { color: "#fff" },

  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 10 },

  sellerCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.light.surface, borderRadius: 14,
    padding: 12, marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  sellerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.light.primary + "20",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  sellerAvatarImage: { width: 48, height: 48, borderRadius: 24 },
  sellerAvatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  sellerInfo: { flex: 1 },
  sellerName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 3 },
  sellerAddressRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  sellerAddress: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, flex: 1 },
  sellerMeta: { flexDirection: "row", gap: 10 },
  ratingChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  reviewCount: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  productChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  productCount: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.primary },

  listContent: { paddingBottom: 100 },
  empty: { alignItems: "center", paddingTop: 80, gap: 10, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center" },
});
