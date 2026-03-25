import React from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGetWallet } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

const TRANSACTION_LABELS: Record<string, { label: string; color: string }> = {
  earning: { label: "Kazanç", color: Colors.light.success },
  pending: { label: "Bekliyor", color: Colors.light.warning },
  withdrawal: { label: "Çekim", color: Colors.light.accent },
};

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const { data: wallet, isLoading } = useGetWallet({ query: { enabled: !!user?.isSeller } });

  if (!user?.isSeller) {
    return (
      <View style={[styles.centered, { paddingTop: topInset }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Feather name="dollar-sign" size={48} color={Colors.light.textMuted} />
        <Text style={styles.errorText}>Sadece satıcılar cüzdanı kullanabilir</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: topInset }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Cüzdanım</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 20 }}
      >
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Kullanılabilir Bakiye</Text>
        <Text style={styles.balanceAmount}>₺{(wallet?.availableBalance ?? 0).toFixed(2)}</Text>
        <Pressable style={styles.withdrawBtn}>
          <Feather name="arrow-up-circle" size={18} color="#fff" />
          <Text style={styles.withdrawBtnText}>Para Çek</Text>
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Feather name="trending-up" size={20} color={Colors.light.success} />
          <Text style={styles.statAmount}>₺{(wallet?.totalEarnings ?? 0).toFixed(0)}</Text>
          <Text style={styles.statLabel}>Toplam Kazanç</Text>
        </View>
        <View style={styles.statCard}>
          <Feather name="clock" size={20} color={Colors.light.warning} />
          <Text style={styles.statAmount}>₺{(wallet?.pendingBalance ?? 0).toFixed(0)}</Text>
          <Text style={styles.statLabel}>Bekleyen</Text>
        </View>
        <View style={styles.statCard}>
          <Feather name="arrow-down-circle" size={20} color={Colors.light.primary} />
          <Text style={styles.statAmount}>₺{(wallet?.totalWithdrawn ?? 0).toFixed(0)}</Text>
          <Text style={styles.statLabel}>Çekilen</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>İşlem Geçmişi</Text>
        {(wallet?.recentTransactions ?? []).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Henüz işlem yok</Text>
          </View>
        ) : (
          (wallet?.recentTransactions ?? []).slice().reverse().map(tx => {
            const info = TRANSACTION_LABELS[tx.type] ?? { label: tx.type, color: Colors.light.textMuted };
            return (
              <View key={tx.id} style={styles.txItem}>
                <View style={[styles.txIconBox, { backgroundColor: info.color + "15" }]}>
                  <Feather
                    name={tx.type === "earning" ? "arrow-down-left" : tx.type === "withdrawal" ? "arrow-up-right" : "clock"}
                    size={16} color={info.color}
                  />
                </View>
                <View style={styles.txContent}>
                  <Text style={styles.txDesc}>{tx.description}</Text>
                  <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString("tr-TR")}</Text>
                </View>
                <Text style={[styles.txAmount, { color: info.color }]}>
                  {tx.type === "withdrawal" ? "-" : "+"}₺{tx.amount.toFixed(0)}
                </Text>
              </View>
            );
          })
        )}
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.light.background, gap: 12 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary, textAlign: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.surface, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  balanceCard: {
    backgroundColor: Colors.light.primary, marginHorizontal: 20, borderRadius: 24,
    padding: 28, alignItems: "center", marginBottom: 20, gap: 8,
  },
  balanceLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  balanceAmount: { fontSize: 44, fontFamily: "Inter_700Bold", color: "#fff" },
  withdrawBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8,
  },
  withdrawBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  statsGrid: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: Colors.light.surface, borderRadius: 16,
    padding: 14, alignItems: "center", gap: 6,
    ...Platform.select({ ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 }, android: { elevation: 1 } }),
  },
  statAmount: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center" },
  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.light.text, marginBottom: 12 },
  empty: { alignItems: "center", paddingVertical: 24 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.textMuted },
  txItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.light.surface, borderRadius: 14, padding: 14, marginBottom: 8,
  },
  txIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txContent: { flex: 1 },
  txDesc: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.light.text },
  txDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  txAmount: { fontFamily: "Inter_700Bold", fontSize: 16 },
});
