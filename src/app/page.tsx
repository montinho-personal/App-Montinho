import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function RootPage() {
  // Sem Supabase configurado → modo dev com dados mock, acessa como treinador.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    redirect("/treinador");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  redirect(profile?.role === "treinador" ? "/treinador" : "/aluno");
}
