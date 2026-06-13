import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/(tabs)");
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          router.replace("/(tabs)");
        } else {
          setInfo("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#0f172a" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#10b981", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 28 }}>🧾</Text>
          </View>
          <Text style={{ color: "white", fontSize: 26, fontWeight: "800" }}>CukaiBro</Text>
          <Text style={{ color: "#94a3b8", marginTop: 4 }}>Snap receipts. Maximise your tax reliefs.</Text>
        </View>

        <Text style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 6 }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor="#64748b"
          style={inputStyle}
        />

        <Text style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 6, marginTop: 16 }}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#64748b"
          style={inputStyle}
        />

        {error && <Text style={{ color: "#f87171", marginTop: 14 }}>{error}</Text>}
        {info && <Text style={{ color: "#34d399", marginTop: 14 }}>{info}</Text>}

        <TouchableOpacity
          onPress={submit}
          disabled={loading}
          style={{ backgroundColor: "#10b981", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 24, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
              {mode === "signin" ? "Log Masuk" : "Create Account"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setInfo(null); }} style={{ marginTop: 18, alignItems: "center" }}>
          <Text style={{ color: "#94a3b8" }}>
            {mode === "signin" ? "No account yet? " : "Already have an account? "}
            <Text style={{ color: "#34d399", fontWeight: "600" }}>{mode === "signin" ? "Sign up" : "Sign in"}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const inputStyle = {
  backgroundColor: "#1e293b",
  borderColor: "#334155",
  borderWidth: 1,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: "white",
  fontSize: 16,
} as const;
