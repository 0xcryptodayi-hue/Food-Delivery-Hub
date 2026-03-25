import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform,
  TextInput, Alert, ActivityIndicator, ScrollView, Modal, Image,
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

const CATEGORIES = [
  { slug: "main-dish", name: "Ana Yemek" },
  { slug: "soup", name: "Çorba" },
  { slug: "dessert", name: "Tatlı" },
  { slug: "breakfast", name: "Kahvaltı" },
  { slug: "salad", name: "Salata" },
  { slug: "pastry", name: "Börek" },
];

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

function ProductForm({
  initial,
  onSave,
  onCancel,
  loading,
  token,
}: {
  initial?: ProductFormData;
  onSave: (data: ProductFormData) => void;
  onCancel: () => void;
  loading: boolean;
  token?: string;
}) {
  const [form, setForm] = useState<ProductFormData>(initial ?? {
    title: "", description: "", price: "",
    category: "main-dish", portion: "1 kişilik",
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
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: asset.uri,
        type: asset.mimeType ?? "image/jpeg",
        name: asset.fileName ?? "product.jpg",
      } as unknown as Blob);

      const res = await fetch(`${getBaseUrl()}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      set("imageUrl", url);
    } catch (e) {
      Alert.alert("Hata", "Fotoğraf yüklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.fieldLabel}>Ürün Fotoğrafı</Text>
      <Pressable style={styles.imagePicker} onPress={pickImage} disabled={uploading}>
        {uploading ? (
          <ActivityIndicator color={Colors.light.primary} />
        ) : form.imageUrl ? (
          <Image source={{ uri: form.imageUrl }} style={styles.imagePreview} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="camera" size={28} color={Colors.light.textMuted} />
            <Text style={styles.imagePlaceholderText}>Fotoğraf Ekle</Text>
          </View>
        )}
      </Pressable>
      {form.imageUrl ? (
        <Pressable onPress={() => set("imageUrl", "")} style={styles.removeImage}>
          <Text style={styles.removeImageText}>Fotoğrafı Kaldır</Text>
        </Pressable>
      ) : null}

      <FormField label="Ürün Adı" value={form.title} onChange={v => set("title", v)} placeholder="Örn: Mercimek Çorbası" />
      <FormField label="Açıklama" value={form.description} onChange={v => set("description", v)} placeholder="Ürün açıklaması..." multiline />
      <FormField label="Fiyat (₺)" value={form.price} onChange={v => set("price", v)} placeholder="0" keyboardType="numeric" />
      <FormField label="Porsiyon" value={form.portion} onChange={v => set("portion", v)} placeholder="1 kişilik" />
      <FormField label="Günlük Stok" value={form.dailyStock} onChange={v => set("dailyStock", v)} placeholder="10" keyboardType="numeric" />
      <FormField label="Hazırlama Süresi (dk)" value={form.prepTime} onChange={v => set("prepTime", v)} placeholder="30" keyboardType="numeric" />

      <Text style={styles.fieldLabel}>Kategori</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat.slug}
            style={[styles.catChip, form.category === cat.slug && styles.catChipActive]}
            onPress={() => set("category", cat.slug)}
          >
            <Text style={[styles.catChipText, form.category === cat.slug && styles.catChipTextActive]}>
              {cat.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.formButtons}>
        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>İptal</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.9 }, (loading || uploading) && { opacity: 0.7 }]}
          onPress={() => onSave(form)}
          disabled={loading || uploading}
        >
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function FormField({ label, value, onChange, placeholder, multiline, keyboardType }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; multiline?: boolean; keyboardType?: "numeric" | "default";
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
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

export default function MyProductsScreen() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<null | { id: number; data: ProductFormData }>(null);
  const [formLoading, setFormLoading] = useState(false);

  const { data: products, isLoading, refetch } = useGetUserProducts(user?.id ?? 0, { query: { enabled: !!user?.isSeller && !!user?.id } });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

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
      if (editProduct) {
        await updateProduct.mutateAsync({ id: editProduct.id, data: body });
      } else {
        await createProduct.mutateAsync({ data: body });
      }
      setShowModal(false);
      setEditProduct(null);
      refetch();
    } catch (err: unknown) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (id: number, title: string) => {
    Alert.alert("Ürünü Sil", `"${title}" silinsin mi?`, [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil", style: "destructive",
        onPress: async () => {
          try {
            await deleteProduct.mutateAsync({ id });
            refetch();
          } catch { Alert.alert("Hata", "Silinemedi"); }
        },
      },
    ]);
  };

  if (!user?.isSeller) {
    return (
      <View style={[styles.centered, { paddingTop: topInset }]}>
        <Text style={styles.errorText}>Sadece satıcılar bu sayfayı görebilir</Text>
        <Pressable onPress={() => router.back()}><Text style={styles.backLink}>Geri Dön</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Ürünlerim</Text>
        <Pressable style={styles.addBtn} onPress={() => { setEditProduct(null); setShowModal(true); }}>
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {[1, 2].map(i => <View key={i} style={styles.skeleton} />)}
        </View>
      ) : (
        <FlatList
          data={products ?? []}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.productItem}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.productThumb} />
              ) : (
                <View style={[styles.productThumb, styles.productThumbEmpty]}>
                  <Feather name="image" size={20} color={Colors.light.textMuted} />
                </View>
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productTitle}>{item.title}</Text>
                <Text style={styles.productMeta}>₺{item.price} · {item.remainingStock}/{item.dailyStock} stok</Text>
              </View>
              <View style={styles.productActions}>
                <Pressable
                  style={styles.editBtn}
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
                  <Feather name="edit-2" size={16} color={Colors.light.primary} />
                </Pressable>
                <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item.id, item.title)}>
                  <Feather name="trash-2" size={16} color={Colors.light.accent} />
                </Pressable>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>Henüz ürün yok</Text>
              <Pressable style={styles.addFirstBtn} onPress={() => setShowModal(true)}>
                <Text style={styles.addFirstBtnText}>İlk Ürününüzü Ekleyin</Text>
              </Pressable>
            </View>
          }
        />
      )}

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { paddingTop: topInset + 20 }]}>
          <Text style={styles.modalTitle}>{editProduct ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}</Text>
          <ProductForm
            initial={editProduct?.data}
            onSave={handleSave}
            onCancel={() => { setShowModal(false); setEditProduct(null); }}
            loading={formLoading}
            token={token ?? undefined}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.light.background, gap: 12 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  backLink: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.light.primary },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.surface, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.primary, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  productItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.light.surface, borderRadius: 14, padding: 12, marginBottom: 8,
  },
  productThumb: { width: 52, height: 52, borderRadius: 10 },
  productThumbEmpty: { backgroundColor: Colors.light.backgroundSecondary, alignItems: "center", justifyContent: "center" },
  productInfo: { flex: 1 },
  productTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  productMeta: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, marginTop: 2 },
  productActions: { flexDirection: "row", gap: 8 },
  editBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.light.primary + "15", alignItems: "center", justifyContent: "center" },
  deleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.light.accent + "15", alignItems: "center", justifyContent: "center" },
  skeleton: { height: 70, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 14, marginBottom: 8 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  addFirstBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  addFirstBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  modal: { flex: 1, backgroundColor: Colors.light.background, paddingHorizontal: 20 },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text, marginBottom: 20, textAlign: "center" },
  formScroll: { flex: 1 },
  imagePicker: {
    height: 160, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.light.border,
    borderStyle: "dashed", overflow: "hidden", marginBottom: 8,
  },
  imagePreview: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.light.backgroundSecondary },
  imagePlaceholderText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.light.textMuted },
  removeImage: { alignItems: "center", marginBottom: 16 },
  removeImageText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.accent },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary, marginBottom: 8 },
  fieldInput: {
    backgroundColor: Colors.light.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.light.text,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  fieldInputMultiline: { height: 80, textAlignVertical: "top" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.border },
  catChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  catChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.light.textSecondary },
  catChipTextActive: { color: "#fff" },
  formButtons: { flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 40 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: Colors.light.backgroundSecondary, alignItems: "center" },
  cancelBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.light.textSecondary },
  saveBtn: { flex: 2, paddingVertical: 16, borderRadius: 14, backgroundColor: Colors.light.primary, alignItems: "center" },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
});
