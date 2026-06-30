import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = "https://lrgoqzwhbmgyiouhbzem.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyZ29xendoYm1neWlvdWhiemVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Nzg1NTMsImV4cCI6MjA5NTM1NDU1M30.w4Ihoa_sCV53jFcG5zOZi_-hzlB-G8EwuTRAE3s9H7k";

const PUBLIC_PATHS = ["/login", "/start", "/set-password", "/activate", "/api/checkout", "/api/activate", "/api/webhooks/stripe"];

function createSupabaseForMiddleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  return { supabase, getResponse: () => response };
}

export async function middleware(request: NextRequest) {
  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isPublicPath) {
    if (request.nextUrl.pathname.startsWith("/login")) {
      const { supabase, getResponse } = createSupabaseForMiddleware(request);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Nur weiterleiten, wenn der Nutzer auch tatsächlich aktiv ist.
        // Sonst bleibt er auf /login (z.B. mit ?status=inactive), kein Redirect-Loop.
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_active")
          .eq("id", user.id)
          .single();

        if (profile?.is_active) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
      }
      return getResponse();
    }

    return NextResponse.next();
  }

  const { supabase, getResponse } = createSupabaseForMiddleware(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", user.id)
    .single();

  if (!profile?.is_active) {
    return NextResponse.redirect(new URL("/login?status=inactive", request.url));
  }

  return getResponse();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};