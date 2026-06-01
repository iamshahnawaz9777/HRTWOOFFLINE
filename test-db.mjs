import { createClient } from "@libsql/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const supabase = createSupabaseClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISH_KEY // or SUPABASE_ANON_KEY
);

export async function testAllDatabases() {
  const status = {
    supabase: "Checking...",
    googleSheets: "Checking...",
    turso: "Checking..."
  };

  console.log("--- Starting Database Health Inspection ---");

  // 1. Test Turso
  try {
    const result = await turso.execute("SELECT 1");
    if (result) status.turso = "✅ ONLINE (Cloud)";
  } catch (e) {
    status.turso = "❌ OFFLINE: " + e.message;
  }

  // 2. Test Supabase
  try {
    const { data, error } = await supabase.from('employees').select('*', { count: 'exact', head: true });
    if (!error) status.supabase = "✅ ONLINE (Cloud)";
    else throw error;
  } catch (e) {
    status.supabase = "❌ OFFLINE: " + e.message;
  }

  // 3. Test Google Sheets
  try {
    const res = await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL || 'https://google.com', { method: 'HEAD' });
    status.googleSheets = res.ok ? "✅ ONLINE (Webhook Active)" : "⚠️ ACCESSIBLE BUT ERROR " + res.status;
  } catch (e) {
    status.googleSheets = "❌ OFFLINE: Webhook Unreachable";
  }

  console.table(status);
  return status;
}

testAllDatabases();
