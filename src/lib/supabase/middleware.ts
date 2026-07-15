import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "./admin";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    // Check admin role via profile (using admin client to bypass RLS in middleware context) and user metadata
    let dbRole = undefined;
    let dbError = null;

    try {
      const adminSupabase = createAdminClient();
      const { data: profile, error } = await adminSupabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      dbRole = profile?.role;
      dbError = error;
    } catch (e: any) {
      console.error("Admin client check failed:", e);
      dbError = e;
    }

    const appMetadataRole = user.app_metadata?.role;
    const userMetadataRole = user.user_metadata?.role;
    const isAdmin = dbRole === "admin" || appMetadataRole === "admin" || userMetadataRole === "admin";

    console.log("Admin Access Attempt:", {
      userId: user.id,
      userEmail: user.email,
      dbRole,
      appMetadataRole,
      userMetadataRole,
      isAdmin,
      error: dbError ? (dbError.message || dbError) : null
    });

    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // Protect auth-required routes
  const protectedPaths = ["/library", "/checkout", "/cart"];
  if (protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p))) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
