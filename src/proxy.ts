import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { appMode, DEMO_COOKIE } from "@/lib/env";
import { redirecionamentoPorPapel, sessaoDoCookieDemo } from "@/lib/auth/guards";
import { DEMO_PERSONAS } from "@/lib/mock/personas";

// Proxy = checagem OTIMISTA de rota (Next 16). A autorização de verdade acontece
// no servidor (src/lib/auth/session.ts) e no banco (RLS). Não confie só aqui.

const PUBLIC_PATHS = new Set(["/", "/login", "/cadastro", "/configuracao-pendente", "/pagamento/sucesso", "/sw.js", "/manifest.webmanifest", "/chalala"]);
const PUBLIC_PREFIXES = ["/api/webhook", "/api/cron", "/api/public", "/api/auth", "/auth/", "/conta/", "/f/", "/_next", "/favicon", "/brand/"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const mode = appMode();

  // Nada configurado: NUNCA libera páginas privadas (nem em dev).
  if (mode === "nao_configurado") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Aplicação não configurada (Supabase ou modo demo)" }, { status: 503 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/configuracao-pendente";
    return NextResponse.redirect(url);
  }

  // Demo: identidade vem do cookie explícito escolhido em /login.
  if (mode === "demo") {
    const sessao = sessaoDoCookieDemo(request.cookies.get(DEMO_COOKIE)?.value, DEMO_PERSONAS);
    const destino = redirecionamentoPorPapel(sessao?.role ?? null, pathname);
    if (destino && !pathname.startsWith("/api/")) {
      const url = request.nextUrl.clone();
      const [path, query] = destino.split("?");
      url.pathname = path;
      url.search = query ? `?${query}` : "";
      return NextResponse.redirect(url);
    }
    if (!sessao && pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Live: sessão Supabase via cookies.
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // O cookie "-code-verifier" é o segredo do link de e-mail (PKCE). Uma
        // visita sem sessão a uma rota privada não pode apagá-lo, senão o link
        // deixa de funcionar quando for aberto.
        const seguros = cookiesToSet.filter(({ name, value }) => !(name.endsWith("-code-verifier") && value === ""));
        seguros.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        seguros.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/treinador") || pathname.startsWith("/aluno")) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const destino = redirecionamentoPorPapel((profile?.role as "treinador" | "aluno" | undefined) ?? null, pathname);
    if (destino) {
      const url = request.nextUrl.clone();
      url.pathname = destino.split("?")[0];
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
