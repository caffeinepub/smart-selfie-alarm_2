import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ozorrmrvvhmtpoeelewb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96b3JybXJ2dmhtdHBvZWVsZXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTY3ODksImV4cCI6MjA4ODM3Mjc4OX0.t6mhVisTuS12QUD8M9b5DrLtlzcIhaILkaTSvoGuF_s";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

export default supabase;
