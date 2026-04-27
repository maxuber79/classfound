import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ENABLE_LOGS = true;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function log(...args: unknown[]): void {
  if (ENABLE_LOGS) {
    console.log(...args);
  }
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

function getBearerToken(req: Request): string | null {
  const authorization = req.headers.get("Authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  try {
    log("🚀 [delete-user-admin] Inicio");

    if (req.method !== "POST") {
      return jsonResponse(405, {
        success: false,
        message: "Método no permitido. Usa POST."
      });
    }

    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, {
        success: false,
        message: "Faltan variables de entorno."
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const callerToken = getBearerToken(req);

    if (!callerToken) {
      return jsonResponse(401, {
        success: false,
        message: "No autenticado."
      });
    }

    const { data: callerData, error: callerError } =
      await supabase.auth.getUser(callerToken);

    if (callerError || !callerData.user) {
      log("❌ Token inválido:", callerError);

      return jsonResponse(401, {
        success: false,
        message: "Sesión inválida."
      });
    }

    const { data: callerProfile, error: callerProfileError } = await supabase
      .from("profiles")
      .select("global_role,is_active")
      .eq("id", callerData.user.id)
      .single();

    const isAdmin =
      callerProfile?.is_active === true &&
      (callerProfile.global_role === "admin" || callerProfile.global_role === "super_admin");

    if (callerProfileError || !isAdmin) {
      log("⛔ Usuario sin permisos para eliminar usuarios:", {
        userId: callerData.user.id,
        callerProfileError,
        role: callerProfile?.global_role
      });

      return jsonResponse(403, {
        success: false,
        message: "No tienes permisos para eliminar usuarios."
      });
    }

    const body = await req.json();
    const userId = typeof body?.user_id === "string" ? body.user_id.trim() : "";

    if (!userId) {
      return jsonResponse(400, {
        success: false,
        message: "Debes enviar user_id."
      });
    }

    if (userId === callerData.user.id) {
      return jsonResponse(400, {
        success: false,
        message: "No puedes eliminar tu propio usuario desde este módulo."
      });
    }

    const { error: courseMembersError } = await supabase
      .from("course_members")
      .delete()
      .eq("user_id", userId);

    if (courseMembersError) {
      log("❌ Error al eliminar course_members:", courseMembersError);

      return jsonResponse(400, {
        success: false,
        message: "No se pudieron eliminar las membresías del usuario.",
        error: courseMembersError.message
      });
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      log("❌ Error al eliminar profile:", profileError);

      return jsonResponse(400, {
        success: false,
        message: "No se pudo eliminar el perfil del usuario.",
        error: profileError.message
      });
    }

    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      log("❌ Error al eliminar usuario Auth:", authError);

      return jsonResponse(400, {
        success: false,
        message: "No se pudo eliminar el usuario en Auth.",
        error: authError.message
      });
    }

    return jsonResponse(200, {
      success: true,
      message: "Usuario eliminado correctamente."
    });
  } catch (err) {
    log("💥 Error inesperado:", err);

    return jsonResponse(500, {
      success: false,
      message: "Ocurrió un error inesperado.",
      error: err instanceof Error ? err.message : String(err)
    });
  }
});
