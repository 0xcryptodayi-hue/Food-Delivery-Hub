import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Platform, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGetFavorites, useToggleFavorite, getGetFavoritesQueryKey } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ui/ProductCard";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: favorites, isLoading, refetch } = useGetFavorites({
    query: { enabled: !!user },
  });
  const toggleFav = useToggleFavorite();

  const handleUnfavorite = (productId: number) => {
    toggleFav.mutate(
      { data: { productId } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetFavoritesQueryKey() }) }
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.title}>Favorilerim</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>❤️</Text>
          <Text style={styles.emptyTitle}>Giriş yapmanız gerekiyor</Text>
          <Text style={styles.emptyText}>Favorilerinizi görmek için giriş yapın</Text>
          <Pressable style={styles.browseBtn} onPress={() => router.push("/auth")}>
            <Text style={styles.browseBtnText}>Giriş Yap</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Favorilerim</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {[1, 2].map(i => <View key={i} style={styles.skeleton} />)}
        </View>
      ) : (
        <FlatList
          data={favorites ?? []}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <ProductCard
              {...item}
              isFavorited={true}
              onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } })}
              onFavoritePress={() => handleUnfavorite(item.id)}
              onAddToCart={() => addItem({
                productId: item.id, title: item.title, price: item.price,
                imageUrl: item.imageUrl, sellerId: item.sellerId, sellerName: item.sellerName,
              })}
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
              <Text style={styles.emptyEmoji}>❤️</Text>
              <Text style={styles.emptyTitle}>Henüz favoriniz yok</Text>
              <Text style={styles.emptyText}>Beğendiğiniz ürünleri favori olarak kaydedin</Text>
              <Pressable style={styles.browseBtn} onPress={() => router.back()}>
                <Text style={styles.browseBtnText}>Keşfet</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.surface, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  skeleton: { height: 240, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 16, marginBottom: 12 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center" },
  browseBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  browseBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
});
