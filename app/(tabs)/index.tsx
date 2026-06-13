import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { listReceipts, listTaxYears, deleteReceipt } from "@/lib/receipts";
import type { Receipt, TaxYear } from "@/lib/types";

function formatMYR(n: number | null) {
  if (n == null) return "—";
  return "RM " + n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ReceiptsScreen() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [taxYear, setTaxYear] = useState<TaxYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setMessage(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const years = await listTaxYears(user.id);
      const year = years[0] ?? null;
      setTaxYear(year);
      if (!year) {
        setReceipts([]);
        setMessage("No tax year found yet. Add one in the CukaiBro web app first, then your receipts will appear here.");
        return;
      }
      const recs = await listReceipts(user.id, year.id);
      setReceipts(recs);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to load receipts.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmDelete = (receipt: Receipt) => {
    Alert.alert("Delete receipt?", "This permanently removes the file and record.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReceipt(receipt);
            setReceipts((prev) => prev.filter((r) => r.id !== receipt.id));
          } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Could not delete.");
          }
        },
      },
    ]);
  };

  const total = receipts.reduce((s, r) => s + (r.amount ?? 0), 0);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color="#10b981" size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <View style={{ padding: 16, backgroundColor: "white", borderBottomColor: "#e2e8f0", borderBottomWidth: 1 }}>
        <Text style={{ fontSize: 13, color: "#64748b" }}>
          {taxYear ? `Year of Assessment ${taxYear.year}` : "No tax year"}
        </Text>
        <Text style={{ fontSize: 24, fontWeight: "800", color: "#0f172a" }}>{formatMYR(total)}</Text>
        <Text style={{ fontSize: 12, color: "#94a3b8" }}>{receipts.length} receipt{receipts.length !== 1 ? "s" : ""} claimed</Text>
      </View>

      {message && (
        <View style={{ margin: 16, padding: 12, backgroundColor: "#fef9c3", borderRadius: 12 }}>
          <Text style={{ color: "#854d0e", fontSize: 13 }}>{message}</Text>
        </View>
      )}

      <FlatList
        data={receipts}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
        ListEmptyComponent={
          !message ? (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Ionicons name="receipt-outline" size={48} color="#cbd5e1" />
              <Text style={{ color: "#64748b", marginTop: 12, fontWeight: "600" }}>No receipts yet</Text>
              <Text style={{ color: "#94a3b8", marginTop: 4 }}>Tap Capture to add your first one.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => confirmDelete(item)}
            activeOpacity={0.8}
            style={{ flexDirection: "row", backgroundColor: "white", borderRadius: 14, padding: 10, marginBottom: 10, borderColor: "#e2e8f0", borderWidth: 1, alignItems: "center" }}
          >
            <View style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: "#f1f5f9", overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
              {item.file_type?.startsWith("image/") && item.signedUrl ? (
                <Image source={{ uri: item.signedUrl }} style={{ width: 56, height: 56 }} resizeMode="cover" />
              ) : (
                <Ionicons name={item.file_type === "application/pdf" ? "document-text-outline" : "image-outline"} size={24} color="#94a3b8" />
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: "700", color: "#0f172a" }} numberOfLines={1}>{item.merchant ?? "Receipt"}</Text>
              <Text style={{ color: "#10b981", fontWeight: "700", marginTop: 2 }}>{formatMYR(item.amount)}</Text>
              <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
                {item.receipt_date ?? "—"}{item.category ? ` · ${item.category.name}` : ""}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
