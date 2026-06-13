import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

export default function SettingsScreen() {
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const signOut = () => {
    Alert.alert("Log out?", "You'll need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc", padding: 16 }}>
      <View style={{ backgroundColor: "white", borderRadius: 14, padding: 16, borderColor: "#e2e8f0", borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#10b981", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="person" size={22} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#0f172a", fontWeight: "700" }}>Signed in</Text>
          <Text style={{ color: "#64748b", fontSize: 13 }} numberOfLines={1}>{email || "—"}</Text>
        </View>
      </View>

      <Text style={{ color: "#94a3b8", fontSize: 13, marginTop: 16, lineHeight: 19 }}>
        This app shares your CukaiBro account and data with the website. Receipts you capture here appear in your
        dashboard at cukaibro.com, and vice-versa.
      </Text>

      <TouchableOpacity onPress={signOut} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "white", borderColor: "#fecaca", borderWidth: 1, borderRadius: 14, paddingVertical: 14, marginTop: 24 }}>
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text style={{ color: "#dc2626", fontWeight: "700", fontSize: 15 }}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}
