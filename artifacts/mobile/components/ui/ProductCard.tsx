import React from "react";
import { View, Text, StyleSheet, Pressable, Image, Platform } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const CATEGORY_EMOJI: Record<string, string> = {
  "main-dish": "🍛",
  "soup": "🥣",
  "dessert": "🍮",
  "breakfast": "🥞",
  "salad": "🥗",
  "pastry": "🥐",
};

const CATEGORY_BG: Record<string, string> = {
  "main-dish": "#FFF3E0",
  "soup": "#FFEBEE",
  "dessert": "#FFF8E1",
  "breakfast": "#F3E5F5",
  "salad": "#E8F5E9",
  "pastry": "#EDE7F6",
};

type ProductCardProps = {
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
  isFavorited: boolean;
  discountPercent?: number | null;
  onPress: () => void;
  onFavoritePress?: () => void;
  onAddToCart?: () => void;
};

export function ProductCard({
  title, description, price, imageUrl, category, sellerName, rating, reviewCount,
  prepTime, remainingStock, isSponsored, isFavorited, discountPercent,
  onPress, onFavoritePress, onAddToCart,
}: ProductCardProps) {
  const emoji = CATEGORY_EMOJI[category] ?? "🍲";
  const bgColor = CATEGORY_BG[category] ?? "#FFF3E0";

  const hasDiscount = discountPercent != null && discountPercent > 0;
  const discountedPrice = hasDiscount ? price * (1 - discountPercent! / 100) : price;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.97, transform: [{ scale: 0.99 }] }]}
      onPress={onPress}
    >
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: bgColor }]}>
            <Text style={styles.imagePlaceholderEmoji}>{emoji}</Text>
          </View>
        )}

        <View style={styles.overlayRow}>
          {isSponsored && (
            <View style={styles.sponsoredBadge}>
              <Feather name="zap" size={10} color="#fff" />
              <Text style={styles.sponsoredText}>Öne Çıkan</Text>
            </View>
          )}
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>%{discountPercent} İndirim</Text>
            </View>
          )}
          {remainingStock <= 3 && remainingStock > 0 && (
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>Son {remainingStock}!</Text>
            </View>
          )}
          {remainingStock === 0 && (
            <View style={[styles.stockBadge, { backgroundColor: "#9E9E9E" }]}>
              <Text style={styles.stockText}>Tükendi</Text>
            </View>
          )}
        </View>

        <Pressable style={styles.favoriteBtn} onPress={onFavoritePress ?? onPress} hitSlop={10}>
          <Ionicons
            name={isFavorited ? "heart" : "heart-outline"}
            size={20}
            color={isFavorited ? Colors.light.accent : "#fff"}
          />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.description} numberOfLines={2}>{description}</Text>

        <View style={styles.sellerRow}>
          <View style={styles.sellerDot} />
          <Text style={styles.sellerName} numberOfLines={1}>{sellerName}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.metaRow}>
            {rating !== null && rating !== undefined && (
              <View style={styles.ratingChip}>
                <Ionicons name="star" size={12} color={Colors.light.star} />
                <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                {reviewCount > 0 && <Text style={styles.reviewCountText}>({reviewCount})</Text>}
              </View>
            )}
            <View style={styles.timeChip}>
              <Feather name="clock" size={11} color={Colors.light.textMuted} />
              <Text style={styles.timeText}>{prepTime} dk</Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            <View style={styles.priceStack}>
              {hasDiscount && (
                <Text style={styles.originalPrice}>₺{price.toFixed(0)}</Text>
              )}
              <Text style={[styles.price, hasDiscount && styles.priceDiscounted]} numberOfLines={1}>
                ₺{discountedPrice.toFixed(0)}
              </Text>
            </View>
            {onAddToCart && remainingStock > 0 && (
              <Pressable style={styles.addBtn} onPress={e => { e.stopPropagation?.(); onAddToCart(); }} hitSlop={6}>
                <Feather name="plus" size={18} color="#fff" />
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
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: "rgba(60, 30, 10, 0.12)",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  imageContainer: { position: "relative" },
  image: { width: "100%", height: 180 },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  imagePlaceholderEmoji: { fontSize: 56 },
  overlayRow: {
    position: "absolute", top: 12, left: 12,
    flexDirection: "row", gap: 6, flexWrap: "wrap", maxWidth: "85%",
  },
  sponsoredBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.light.sponsored,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  sponsoredText: { color: "#fff", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  discountBadge: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#E53935",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  discountText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  stockBadge: {
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  stockText: { color: "#fff", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  favoriteBtn: {
    position: "absolute", top: 10, right: 10,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 20, padding: 7,
  },
  content: { padding: 14 },
  title: {
    fontSize: 16, fontFamily: "Inter_700Bold",
    color: Colors.light.text, marginBottom: 4,
  },
  description: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary, marginBottom: 8, lineHeight: 18,
  },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  sellerDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.light.primary,
  },
  sellerName: {
    fontSize: 12, fontFamily: "Inter_500Medium",
    color: Colors.light.textMuted, flex: 1,
  },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metaRow: { flexDirection: "row", gap: 8, alignItems: "center", flex: 1, flexShrink: 1, minWidth: 0 },
  ratingChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.light.text },
  reviewCountText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  timeChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  timeText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  priceStack: { alignItems: "flex-end" },
  originalPrice: {
    fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted,
    textDecorationLine: "line-through",
  },
  price: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  priceDiscounted: { color: "#E53935" },
  addBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 20,
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
  },
});
