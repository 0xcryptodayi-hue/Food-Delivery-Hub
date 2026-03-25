import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform,
  TextInput, ActivityIndicator, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGetSellers, getBaseUrl } from "@workspace/api-client-react";

const API_BASE = getBaseUrl();

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

type Product = {
  id: number;
  title: string;
  price: number;
  imageUrl?: string | null;
  sellerName: string;
  sellerId: number;
  category?: string | null;
  rating?: number | null;
  reviewCount?: number;
  isSponsored?: boolean;
};

function SellerCard({ seller, onPress }: { seller: Seller; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.sellerCard, pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] }]}
      onPress={onPress}
    >
      <View style={styles.sellerAvatar}>
        <Text style={styles.sellerAvatarText}>{seller.name[0]?.toUpperCase()}</Text>
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

function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.productCard, pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] }]}
      onPress={onPress}
    >
      {product.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} style={styles.productImage} resizeMode="cover" />
      ) : (
        <View style={[styles.productImage, styles.productImagePlaceholder]}>
          <Text style={{ fontSize: 28 }}>🍲</Text>
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={1}>{product.title}</Text>
        <Text style={styles.productSeller} numberOfLines={1}>{product.sellerName}</Text>
        <View style={styles.productBottom}>
          <Text style={styles.productPrice}>₺{product.price.toFixed(0)}</Text>
          {product.rating != null && (
            <View style={styles.ratingChip}>
              <Ionicons name="star" size={11} color={Colors.light.star} />
              <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchProducts, setSearchProducts] = useState<Product[]>([]);
  const [searchSellers, setSearchSellers] = useState<Seller[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: allSellers, isLoading: sellersLoading } = useGetSellers({});

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const runSearch = useCallback(async (q: string) => {
    if (!q) { setSearchProducts([]); setSearchSellers([]); return; }
    setIsSearching(true);
    try {
      const [prodRes, sellRes] = await Promise.all([
        fetch(`${API_BASE}/api/products?search=${encodeURIComponent(q)}&limit=10`),
        fetch(`${API_BASE}/api/sellers?search=${encodeURIComponent(q)}`),
      ]);
      const [products, sellers] = await Promise.all([
        prodRes.ok ? prodRes.json() : [],
        sellRes.ok ? sellRes.json() : [],
      ]);
      setSearchProducts(Array.isArray(products) ? products : []);
      setSearchSellers(Array.isArray(sellers) ? sellers : []);
    } catch {
      setSearchProducts([]);
      setSearchSellers([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    runSearch(debouncedQuery);
  }, [debouncedQuery, runSearch]);

  const isActive = debouncedQuery.length > 0 || query.length > 0;
  const noResults = isActive && !isSearching && searchProducts.length === 0 && searchSellers.length === 0;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Keşfet</Text>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={Colors.light.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Yemek veya satıcı ara..."
            placeholderTextColor={Colors.light.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(""); setDebouncedQuery(""); }} hitSlop={8}>
              <Feather name="x" size={16} color={Colors.light.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {!isActive ? (
        <>
          {sellersLoading ? (
            <View style={{ paddingHorizontal: 20, gap: 12 }}>
              {[1, 2, 3].map(i => <View key={i} style={styles.skeletonCard} />)}
            </View>
          ) : (
            <FlatList
              data={(allSellers ?? []) as Seller[]}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <SellerCard
                  seller={item}
                  onPress={() => router.push({ pathname: "/seller/[id]", params: { id: item.id } })}
                />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                allSellers && allSellers.length > 0 ? (
                  <Text style={styles.countText}>{allSellers.length} satıcı mevcut</Text>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>🏪</Text>
                  <Text style={styles.emptyTitle}>Satıcı bulunamadı</Text>
                  <Text style={styles.emptyText}>Yakında daha fazla satıcı gelecek!</Text>
                </View>
              }
            />
          )}
        </>
      ) : isSearching ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.searchingText}>Aranıyor...</Text>
        </View>
      ) : noResults ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Sonuç bulunamadı</Text>
          <Text style={styles.emptyText}>"{debouncedQuery}" için eşleşen yemek veya satıcı yok</Text>
        </View>
      ) : (
        <FlatList
          data={[
            ...(searchProducts.length > 0 ? [{ type: "header", key: "prod-header", label: `🍲  Yemekler (${searchProducts.length})` }] : []),
            ...searchProducts.map(p => ({ type: "product", key: `prod-${p.id}`, data: p })),
            ...(searchSellers.length > 0 ? [{ type: "header", key: "sel-header", label: `🏪  Satıcılar (${searchSellers.length})` }] : []),
            ...searchSellers.map(s => ({ type: "seller", key: `sel-${s.id}`, data: s })),
          ] as Array<{ type: string; key: string; label?: string; data?: Product | Seller }>}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            if (item.type === "header") {
              return <Text style={styles.sectionHeader}>{item.label}</Text>;
            }
            if (item.type === "product") {
              const p = item.data as Product;
              return (
                <ProductCard
                  product={p}
                  onPress={() => router.push({ pathname: "/product/[id]", params: { id: p.id } })}
                />
              );
            }
            if (item.type === "seller") {
              const s = item.data as Seller;
              return (
                <SellerCard
                  seller={s}
                  onPress={() => router.push({ pathname: "/seller/[id]", params: { id: s.id } })}
                />
              );
            }
            return null;
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.light.text, marginBottom: 12 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.light.surface, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: Colors.light.borderLight,
  },
  searchInput: {
    flex: 1, fontSize: 15, fontFamily: "Inter_400Regular",
    color: Colors.light.text, padding: 0,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  countText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginBottom: 12 },
  sectionHeader: {
    fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.light.text,
    marginBottom: 10, marginTop: 8,
  },
  sellerCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.light.surface, borderRadius: 16,
    padding: 14, marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: "0 2px 8px rgba(60,30,10,0.07)" },
    }),
  },
  sellerAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.light.primary + "20", alignItems: "center", justifyContent: "center",
  },
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
  productCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.light.surface, borderRadius: 16,
    padding: 10, marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: "0 2px 8px rgba(60,30,10,0.07)" },
    }),
  },
  productImage: { width: 70, height: 70, borderRadius: 12 },
  productImagePlaceholder: { backgroundColor: Colors.light.backgroundSecondary, alignItems: "center", justifyContent: "center" },
  productInfo: { flex: 1 },
  productTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 3 },
  productSeller: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginBottom: 6 },
  productBottom: { flexDirection: "row", alignItems: "center", gap: 10 },
  productPrice: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  skeletonCard: { height: 90, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 16, marginBottom: 10 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  searchingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center", paddingHorizontal: 20 },
});
