import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ENABLE_LOGS = true;

/**
 * Headers CORS para permitir llamadas desde frontend.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

/**
 * Helper de logs controlados por flag.
 * @param {...unknown[]} args Datos a imprimir en consola.
 */
function log(...args: unknown[]): void {
  if (ENABLE_LOGS) {
    console.log(...args);
  }
}

/**
 * Tipo esperado del body de entrada.
 */
interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  global_role: string;
  is_active?: boolean;
  course_id?: string | null;
  course_role?: string | null;
}

/**
 * Helper para responder JSON con headers CORS.
 *
 * @param {number} status Código HTTP
 * @param {Record<string, unknown>} body Cuerpo de respuesta
 * @returns {Response} Response JSON
 */
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
  /**
   * Respuesta al preflight CORS.
   */
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  try {
    log("🚀 [create-user-admin] Inicio");

    if (req.method !== "POST") {
      return jsonResponse(405, {
        success: false,
        message: "Método no permitido. Usa POST."
      });
    }

    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

    log("🔍 PROJECT_URL existe:", !!supabaseUrl);
    log("🔍 SERVICE_ROLE_KEY existe:", !!serviceRoleKey);

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, {
        success: false,
        message: "Faltan variables de entorno."
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body: CreateUserRequest = await req.json();
    log("📦 Body recibido:", body);

    const email = body?.email?.trim();
    const password = body?.password?.trim();
    const fullName = body?.full_name?.trim();
    const globalRole = body?.global_role?.trim();
    const isActive = body?.is_active ?? true;
    const courseId = body?.course_id ?? null;
    const courseRole = body?.course_role?.trim() ?? null;

    if (!email || !password || !fullName || !globalRole) {
      return jsonResponse(400, {
        success: false,
        message: "Debes enviar email, password, full_name y global_role."
      });
    }

    if (password.length < 6) {
      return jsonResponse(400, {
        success: false,
        message: "La contraseña debe tener al menos 6 caracteres."
      });
    }

    if (courseId && !courseRole) {
      return jsonResponse(400, {
        success: false,
        message: "Si envías course_id, también debes enviar course_role."
      });
    }

    const callerToken = getBearerToken(req);

    if (callerToken && globalRole !== "user") {
      const { data: callerData, error: callerError } =
        await supabase.auth.getUser(callerToken);

      if (!callerError && callerData.user) {
        const { data: callerProfile, error: callerProfileError } = await supabase
          .from("profiles")
          .select("global_role,is_active")
          .eq("id", callerData.user.id)
          .single();

        const isAdmin =
          callerProfile?.is_active === true &&
          (callerProfile.global_role === "admin" || callerProfile.global_role === "super_admin");

        if (callerProfileError || !isAdmin) {
          log("⛔ Usuario sin permisos para crear usuarios:", {
            userId: callerData.user.id,
            callerProfileError,
            role: callerProfile?.global_role
          });

          return jsonResponse(403, {
            success: false,
            message: "No tienes permisos para crear usuarios."
          });
        }
      }
    }

    log("👤 Creando usuario en Auth...");
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

    if (authError || !authData.user) {
      log("❌ Error al crear usuario en Auth:", authError);

      return jsonResponse(400, {
        success: false,
        message: authError?.message || "No se pudo crear el usuario en Auth."
      });
    }

    const userId = authData.user.id;
    log("✅ Usuario Auth creado:", userId);

    log("🧾 Guardando perfil en profiles con upsert...");
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name: fullName,
          email,
          global_role: globalRole,
          is_active: isActive
        },
        {
          onConflict: "id"
        }
      );

    if (profileError) {
      log("❌ Error al guardar profile:", profileError);

      await supabase.auth.admin.deleteUser(userId);

      return jsonResponse(400, {
        success: false,
        message: "No se pudo guardar el perfil del usuario.",
        error: profileError.message
      });
    }

    log("✅ Perfil guardado correctamente");

    if (courseId && courseRole) {
      log("📘 Insertando relación en course_members...");

      const { error: courseMemberError } = await supabase
        .from("course_members")
        .insert({
          course_id: courseId,
          user_id: userId,
          role: courseRole,
          is_active: isActive
        });

      if (courseMemberError) {
        log("❌ Error al insertar course_members:", courseMemberError);

        await supabase.from("profiles").delete().eq("id", userId);
        await supabase.auth.admin.deleteUser(userId);

        return jsonResponse(400, {
          success: false,
          message: "No se pudo asociar el usuario al curso.",
          error: courseMemberError.message
        });
      }

      log("✅ Relación course_members creada correctamente");
    }

    return jsonResponse(200, {
      success: true,
      message: "Usuario creado correctamente.",
      user: {
        id: userId,
        email,
        full_name: fullName,
        global_role: globalRole,
        is_active: isActive,
        course_id: courseId,
        course_role: courseRole
      }
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
