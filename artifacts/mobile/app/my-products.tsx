import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform,
  TextInput, Alert, ActivityIndicator, ScrollView, Modal, Image, Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import {
  useGetUserProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  getBaseUrl,
} from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = getBaseUrl();

const CATEGORIES = [
  { slug: "borek",      name: "Börek" },
  { slug: "pogaca",     name: "Poğaça" },
  { slug: "baklava",    name: "Baklava" },
  { slug: "kurabiye",   name: "Kurabiye" },
  { slug: "sarma",      name: "Sarma / Dolma" },
  { slug: "icli-kofte", name: "İçli Köfte" },
  { slug: "manti",      name: "Mantı" },
  { slug: "dessert",    name: "Tatlılar" },
];

const PORTION_PRESETS = ["Porsiyon", "500 gr", "1 Kg", "Adet"];

const DISCOUNT_PRESETS = [0, 10, 15, 20, 25, 30, 40, 50];

type Tab = "products" | "campaigns" | "ads" | "hygiene";

type ProductFormData = {
  title: string;
  description: string;
  price: string;
  category: string;
  portion: string;
  dailyStock: string;
  prepTime: string;
  imageUrl: string;
};

interface AdPackage {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  description: string;
  features: string[];
  color: string;
  popular?: boolean;
}

interface AdCampaign {
  id: number;
  packageType: string;
  durationDays: number;
  price: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

function StatCard({ icon, label, value, color, bg }: {
  icon: string; label: string; value: string | number; color: string; bg: string;
}) {
  return (
    <View style={[statStyles.card, { backgroundColor: bg }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: color + "20" }]}>
        <Feather name={icon as "package"} size={16} color={color} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1, borderRadius: 14, padding: 12, alignItems: "center", gap: 4,
    minWidth: 80,
  },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  value: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.light.text },
  label: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textAlign: "center" },
});

function FormField({ label, value, onChange, placeholder, multiline, keyboardType }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; multiline?: boolean; keyboardType?: "numeric" | "default";
}) {
  return (
    <View style={formStyles.fieldGroup}>
      <Text style={formStyles.fieldLabel}>{label}</Text>
      <TextInput
        style={[formStyles.fieldInput, multiline && formStyles.fieldInputMultiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.light.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType ?? "default"}
      />
    </View>
  );
}

const formStyles = StyleSheet.create({
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 6 },
  fieldInput: {
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text,
    backgroundColor: Colors.light.surface,
  },
  fieldInputMultiline: { height: 80, textAlignVertical: "top" },
});

function ProductForm({
  initial, onSave, onCancel, loading, token,
}: {
  initial?: ProductFormData; onSave: (data: ProductFormData) => void;
  onCancel: () => void; loading: boolean; token?: string;
}) {
  const [form, setForm] = useState<ProductFormData>(initial ?? {
    title: "", description: "", price: "",
    category: "borek", portion: "Porsiyon",
    dailyStock: "10", prepTime: "30", imageUrl: "",
  });
  const [uploading, setUploading] = useState(false);

  const set = (key: keyof ProductFormData, val: string) => setForm(f => ({ ...f, [key]: val }));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("İzin Gerekli", "Fotoğraf seçmek için galeri erişimi gereklidir");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", { uri: asset.uri, type: asset.mimeType ?? "image/jpeg", name: asset.fileName ?? "product.jpg" } as unknown as Blob);
      const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      set("imageUrl", url);
    } catch {
      Alert.alert("Hata", "Fotoğraf yüklenemedi. Lütfen tekrar deneyin.");
    } finally { setUploading(false); }
  };

  return (
    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={formStyles.fieldLabel}>Ürün Fotoğrafı</Text>
      <Pressable
        style={[pStyles.imagePicker, form.imageUrl && { padding: 0 }]}
        onPress={pickImage}
        disabled={uploading}
      >
        {uploading ? <ActivityIndicator color={Colors.light.primary} /> :
          form.imageUrl ? <Image source={{ uri: form.imageUrl }} style={pStyles.imagePreview} resizeMode="cover" /> :
          <View style={pStyles.imagePlaceholder}>
            <Feather name="camera" size={28} color={Colors.light.textMuted} />
            <Text style={pStyles.imagePlaceholderText}>Fotoğraf Ekle</Text>
          </View>}
      </Pressable>
      {!!form.imageUrl && (
        <Pressable onPress={() => set("imageUrl", "")} style={pStyles.removeImage}>
          <Text style={pStyles.removeImageText}>Fotoğrafı Kaldır</Text>
        </Pressable>
      )}

      <FormField label="Ürün Adı" value={form.title} onChange={v => set("title", v)} placeholder="Örn: Mercimek Çorbası" />
      <FormField label="Açıklama" value={form.description} onChange={v => set("description", v)} placeholder="Ürün açıklaması..." multiline />
      <FormField label="Fiyat (₺)" value={form.price} onChange={v => set("price", v)} placeholder="0" keyboardType="numeric" />

      <View style={formStyles.fieldGroup}>
        <Text style={formStyles.fieldLabel}>Miktar / Porsiyon</Text>
        <View style={pStyles.portionGrid}>
          {PORTION_PRESETS.map(p => (
            <Pressable
              key={p}
              style={[pStyles.portionChip, form.portion === p && pStyles.portionChipActive]}
              onPress={() => set("portion", p)}
            >
              <Text style={[pStyles.portionChipText, form.portion === p && pStyles.portionChipTextActive]}>{p}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[formStyles.fieldInput, { marginTop: 8 }]}
          value={form.portion}
          onChangeText={v => set("portion", v)}
          placeholder="Veya özel girin: 2.5 kg, 5 porsiyon..."
          placeholderTextColor={Colors.light.textMuted}
        />
      </View>

      <FormField label="Günlük Stok" value={form.dailyStock} onChange={v => set("dailyStock", v)} placeholder="10" keyboardType="numeric" />
      <FormField label="Hazırlama Süresi (dk)" value={form.prepTime} onChange={v => set("prepTime", v)} placeholder="30" keyboardType="numeric" />

      <Text style={formStyles.fieldLabel}>Kategori</Text>
      <View style={pStyles.categoryGrid}>
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat.slug}
            style={[pStyles.catChip, form.category === cat.slug && pStyles.catChipActive]}
            onPress={() => set("category", cat.slug)}
          >
            <Text style={[pStyles.catChipText, form.category === cat.slug && pStyles.catChipTextActive]}>{cat.name}</Text>
          </Pressable>
        ))}
      </View>

      <View style={pStyles.formButtons}>
        <Pressable style={pStyles.cancelBtn} onPress={onCancel}>
          <Text style={pStyles.cancelBtnText}>İptal</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [pStyles.saveBtn, pressed && { opacity: 0.9 }, (loading || uploading) && { opacity: 0.7 }]}
          onPress={() => onSave(form)}
          disabled={loading || uploading}
        >
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={pStyles.saveBtnText}>Kaydet</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

export default function MyProductsScreen() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [activeTab, setActiveTab] = useState<Tab>("products");

  // --- Product management ---
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<null | { id: number; data: ProductFormData }>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountProduct, setDiscountProduct] = useState<null | { id: number; title: string; price: number; discountPercent: number | null }>(null);
  const [discountInput, setDiscountInput] = useState("0");
  const [savingDiscount, setSavingDiscount] = useState(false);

  const { data: products, isLoading: productsLoading, refetch } = useGetUserProducts(user?.id ?? 0, { query: { enabled: !!user?.isSeller && !!user?.id } });
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

  const hasActiveCampaign = adCampaigns.some(c => c.status === "active");
  const activeCampaign = adCampaigns.find(c => c.status === "active");

  // --- Hygiene declarations ---
  const [hygieneDecl, setHygieneDecl] = useState({
    wearsGloves: false,
    wearsBone: false,
    hasHealthCert: false,
    washesHands: false,
    singleUsePackaging: false,
    kitchenProtocol: false,
    note: "",
  });
  const [hygienePlatformScore, setHygienePlatformScore] = useState<number | null>(null);
  const [hygieneLoading, setHygieneLoading] = useState(false);
  const [hygieneSaving, setHygieneSaving] = useState(false);

  const fetchHygieneDeclaration = useCallback(async () => {
    if (!token) return;
    setHygieneLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/hygiene/declaration`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setHygieneDecl({
          wearsGloves: d.wearsGloves ?? false,
          wearsBone: d.wearsBone ?? false,
          hasHealthCert: d.hasHealthCert ?? false,
          washesHands: d.washesHands ?? false,
          singleUsePackaging: d.singleUsePackaging ?? false,
          kitchenProtocol: d.kitchenProtocol ?? false,
          note: d.note ?? "",
        });
        setHygienePlatformScore(d.platformScore ?? null);
      }
    } catch { } finally { setHygieneLoading(false); }
  }, [token]);

  const saveHygieneDeclaration = async () => {
    if (!token) return;
    setHygieneSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/hygiene/declaration`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(hygieneDecl),
      });
      if (res.ok) {
        const d = await res.json();
        setHygienePlatformScore(d.platformScore);
        Alert.alert("Kaydedildi ✓", `Hijyen profiliniz güncellendi.\nPlatform puanınız: ${d.platformScore}/5`);
      }
    } catch {
      Alert.alert("Hata", "Kaydedilemedi");
    } finally { setHygieneSaving(false); }
  };

  const fetchAdData = useCallback(async () => {
    if (!token) return;
    setAdLoading(true);
    try {
      const [pkgRes, campRes] = await Promise.all([
        fetch(`${API_BASE}/api/ads/packages`),
        fetch(`${API_BASE}/api/ads/my-campaigns`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (pkgRes.ok) setAdPackages(await pkgRes.json());
      if (campRes.ok) setAdCampaigns(await campRes.json());
    } catch { } finally { setAdLoading(false); }
  }, [token]);

  useEffect(() => { if (activeTab === "ads") fetchAdData(); }, [activeTab, fetchAdData]);
  useEffect(() => { if (activeTab === "hygiene") fetchHygieneDeclaration(); }, [activeTab, fetchHygieneDeclaration]);

  const handleSave = async (form: ProductFormData) => {
    if (!form.title || !form.price) { Alert.alert("Hata", "Başlık ve fiyat zorunludur"); return; }
    setFormLoading(true);
    try {
      const body = {
        title: form.title, description: form.description,
        price: parseFloat(form.price), category: form.category,
        portion: form.portion, dailyStock: parseInt(form.dailyStock) || 10,
        prepTime: parseInt(form.prepTime) || 30,
        imageUrl: form.imageUrl || undefined,
      };
      if (editProduct) await updateProduct.mutateAsync({ id: editProduct.id, data: body });
      else await createProduct.mutateAsync({ data: body });
      setShowModal(false);
      setEditProduct(null);
      refetch();
    } catch (err: unknown) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Kaydedilemedi");
    } finally { setFormLoading(false); }
  };

  const handleDelete = (id: number, title: string) => {
    Alert.alert("Ürünü Sil", `"${title}" silinsin mi?`, [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil", style: "destructive",
        onPress: async () => {
          try { await deleteProduct.mutateAsync({ id }); refetch(); }
          catch { Alert.alert("Hata", "Silinemedi"); }
        },
      },
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
    if (isNaN(pct) || pct < 0 || pct > 80) {
      Alert.alert("Hata", "İndirim oranı 0 ile 80 arasında olmalıdır");
      return;
    }
    setSavingDiscount(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/${discountProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ discountPercent: pct === 0 ? null : pct }),
      });
      if (!res.ok) throw new Error("Güncelleme başarısız");
      setShowDiscountModal(false);
      refetch();
      Alert.alert(
        pct === 0 ? "İndirim Kaldırıldı" : "İndirim Uygulandı",
        pct === 0
          ? `"${discountProduct.title}" ürününden indirim kaldırıldı.`
          : `"${discountProduct.title}" ürününe %${pct} indirim uygulandı.\nYeni fiyat: ₺${(discountProduct.price * (1 - pct / 100)).toFixed(0)}`
      );
    } catch {
      Alert.alert("Hata", "İndirim güncellenemedi");
    } finally { setSavingDiscount(false); }
  };

  const handleAdSubmit = async () => {
    if (!selectedPackage) { Alert.alert("Hata", "Lütfen bir kampanya paketi seçin"); return; }
    if (!agreedToTerms) { Alert.alert("Hata", "Kampanya koşullarını kabul etmeniz gerekmektedir"); return; }
    const pkg = adPackages.find(p => p.id === selectedPackage);
    if (!pkg) return;
    Alert.alert(
      "Kampanya Başlat",
      `${pkg.name} paketi ₺${pkg.price} tutarında olup ${pkg.durationDays} gün boyunca tüm ürünlerinizi öne çıkaracaktır.\n\nDevam etmek istiyor musunuz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Onayla",
          onPress: async () => {
            setSubmittingAd(true);
            try {
              const res = await fetch(`${API_BASE}/api/ads/apply`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ packageType: selectedPackage, agreedToTerms: true }),
              });
              const data = await res.json();
              if (!res.ok) {
                Alert.alert("Hata", data.error ?? "Kampanya başlatılamadı");
              } else {
                Alert.alert("Kampanya Başlatıldı! 🎉", "Tüm ürünleriniz artık öne çıkanlar arasında görünecek.", [
                  { text: "Tamam", onPress: () => { fetchAdData(); setAdSubTab("my"); } }
                ]);
                setSelectedPackage(null);
                setAgreedToTerms(false);
              }
            } catch {
              Alert.alert("Hata", "Bir sorun oluştu, lütfen tekrar deneyin");
            } finally { setSubmittingAd(false); }
          },
        },
      ]
    );
  };

  const adStatusLabel = (s: string) => {
    if (s === "active") return { label: "Aktif", color: Colors.light.success };
    if (s === "pending") return { label: "Beklemede", color: Colors.light.warning };
    if (s === "expired") return { label: "Sona Erdi", color: Colors.light.textMuted };
    return { label: "İptal", color: Colors.light.accent };
  };

  if (!user?.isSeller) {
    return (
      <View style={[styles.centered, { paddingTop: topInset }]}>
        <Feather name="lock" size={48} color={Colors.light.textMuted} />
        <Text style={styles.errorText}>Sadece satıcılar bu paneli kullanabilir</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  const totalProducts = products?.length ?? 0;
  const activeProducts = products?.filter(p => (p.remainingStock ?? 0) > 0).length ?? 0;
  const discountedProducts = products?.filter(p => p.discountPercent && p.discountPercent > 0).length ?? 0;
  const discountedPrice = discountProduct ? discountProduct.price * (1 - parseInt(discountInput || "0") / 100) : 0;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Mağaza Yönetimi</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Canlı</Text>
          </View>
        </View>
        {activeTab === "products" ? (
          <Pressable style={styles.addBtn} onPress={() => { setEditProduct(null); setShowModal(true); }}>
            <Feather name="plus" size={20} color="#fff" />
          </Pressable>
        ) : activeTab === "hygiene" ? (
          <Pressable
            style={[styles.addBtn, { backgroundColor: "#10B981", opacity: hygieneSaving ? 0.6 : 1 }]}
            onPress={saveHygieneDeclaration}
            disabled={hygieneSaving}
          >
            {hygieneSaving ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="save" size={18} color="#fff" />}
          </Pressable>
        ) : (
          <Pressable style={styles.iconBtn} onPress={() => { refetch(); fetchAdData(); }}>
            <Feather name="refresh-cw" size={16} color={Colors.light.text} />
          </Pressable>
        )}
      </View>

      {/* Stats Strip */}
      <View style={styles.statsStrip}>
        <StatCard icon="package" label="Toplam" value={totalProducts} color={Colors.light.primary} bg={Colors.light.primary + "10"} />
        <StatCard icon="check-circle" label="Aktif" value={activeProducts} color={Colors.light.success} bg={Colors.light.success + "10"} />
        <StatCard icon="tag" label="İndirimli" value={discountedProducts} color="#E53935" bg="#E5393510" />
        <StatCard icon="zap" label={hasActiveCampaign ? "Reklam ✓" : "Reklam"} value={hasActiveCampaign ? "Aktif" : "Yok"} color={Colors.light.sponsored} bg={Colors.light.sponsored + "10"} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {([
          { id: "products", icon: "package", label: "Ürünlerim" },
          { id: "campaigns", icon: "tag", label: "Kampanya" },
          { id: "ads", icon: "zap", label: "Reklam" },
          { id: "hygiene", icon: "shield", label: "Hijyen" },
        ] as { id: Tab; icon: string; label: string }[]).map(t => (
          <Pressable key={t.id} style={[styles.tab, activeTab === t.id && styles.tabActive]} onPress={() => setActiveTab(t.id)}>
            <Feather
              name={t.icon as "package"}
              size={15}
              color={activeTab === t.id ? (t.id === "hygiene" ? "#10B981" : Colors.light.primary) : Colors.light.textMuted}
            />
            <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive, activeTab === t.id && t.id === "hygiene" && { color: "#10B981" }]}>{t.label}</Text>
            {t.id === "ads" && hasActiveCampaign && <View style={styles.tabBadge} />}
            {t.id === "hygiene" && hygienePlatformScore != null && hygienePlatformScore > 0 && <View style={[styles.tabBadge, { backgroundColor: "#10B981" }]} />}
          </Pressable>
        ))}
      </View>

      {/* ─── TAB: ÜRÜNLERIM ─── */}
      {activeTab === "products" && (
        productsLoading ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 10 }}>
            {[1, 2, 3].map(i => <View key={i} style={styles.skeleton} />)}
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
                <View style={styles.productCard}>
                  <View style={styles.productCardTop}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.productThumb} />
                    ) : (
                      <View style={[styles.productThumb, styles.productThumbEmpty]}>
                        <Feather name="image" size={22} color={Colors.light.textMuted} />
                      </View>
                    )}
                    <View style={styles.productMeta}>
                      <View style={styles.productTitleRow}>
                        <Text style={styles.productTitle} numberOfLines={1}>{item.title}</Text>
                        {hasDiscount && (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountBadgeText}>%{item.discountPercent}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.productCategory}>{CATEGORIES.find(c => c.slug === item.category)?.name ?? item.category}</Text>
                      <View style={styles.priceRow}>
                        {hasDiscount ? (
                          <>
                            <Text style={styles.priceOriginal}>₺{item.price}</Text>
                            <Text style={styles.priceDiscounted}>₺{dp?.toFixed(0)}</Text>
                          </>
                        ) : (
                          <Text style={styles.price}>₺{item.price}</Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Stock bar */}
                  <View style={styles.stockSection}>
                    <View style={styles.stockLabelRow}>
                      <Text style={styles.stockLabel}>Stok</Text>
                      <Text style={[styles.stockCount, { color: stockColor }]}>{item.remainingStock}/{item.dailyStock}</Text>
                    </View>
                    <View style={styles.stockBar}>
                      <View style={[styles.stockBarFill, { width: `${Math.max(3, stockPct * 100)}%` as any, backgroundColor: stockColor }]} />
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.productCardActions}>
                    <Pressable
                      style={[styles.actionChip, { backgroundColor: "#E5393512", borderColor: "#E5393530" }]}
                      onPress={() => openDiscountModal(item)}
                    >
                      <Feather name="tag" size={13} color="#E53935" />
                      <Text style={[styles.actionChipText, { color: "#E53935" }]}>
                        {hasDiscount ? "İndirimi Düzenle" : "İndirim Ekle"}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[styles.actionChip, { backgroundColor: Colors.light.primary + "12", borderColor: Colors.light.primary + "30" }]}
                      onPress={() => {
                        setEditProduct({
                          id: item.id,
                          data: {
                            title: item.title, description: item.description,
                            price: String(item.price), category: item.category,
                            portion: item.portion, dailyStock: String(item.dailyStock),
                            prepTime: String(item.prepTime), imageUrl: item.imageUrl ?? "",
                          },
                        });
                        setShowModal(true);
                      }}
                    >
                      <Feather name="edit-2" size={13} color={Colors.light.primary} />
                      <Text style={[styles.actionChipText, { color: Colors.light.primary }]}>Düzenle</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.actionChipIcon, { backgroundColor: Colors.light.accent + "12" }]}
                      onPress={() => handleDelete(item.id, item.title)}
                    >
                      <Feather name="trash-2" size={14} color={Colors.light.accent} />
                    </Pressable>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Feather name="package" size={36} color={Colors.light.primary} />
                </View>
                <Text style={styles.emptyTitle}>Henüz ürün yok</Text>
                <Text style={styles.emptyDesc}>İlk ürününüzü ekleyerek mağazanızı açın</Text>
                <Pressable style={styles.emptyBtn} onPress={() => setShowModal(true)}>
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.emptyBtnText}>İlk Ürünü Ekle</Text>
                </Pressable>
              </View>
            }
          />
        )
      )}

      {/* ─── TAB: KAMPANYA ─── */}
      {activeTab === "campaigns" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 40 }}>
          <Text style={styles.sectionHeading}>Ürün İndirimleri</Text>
          <Text style={styles.sectionSubheading}>Her ürüne ayrı ayrı indirim uygulayabilirsiniz</Text>

          {productsLoading ? (
            <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 20 }} />
          ) : (products ?? []).length === 0 ? (
            <View style={[styles.emptyState, { paddingTop: 40 }]}>
              <Feather name="tag" size={36} color={Colors.light.textMuted} />
              <Text style={styles.emptyTitle}>Önce ürün ekleyin</Text>
              <Pressable style={styles.emptyBtn} onPress={() => setActiveTab("products")}>
                <Text style={styles.emptyBtnText}>Ürünlerime Git</Text>
              </Pressable>
            </View>
          ) : (
            (products ?? []).map(item => {
              const hasDiscount = item.discountPercent != null && item.discountPercent > 0;
              const dp = hasDiscount ? item.price * (1 - item.discountPercent! / 100) : null;
              return (
                <View key={item.id} style={styles.campaignProductRow}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.campaignThumb} />
                  ) : (
                    <View style={[styles.campaignThumb, styles.productThumbEmpty]}>
                      <Feather name="image" size={16} color={Colors.light.textMuted} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.campaignProductName} numberOfLines={1}>{item.title}</Text>
                    <View style={styles.campaignPriceRow}>
                      {hasDiscount ? (
                        <>
                          <Text style={styles.priceOriginal}>₺{item.price}</Text>
                          <Text style={styles.priceDiscounted}>₺{dp?.toFixed(0)}</Text>
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountBadgeText}>%{item.discountPercent}</Text>
                          </View>
                        </>
                      ) : (
                        <Text style={styles.price}>₺{item.price}</Text>
                      )}
                    </View>
                  </View>
                  <Pressable
                    style={[
                      styles.campaignActionBtn,
                      hasDiscount
                        ? { backgroundColor: "#E5393515", borderColor: "#E5393540" }
                        : { backgroundColor: Colors.light.primary + "15", borderColor: Colors.light.primary + "40" }
                    ]}
                    onPress={() => { openDiscountModal(item); }}
                  >
                    <Feather name="tag" size={13} color={hasDiscount ? "#E53935" : Colors.light.primary} />
                    <Text style={[styles.campaignActionText, { color: hasDiscount ? "#E53935" : Colors.light.primary }]}>
                      {hasDiscount ? `%${item.discountPercent}` : "İndirim"}
                    </Text>
                  </Pressable>
                </View>
              );
            })
          )}

          {/* Summary */}
          {discountedProducts > 0 && (
            <View style={styles.campaignSummaryCard}>
              <View style={styles.campaignSummaryRow}>
                <Feather name="info" size={15} color={Colors.light.primary} />
                <Text style={styles.campaignSummaryText}>
                  {discountedProducts} ürününüzde aktif indirim var. Müşteriler bu fiyatları görüyor.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ─── TAB: REKLAM ─── */}
      {activeTab === "ads" && (
        <View style={{ flex: 1 }}>
          {/* Ad Sub-tabs */}
          <View style={styles.adTabBar}>
            <Pressable style={[styles.adTab, adSubTab === "new" && styles.adTabActive]} onPress={() => setAdSubTab("new")}>
              <Feather name="zap" size={14} color={adSubTab === "new" ? Colors.light.primary : Colors.light.textMuted} />
              <Text style={[styles.adTabText, adSubTab === "new" && styles.adTabTextActive]}>Yeni Reklam</Text>
            </Pressable>
            <Pressable style={[styles.adTab, adSubTab === "my" && styles.adTabActive]} onPress={() => setAdSubTab("my")}>
              <Feather name="list" size={14} color={adSubTab === "my" ? Colors.light.primary : Colors.light.textMuted} />
              <Text style={[styles.adTabText, adSubTab === "my" && styles.adTabTextActive]}>
                Reklamlarım {adCampaigns.length > 0 ? `(${adCampaigns.length})` : ""}
              </Text>
            </Pressable>
          </View>

          {adLoading ? (
            <View style={styles.loadingCenter}><ActivityIndicator size="large" color={Colors.light.primary} /></View>
          ) : adSubTab === "new" ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 40 }}>
              {/* Active campaign notice */}
              {hasActiveCampaign && activeCampaign && (
                <View style={styles.activeAdBanner}>
                  <View style={styles.activeAdBannerLeft}>
                    <View style={styles.activeAdDot} />
                    <Text style={styles.activeAdTitle}>Aktif Reklamınız Var</Text>
                  </View>
                  <Text style={styles.activeAdExp}>
                    {activeCampaign.endDate ? `${new Date(activeCampaign.endDate).toLocaleDateString("tr-TR")}'e kadar` : "Süresiz"}
                  </Text>
                </View>
              )}

              {/* Info card */}
              <View style={styles.adInfoCard}>
                <View style={styles.adInfoIconWrap}>
                  <Feather name="trending-up" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.adInfoTitle}>Tüm Mağazanızı Öne Çıkarın</Text>
                  <Text style={styles.adInfoDesc}>Kampanya başlattığınızda tüm ürünleriniz listenin üstünde görünür</Text>
                </View>
              </View>

              {/* Packages */}
              <Text style={styles.sectionHeading}>Reklam Paketi Seçin</Text>
              {adPackages.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="zap-off" size={36} color={Colors.light.textMuted} />
                  <Text style={styles.emptyTitle}>Paket bulunamadı</Text>
                </View>
              ) : (
                adPackages.map(pkg => (
                  <Pressable
                    key={pkg.id}
                    style={[styles.adPackageCard, selectedPackage === pkg.id && { borderColor: pkg.color, borderWidth: 2 }]}
                    onPress={() => setSelectedPackage(pkg.id)}
                  >
                    {pkg.popular && (
                      <View style={[styles.popularBadge, { backgroundColor: pkg.color }]}>
                        <Text style={styles.popularBadgeText}>En Popüler</Text>
                      </View>
                    )}
                    <View style={styles.adPackageHeader}>
                      <View style={[styles.adPackageIcon, { backgroundColor: pkg.color + "18" }]}>
                        <Feather name="zap" size={20} color={pkg.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.adPackageName}>{pkg.name}</Text>
                        <Text style={styles.adPackageDur}>{pkg.durationDays} gün · Tüm ürünler</Text>
                      </View>
                      <Text style={[styles.adPackagePrice, { color: pkg.color }]}>₺{pkg.price}</Text>
                      <View style={[styles.radioOuter, selectedPackage === pkg.id && { borderColor: pkg.color }]}>
                        {selectedPackage === pkg.id && <View style={[styles.radioInner, { backgroundColor: pkg.color }]} />}
                      </View>
                    </View>
                    <View style={styles.adFeatureList}>
                      {pkg.features.map((f, i) => (
                        <View key={i} style={styles.adFeatureRow}>
                          <Feather name="check" size={13} color={pkg.color} />
                          <Text style={styles.adFeatureText}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  </Pressable>
                ))
              )}

              {/* Terms */}
              <View style={styles.termsCard}>
                <Feather name="file-text" size={15} color={Colors.light.textSecondary} />
                <Text style={styles.termsText}>
                  Kampanya bedelinin 3 iş günü içinde belirtilen hesaba ödenmesi gerekmektedir.
                  Ödeme yapılmayan kampanyalar otomatik olarak iptal edilir.
                </Text>
              </View>
              <Pressable style={styles.agreeRow} onPress={() => setAgreedToTerms(!agreedToTerms)}>
                <Switch
                  value={agreedToTerms}
                  onValueChange={setAgreedToTerms}
                  trackColor={{ false: Colors.light.border, true: Colors.light.primary + "80" }}
                  thumbColor={agreedToTerms ? Colors.light.primary : "#f4f3f4"}
                />
                <Text style={styles.agreeText}>Kampanya koşullarını okudum ve kabul ediyorum</Text>
              </Pressable>

              {/* Submit */}
              <Pressable
                style={[styles.adSubmitBtn, (submittingAd || !agreedToTerms || !selectedPackage || hasActiveCampaign) && { opacity: 0.6 }]}
                onPress={handleAdSubmit}
                disabled={submittingAd || !agreedToTerms || !selectedPackage || hasActiveCampaign}
              >
                {submittingAd ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Feather name="zap" size={18} color="#fff" />
                    <Text style={styles.adSubmitBtnText}>
                      {hasActiveCampaign ? "Aktif Kampanya Mevcut" : "Reklamı Başlat"}
                    </Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 40 }}>
              {adCampaigns.length === 0 ? (
                <View style={[styles.emptyState, { paddingTop: 40 }]}>
                  <Feather name="zap-off" size={40} color={Colors.light.textMuted} />
                  <Text style={styles.emptyTitle}>Henüz reklamınız yok</Text>
                  <Text style={styles.emptyDesc}>İlk reklam kampanyanızı başlatın</Text>
                  <Pressable style={styles.emptyBtn} onPress={() => setAdSubTab("new")}>
                    <Feather name="plus" size={16} color="#fff" />
                    <Text style={styles.emptyBtnText}>Reklam Oluştur</Text>
                  </Pressable>
                </View>
              ) : (
                adCampaigns.map(camp => {
                  const { label, color } = adStatusLabel(camp.status);
                  const pkg = adPackages.find(p => p.id === camp.packageType);
                  return (
                    <View key={camp.id} style={styles.adCampaignCard}>
                      <View style={styles.adCampaignHeader}>
                        <View style={[styles.adCampaignIcon, { backgroundColor: (pkg?.color ?? Colors.light.primary) + "18" }]}>
                          <Feather name="zap" size={18} color={pkg?.color ?? Colors.light.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.adCampaignName}>{pkg?.name ?? camp.packageType} Paketi</Text>
                          <Text style={styles.adCampaignSub}>Tüm ürünler · {camp.durationDays} gün</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: color + "18" }]}>
                          <View style={[styles.statusDot, { backgroundColor: color }]} />
                          <Text style={[styles.statusText, { color }]}>{label}</Text>
                        </View>
                      </View>
                      <View style={styles.adCampaignDivider} />
                      <View style={styles.adCampaignMeta}>
                        <View style={styles.adCampaignMetaItem}>
                          <Feather name="calendar" size={12} color={Colors.light.textMuted} />
                          <Text style={styles.adMetaText}>
                            {camp.startDate ? new Date(camp.startDate).toLocaleDateString("tr-TR") : "-"}
                          </Text>
                        </View>
                        <Feather name="arrow-right" size={12} color={Colors.light.textMuted} />
                        <View style={styles.adCampaignMetaItem}>
                          <Feather name="calendar" size={12} color={Colors.light.textMuted} />
                          <Text style={styles.adMetaText}>
                            {camp.endDate ? new Date(camp.endDate).toLocaleDateString("tr-TR") : "-"}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }} />
                        <Text style={styles.adCampaignPrice}>₺{camp.price}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* ─── TAB: HİJYEN ─── */}
      {activeTab === "hygiene" && (
        hygieneLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 40 }}>
            {/* Score card */}
            <View style={styles.hygieneScoreCard}>
              <View style={styles.hygieneScoreLeft}>
                <Feather name="shield" size={36} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hygieneScoreTitle}>Platform Hijyen Skoru</Text>
                <View style={styles.hygieneScoreRow}>
                  <Text style={styles.hygieneScoreBig}>{hygienePlatformScore?.toFixed(1) ?? "0.0"}</Text>
                  <Text style={styles.hygieneScoreMax}>/5</Text>
                </View>
                <Text style={styles.hygieneScoreHint}>Bildirimleri onaylayarak skor artar</Text>
              </View>
              {hygienePlatformScore != null && hygienePlatformScore >= 4.5 && (
                <View style={styles.hygieneEliteBadge}>
                  <Text style={styles.hygieneEliteText}>⭐ Üstün</Text>
                </View>
              )}
            </View>

            <Text style={styles.hygieneSectionTitle}>Hijyen Bildirimleri</Text>
            <Text style={styles.hygieneSectionSub}>Hangi önlemleri aldığınızı işaretleyin. Her kriter platorm skorunuzu etkiler.</Text>

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
                <View key={item.key} style={styles.hygieneCriteriaRow}>
                  <View style={[styles.hygieneCriteriaIcon, val && { backgroundColor: "#10B98120" }]}>
                    <Feather name={item.icon as "shield"} size={18} color={val ? "#10B981" : Colors.light.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.hygieneCriteriaLabel, val && { color: "#10B981" }]}>{item.label}</Text>
                    <Text style={styles.hygieneCriteriaDesc}>{item.desc}</Text>
                    <View style={styles.hygienePointsBadge}>
                      <Text style={styles.hygienePointsText}>+{item.points} puan</Text>
                    </View>
                  </View>
                  <Switch
                    value={val}
                    onValueChange={v => setHygieneDecl(prev => ({ ...prev, [item.key]: v }))}
                    trackColor={{ false: Colors.light.border, true: "#10B98160" }}
                    thumbColor={val ? "#10B981" : "#f4f3f4"}
                  />
                </View>
              );
            })}

            {/* Note field */}
            <View style={[formStyles.fieldGroup, { marginTop: 8 }]}>
              <Text style={formStyles.fieldLabel}>Ek Hijyen Notu (isteğe bağlı)</Text>
              <TextInput
                style={[formStyles.fieldInput, formStyles.fieldInputMultiline]}
                value={hygieneDecl.note}
                onChangeText={v => setHygieneDecl(prev => ({ ...prev, note: v }))}
                placeholder="Örn: Helal sertifikalı ürünler kullanıyorum, mutfağım düzenli denetleniyor..."
                placeholderTextColor={Colors.light.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <Pressable
              style={[styles.hygieneSaveBtn, hygieneSaving && { opacity: 0.6 }]}
              onPress={saveHygieneDeclaration}
              disabled={hygieneSaving}
            >
              {hygieneSaving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Feather name="check-circle" size={18} color="#fff" />
                  <Text style={styles.hygieneSaveBtnText}>Hijyen Profilini Kaydet</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        )
      )}

      {/* ── MODAL: Ürün Ekle/Düzenle ── */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { paddingTop: topInset + 16 }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => { setShowModal(false); setEditProduct(null); }} hitSlop={8}>
              <Feather name="x" size={22} color={Colors.light.text} />
            </Pressable>
            <Text style={styles.modalTitle}>{editProduct ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}</Text>
            <View style={{ width: 22 }} />
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

      {/* ── MODAL: İndirim ── */}
      <Modal visible={showDiscountModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { paddingTop: topInset + 16 }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowDiscountModal(false)} hitSlop={8}>
              <Feather name="x" size={22} color={Colors.light.text} />
            </Pressable>
            <Text style={styles.modalTitle}>İndirim Ayarla</Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingBottom: 40 }}>
            <View style={styles.discountProductCard}>
              <Feather name="package" size={18} color={Colors.light.primary} />
              <Text style={styles.discountProductName} numberOfLines={1}>{discountProduct?.title}</Text>
              <Text style={styles.discountProductBasePrice}>₺{discountProduct?.price}</Text>
            </View>

            {parseInt(discountInput || "0") > 0 && (
              <View style={styles.discountPreviewCard}>
                <View style={styles.discountPreviewBadge}>
                  <Text style={styles.discountPreviewBadgeText}>%{discountInput} İndirim</Text>
                </View>
                <View style={styles.discountPreviewPrices}>
                  <Text style={styles.discountPreviewOriginal}>₺{discountProduct?.price}</Text>
                  <Text style={styles.discountPreviewNew}>₺{discountedPrice.toFixed(0)}</Text>
                </View>
                <Text style={styles.discountPreviewHint}>Müşteri bu fiyatı görür</Text>
              </View>
            )}

            <Text style={[formStyles.fieldLabel, { marginBottom: 0 }]}>Hızlı Seçim</Text>
            <View style={styles.presetGrid}>
              {DISCOUNT_PRESETS.map(pct => (
                <Pressable
                  key={pct}
                  style={[styles.presetBtn, discountInput === String(pct) && styles.presetBtnActive]}
                  onPress={() => setDiscountInput(String(pct))}
                >
                  <Text style={[styles.presetBtnText, discountInput === String(pct) && styles.presetBtnTextActive]}>
                    {pct === 0 ? "Yok" : `%${pct}`}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[formStyles.fieldLabel, { marginBottom: 0 }]}>Manuel Giriş (%0 - %80)</Text>
            <View style={styles.discountInputRow}>
              <Feather name="tag" size={18} color={Colors.light.textMuted} />
              <TextInput
                style={styles.discountInput}
                value={discountInput}
                onChangeText={v => setDiscountInput(v.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.light.textMuted}
              />
              <Text style={styles.discountInputSuffix}>%</Text>
            </View>

            <Pressable
              style={[styles.discountSaveBtn, savingDiscount && { opacity: 0.7 }]}
              onPress={handleSaveDiscount}
              disabled={savingDiscount}
            >
              {savingDiscount ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={styles.discountSaveBtnText}>
                    {parseInt(discountInput || "0") === 0 ? "İndirimi Kaldır" : "İndirimi Uygula"}
                  </Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const pStyles = StyleSheet.create({
  imagePicker: {
    height: 120, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.light.border,
    borderStyle: "dashed", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.light.backgroundSecondary, marginBottom: 8, overflow: "hidden",
  },
  imagePreview: { width: "100%", height: "100%" },
  imagePlaceholder: { alignItems: "center", gap: 8 },
  imagePlaceholderText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  removeImage: { alignSelf: "flex-end", marginBottom: 12 },
  removeImageText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.accent },
  portionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  portionChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary, borderWidth: 1, borderColor: Colors.light.border,
  },
  portionChipActive: { backgroundColor: Colors.light.primary + "18", borderColor: Colors.light.primary },
  portionChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  portionChipTextActive: { color: Colors.light.primary, fontFamily: "Inter_600SemiBold" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary, borderWidth: 1, borderColor: Colors.light.border,
  },
  catChipActive: { backgroundColor: Colors.light.primary + "18", borderColor: Colors.light.primary },
  catChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  catChipTextActive: { color: Colors.light.primary, fontFamily: "Inter_600SemiBold" },
  formButtons: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.light.backgroundSecondary, alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.textSecondary },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.light.primary, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: Colors.light.background, padding: 24 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary, textAlign: "center" },
  backBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  backBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text },
  liveIndicator: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.light.success },
  liveText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.light.success },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.surface, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.primary, alignItems: "center", justifyContent: "center" },

  statsStrip: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 12 },

  tabBar: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.light.surface, borderRadius: 14, padding: 4,
    ...Platform.select({ web: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } }),
  },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: Colors.light.primary + "15" },
  tabText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  tabTextActive: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  tabBadge: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.light.success, position: "absolute", top: 6, right: 10 },

  skeleton: { height: 120, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 16, marginBottom: 10 },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },

  productCard: {
    backgroundColor: Colors.light.surface, borderRadius: 16, padding: 14, marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: "0 2px 12px rgba(60,30,10,0.07)" },
    }),
  },
  productCardTop: { flexDirection: "row", gap: 12, marginBottom: 12 },
  productThumb: { width: 60, height: 60, borderRadius: 12 },
  productThumbEmpty: { backgroundColor: Colors.light.backgroundSecondary, alignItems: "center", justifyContent: "center" },
  productMeta: { flex: 1, justifyContent: "space-between" },
  productTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  productTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text, flex: 1 },
  productCategory: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2 },
  discountBadge: { backgroundColor: "#E5393515", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: "#E5393530" },
  discountBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#E53935" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  price: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.light.text },
  priceOriginal: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textDecorationLine: "line-through" },
  priceDiscounted: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#E53935" },

  stockSection: { marginBottom: 12 },
  stockLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  stockLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  stockCount: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  stockBar: { height: 4, backgroundColor: Colors.light.borderLight, borderRadius: 2, overflow: "hidden" },
  stockBarFill: { height: "100%", borderRadius: 2 },

  productCardActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  actionChip: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  actionChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  actionChipIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.light.primary + "15", alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textAlign: "center" },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.light.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  emptyBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },

  sectionHeading: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.light.text, marginBottom: 4 },
  sectionSubheading: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginBottom: 14 },

  campaignProductRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.light.surface, borderRadius: 14, padding: 12, marginBottom: 8,
  },
  campaignThumb: { width: 44, height: 44, borderRadius: 10 },
  campaignProductName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 2 },
  campaignPriceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  campaignActionBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  campaignActionText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  campaignSummaryCard: {
    backgroundColor: Colors.light.primary + "10", borderRadius: 14, padding: 14, marginTop: 8,
    borderWidth: 1, borderColor: Colors.light.primary + "25",
  },
  campaignSummaryRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  campaignSummaryText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.text, lineHeight: 19 },

  adTabBar: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.light.backgroundSecondary, borderRadius: 12, padding: 3,
  },
  adTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10 },
  adTabActive: { backgroundColor: Colors.light.surface },
  adTabText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  adTabTextActive: { color: Colors.light.primary, fontFamily: "Inter_700Bold" },

  activeAdBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.light.success + "15", borderRadius: 14, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.light.success + "30",
  },
  activeAdBannerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  activeAdDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.light.success },
  activeAdTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.light.success },
  activeAdExp: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },

  adInfoCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.light.primary, borderRadius: 16, padding: 16, marginBottom: 16,
  },
  adInfoIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  adInfoTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 3 },
  adInfoDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)", lineHeight: 17 },

  adPackageCard: {
    backgroundColor: Colors.light.surface, borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.light.border, overflow: "hidden",
  },
  popularBadge: { position: "absolute", top: 0, right: 0, paddingHorizontal: 12, paddingVertical: 5, borderBottomLeftRadius: 12 },
  popularBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#fff" },
  adPackageHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  adPackageIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  adPackageName: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.light.text },
  adPackageDur: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2 },
  adPackagePrice: { fontSize: 20, fontFamily: "Inter_700Bold", marginRight: 8 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.light.border, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  adFeatureList: { gap: 6 },
  adFeatureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  adFeatureText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },

  termsCard: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: Colors.light.backgroundSecondary, borderRadius: 12, padding: 14, marginTop: 8,
  },
  termsText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, lineHeight: 18 },
  agreeRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  agreeText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text },
  adSubmitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.light.primary, borderRadius: 16, paddingVertical: 16, marginTop: 8,
  },
  adSubmitBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },

  adCampaignCard: { backgroundColor: Colors.light.surface, borderRadius: 16, padding: 14, marginBottom: 10 },
  adCampaignHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  adCampaignIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  adCampaignName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  adCampaignSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  adCampaignDivider: { height: 1, backgroundColor: Colors.light.borderLight, marginVertical: 10 },
  adCampaignMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  adCampaignMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  adMetaText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  adCampaignPrice: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.light.primary },

  modal: { flex: 1, backgroundColor: Colors.light.background },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text },

  discountProductCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.light.backgroundSecondary, borderRadius: 14, padding: 14,
  },
  discountProductName: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  discountProductBasePrice: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  discountPreviewCard: {
    backgroundColor: "#E5393510", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#E5393525",
    alignItems: "center", gap: 4,
  },
  discountPreviewBadge: { backgroundColor: "#E53935", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 4 },
  discountPreviewBadgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  discountPreviewPrices: { flexDirection: "row", alignItems: "center", gap: 10 },
  discountPreviewOriginal: { fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textDecorationLine: "line-through" },
  discountPreviewNew: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#E53935" },
  discountPreviewHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  presetBtn: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
    backgroundColor: Colors.light.backgroundSecondary, borderWidth: 1, borderColor: Colors.light.border,
  },
  presetBtnActive: { backgroundColor: Colors.light.primary + "18", borderColor: Colors.light.primary },
  presetBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  presetBtnTextActive: { color: Colors.light.primary, fontFamily: "Inter_700Bold" },
  discountInputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Colors.light.surface,
  },
  discountInput: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text },
  discountInputSuffix: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.textMuted },
  discountSaveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.light.primary, borderRadius: 14, paddingVertical: 15,
  },
  discountSaveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },

  // Hygiene tab
  hygieneScoreCard: {
    flexDirection: "row", alignItems: "center", gap: 16,
    backgroundColor: "#10B98112", borderRadius: 18, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: "#10B98130",
  },
  hygieneScoreLeft: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: "#10B98120",
    alignItems: "center", justifyContent: "center",
  },
  hygieneScoreTitle: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#10B981", marginBottom: 2 },
  hygieneScoreRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  hygieneScoreBig: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#10B981" },
  hygieneScoreMax: { fontSize: 16, fontFamily: "Inter_400Regular", color: "#10B981", opacity: 0.7 },
  hygieneScoreHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#10B981", opacity: 0.8, marginTop: 2 },
  hygieneEliteBadge: {
    backgroundColor: "#10B981", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start",
  },
  hygieneEliteText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  hygieneSectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.light.text, marginBottom: 4 },
  hygieneSectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginBottom: 16, lineHeight: 18 },
  hygieneCriteriaRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.light.surface, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.light.borderLight,
  },
  hygieneCriteriaIcon: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.light.backgroundSecondary,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  hygieneCriteriaLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginBottom: 2 },
  hygieneCriteriaDesc: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, lineHeight: 16, marginBottom: 4 },
  hygienePointsBadge: {
    backgroundColor: "#10B98118", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start",
  },
  hygienePointsText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#10B981" },
  hygieneSaveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#10B981", borderRadius: 14, paddingVertical: 16, marginTop: 8,
  },
  hygieneSaveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
});
