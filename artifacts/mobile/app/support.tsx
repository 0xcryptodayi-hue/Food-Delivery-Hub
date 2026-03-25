import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, TextInput, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getBaseUrl } from "@workspace/api-client-react";

const API_BASE = getBaseUrl();

const CATEGORIES = [
  { key: "order", label: "Sipariş Sorunu", icon: "shopping-bag" },
  { key: "payment", label: "Ödeme / İade", icon: "credit-card" },
  { key: "seller", label: "Satıcı Şikayeti", icon: "user-x" },
  { key: "account", label: "Hesap Sorunu", icon: "settings" },
  { key: "hygiene", label: "Hijyen Şikayeti", icon: "shield" },
  { key: "other", label: "Diğer", icon: "help-circle" },
];

const FAQ = [
  {
    q: "Siparişimi nasıl iptal edebilirim?",
    a: "Sipariş 'Hazırlanıyor' aşamasına geçmeden iptal edebilirsiniz. Siparişler ekranından ilgili siparişe girin ve 'İptal Et' seçeneğini kullanın.",
  },
  {
    q: "Ödeme iadesi ne zaman gelir?",
    a: "Online ödemelerde iade 3-5 iş günü içinde kartınıza yansır. Kapıda ödeme siparişlerinde iade işlemi yapılmaz.",
  },
  {
    q: "Satıcı mesajıma neden cevap vermiyor?",
    a: "Satıcılar yoğun olabilir. 24 saat içinde yanıt alamamanız durumunda destek ekibimize ulaşabilirsiniz.",
  },
  {
    q: "Hijyen puanı nasıl çalışır?",
    a: "Alıcılar teslim alınan siparişler için satıcıyı hijyen açısından 1-5 arasında puanlayabilir. Bu puan satıcı profilinde ayrıca gösterilir.",
  },
  {
    q: "Satıcı olmak istiyorum, ne yapmalıyım?",
    a: "Profil ekranından hesabınızı satıcıya yükseltebilirsiniz. Hesabınız incelendikten sonra satıcı özelliklerine erişebilirsiniz.",
  },
  {
    q: "Ürün görseli gerçekle uyuşmuyorsa ne yapabilirim?",
    a: "Sipariş tesliminden sonra 'Satıcı Şikayeti' kategorisinde destek talebi oluşturun. Ekibimiz 24 saat içinde size dönecektir.",
  },
];

type Ticket = {
  id: number;
  category: string;
  subject: string;
  message: string;
  status: string;
  adminResponse?: string;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  open: "Açık",
  in_progress: "İşlemde",
  resolved: "Çözüldü",
  closed: "Kapatıldı",
};
const STATUS_COLORS: Record<string, string> = {
  open: "#F59E0B",
  in_progress: "#3B82F6",
  resolved: "#10B981",
  closed: "#9CA3AF",
};

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable style={styles.faqItem} onPress={() => setOpen(o => !o)}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQ}>{q}</Text>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={16} color={Colors.light.textMuted} />
      </View>
      {open && <Text style={styles.faqA}>{a}</Text>}
    </Pressable>
  );
}

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [tab, setTab] = useState<"faq" | "new" | "tickets">("faq");
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  useEffect(() => {
    if (tab === "tickets" && user) fetchTickets();
  }, [tab, user]);

  const fetchTickets = async () => {
    if (!token) return;
    setTicketsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/support/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTickets(await res.json());
    } catch {}
    finally { setTicketsLoading(false); }
  };

  const handleSubmit = async () => {
    if (!user) { router.push("/auth"); return; }
    if (!category) { Alert.alert("Uyarı", "Lütfen bir kategori seçin"); return; }
    if (!subject.trim()) { Alert.alert("Uyarı", "Lütfen konu başlığı girin"); return; }
    if (message.trim().length < 10) { Alert.alert("Uyarı", "Mesajınız çok kısa, lütfen daha ayrıntılı yazın"); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/support/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category, subject, message }),
      });
      if (!res.ok) throw new Error();
      Alert.alert("Talebiniz Alındı", "Destek ekibimiz en kısa sürede size dönecektir.", [
        { text: "Tamam", onPress: () => { setCategory(""); setSubject(""); setMessage(""); setTab("tickets"); } },
      ]);
    } catch {
      Alert.alert("Hata", "Talep gönderilemedi, lütfen tekrar deneyin");
    } finally { setSubmitting(false); }
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Müşteri Hizmetleri</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.tabBar}>
        {([["faq", "S.S.S."], ["new", "Yeni Talep"], ["tickets", "Taleplerim"]] as const).map(([key, label]) => (
          <Pressable key={key} style={[styles.tabBtn, tab === key && styles.tabBtnActive]} onPress={() => setTab(key)}>
            <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "faq" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={22} color={Colors.light.primary} />
            <Text style={styles.infoText}>
              Aşağıdaki sık sorulan sorulara göz atın. Cevabınızı bulamazsanız destek talebi oluşturun.
            </Text>
          </View>
          <Text style={styles.sectionTitle}>Sık Sorulan Sorular</Text>
          <View style={styles.faqCard}>
            {FAQ.map((item, i) => (
              <React.Fragment key={i}>
                <FaqItem q={item.q} a={item.a} />
                {i < FAQ.length - 1 && <View style={styles.faqDivider} />}
              </React.Fragment>
            ))}
          </View>
          <View style={styles.contactCard}>
            <Feather name="mail" size={20} color={Colors.light.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.contactTitle}>Bize Ulaşın</Text>
              <Text style={styles.contactText}>destek@hanameli.com</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {tab === "new" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Kategori Seçin</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(c => (
              <Pressable
                key={c.key}
                style={[styles.categoryChip, category === c.key && styles.categoryChipActive]}
                onPress={() => setCategory(c.key)}
              >
                <Feather name={c.icon as "home"} size={16} color={category === c.key ? "#fff" : Colors.light.primary} />
                <Text style={[styles.categoryLabel, category === c.key && styles.categoryLabelActive]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Konu</Text>
          <TextInput
            style={styles.input}
            placeholder="Konu başlığı girin..."
            placeholderTextColor={Colors.light.textMuted}
            value={subject}
            onChangeText={setSubject}
            maxLength={100}
          />

          <Text style={styles.sectionTitle}>Mesajınız</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Sorununuzu ayrıntılı olarak açıklayın..."
            placeholderTextColor={Colors.light.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.charCount}>{message.length}/1000</Text>

          <Pressable
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="send" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>Talebi Gönder</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}

      {tab === "tickets" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {!user ? (
            <View style={styles.emptyState}>
              <Feather name="lock" size={40} color={Colors.light.textMuted} />
              <Text style={styles.emptyTitle}>Giriş Gerekli</Text>
              <Pressable style={styles.loginBtn} onPress={() => router.push("/auth")}>
                <Text style={styles.loginBtnText}>Giriş Yap</Text>
              </Pressable>
            </View>
          ) : ticketsLoading ? (
            <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
          ) : tickets.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={40} color={Colors.light.textMuted} />
              <Text style={styles.emptyTitle}>Henüz talebiniz yok</Text>
              <Text style={styles.emptySubtitle}>Yardım almak için "Yeni Talep" oluşturun</Text>
            </View>
          ) : (
            tickets.map(t => (
              <View key={t.id} style={styles.ticketCard}>
                <View style={styles.ticketHeader}>
                  <View style={styles.ticketCategoryChip}>
                    <Text style={styles.ticketCategoryText}>
                      {CATEGORIES.find(c => c.key === t.category)?.label ?? t.category}
                    </Text>
                  </View>
                  <View style={[styles.ticketStatusBadge, { backgroundColor: (STATUS_COLORS[t.status] ?? "#9CA3AF") + "20" }]}>
                    <View style={[styles.ticketStatusDot, { backgroundColor: STATUS_COLORS[t.status] ?? "#9CA3AF" }]} />
                    <Text style={[styles.ticketStatusText, { color: STATUS_COLORS[t.status] ?? "#9CA3AF" }]}>
                      {STATUS_LABELS[t.status] ?? t.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.ticketSubject}>{t.subject}</Text>
                <Text style={styles.ticketMessage} numberOfLines={2}>{t.message}</Text>
                {t.adminResponse && (
                  <View style={styles.adminResponseBox}>
                    <Feather name="message-square" size={13} color={Colors.light.primary} />
                    <Text style={styles.adminResponseText}>{t.adminResponse}</Text>
                  </View>
                )}
                <Text style={styles.ticketDate}>
                  {new Date(t.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight,
    backgroundColor: Colors.light.surface,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.backgroundSecondary, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.light.text },
  tabBar: {
    flexDirection: "row", backgroundColor: Colors.light.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight,
  },
  tabBtn: { flex: 1, paddingVertical: 13, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabBtnActive: { borderBottomColor: Colors.light.primary },
  tabLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  tabLabelActive: { color: Colors.light.primary, fontFamily: "Inter_700Bold" },
  scrollContent: { padding: 16, paddingBottom: 48 },
  infoCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: Colors.light.primary + "12", borderRadius: 14,
    padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: Colors.light.primary + "25",
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.text, lineHeight: 20 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.light.text, marginBottom: 10, marginTop: 6 },
  faqCard: { backgroundColor: Colors.light.surface, borderRadius: 16, overflow: "hidden", marginBottom: 20 },
  faqItem: { padding: 16 },
  faqHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  faqQ: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text, lineHeight: 20 },
  faqA: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, lineHeight: 20, marginTop: 10 },
  faqDivider: { height: 1, backgroundColor: Colors.light.borderLight, marginHorizontal: 16 },
  contactCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.light.surface, borderRadius: 16, padding: 16,
  },
  contactTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  contactText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.primary, marginTop: 2 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  categoryChip: {
    flexDirection: "row", alignItems: "center", gap: 7,
    borderWidth: 1.5, borderColor: Colors.light.primary + "50",
    backgroundColor: Colors.light.primary + "08",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  categoryChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  categoryLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.primary },
  categoryLabelActive: { color: "#fff" },
  input: {
    backgroundColor: Colors.light.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.light.borderLight,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.light.text,
    marginBottom: 16,
  },
  textarea: { minHeight: 130, paddingTop: 14 },
  charCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textAlign: "right", marginTop: -12, marginBottom: 20 },
  submitBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 16,
    paddingVertical: 16, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
  },
  submitBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textAlign: "center" },
  loginBtn: { backgroundColor: Colors.light.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  loginBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  ticketCard: {
    backgroundColor: Colors.light.surface, borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.light.borderLight,
  },
  ticketHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  ticketCategoryChip: { backgroundColor: Colors.light.backgroundSecondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  ticketCategoryText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  ticketStatusBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  ticketStatusDot: { width: 7, height: 7, borderRadius: 4 },
  ticketStatusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  ticketSubject: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 5 },
  ticketMessage: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, lineHeight: 19, marginBottom: 8 },
  adminResponseBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: Colors.light.primary + "10", borderRadius: 10,
    padding: 10, marginBottom: 8,
  },
  adminResponseText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.text, lineHeight: 19 },
  ticketDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
});
