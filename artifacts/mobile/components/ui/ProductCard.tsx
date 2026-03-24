import React from "react";
import { View, Text, StyleSheet, Pressable, Image, Platform } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

type ProductCardProps = {
  id: number;
  title: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  sellerName: string;
  sellerRating?: number | null;
  rating?: number | null;
  reviewCount: number;
  prepTime: number;
  remainingStock: number;
  isSponsored: boolean;
  isFavorited: boolean;
  onPress: () => void;
  onFavoritePress?: () => void;
  onAddToCart?: () => void;
};

export function ProductCard({ title, description, price, imageUrl, sellerName, rating, reviewCount, prepTime, remainingStock, isSponsored, isFavorited, onPress, onFavoritePress, onAddToCart }: ProductCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] }]}
      onPress={onPress}
    >
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderEmoji}>🍲</Text>
          </View>
        )}
        {isSponsored && (
          <View style={styles.sponsoredBadge}>
            <Text style={styles.sponsoredText}>Öne Çıkan</Text>
          </View>
        )}
        {remainingStock <= 3 && remainingStock > 0 && (
          <View style={styles.stockBadge}>
            <Text style={styles.stockText}>Son {remainingStock}!</Text>
          </View>
        )}
        {onFavoritePress && (
          <Pressable style={styles.favoriteBtn} onPress={onFavoritePress} hitSlop={8}>
            <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={20} color={isFavorited ? Colors.light.accent : "#fff"} />
          </Pressable>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.description} numberOfLines={2}>{description}</Text>

        <View style={styles.sellerRow}>
          <Feather name="user" size={11} color={Colors.light.textMuted} />
          <Text style={styles.sellerName} numberOfLines={1}>{sellerName}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.metaRow}>
            {rating !== null && rating !== undefined && (
              <View style={styles.ratingChip}>
                <Ionicons name="star" size={11} color={Colors.light.star} />
                <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                <Text style={styles.reviewCountText}>({reviewCount})</Text>
              </View>
            )}
            <View style={styles.timeChip}>
              <Feather name="clock" size={11} color={Colors.light.textMuted} />
              <Text style={styles.timeText}>{prepTime} dk</Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₺{price.toFixed(0)}</Text>
            {onAddToCart && (
              <Pressable style={styles.addBtn} onPress={onAddToCart} hitSlop={4}>
                <Feather name="plus" size={16} color="#fff" />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  imageContainer: { position: "relative" },
  image: { width: "100%", height: 180 },
  imagePlaceholder: { backgroundColor: Colors.light.backgroundTertiary, alignItems: "center", justifyContent: "center" },
  imagePlaceholderEmoji: { fontSize: 48 },
  sponsoredBadge: {
    position: "absolute", top: 10, left: 10,
    backgroundColor: Colors.light.sponsored, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  sponsoredText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  stockBadge: {
    position: "absolute", top: 10, right: 42,
    backgroundColor: Colors.light.accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  stockText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  favoriteBtn: {
    position: "absolute", top: 10, right: 10,
    backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 20, padding: 6,
  },
  content: { padding: 12 },
  title: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 4 },
  description: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, marginBottom: 8, lineHeight: 18 },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10 },
  sellerName: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted, flex: 1 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metaRow: { flexDirection: "row", gap: 8, alignItems: "center", flex: 1 },
  ratingChip: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  reviewCountText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  timeChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  timeText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  price: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  addBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 20,
    width: 32, height: 32, alignItems: "center", justifyContent: "center",
  },
});
