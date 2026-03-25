import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, ScrollView, Pressable, Platform,
  TextInput, Alert, ActivityIndicator, Modal, Image, Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import {
  useGetWallet, useGetUserProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  getBaseUrl,
} from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = getBaseUrl();
const TR_MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

type Tab = "overview" | "products" | "campaigns" | "ads" | "hygiene";

const CATEGORIES = [
  { slug: "borek", name: "Börek" },
  { slug: "pogaca", name: "Poğaça" },
  { slug: "baklava", name: "Baklava" },
  { slug: "kurabiye", name: "Kurabiye" },
  { slug: "sarma", name: "Sarma / Dolma" },
  { slug: "icli-kofte", name: "İçli Köfte" },
  { slug: "manti", name: "Mantı" },
  { slug: "dessert", name: "Tatlılar" },
];
const PORTION_PRESETS = ["Porsiyon", "500 gr", "1 Kg", "Adet"];

type ProductFormData = {
  title: string; description: string; price: string;
  category: string; portion: string; dailyStock: string;
  prepTime: string; imageUrl: string;
};

interface AdPackage {
  id: string; name: string; durationDays: number; price: number;
  description: string; features: string[]; color: string; popular?: boolean;
}
interface AdCampaign {
  id: number; packageType: string; durationDays: number; price: number;
  status: string; startDate: string | null; endDate: string | null; createdAt: string;
}
type Transaction = { id: number; type: string; amount: number; description: string; createdAt: string };

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function buildChartData(transactions: Transaction[]) {
  const now = new Date();
  const months: { label: string; earning: number; expense: number; _key: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: TR_MONTHS[d.getMonth()], earning: 0, expense: 0, _key: `${d.getFullYear()}-${d.getMonth()}` });
  }
  for (const tx of transactions) {
    const d = new Date(tx.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const entry = months.find(m => m._key === key);
    if (!entry) continue;
    if (tx.type === "earning") entry.earning += tx.amount;
    else if (tx.type === "withdrawal") entry.expense += tx.amount;
  }
  return months;
}

function EarningsChart({ transactions }: { transactions: Transaction[] }) {
  const data = buildChartData(transactions);
  const maxVal = Math.max(...data.flatMap(d => [d.earning, d.expense]), 100);
  const chartH = 110;
  return (
    <View style={chartSt.container}>
      <View style={chartSt.legend}>
        <View style={chartSt.legendItem}><View style={[chartSt.legendDot, { backgroundColor: Colors.light.success }]} /><Text style={chartSt.legendText}>Kazanç</Text></View>
        <View style={chartSt.legendItem}><View style={[chartSt.legendDot, { backgroundColor: Colors.light.accent }]} /><Text style={chartSt.legendText}>Çekim</Text></View>
      </View>
      <View style={chartSt.chart}>
        {data.map((d, i) => {
          const eH = (d.earning / maxVal) * chartH;
          const xH = (d.expense / maxVal) * chartH;
          return (
            <View key={i} style={chartSt.col}>
              <View style={[chartSt.bars, { height: chartH }]}>
                {d.expense > 0 && <View style={[chartSt.bar, { height: xH, backgroundColor: Colors.light.accent + "80", marginRight: 2 }]} />}
                {d.earning > 0 && <View style={[chartSt.bar, { height: eH, backgroundColor: Colors.light.success }]} />}
                {d.earning === 0 && d.expense === 0 && <View style={[chartSt.bar, { height: 3, backgroundColor: Colors.light.borderLight }]} />}
              </View>
              <Text style={chartSt.monthLabel}>{d.label}</Text>
            </View>
          );
        })}
      </View>
      <View style={chartSt.baseline} />
    </View>
  );
}

const chartSt = StyleSheet.create({
  container: { paddingTop: 4 },
  legend: { flexDirection: "row", gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 6, paddingBottom: 4 },
  col: { flex: 1, alignItems: "center", gap: 4 },
  bars: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 2 },
  bar: { flex: 1, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  monthLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  baseline: { height: 1, backgroundColor: Colors.light.borderLight, marginTop: 2 },
});

function FormField({ label, value, onChange, placeholder, multiline, keyboardType }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; multiline?: boolean; keyboardType?: "numeric" | "default";
}) {
  return (
    <View style={fSt.group}>
      <Text style={fSt.label}>{label}</Text>
      <TextInput
        style={[fSt.input, multiline && fSt.inputMulti]}
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={Colors.light.textMuted}
        multiline={multiline} numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType ?? "default"}
      />
    </View>
  );
}

const fSt = StyleSheet.create({
  group: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text, backgroundColor: Colors.light.surface },
  inputMulti: { height: 80, textAlignVertical: "top" },
});

function ProductForm({ initial, onSave, onCancel, loading, token }: {
  initial?: ProductFormData; onSave: (d: ProductFormData) => void;
  onCancel: () => void; loading: boolean; token?: string;
}) {
  const [form, setForm] = useState<ProductFormData>(initial ?? { title: "", description: "", price: "", category: "borek", portion: "Porsiyon", dailyStock: "10", prepTime: "30", imageUrl: "" });
  const [uploading, setUploading] = useState(false);
  const set = (k: keyof ProductFormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("İzin Gerekli", "Fotoğraf seçmek için galeri erişimi gereklidir"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", { uri: asset.uri, type: asset.mimeType ?? "image/jpeg", name: asset.fileName ?? "product.jpg" } as unknown as Blob);
      const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      set("imageUrl", url);
    } catch { Alert.alert("Hata", "Fotoğraf yüklenemedi."); } finally { setUploading(false); }
  };

  return (
    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={fSt.label}>Ürün Fotoğrafı</Text>
      <Pressable style={[pSt.imagePicker, form.imageUrl && { padding: 0 }]} onPress={pickImage} disabled={uploading}>
        {uploading ? <ActivityIndicator color={Colors.light.primary} /> :
          form.imageUrl ? <Image source={{ uri: form.imageUrl }} style={pSt.imagePreview} resizeMode="cover" /> :
            <View style={pSt.imagePlaceholder}><Feather name="camera" size={28} color={Colors.light.textMuted} /><Text style={pSt.imagePlaceholderText}>Fotoğraf Ekle</Text></View>}
      </Pressable>
      {!!form.imageUrl && <Pressable onPress={() => set("imageUrl", "")} style={pSt.removeImage}><Text style={pSt.removeImageText}>Fotoğrafı Kaldır</Text></Pressable>}

      <FormField label="Ürün Adı" value={form.title} onChange={v => set("title", v)} placeholder="Örn: Mercimek Çorbası" />
      <FormField label="Açıklama" value={form.description} onChange={v => set("description", v)} placeholder="Ürün açıklaması..." multiline />
      <FormField label="Fiyat (₺)" value={form.price} onChange={v => set("price", v)} placeholder="0" keyboardType="numeric" />

      <View style={fSt.group}>
        <Text style={fSt.label}>Miktar / Porsiyon</Text>
        <View style={pSt.portionGrid}>
          {PORTION_PRESETS.map(p => (
            <Pressable key={p} style={[pSt.portionChip, form.portion === p && pSt.portionChipActive]} onPress={() => set("portion", p)}>
              <Text style={[pSt.portionChipText, form.portion === p && pSt.portionChipTextActive]}>{p}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput style={[fSt.input, { marginTop: 8 }]} value={form.portion} onChangeText={v => set("portion", v)} placeholder="Veya özel girin: 2.5 kg..." placeholderTextColor={Colors.light.textMuted} />
      </View>

      <FormField label="Günlük Stok" value={form.dailyStock} onChange={v => set("dailyStock", v)} placeholder="10" keyboardType="numeric" />
      <FormField label="Hazırlama Süresi (dk)" value={form.prepTime} onChange={v => set("prepTime", v)} placeholder="30" keyboardType="numeric" />

      <Text style={fSt.label}>Kategori</Text>
      <View style={pSt.categoryGrid}>
        {CATEGORIES.map(cat => (
          <Pressable key={cat.slug} style={[pSt.catChip, form.category === cat.slug && pSt.catChipActive]} onPress={() => set("category", cat.slug)}>
            <Text style={[pSt.catChipText, form.category === cat.slug && pSt.catChipTextActive]}>{cat.name}</Text>
          </Pressable>
        ))}
      </View>

      <View style={pSt.formButtons}>
        <Pressable style={pSt.cancelBtn} onPress={onCancel}><Text style={pSt.cancelBtnText}>İptal</Text></Pressable>
        <Pressable style={({ pressed }) => [pSt.saveBtn, pressed && { opacity: 0.9 }, (loading || uploading) && { opacity: 0.7 }]} onPress={() => onSave(form)} disabled={loading || uploading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={pSt.saveBtnText}>Kaydet</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const pSt = StyleSheet.create({
  imagePicker: { borderWidth: 1.5, borderColor: Colors.light.border, borderRadius: 14, borderStyle: "dashed", height: 140, alignItems: "center", justifyContent: "center", marginBottom: 8, overflow: "hidden", backgroundColor: Colors.light.backgroundSecondary },
  imagePreview: { width: "100%", height: "100%", borderRadius: 14 },
  imagePlaceholder: { alignItems: "center", gap: 8 },
  imagePlaceholderText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  removeImage: { alignSelf: "flex-end", paddingVertical: 4, paddingHorizontal: 8, marginBottom: 8 },
  removeImageText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.accent },
  portionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  portionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: Colors.light.backgroundSecondary },
  portionChipActive: { backgroundColor: Colors.light.primary + "15", borderColor: Colors.light.primary },
  portionChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  portionChipTextActive: { color: Colors.light.primary, fontFamily: "Inter_600SemiBold" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: Colors.light.backgroundSecondary },
  catChipActive: { backgroundColor: Colors.light.primary + "15", borderColor: Colors.light.primary },
  catChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  catChipTextActive: { color: Colors.light.primary, fontFamily: "Inter_600SemiBold" },
  formButtons: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 15, borderRadius: 14, borderWidth: 1, borderColor: Colors.light.border, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.textSecondary },
  saveBtn: { flex: 2, paddingVertical: 15, borderRadius: 14, backgroundColor: Colors.light.primary, alignItems: "center", justifyContent: "center" },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────

export default function SellerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, updateUser } = useAuth();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // --- Wallet ---
  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useGetWallet({ query: { enabled: !!user?.isSeller } });

  // --- Store ---
  const [currentDeliveryFee, setCurrentDeliveryFee] = useState<number | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryFeeInput, setDeliveryFeeInput] = useState("");
  const [savingFee, setSavingFee] = useState(false);
  const [uploadingStore, setUploadingStore] = useState(false);
  const [hasActiveCampaign, setHasActiveCampaign] = useState(false);

  // --- Products ---
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<null | { id: number; data: ProductFormData }>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountProduct, setDiscountProduct] = useState<null | { id: number; title: string; price: number; discountPercent: number | null }>(null);
  const [discountInput, setDiscountInput] = useState("0");
  const [savingDiscount, setSavingDiscount] = useState(false);

  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = useGetUserProducts(user?.id ?? 0, { query: { enabled: !!user?.isSeller && !!user?.id } });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  // --- Ads ---
  const [adPackages, setAdPackages] = useState<AdPackage[]>([]);
  const [adCampaigns, setAdCampaigns] = useState<AdCampaign[]>([]);
  const [adLoading, setAdLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submittingAd, setSubmittingAd] = useState(false);
  const [adSubTab, setAdSubTab] = useState<"new" | "my">("new");
  const activeCampaign = adCampaigns.find(c => c.status === "active");

  // --- Hygiene ---
  const [hygieneDecl, setHygieneDecl] = useState({ wearsGloves: false, wearsBone: false, hasHealthCert: false, washesHands: false, singleUsePackaging: false, kitchenProtocol: false, note: "" });
  const [hygienePlatformScore, setHygienePlatformScore] = useState<number | null>(null);
  const [hygieneLoading, setHygieneLoading] = useState(false);
  const [hygieneSaving, setHygieneSaving] = useState(false);

  useEffect(() => {
    if (!user?.isSeller || !token) return;
    fetch(`${API_BASE}/api/sellers/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.deliveryFee !== undefined) setCurrentDeliveryFee(d.deliveryFee); }).catch(() => {});
    fetch(`${API_BASE}/api/ads/my-campaigns`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then((c: { status: string }[]) => setHasActiveCampaign(c.some(x => x.status === "active"))).catch(() => {});
  }, [user, token]);

  const fetchAdData = useCallback(async () => {
    if (!token) return;
    setAdLoading(true);
    try {
      const [pkgRes, campRes] = await Promise.all([
        fetch(`${API_BASE}/api/ads/packages`),
        fetch(`${API_BASE}/api/ads/my-campaigns`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (pkgRes.ok) setAdPackages(await pkgRes.json());
      if (campRes.ok) {
        const camps = await campRes.json();
        setAdCampaigns(camps);
        setHasActiveCampaign(camps.some((c: AdCampaign) => c.status === "active"));
      }
    } catch { } finally { setAdLoading(false); }
  }, [token]);

  const fetchHygieneDeclaration = useCallback(async () => {
    if (!token) return;
    setHygieneLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/hygiene/declaration`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setHygieneDecl({ wearsGloves: d.wearsGloves ?? false, wearsBone: d.wearsBone ?? false, hasHealthCert: d.hasHealthCert ?? false, washesHands: d.washesHands ?? false, singleUsePackaging: d.singleUsePackaging ?? false, kitchenProtocol: d.kitchenProtocol ?? false, note: d.note ?? "" });
        setHygienePlatformScore(d.platformScore ?? null);
      }
    } catch { } finally { setHygieneLoading(false); }
  }, [token]);

  useEffect(() => { if (activeTab === "ads") fetchAdData(); }, [activeTab, fetchAdData]);
  useEffect(() => { if (activeTab === "hygiene") fetchHygieneDeclaration(); }, [activeTab, fetchHygieneDeclaration]);

  const saveHygieneDeclaration = async () => {
    if (!token) return;
    setHygieneSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/hygiene/declaration`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(hygieneDecl) });
      if (res.ok) {
        const d = await res.json();
        setHygienePlatformScore(d.platformScore);
        Alert.alert("Kaydedildi ✓", `Hijyen profiliniz güncellendi.\nPlatform puanınız: ${d.platformScore}/5`);
      }
    } catch { Alert.alert("Hata", "Kaydedilemedi"); } finally { setHygieneSaving(false); }
  };

  const handleSave = async (form: ProductFormData) => {
    if (!form.title || !form.price) { Alert.alert("Hata", "Başlık ve fiyat zorunludur"); return; }
    setFormLoading(true);
    try {
      const body = { title: form.title, description: form.description, price: parseFloat(form.price), category: form.category, portion: form.portion, dailyStock: parseInt(form.dailyStock) || 10, prepTime: parseInt(form.prepTime) || 30, imageUrl: form.imageUrl || undefined };
      if (editProduct) await updateProduct.mutateAsync({ id: editProduct.id, data: body });
      else await createProduct.mutateAsync({ data: body });
      setShowModal(false); setEditProduct(null); refetchProducts();
    } catch (e: unknown) { Alert.alert("Hata", e instanceof Error ? e.message : "Kaydedilemedi"); } finally { setFormLoading(false); }
  };

  const handleDelete = (id: number, title: string) => {
    Alert.alert("Ürünü Sil", `"${title}" silinsin mi?`, [
      { text: "İptal", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: async () => { try { await deleteProduct.mutateAsync({ id }); refetchProducts(); } catch { Alert.alert("Hata", "Silinemedi"); } } },
    ]);
  };

  const openDiscountModal = (item: { id: number; title: string; price: number; discountPercent?: number | null }) => {
    setDiscountProduct({ id: item.id, title: item.title, price: item.price, discountPercent: item.discountPercent ?? null });
    setDiscountInput(String(item.discountPercent ?? 0));
    setShowDiscountModal(true);
  };

  const handleSaveDiscount = async () => {
    if (!discountProduct) return;
    const pct = parseInt(discountInput);
    if (isNaN(pct) || pct < 0 || pct > 80) { Alert.alert("Hata", "İndirim oranı 0 ile 80 arasında olmalıdır"); return; }
    setSavingDiscount(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/${discountProduct.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ discountPercent: pct === 0 ? null : pct }) });
      if (!res.ok) throw new Error();
      setShowDiscountModal(false); refetchProducts();
      Alert.alert(pct === 0 ? "İndirim Kaldırıldı" : "İndirim Uygulandı", pct === 0 ? `"${discountProduct.title}" ürününden indirim kaldırıldı.` : `"${discountProduct.title}" ürününe %${pct} indirim uygulandı.\nYeni fiyat: ₺${(discountProduct.price * (1 - pct / 100)).toFixed(0)}`);
    } catch { Alert.alert("Hata", "İndirim güncellenemedi"); } finally { setSavingDiscount(false); }
  };

  const handleAdSubmit = async () => {
    if (!selectedPackage) { Alert.alert("Hata", "Lütfen bir kampanya paketi seçin"); return; }
    if (!agreedToTerms) { Alert.alert("Hata", "Kampanya koşullarını kabul etmeniz gerekmektedir"); return; }
    const pkg = adPackages.find(p => p.id === selectedPackage);
    if (!pkg) return;
    Alert.alert("Kampanya Başlat", `${pkg.name} paketi ₺${pkg.price} tutarında olup ${pkg.durationDays} gün boyunca tüm ürünlerinizi öne çıkaracaktır.\n\nDevam etmek istiyor musunuz?`, [
      { text: "İptal", style: "cancel" },
      { text: "Onayla", onPress: async () => {
        setSubmittingAd(true);
        try {
          const res = await fetch(`${API_BASE}/api/ads/apply`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ packageType: selectedPackage, agreedToTerms: true }) });
          const data = await res.json();
          if (!res.ok) { Alert.alert("Hata", data.error ?? "Kampanya başlatılamadı"); }
          else { Alert.alert("Kampanya Başlatıldı! 🎉", "Tüm ürünleriniz artık öne çıkanlar arasında görünecek.", [{ text: "Tamam", onPress: () => { fetchAdData(); setAdSubTab("my"); } }]); setSelectedPackage(null); setAgreedToTerms(false); }
        } catch { Alert.alert("Hata", "Bir sorun oluştu, lütfen tekrar deneyin"); } finally { setSubmittingAd(false); }
      }},
    ]);
  };

  const handleSaveDeliveryFee = async () => {
    const fee = parseFloat(deliveryFeeInput);
    if (isNaN(fee) || fee < 0 || fee > 500) { Alert.alert("Hata", "Geçerli bir kargo bedeli girin (0 - 500 ₺)"); return; }
    setSavingFee(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellers/delivery-fee`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ deliveryFee: fee }) });
      if (!res.ok) throw new Error();
      setCurrentDeliveryFee(fee); setShowDeliveryModal(false);
      Alert.alert("Güncellendi", `Kargo bedeli ₺${fee.toFixed(0)} olarak güncellendi.`);
    } catch { Alert.alert("Hata", "Kargo bedeli güncellenemedi"); } finally { setSavingFee(false); }
  };

  const pickAndUploadStoreImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("İzin Gerekli", "Fotoğraf seçmek için galeri erişimi gereklidir"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [16, 9], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingStore(true);
    try {
      const fd = new FormData();
      fd.append("image", { uri: asset.uri, type: asset.mimeType ?? "image/jpeg", name: asset.fileName ?? "store.jpg" } as unknown as Blob);
      const uploadRes = await fetch(`${API_BASE}/api/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!uploadRes.ok) throw new Error();
      const { url } = await uploadRes.json();
      const updateRes = await fetch(`${API_BASE}/api/auth/me`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ storeImage: url }) });
      if (!updateRes.ok) throw new Error();
      const updatedUser = await updateRes.json();
      updateUser(updatedUser);
      Alert.alert("Güncellendi", "Mağaza fotoğrafınız başarıyla güncellendi.");
    } catch { Alert.alert("Hata", "Fotoğraf güncellenemedi."); } finally { setUploadingStore(false); }
  };

  const adStatusLabel = (s: string) => {
    if (s === "active") return { label: "Aktif", color: Colors.light.success };
    if (s === "pending") return { label: "Beklemede", color: Colors.light.warning };
    if (s === "expired") return { label: "Sona Erdi", color: Colors.light.textMuted };
    return { label: "İptal", color: Colors.light.accent };
  };

  if (!user?.isSeller) {
    return (
      <View style={[s.centered, { paddingTop: topInset }]}>
        <Feather name="lock" size={48} color={Colors.light.textMuted} />
        <Text style={s.errorText}>Sadece satıcılar bu paneli kullanabilir</Text>
        <Pressable style={s.backBtn} onPress={() => router.back()}><Text style={s.backBtnText}>Geri Dön</Text></Pressable>
      </View>
    );
  }

  const totalProducts = products?.length ?? 0;
  const activeProducts = products?.filter(p => (p.remainingStock ?? 0) > 0).length ?? 0;
  const discountedProducts = products?.filter(p => p.discountPercent && p.discountPercent > 0).length ?? 0;
  const transactions: Transaction[] = (wallet?.recentTransactions ?? []) as Transaction[];
  const netProfit = (wallet?.totalEarnings ?? 0) - (wallet?.platformFeePaid ?? 0) - (wallet?.totalWithdrawn ?? 0);
  const discountedPrice = discountProduct ? discountProduct.price * (1 - parseInt(discountInput || "0") / 100) : 0;

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: "overview", icon: "home", label: "Genel" },
    { id: "products", icon: "package", label: "Ürünlerim" },
    { id: "campaigns", icon: "tag", label: "Kampanya" },
    { id: "ads", icon: "zap", label: "Reklam" },
    { id: "hygiene", icon: "shield", label: "Hijyen" },
  ];

  return (
    <View style={[s.container, { paddingTop: topInset }]}>
      {/* ─── Header ─── */}
      <View style={s.header}>
        <Pressable style={s.iconBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Yönetici Paneli</Text>
          <View style={s.livePill}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>Canlı</Text>
          </View>
        </View>
        {activeTab === "products" ? (
          <Pressable style={s.addBtn} onPress={() => { setEditProduct(null); setShowModal(true); }}>
            <Feather name="plus" size={20} color="#fff" />
          </Pressable>
        ) : activeTab === "hygiene" ? (
          <Pressable style={[s.addBtn, { backgroundColor: "#10B981", opacity: hygieneSaving ? 0.6 : 1 }]} onPress={saveHygieneDeclaration} disabled={hygieneSaving}>
            {hygieneSaving ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="save" size={18} color="#fff" />}
          </Pressable>
        ) : (
          <Pressable style={s.iconBtn} onPress={() => { refetchWallet(); refetchProducts(); if (activeTab === "ads") fetchAdData(); }}>
            <Feather name="refresh-cw" size={16} color={Colors.light.text} />
          </Pressable>
        )}
      </View>

      {/* ─── Tab Bar ─── */}
      <View style={s.tabBar}>
        {TABS.map(t => {
          const isActive = activeTab === t.id;
          const accent = t.id === "hygiene" ? "#10B981" : Colors.light.primary;
          return (
            <Pressable key={t.id} style={[s.tab, isActive && [s.tabActive, { borderBottomColor: accent }]]} onPress={() => setActiveTab(t.id)}>
              <Feather name={t.icon as "home"} size={14} color={isActive ? accent : Colors.light.textMuted} />
              <Text style={[s.tabText, isActive && { color: accent, fontFamily: "Inter_600SemiBold" }]}>{t.label}</Text>
              {t.id === "ads" && hasActiveCampaign && <View style={[s.tabBadge, { backgroundColor: Colors.light.success }]} />}
              {t.id === "hygiene" && hygienePlatformScore != null && hygienePlatformScore > 0 && <View style={[s.tabBadge, { backgroundColor: "#10B981" }]} />}
            </Pressable>
          );
        })}
      </View>

      {/* ══════════════════════════════════════
          TAB: GENEL BAKIŞ
      ══════════════════════════════════════ */}
      {activeTab === "overview" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 24 }}>
          {/* Store Banner */}
          <Pressable style={s.storeBanner} onPress={pickAndUploadStoreImage} disabled={uploadingStore}>
            {user.storeImage ? <Image source={{ uri: user.storeImage }} style={StyleSheet.absoluteFillObject} resizeMode="cover" /> : <View style={s.storeBannerEmpty} />}
            <View style={s.storeBannerOverlay}>
              <View style={s.storeBannerContent}>
                <View style={s.storeAvatarWrap}>
                  {user.avatar ? <Image source={{ uri: user.avatar }} style={s.storeAvatar} /> : <View style={s.storeAvatarFallback}><Text style={s.storeAvatarInitial}>{user.name[0]?.toUpperCase()}</Text></View>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.storeName}>{user.name}</Text>
                  <Text style={s.storeRole}>Satıcı · %10 Komisyon</Text>
                </View>
                <View style={s.storeCameraBtn}>
                  {uploadingStore ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="camera" size={16} color="#fff" />}
                </View>
              </View>
            </View>
          </Pressable>
          <Text style={s.bannerHint}>Mağaza fotoğrafını değiştirmek için dokunun</Text>

          {/* Wallet Card */}
          {walletLoading ? (
            <View style={s.loadingRow}><ActivityIndicator color={Colors.light.primary} /></View>
          ) : (
            <>
              <View style={s.balanceCard}>
                <View style={s.balanceTop}>
                  <View>
                    <Text style={s.balanceLabel}>Kullanılabilir Bakiye</Text>
                    <Text style={s.balanceAmount}>₺{(wallet?.availableBalance ?? 0).toFixed(2)}</Text>
                  </View>
                  <Pressable style={s.withdrawBtn} onPress={() => router.push("/wallet")}>
                    <Feather name="arrow-up-right" size={14} color="#fff" />
                    <Text style={s.withdrawBtnText}>Para Çek</Text>
                  </Pressable>
                </View>
                <View style={s.balanceDivider} />
                <View style={s.balanceStatsRow}>
                  {[
                    { icon: "trending-up", label: "Toplam Kazanç", value: `₺${(wallet?.totalEarnings ?? 0).toFixed(0)}`, color: "#4ADE80" },
                    { icon: "clock", label: "Bekleyen", value: `₺${(wallet?.pendingBalance ?? 0).toFixed(0)}`, color: "#FCD34D" },
                    { icon: "percent", label: "Komisyon", value: `₺${(wallet?.platformFeePaid ?? 0).toFixed(0)}`, color: "#FCA5A5" },
                  ].map((item, i) => (
                    <React.Fragment key={item.label}>
                      {i > 0 && <View style={s.balanceStatDivider} />}
                      <View style={s.balanceStat}>
                        <View style={s.balanceStatIcon}><Feather name={item.icon as "clock"} size={12} color="#fff" /></View>
                        <Text style={s.balanceStatLabel}>{item.label}</Text>
                        <Text style={[s.balanceStatValue, { color: item.color }]}>{item.value}</Text>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              </View>

              {/* Net Profit Row */}
              <View style={s.summaryRow}>
                <View style={[s.summaryCard, { backgroundColor: Colors.light.success + "12", borderColor: Colors.light.success + "30" }]}>
                  <Feather name="trending-up" size={16} color={Colors.light.success} />
                  <Text style={s.summaryLabel}>Net Kâr</Text>
                  <Text style={[s.summaryValue, { color: Colors.light.success }]}>₺{Math.max(0, netProfit).toFixed(0)}</Text>
                </View>
                <View style={[s.summaryCard, { backgroundColor: "#8B5CF620", borderColor: "#8B5CF640" }]}>
                  <Feather name="arrow-up-right" size={16} color="#8B5CF6" />
                  <Text style={s.summaryLabel}>Toplam Çekim</Text>
                  <Text style={[s.summaryValue, { color: "#8B5CF6" }]}>₺{(wallet?.totalWithdrawn ?? 0).toFixed(0)}</Text>
                </View>
              </View>

              {/* Chart */}
              {transactions.length > 0 && (
                <View style={s.section}>
                  <View style={s.sectionHeader}><Text style={s.sectionTitle}>Gelir / Çekim Grafiği</Text><Text style={s.sectionSub}>Son 6 ay</Text></View>
                  <View style={s.card}><EarningsChart transactions={transactions} /></View>
                </View>
              )}
            </>
          )}

          {/* Quick Actions */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Hızlı İşlemler</Text>
            <View style={s.actionsGrid}>
              {[
                { icon: "package", label: "Ürünlerim", color: Colors.light.primary, action: () => setActiveTab("products") },
                { icon: "shopping-bag", label: "Siparişler", color: Colors.light.success, action: () => router.push("/(tabs)/orders") },
                { icon: "dollar-sign", label: "Cüzdanım", color: Colors.light.warning, action: () => router.push("/wallet") },
                { icon: "message-circle", label: "Mesajlar", color: Colors.light.accent, action: () => router.push("/(tabs)/messages") },
                { icon: "truck", label: "Kargo Bedeli", color: "#E67E22", action: () => { setDeliveryFeeInput((currentDeliveryFee ?? 15).toString()); setShowDeliveryModal(true); } },
                { icon: "zap", label: "Reklam Ver", color: Colors.light.sponsored, action: () => router.push("/advertise") },
              ].map(item => (
                <Pressable key={item.label} style={({ pressed }) => [s.actionCard, pressed && { opacity: 0.85 }]} onPress={item.action}>
                  <View style={[s.actionIconWrap, { backgroundColor: item.color + "18" }]}>
                    <Feather name={item.icon as "package"} size={20} color={item.color} />
                  </View>
                  <Text style={s.actionLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Recent Transactions */}
          {transactions.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Son İşlemler</Text>
                <Pressable onPress={() => router.push("/wallet")} style={s.seeAll}>
                  <Text style={s.seeAllText}>Tümünü Gör</Text>
                  <Feather name="arrow-right" size={12} color={Colors.light.primary} />
                </Pressable>
              </View>
              <View style={s.card}>
                {transactions.slice().reverse().slice(0, 5).map(tx => {
                  const isEarning = tx.type === "earning";
                  const isPending = tx.type === "pending";
                  const color = isEarning ? Colors.light.success : isPending ? Colors.light.warning : Colors.light.accent;
                  return (
                    <View key={tx.id} style={s.txRow}>
                      <View style={[s.txIcon, { backgroundColor: color + "18" }]}>
                        <Feather name={isEarning ? "arrow-down-left" : isPending ? "clock" : "arrow-up-right"} size={13} color={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.txDesc} numberOfLines={1}>{tx.description}</Text>
                        <Text style={s.txDate}>{new Date(tx.createdAt).toLocaleDateString("tr-TR")}</Text>
                      </View>
                      <Text style={[s.txAmount, { color }]}>{tx.type === "withdrawal" ? "-" : "+"}₺{tx.amount.toFixed(0)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════
          TAB: ÜRÜNLERİM
      ══════════════════════════════════════ */}
      {activeTab === "products" && (
        productsLoading ? (
          <View style={{ padding: 20, gap: 12 }}>
            {[1, 2, 3].map(i => <View key={i} style={s.skeleton} />)}
          </View>
        ) : (
          <FlatList
            data={products ?? []}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 40 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const hasDiscount = item.discountPercent != null && item.discountPercent > 0;
              const dp = hasDiscount ? item.price * (1 - item.discountPercent! / 100) : null;
              const stockPct = item.dailyStock > 0 ? (item.remainingStock ?? 0) / item.dailyStock : 0;
              const stockColor = stockPct > 0.5 ? Colors.light.success : stockPct > 0.2 ? Colors.light.warning : Colors.light.accent;
              return (
                <View style={s.productCard}>
                  <View style={s.productCardTop}>
                    {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={s.productThumb} /> :
                      <View style={[s.productThumb, s.productThumbEmpty]}><Feather name="image" size={22} color={Colors.light.textMuted} /></View>}
                    <View style={s.productMeta}>
                      <View style={s.productTitleRow}>
                        <Text style={s.productTitle} numberOfLines={1}>{item.title}</Text>
                        {hasDiscount && <View style={s.discountBadge}><Text style={s.discountBadgeText}>%{item.discountPercent}</Text></View>}
                      </View>
                      <Text style={s.productCategory}>{CATEGORIES.find(c => c.slug === item.category)?.name ?? item.category}</Text>
                      <View style={s.priceRow}>
                        {hasDiscount ? (<><Text style={s.priceOriginal}>₺{item.price}</Text><Text style={s.priceDiscounted}>₺{dp?.toFixed(0)}</Text></>) : <Text style={s.price}>₺{item.price}</Text>}
                      </View>
                    </View>
                  </View>
                  <View style={s.stockSection}>
                    <View style={s.stockLabelRow}>
                      <Text style={s.stockLabel}>Stok</Text>
                      <Text style={[s.stockCount, { color: stockColor }]}>{item.remainingStock}/{item.dailyStock}</Text>
                    </View>
                    <View style={s.stockBar}>
                      <View style={[s.stockBarFill, { width: `${Math.max(3, stockPct * 100)}%` as any, backgroundColor: stockColor }]} />
                    </View>
                  </View>
                  <View style={s.productActions}>
                    <Pressable style={[s.actionChip, { backgroundColor: "#E5393512", borderColor: "#E5393530" }]} onPress={() => openDiscountModal(item)}>
                      <Feather name="tag" size={13} color="#E53935" />
                      <Text style={[s.actionChipText, { color: "#E53935" }]}>{hasDiscount ? "İndirimi Düzenle" : "İndirim Ekle"}</Text>
                    </Pressable>
                    <Pressable style={[s.actionChip, { backgroundColor: Colors.light.primary + "12", borderColor: Colors.light.primary + "30" }]} onPress={() => { setEditProduct({ id: item.id, data: { title: item.title, description: item.description, price: String(item.price), category: item.category, portion: item.portion, dailyStock: String(item.dailyStock), prepTime: String(item.prepTime), imageUrl: item.imageUrl ?? "" } }); setShowModal(true); }}>
                      <Feather name="edit-2" size={13} color={Colors.light.primary} />
                      <Text style={[s.actionChipText, { color: Colors.light.primary }]}>Düzenle</Text>
                    </Pressable>
                    <Pressable style={[s.actionChipIcon, { backgroundColor: Colors.light.accent + "12" }]} onPress={() => handleDelete(item.id, item.title)}>
                      <Feather name="trash-2" size={14} color={Colors.light.accent} />
                    </Pressable>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <View style={s.emptyIconWrap}><Feather name="package" size={36} color={Colors.light.primary} /></View>
                <Text style={s.emptyTitle}>Henüz ürün yok</Text>
                <Text style={s.emptyDesc}>İlk ürününüzü ekleyerek mağazanızı açın</Text>
                <Pressable style={s.emptyBtn} onPress={() => { setEditProduct(null); setShowModal(true); }}>
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={s.emptyBtnText}>İlk Ürünü Ekle</Text>
                </Pressable>
              </View>
            }
          />
        )
      )}

      {/* ══════════════════════════════════════
          TAB: KAMPANYA (İndirimler)
      ══════════════════════════════════════ */}
      {activeTab === "campaigns" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 40 }}>
          <View style={s.tabHeadingRow}>
            <View style={s.tabHeadingIcon}><Feather name="tag" size={16} color={Colors.light.primary} /></View>
            <View>
              <Text style={s.tabHeadingTitle}>Ürün İndirimleri</Text>
              <Text style={s.tabHeadingSub}>Her ürüne ayrı ayrı indirim uygulayabilirsiniz</Text>
            </View>
          </View>
          {productsLoading ? <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 20 }} /> :
            (products ?? []).length === 0 ? (
              <View style={[s.emptyState, { paddingTop: 40 }]}>
                <Feather name="tag" size={36} color={Colors.light.textMuted} />
                <Text style={s.emptyTitle}>Önce ürün ekleyin</Text>
                <Pressable style={s.emptyBtn} onPress={() => setActiveTab("products")}><Text style={s.emptyBtnText}>Ürünlerime Git</Text></Pressable>
              </View>
            ) : (products ?? []).map(item => {
              const hasDiscount = item.discountPercent != null && item.discountPercent > 0;
              const dp = hasDiscount ? item.price * (1 - item.discountPercent! / 100) : null;
              return (
                <View key={item.id} style={s.campaignRow}>
                  {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={s.campaignThumb} /> :
                    <View style={[s.campaignThumb, s.productThumbEmpty]}><Feather name="image" size={16} color={Colors.light.textMuted} /></View>}
                  <View style={{ flex: 1 }}>
                    <Text style={s.campaignName} numberOfLines={1}>{item.title}</Text>
                    <View style={s.priceRow}>
                      {hasDiscount ? (<><Text style={s.priceOriginal}>₺{item.price}</Text><Text style={s.priceDiscounted}>₺{dp?.toFixed(0)}</Text><View style={s.discountBadge}><Text style={s.discountBadgeText}>%{item.discountPercent}</Text></View></>) : <Text style={s.price}>₺{item.price}</Text>}
                    </View>
                  </View>
                  <Pressable style={[s.campaignActionBtn, hasDiscount ? { backgroundColor: "#E5393515", borderColor: "#E5393540" } : { backgroundColor: Colors.light.primary + "15", borderColor: Colors.light.primary + "40" }]} onPress={() => openDiscountModal(item)}>
                    <Feather name="tag" size={13} color={hasDiscount ? "#E53935" : Colors.light.primary} />
                    <Text style={[s.campaignActionText, { color: hasDiscount ? "#E53935" : Colors.light.primary }]}>{hasDiscount ? `%${item.discountPercent}` : "İndirim"}</Text>
                  </Pressable>
                </View>
              );
            })
          }
          {discountedProducts > 0 && (
            <View style={s.infoCard}>
              <Feather name="info" size={14} color={Colors.light.primary} />
              <Text style={s.infoCardText}>{discountedProducts} ürününüzde aktif indirim var. Müşteriler bu fiyatları görüyor.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════
          TAB: REKLAM
      ══════════════════════════════════════ */}
      {activeTab === "ads" && (
        <View style={{ flex: 1 }}>
          <View style={s.adSubTabBar}>
            <Pressable style={[s.adSubTab, adSubTab === "new" && s.adSubTabActive]} onPress={() => setAdSubTab("new")}>
              <Feather name="zap" size={14} color={adSubTab === "new" ? Colors.light.primary : Colors.light.textMuted} />
              <Text style={[s.adSubTabText, adSubTab === "new" && s.adSubTabTextActive]}>Yeni Reklam</Text>
            </Pressable>
            <Pressable style={[s.adSubTab, adSubTab === "my" && s.adSubTabActive]} onPress={() => setAdSubTab("my")}>
              <Feather name="list" size={14} color={adSubTab === "my" ? Colors.light.primary : Colors.light.textMuted} />
              <Text style={[s.adSubTabText, adSubTab === "my" && s.adSubTabTextActive]}>Reklamlarım {adCampaigns.length > 0 ? `(${adCampaigns.length})` : ""}</Text>
            </Pressable>
          </View>
          {adLoading ? <View style={s.loadingCenter}><ActivityIndicator size="large" color={Colors.light.primary} /></View> :
            adSubTab === "new" ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 40 }}>
                {hasActiveCampaign && activeCampaign && (
                  <View style={s.activeAdBanner}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={s.activeAdDot} />
                      <Text style={s.activeAdTitle}>Aktif Reklamınız Var</Text>
                    </View>
                    <Text style={s.activeAdExp}>{activeCampaign.endDate ? `${new Date(activeCampaign.endDate).toLocaleDateString("tr-TR")}'e kadar` : "Süresiz"}</Text>
                  </View>
                )}
                <View style={s.adInfoCard}>
                  <View style={s.adInfoIconWrap}><Feather name="trending-up" size={20} color="#fff" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.adInfoTitle}>Tüm Mağazanızı Öne Çıkarın</Text>
                    <Text style={s.adInfoDesc}>Kampanya başlattığınızda tüm ürünleriniz listenin üstünde görünür</Text>
                  </View>
                </View>
                <Text style={s.sectionTitle}>Reklam Paketi Seçin</Text>
                {adPackages.length === 0 ? (
                  <View style={s.emptyState}><Feather name="zap-off" size={36} color={Colors.light.textMuted} /><Text style={s.emptyTitle}>Paket bulunamadı</Text></View>
                ) : adPackages.map(pkg => (
                  <Pressable key={pkg.id} style={[s.adPackageCard, selectedPackage === pkg.id && { borderColor: pkg.color, borderWidth: 2 }]} onPress={() => setSelectedPackage(pkg.id)}>
                    {pkg.popular && <View style={[s.popularBadge, { backgroundColor: pkg.color }]}><Text style={s.popularBadgeText}>En Popüler</Text></View>}
                    <View style={s.adPackageHeader}>
                      <View style={[s.adPackageIcon, { backgroundColor: pkg.color + "18" }]}><Feather name="zap" size={20} color={pkg.color} /></View>
                      <View style={{ flex: 1 }}><Text style={s.adPackageName}>{pkg.name}</Text><Text style={s.adPackageDur}>{pkg.durationDays} gün · Tüm ürünler</Text></View>
                      <Text style={[s.adPackagePrice, { color: pkg.color }]}>₺{pkg.price}</Text>
                      <View style={[s.radioOuter, selectedPackage === pkg.id && { borderColor: pkg.color }]}>
                        {selectedPackage === pkg.id && <View style={[s.radioInner, { backgroundColor: pkg.color }]} />}
                      </View>
                    </View>
                    <View style={s.adFeatureList}>
                      {pkg.features.map((f, i) => (
                        <View key={i} style={s.adFeatureRow}><Feather name="check" size={13} color={pkg.color} /><Text style={s.adFeatureText}>{f}</Text></View>
                      ))}
                    </View>
                  </Pressable>
                ))}
                <View style={s.termsCard}>
                  <Feather name="file-text" size={14} color={Colors.light.textSecondary} />
                  <Text style={s.termsText}>Kampanya bedelinin 3 iş günü içinde belirtilen hesaba ödenmesi gerekmektedir. Ödeme yapılmayan kampanyalar otomatik olarak iptal edilir.</Text>
                </View>
                <Pressable style={s.agreeRow} onPress={() => setAgreedToTerms(!agreedToTerms)}>
                  <Switch value={agreedToTerms} onValueChange={setAgreedToTerms} trackColor={{ false: Colors.light.border, true: Colors.light.primary + "80" }} thumbColor={agreedToTerms ? Colors.light.primary : "#f4f3f4"} />
                  <Text style={s.agreeText}>Kampanya koşullarını okudum ve kabul ediyorum</Text>
                </Pressable>
                <Pressable style={[s.adSubmitBtn, (submittingAd || !agreedToTerms || !selectedPackage || hasActiveCampaign) && { opacity: 0.5 }]} onPress={handleAdSubmit} disabled={submittingAd || !agreedToTerms || !selectedPackage || hasActiveCampaign}>
                  {submittingAd ? <ActivityIndicator color="#fff" /> : <><Feather name="zap" size={18} color="#fff" /><Text style={s.adSubmitBtnText}>{hasActiveCampaign ? "Aktif Kampanya Mevcut" : "Reklamı Başlat"}</Text></>}
                </Pressable>
              </ScrollView>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 40 }}>
                {adCampaigns.length === 0 ? (
                  <View style={[s.emptyState, { paddingTop: 40 }]}>
                    <Feather name="zap-off" size={40} color={Colors.light.textMuted} />
                    <Text style={s.emptyTitle}>Henüz reklamınız yok</Text>
                    <Text style={s.emptyDesc}>İlk reklam kampanyanızı başlatın</Text>
                    <Pressable style={s.emptyBtn} onPress={() => setAdSubTab("new")}><Feather name="plus" size={16} color="#fff" /><Text style={s.emptyBtnText}>Reklam Oluştur</Text></Pressable>
                  </View>
                ) : adCampaigns.map(camp => {
                  const { label, color } = adStatusLabel(camp.status);
                  const pkg = adPackages.find(p => p.id === camp.packageType);
                  return (
                    <View key={camp.id} style={s.adCampaignCard}>
                      <View style={s.adCampaignHeader}>
                        <View style={[s.adCampaignIcon, { backgroundColor: (pkg?.color ?? Colors.light.primary) + "18" }]}><Feather name="zap" size={18} color={pkg?.color ?? Colors.light.primary} /></View>
                        <View style={{ flex: 1 }}><Text style={s.adCampaignName}>{pkg?.name ?? camp.packageType} Paketi</Text><Text style={s.adCampaignSub}>Tüm ürünler · {camp.durationDays} gün</Text></View>
                        <View style={[s.statusBadge, { backgroundColor: color + "18" }]}><View style={[s.statusDot, { backgroundColor: color }]} /><Text style={[s.statusText, { color }]}>{label}</Text></View>
                      </View>
                      <View style={s.adCampaignDivider} />
                      <View style={s.adCampaignMeta}>
                        <View style={s.adCampaignMetaItem}><Feather name="calendar" size={12} color={Colors.light.textMuted} /><Text style={s.adMetaText}>{camp.startDate ? new Date(camp.startDate).toLocaleDateString("tr-TR") : "-"}</Text></View>
                        <Feather name="arrow-right" size={12} color={Colors.light.textMuted} />
                        <View style={s.adCampaignMetaItem}><Feather name="calendar" size={12} color={Colors.light.textMuted} /><Text style={s.adMetaText}>{camp.endDate ? new Date(camp.endDate).toLocaleDateString("tr-TR") : "-"}</Text></View>
                        <View style={{ flex: 1 }} />
                        <Text style={s.adCampaignPrice}>₺{camp.price}</Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )
          }
        </View>
      )}

      {/* ══════════════════════════════════════
          TAB: HİJYEN
      ══════════════════════════════════════ */}
      {activeTab === "hygiene" && (
        hygieneLoading ? <View style={s.loadingCenter}><ActivityIndicator size="large" color="#10B981" /></View> : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 40 }}>
            <View style={s.hygieneScoreCard}>
              <Feather name="shield" size={40} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={s.hygieneScoreTitle}>Platform Hijyen Skoru</Text>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
                  <Text style={s.hygieneScoreBig}>{hygienePlatformScore?.toFixed(1) ?? "0.0"}</Text>
                  <Text style={s.hygieneScoreMax}>/5</Text>
                </View>
                <Text style={s.hygieneScoreHint}>Bildirimleri onaylayarak skor artar</Text>
              </View>
              {hygienePlatformScore != null && hygienePlatformScore >= 4.5 && (
                <View style={s.hygieneEliteBadge}><Text style={s.hygieneEliteText}>⭐ Üstün</Text></View>
              )}
            </View>
            <Text style={s.tabHeadingTitle}>Hijyen Bildirimleri</Text>
            <Text style={[s.tabHeadingSub, { marginBottom: 16 }]}>Hangi önlemleri aldığınızı işaretleyin. Her kriter platform skorunuzu etkiler.</Text>
            {[
              { key: "wearsGloves", label: "Eldiven kullanıyorum", desc: "Yemek hazırlarken tek kullanımlık eldiven takıyorum", icon: "shield", points: 1.0 },
              { key: "wearsBone", label: "Bone / Kep kullanıyorum", desc: "Saçların yemeğe karışmaması için bone veya kep takıyorum", icon: "user", points: 1.0 },
              { key: "hasHealthCert", label: "Sağlık sertifikam var", desc: "Gıda üretimi için geçerli sağlık sertifikasına sahibim", icon: "award", points: 1.25 },
              { key: "washesHands", label: "El yıkama protokolü", desc: "Pişirmeden önce ve sonra ellerimi yıkıyorum", icon: "droplet", points: 0.5 },
              { key: "singleUsePackaging", label: "Tek kullanımlık ambalaj", desc: "Ürünleri hijyenik tek kullanımlık kutularda teslim ediyorum", icon: "box", points: 0.75 },
              { key: "kitchenProtocol", label: "Mutfak temizlik protokolü", desc: "Mutfağımı düzenli olarak dezenfekte ediyorum", icon: "trash-2", points: 0.5 },
            ].map(item => {
              const val = hygieneDecl[item.key as keyof typeof hygieneDecl] as boolean;
              return (
                <View key={item.key} style={s.hygieneRow}>
                  <View style={[s.hygieneCriteriaIcon, val && { backgroundColor: "#10B98120" }]}>
                    <Feather name={item.icon as "shield"} size={18} color={val ? "#10B981" : Colors.light.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.hygieneLabel, val && { color: "#10B981" }]}>{item.label}</Text>
                    <Text style={s.hygieneDesc}>{item.desc}</Text>
                    <View style={s.hygienePointBadge}><Text style={s.hygienePointText}>+{item.points} puan</Text></View>
                  </View>
                  <Switch value={val} onValueChange={v => setHygieneDecl(prev => ({ ...prev, [item.key]: v }))} trackColor={{ false: Colors.light.border, true: "#10B98160" }} thumbColor={val ? "#10B981" : "#f4f3f4"} />
                </View>
              );
            })}
            <View style={fSt.group}>
              <Text style={fSt.label}>Ek Hijyen Notu (isteğe bağlı)</Text>
              <TextInput style={[fSt.input, fSt.inputMulti]} value={hygieneDecl.note} onChangeText={v => setHygieneDecl(prev => ({ ...prev, note: v }))} placeholder="Örn: Helal sertifikalı ürünler kullanıyorum..." placeholderTextColor={Colors.light.textMuted} multiline numberOfLines={3} />
            </View>
            <Pressable style={[s.adSubmitBtn, { backgroundColor: "#10B981" }, hygieneSaving && { opacity: 0.6 }]} onPress={saveHygieneDeclaration} disabled={hygieneSaving}>
              {hygieneSaving ? <ActivityIndicator color="#fff" /> : <><Feather name="save" size={18} color="#fff" /><Text style={s.adSubmitBtnText}>Hijyen Profilini Kaydet</Text></>}
            </Pressable>
          </ScrollView>
        )
      )}

      {/* ─── Product Add/Edit Modal ─── */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { paddingTop: topInset + 8 }]}>
          <View style={s.modalHeader}>
            <Pressable onPress={() => { setShowModal(false); setEditProduct(null); }} hitSlop={8}>
              <Feather name="x" size={22} color={Colors.light.text} />
            </Pressable>
            <Text style={s.modalTitle}>{editProduct ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}</Text>
            <View style={{ width: 24 }} />
          </View>
          <ProductForm
            initial={editProduct?.data}
            onSave={handleSave}
            onCancel={() => { setShowModal(false); setEditProduct(null); }}
            loading={formLoading}
            token={token ?? undefined}
          />
        </View>
      </Modal>

      {/* ─── Discount Modal ─── */}
      <Modal visible={showDiscountModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { paddingTop: topInset + 24 }]}>
          <View style={s.modalHeader}>
            <Pressable onPress={() => setShowDiscountModal(false)} hitSlop={8}><Feather name="x" size={22} color={Colors.light.text} /></Pressable>
            <Text style={s.modalTitle}>İndirim Belirle</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 16 }}>
            {discountProduct && (
              <View style={s.infoCard}>
                <Feather name="tag" size={15} color={Colors.light.primary} />
                <Text style={s.infoCardText}>{discountProduct.title} · Orijinal fiyat: ₺{discountProduct.price}</Text>
              </View>
            )}
            <Text style={s.fieldLabel}>İndirim Oranı (%)</Text>
            <View style={s.inputWrapper}>
              <Feather name="tag" size={18} color={Colors.light.textMuted} />
              <TextInput style={s.inputField} value={discountInput} onChangeText={setDiscountInput} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.light.textMuted} />
              <Text style={s.inputSuffix}>%</Text>
            </View>
            <View style={s.presetRow}>
              {[0, 10, 15, 20, 25, 30, 40, 50].map(pct => (
                <Pressable key={pct} style={[s.presetBtn, discountInput === pct.toString() && s.presetBtnActive]} onPress={() => setDiscountInput(pct.toString())}>
                  <Text style={[s.presetBtnText, discountInput === pct.toString() && s.presetBtnTextActive]}>{pct === 0 ? "Kaldır" : `%${pct}`}</Text>
                </Pressable>
              ))}
            </View>
            {parseInt(discountInput) > 0 && discountProduct && (
              <View style={[s.infoCard, { backgroundColor: Colors.light.success + "12" }]}>
                <Feather name="check-circle" size={15} color={Colors.light.success} />
                <Text style={[s.infoCardText, { color: Colors.light.success }]}>Yeni fiyat: ₺{discountedPrice.toFixed(0)} (%{discountInput} indirimli)</Text>
              </View>
            )}
            <Pressable style={[s.adSubmitBtn, savingDiscount && { opacity: 0.7 }]} onPress={handleSaveDiscount} disabled={savingDiscount}>
              {savingDiscount ? <ActivityIndicator color="#fff" /> : <><Feather name="check" size={18} color="#fff" /><Text style={s.adSubmitBtnText}>{parseInt(discountInput) === 0 ? "İndirimi Kaldır" : "İndirimi Uygula"}</Text></>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* ─── Delivery Fee Modal ─── */}
      <Modal visible={showDeliveryModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { paddingTop: topInset + 24 }]}>
          <View style={s.modalHeader}>
            <Pressable onPress={() => setShowDeliveryModal(false)} hitSlop={8}><Feather name="x" size={22} color={Colors.light.text} /></Pressable>
            <Text style={s.modalTitle}>Kargo Bedeli</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 16 }}>
            <View style={s.infoCard}>
              <Feather name="info" size={15} color={Colors.light.primary} />
              <Text style={s.infoCardText}>Kargo bedeli siparişlerde müşteriden ayrıca tahsil edilir. Kargo bedelinden komisyon alınmaz.</Text>
            </View>
            <Text style={s.fieldLabel}>Kargo Bedeli (₺)</Text>
            <View style={s.inputWrapper}>
              <Feather name="truck" size={18} color={Colors.light.textMuted} />
              <TextInput style={s.inputField} value={deliveryFeeInput} onChangeText={setDeliveryFeeInput} keyboardType="numeric" placeholder="15" placeholderTextColor={Colors.light.textMuted} />
              <Text style={s.inputSuffix}>₺</Text>
            </View>
            <View style={s.presetRow}>
              {[0, 10, 15, 20, 25, 30].map(fee => (
                <Pressable key={fee} style={[s.presetBtn, deliveryFeeInput === fee.toString() && s.presetBtnActive]} onPress={() => setDeliveryFeeInput(fee.toString())}>
                  <Text style={[s.presetBtnText, deliveryFeeInput === fee.toString() && s.presetBtnTextActive]}>{fee === 0 ? "Ücretsiz" : `₺${fee}`}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={[s.adSubmitBtn, savingFee && { opacity: 0.7 }]} onPress={handleSaveDeliveryFee} disabled={savingFee}>
              {savingFee ? <ActivityIndicator color="#fff" /> : <><Feather name="check" size={18} color="#fff" /><Text style={s.adSubmitBtnText}>Kaydet</Text></>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: Colors.light.background, padding: 24 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary, textAlign: "center" },
  backBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  backBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },

  // Header
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 10 },
  headerCenter: { flex: 1, alignItems: "center", gap: 4 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.light.text },
  livePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.light.success + "18", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.light.success },
  liveText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.light.success },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.surface, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.primary, alignItems: "center", justifyContent: "center" },

  // Stats
  statsScroll: { maxHeight: 100, marginBottom: 2 },
  statsRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 10, flexDirection: "row" },
  statCard: { borderRadius: 14, padding: 12, alignItems: "center", gap: 4, borderWidth: 1, backgroundColor: Colors.light.surface, minWidth: 88 },
  statIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textAlign: "center" },

  // Tab Bar
  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight, marginBottom: 4 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 3, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: Colors.light.primary },
  tabText: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  tabBadge: { position: "absolute", top: 8, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.light.success },

  // Tab headings
  tabHeadingRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.light.surface, borderRadius: 14, padding: 14, marginBottom: 16 },
  tabHeadingIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.light.primary + "15", alignItems: "center", justifyContent: "center" },
  tabHeadingTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  tabHeadingSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2 },

  // Store Banner
  storeBanner: { height: 155, marginHorizontal: 20, borderRadius: 20, overflow: "hidden", backgroundColor: Colors.light.backgroundSecondary, marginBottom: 6, marginTop: 8 },
  storeBannerEmpty: { ...StyleSheet.absoluteFillObject, backgroundColor: `${Colors.light.primary}25` },
  storeBannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.38)", justifyContent: "flex-end", padding: 16 },
  storeBannerContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  storeAvatarWrap: { width: 46, height: 46, borderRadius: 23, overflow: "hidden", borderWidth: 2, borderColor: "#fff" },
  storeAvatar: { width: "100%", height: "100%" },
  storeAvatarFallback: { width: "100%", height: "100%", backgroundColor: Colors.light.primary + "80", alignItems: "center", justifyContent: "center" },
  storeAvatarInitial: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  storeName: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  storeRole: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 1 },
  storeCameraBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },
  bannerHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textAlign: "center", marginBottom: 16 },

  // Wallet / Balance Card
  balanceCard: { backgroundColor: Colors.light.primary, marginHorizontal: 20, borderRadius: 22, padding: 20, marginBottom: 14, ...Platform.select({ ios: { shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 18 }, android: { elevation: 8 }, web: { boxShadow: `0 8px 28px ${Colors.light.primary}55` } }) },
  balanceTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 },
  balanceLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginBottom: 3 },
  balanceAmount: { fontSize: 34, fontFamily: "Inter_700Bold", color: "#fff" },
  withdrawBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  withdrawBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  balanceDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 14 },
  balanceStatsRow: { flexDirection: "row" },
  balanceStat: { flex: 1, alignItems: "center", gap: 4 },
  balanceStatIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  balanceStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", textAlign: "center" },
  balanceStatValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  balanceStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)" },

  // Summary Row
  summaryRow: { flexDirection: "row", gap: 12, marginHorizontal: 20, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 16, padding: 14, gap: 4, borderWidth: 1 },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  summaryValue: { fontSize: 18, fontFamily: "Inter_700Bold" },

  // Sections / Cards
  section: { paddingHorizontal: 20, marginBottom: 18 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 10 },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 4 },
  seeAllText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },
  card: { backgroundColor: Colors.light.surface, borderRadius: 16, padding: 16 },
  loadingRow: { alignItems: "center", paddingVertical: 40 },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Quick Actions
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCard: { width: "30%", flexGrow: 1, backgroundColor: Colors.light.surface, borderRadius: 16, padding: 14, alignItems: "center", gap: 8, borderWidth: 1, borderColor: Colors.light.borderLight },
  actionIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.light.text, textAlign: "center" },

  // Transactions
  txRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight },
  txIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  txDesc: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text },
  txDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 1 },
  txAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },

  // Products
  skeleton: { height: 120, borderRadius: 16, backgroundColor: Colors.light.backgroundSecondary },
  productCard: { backgroundColor: Colors.light.surface, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.light.borderLight },
  productCardTop: { flexDirection: "row", gap: 12, marginBottom: 10 },
  productThumb: { width: 72, height: 72, borderRadius: 12 },
  productThumbEmpty: { backgroundColor: Colors.light.backgroundSecondary, alignItems: "center", justifyContent: "center" },
  productMeta: { flex: 1 },
  productTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  productTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  productCategory: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginBottom: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  price: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  priceOriginal: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textDecorationLine: "line-through" },
  priceDiscounted: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#E53935" },
  discountBadge: { backgroundColor: "#E5393518", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  discountBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#E53935" },
  stockSection: { marginBottom: 10 },
  stockLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  stockLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  stockCount: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  stockBar: { height: 4, borderRadius: 2, backgroundColor: Colors.light.borderLight, overflow: "hidden" },
  stockBarFill: { height: "100%", borderRadius: 2 },
  productActions: { flexDirection: "row", gap: 8 },
  actionChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  actionChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  actionChipIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  // Campaign
  campaignRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.light.surface, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: Colors.light.borderLight },
  campaignThumb: { width: 52, height: 52, borderRadius: 10 },
  campaignName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 4 },
  campaignActionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  campaignActionText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Ads
  adSubTabBar: { flexDirection: "row", backgroundColor: Colors.light.backgroundSecondary, marginHorizontal: 16, borderRadius: 12, padding: 3, marginBottom: 8 },
  adSubTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10 },
  adSubTabActive: { backgroundColor: Colors.light.surface, ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }, android: { elevation: 2 } }) },
  adSubTabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  adSubTabTextActive: { color: Colors.light.primary, fontFamily: "Inter_600SemiBold" },
  activeAdBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.light.success + "15", borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: Colors.light.success + "30" },
  activeAdDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.light.success },
  activeAdTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.success },
  activeAdExp: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  adInfoCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.light.primary + "12", borderRadius: 14, padding: 16, marginBottom: 16 },
  adInfoIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.light.primary, alignItems: "center", justifyContent: "center" },
  adInfoTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 2 },
  adInfoDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, lineHeight: 17 },
  adPackageCard: { backgroundColor: Colors.light.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.light.borderLight, overflow: "hidden" },
  popularBadge: { position: "absolute", top: 0, right: 0, paddingHorizontal: 12, paddingVertical: 5, borderBottomLeftRadius: 12 },
  popularBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  adPackageHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  adPackageIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  adPackageName: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.light.text },
  adPackageDur: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2 },
  adPackagePrice: { fontSize: 18, fontFamily: "Inter_700Bold" },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.light.border, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  adFeatureList: { gap: 6 },
  adFeatureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  adFeatureText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  termsCard: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: Colors.light.backgroundSecondary, borderRadius: 12, padding: 14 },
  termsText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, lineHeight: 18 },
  agreeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  agreeText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.text, lineHeight: 19 },
  adSubmitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.light.primary, borderRadius: 16, paddingVertical: 16, marginTop: 8 },
  adSubmitBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  adCampaignCard: { backgroundColor: Colors.light.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.light.borderLight },
  adCampaignHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  adCampaignIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  adCampaignName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  adCampaignSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2 },
  adCampaignDivider: { height: 1, backgroundColor: Colors.light.borderLight, marginVertical: 12 },
  adCampaignMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  adCampaignMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  adMetaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  adCampaignPrice: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.light.text },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // Hygiene
  hygieneScoreCard: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: "#10B98112", borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: "#10B98130" },
  hygieneScoreTitle: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  hygieneScoreBig: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#10B981" },
  hygieneScoreMax: { fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  hygieneScoreHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2 },
  hygieneEliteBadge: { backgroundColor: "#10B981", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  hygieneEliteText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  hygieneRow: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.light.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.light.borderLight },
  hygieneCriteriaIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.light.backgroundSecondary, alignItems: "center", justifyContent: "center" },
  hygieneLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  hygieneDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2, lineHeight: 17 },
  hygienePointBadge: { marginTop: 5, alignSelf: "flex-start", backgroundColor: "#10B98115", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  hygienePointText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#10B981" },

  // Info / empty
  infoCard: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: Colors.light.primary + "12", borderRadius: 12, padding: 14, marginBottom: 8 },
  infoCardText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.text, lineHeight: 19 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 22, backgroundColor: Colors.light.primary + "15", alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textAlign: "center", paddingHorizontal: 20 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },

  // Modals
  modal: { flex: 1, backgroundColor: Colors.light.background },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: 16 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.light.text },

  // Modal fields
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  inputWrapper: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.light.surface, borderRadius: 14, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: Colors.light.border },
  inputField: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.light.text },
  inputSuffix: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.textMuted },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.light.backgroundSecondary, borderWidth: 1, borderColor: Colors.light.border },
  presetBtnActive: { backgroundColor: Colors.light.primary + "15", borderColor: Colors.light.primary },
  presetBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  presetBtnTextActive: { color: Colors.light.primary, fontFamily: "Inter_600SemiBold" },
});
