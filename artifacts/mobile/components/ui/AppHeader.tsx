import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

type AppHeaderProps = {
  onCategoryPress?: () => void;
  categoryActive?: boolean;
};

export function AppHeader({ onCategoryPress, categoryActive = false }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.header, { paddingTop: topInset + 6, paddingBottom: 10 }]}>

      {/* Marka Adı + Slogan — sola hizalı, ikisi kendi içinde ortalı */}
      <View style={styles.brandWrap}>
        <View style={styles.brandInner}>
          <Text style={styles.brandName}>HanımEli</Text>
          <View style={styles.sloganRow}>
            <Text style={styles.leaf}>🌿</Text>
            <Text style={styles.sloganText}>Ev Yapımı Lezzetler</Text>
            <Text style={styles.leaf}>🌿</Text>
          </View>
        </View>
      </View>

      {/* Eylem ikonları */}
      <View style={styles.actions}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => user ? router.push("/notifications") : router.push("/auth")}
          hitSlop={6}
        >
          <Feather name="bell" size={20} color={Colors.light.primaryDark} />
        </Pressable>

        <Pressable style={styles.iconBtn} onPress={() => router.push("/cart")} hitSlop={6}>
          <Feather
            name="shopping-cart"
            size={20}
            color={itemCount > 0 ? Colors.light.primary : Colors.light.primaryDark}
          />
          {itemCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{itemCount > 9 ? "9+" : itemCount}</Text>
            </View>
          )}
        </Pressable>

        {onCategoryPress && (
          <Pressable
            style={[styles.iconBtn, categoryActive && styles.iconBtnActive]}
            onPress={onCategoryPress}
            hitSlop={6}
          >
            <Feather
              name="grid"
              size={20}
              color={categoryActive ? Colors.light.primary : Colors.light.primaryDark}
            />
            {categoryActive && <View style={styles.activeDot} />}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#FEF3E2",
    borderBottomWidth: 1,
    borderBottomColor: "#F0D9B5",
    ...Platform.select({
      ios: { shadowColor: "rgba(180,80,10,0.18)", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 10 },
      android: { elevation: 5 },
      web: { boxShadow: "0 3px 12px rgba(180,80,10,0.13)" },
    }),
  },

  brandWrap: {
    flex: 1,
    alignItems: "flex-start",
  },

  brandInner: {
    alignItems: "center",
  },

  brandName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#C4521A",
    letterSpacing: 0.4,
    lineHeight: 28,
  },

  sloganRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },

  sloganText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#4A7C59",
    letterSpacing: 0.2,
  },

  leaf: {
    fontSize: 11,
  },

  actions: {
    flexDirection: "row",
    gap: 2,
    alignItems: "center",
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },

  iconBtnActive: {
    backgroundColor: "rgba(232,101,26,0.15)",
  },

  activeDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.light.primary,
  },

  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },

  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
});
