import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { email, password } = await request.json();

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Email i hasło są wymagane" }), {
      status: 400,
    });
  }

  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Map Supabase error codes to appropriate HTTP status codes
    let status = 400;
    if (error.status === 429) {
      status = 429;
    } else if (
      error.message?.toLowerCase().includes("invalid") ||
      error.message?.toLowerCase().includes("credentials")
    ) {
      status = 401;
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status,
    });
  }

  // Success - cookies are set by Supabase SSR
  // Use server-side redirect to ensure cookies are available
  // Onboarding page will check if profile exists and redirect to dashboard if needed
  return redirect("/onboarding", 302);
};
