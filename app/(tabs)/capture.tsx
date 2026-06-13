import { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { listReliefCategories, listTaxYears, uploadReceipt } from "@/lib/receipts";
import type { ReliefCategory, TaxYear } from "@/lib/types";

function today() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

interface PickedFile {
  uri: string;
  fileName: string;
  mimeType: string;
}

export default function CaptureScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>("");
  const [taxYear, setTaxYear] = useState<TaxYear | null>(null);
  const [categories, setCategories] = useState<ReliefCategory[]>([]);
  const [file, setFile] = useState<PickedFile | null>(null);

  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(today());
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        try {
          const [years, cats] = await Promise.all([listTaxYears(user.id), listReliefCategories()]);
          setTaxYear(years[0] ?? null);
          setCategories(cats);
        } catch {
          /* surfaced on upload */
        }
      })();
    }, [])
  );

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera permission needed", "Please allow camera access to snap a receipt.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
    handlePick(res);
  };

  const pickFromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    handlePick(res);
  };

  const handlePick = (res: ImagePicker.ImagePickerResult) => {
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    setFile({
      uri: a.uri,
      fileName: a.fileName || `receipt_${Date.now()}.jpg`,
      mimeType: a.mimeType || "image/jpeg",
    });
  };

  const reset = () => {
    setFile(null);
    setAmount("");
    setMerchant("");
    setDate(today());
    setCategoryId(null);
    setNotes("");
  };

  const save = async () => {
    if (!file) return Alert.alert("No photo", "Take or choose a receipt photo first.");
    if (!amount || parseFloat(amount) <= 0) return Alert.alert("Amount required", "Enter a valid amount.");
    if (!merchant.trim()) return Alert.alert("Merchant required", "Enter the merchant or a description.");
    if (!taxYear) return Alert.alert("No tax year", "Add a tax year in the CukaiBro web app first.");

    setUploading(true);
    try {
      const cat = categories.find((c) => c.id === categoryId) || null;
      await uploadReceipt({
        userId,
        taxYearId: taxYear.id,
        year: taxYear.year,
        uri: file.uri,
        fileName: file.fileName,
        mimeType: file.mimeType,
        amount: parseFloat(amount),
        merchant,
        receiptDate: date,
        reliefCategoryId: cat?.id ?? null,
        categoryCode: cat?.code ?? null,
        notes,
      });
      reset();
      Alert.alert("Saved", "Receipt uploaded successfully.", [
        { text: "OK", onPress: () => router.push("/(tabs)") },
      ]);
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f8fafc" }} contentContainerStyle={{ padding: 16 }}>
      {!file ? (
        <View style={{ gap: 12 }}>
          <TouchableOpacity onPress={pickFromCamera} style={captureBtn}>
            <Ionicons name="camera" size={22} color="white" />
            <Text style={captureBtnText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickFromLibrary} style={[captureBtn, { backgroundColor: "#475569" }]}>
            <Ionicons name="images" size={22} color="white" />
            <Text style={captureBtnText}>Choose from Library</Text>
          </TouchableOpacity>
          <Text style={{ color: "#94a3b8", textAlign: "center", marginTop: 8, fontSize: 13 }}>
            Snap a clear photo of your receipt. It uploads securely to your CukaiBro account.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <View style={{ position: "relative" }}>
            <Image source={{ uri: file.uri }} style={{ width: "100%", height: 220, borderRadius: 14, backgroundColor: "#e2e8f0" }} resizeMode="cover" />
            <TouchableOpacity onPress={() => setFile(null)} style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(15,23,42,0.7)", borderRadius: 20, padding: 6 }}>
              <Ionicons name="close" size={18} color="white" />
            </TouchableOpacity>
          </View>

          <Field label="Amount (RM) *">
            <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#94a3b8" style={input} />
          </Field>
          <Field label="Merchant / Description *">
            <TextInput value={merchant} onChangeText={setMerchant} placeholder="e.g. Guardian, MPH Bookstore" placeholderTextColor="#94a3b8" style={input} />
          </Field>
          <Field label="Date *">
            <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" style={input} />
          </Field>

          <Field label="Relief Category">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
              {categories.map((c) => {
                const active = c.id === categoryId;
                return (
                  <TouchableOpacity key={c.id} onPress={() => setCategoryId(active ? null : c.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: active ? "#10b981" : "white", borderColor: active ? "#10b981" : "#cbd5e1", borderWidth: 1 }}>
                    <Text style={{ color: active ? "white" : "#475569", fontSize: 13, fontWeight: "600" }}>{c.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Field>

          <Field label="Notes">
            <TextInput value={notes} onChangeText={setNotes} placeholder="Optional" placeholderTextColor="#94a3b8" multiline style={[input, { height: 70, textAlignVertical: "top" }]} />
          </Field>

          <TouchableOpacity onPress={save} disabled={uploading} style={[captureBtn, { opacity: uploading ? 0.6 : 1 }]}>
            {uploading ? <ActivityIndicator color="white" /> : <><Ionicons name="cloud-upload" size={20} color="white" /><Text style={captureBtnText}>Save Receipt</Text></>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={{ color: "#475569", fontSize: 13, fontWeight: "600", marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

const captureBtn = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  backgroundColor: "#10b981",
  borderRadius: 14,
  paddingVertical: 15,
} as const;

const captureBtnText = { color: "white", fontWeight: "700", fontSize: 16 } as const;

const input = {
  backgroundColor: "white",
  borderColor: "#cbd5e1",
  borderWidth: 1,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: "#0f172a",
  fontSize: 16,
} as const;
