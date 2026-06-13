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
import { isScannerAvailable, scanDocument } from "@/lib/scanner";
import { isOcrAvailable, runReceiptOcr } from "@/lib/ocr";
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
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrNote, setOcrNote] = useState<string | null>(null);

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

  // After a photo is captured/scanned: set it, then try OCR to pre-fill fields.
  const afterCapture = async (picked: PickedFile) => {
    setFile(picked);
    setOcrNote(null);
    if (!isOcrAvailable()) return;
    setOcrRunning(true);
    try {
      const ocr = await runReceiptOcr(picked.uri);
      if (ocr) {
        if (ocr.amount) setAmount(String(ocr.amount));
        if (ocr.date) setDate(ocr.date);
        if (ocr.merchant) setMerchant((prev) => prev || ocr.merchant!);
        setOcrNote(ocr.amount || ocr.date ? "✨ Auto-filled from the receipt — please double-check." : "Couldn't read details automatically — please fill them in.");
      }
    } catch {
      /* OCR is best-effort; ignore failures */
    } finally {
      setOcrRunning(false);
    }
  };

  const handleScan = async () => {
    if (!isScannerAvailable()) {
      Alert.alert(
        "Scanner needs a dev build",
        "The auto-crop document scanner isn't available in Expo Go. Use 'Take Photo' or 'Choose from Library' for now — or build a dev client (see README)."
      );
      return;
    }
    try {
      const uri = await scanDocument();
      if (!uri) return;
      await afterCapture({ uri, fileName: `scan_${Date.now()}.jpg`, mimeType: "image/jpeg" });
    } catch (e) {
      Alert.alert("Scan failed", e instanceof Error ? e.message : "Please try again.");
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera permission needed", "Please allow camera access to snap a receipt.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!res.canceled && res.assets?.length) {
      const a = res.assets[0];
      await afterCapture({ uri: a.uri, fileName: a.fileName || `receipt_${Date.now()}.jpg`, mimeType: a.mimeType || "image/jpeg" });
    }
  };

  const pickFromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!res.canceled && res.assets?.length) {
      const a = res.assets[0];
      await afterCapture({ uri: a.uri, fileName: a.fileName || `receipt_${Date.now()}.jpg`, mimeType: a.mimeType || "image/jpeg" });
    }
  };

  const reset = () => {
    setFile(null);
    setAmount("");
    setMerchant("");
    setDate(today());
    setCategoryId(null);
    setNotes("");
    setOcrNote(null);
  };

  const save = async () => {
    if (!file) return Alert.alert("No photo", "Scan or choose a receipt photo first.");
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
          <TouchableOpacity onPress={handleScan} style={captureBtn}>
            <Ionicons name="scan" size={22} color="white" />
            <Text style={captureBtnText}>Scan Document</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickFromCamera} style={[captureBtn, { backgroundColor: "#0f172a" }]}>
            <Ionicons name="camera" size={22} color="white" />
            <Text style={captureBtnText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickFromLibrary} style={[captureBtn, { backgroundColor: "#475569" }]}>
            <Ionicons name="images" size={22} color="white" />
            <Text style={captureBtnText}>Choose from Library</Text>
          </TouchableOpacity>
          <Text style={{ color: "#94a3b8", textAlign: "center", marginTop: 8, fontSize: 13, lineHeight: 19 }}>
            &quot;Scan Document&quot; auto-crops the receipt and reads the amount &amp; date for you. It uploads securely to your CukaiBro account.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <View style={{ position: "relative" }}>
            <Image source={{ uri: file.uri }} style={{ width: "100%", height: 220, borderRadius: 14, backgroundColor: "#e2e8f0" }} resizeMode="cover" />
            <TouchableOpacity onPress={reset} style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(15,23,42,0.7)", borderRadius: 20, padding: 6 }}>
              <Ionicons name="close" size={18} color="white" />
            </TouchableOpacity>
          </View>

          {ocrRunning && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color="#10b981" />
              <Text style={{ color: "#64748b", fontSize: 13 }}>Reading receipt…</Text>
            </View>
          )}
          {ocrNote && !ocrRunning && (
            <Text style={{ color: "#0f766e", fontSize: 13, backgroundColor: "#ccfbf1", padding: 10, borderRadius: 10 }}>{ocrNote}</Text>
          )}

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
