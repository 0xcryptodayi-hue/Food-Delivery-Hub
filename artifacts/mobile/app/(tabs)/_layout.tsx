import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import Colors from "@/constants/colors";
import { useCart } from "@/context/CartContext";
import { View as RNView, Text } from "react-native";

function CartBadge() {
  const { itemCount } = useCart();
  if (itemCount === 0) return null;
  return (
    <RNView style={{
      position: "absolute", top: -4, right: -8,
      backgroundColor: Colors.light.primary, borderRadius: 10,
      minWidth: 18, height: 18, alignItems: "center", justifyContent: "center",
      paddingHorizontal: 4, zIndex: 10,
    }}>
      <Text style={{ color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" }}>{itemCount > 9 ? "9+" : itemCount}</Text>
    </RNView>
  );
}

export default function TabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          position: isIOS ? "absolute" : "relative",
          backgroundColor: isIOS ? "transparent" : "#fff",
          borderTopWidth: 1,
          borderTopColor: Colors.light.borderLight,
          elevation: 0,
          height: Platform.select({ ios: 84, android: 64, web: 64 }),
          paddingBottom: Platform.select({ ios: 24, default: 8 }),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.light.surface }]} />
          ),
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
          marginTop: 2,
        },
        tabBarIconStyle: { marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Keşfet",
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Satıcılar",
          tabBarIcon: ({ color, size }) => <Feather name="users" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Siparişler",
          tabBarIcon: ({ color, size }) => <Feather name="shopping-bag" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Mesajlar",
          tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size ?? 22} color={color} />,
        }}
      />
    </Tabs>
  );
}
