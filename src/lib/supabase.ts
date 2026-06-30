import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = "https://lrgoqzwhbmgyiouhbzem.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyZ29xendoYm1neWlvdWhiemVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Nzg1NTMsImV4cCI6MjA5NTM1NDU1M30.w4Ihoa_sCV53jFcG5zOZi_-hzlB-G8EwuTRAE3s9H7k";

console.log("Supabase URL geladen:", supabaseUrl);
console.log("Supabase Key geladen:", supabaseAnonKey.substring(0, 5) + "...");

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);