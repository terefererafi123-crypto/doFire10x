import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";

export const POST: APIRoute = async ({ request, cookies }) => {
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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    // Map Supabase error codes to appropriate HTTP status codes
    let status = 400;
    if (error.status === 429) {
      status = 429;
    } else if (
      error.message?.toLowerCase().includes("user already registered") ||
      error.message?.toLowerCase().includes("already registered")
    ) {
      status = 409; // Conflict
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status,
    });
  }

  // Success - return 200 with no body
  // Note: Supabase may send a confirmation email depending on configuration
  // The frontend should inform the user to check their email
  return new Response(null, {
    status: 200,
  });
};
