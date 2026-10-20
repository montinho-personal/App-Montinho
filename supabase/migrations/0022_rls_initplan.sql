-- ============================================================================
-- 0022 — Desempenho das regras de acesso (RLS): auth.uid() avaliado uma vez
-- por consulta, não uma vez por linha (aviso “auth_rls_initplan” do Supabase).
-- Só muda COMO a regra é calculada; QUEM pode ver o quê continua idêntico.
-- ============================================================================
alter policy "Aluno lê próprio cadastro" on alunos using ((profile_id = (select auth.uid())) or (select public.is_treinador()));
alter policy "Aluno lê conhecimento" on conhecimento using (((select auth.uid()) is not null) and (not arquivado));
alter policy "Aluno lê exercicio_conhecimento" on exercicio_conhecimento using ((select auth.uid()) is not null);
alter policy "Treinador gerencia os próprios favoritos" on exercicio_favoritos using ((select public.is_treinador()) and (treinador_id = (select auth.uid()))) with check ((select public.is_treinador()) and (treinador_id = (select auth.uid())));
alter policy "Todos leem biblioteca" on exercicios_biblioteca using ((select auth.uid()) is not null);
alter policy "Autenticado lê correções de grupo" on grupo_correcoes using ((select auth.uid()) is not null);
alter policy "Usuário envia mensagem em conversa dele" on mensagens with check ((remetente_id = (select auth.uid())) and ((aluno_id = (select public.aluno_id_atual())) or (select public.is_treinador())));
alter policy preferencias_treinador_proprias on preferencias_treinador using ((profile_id = (select auth.uid())) and (select public.is_treinador())) with check ((profile_id = (select auth.uid())) and (select public.is_treinador()));
alter policy "Usuário atualiza próprio profile" on profiles using (id = (select auth.uid()));
alter policy "Usuário lê próprio profile" on profiles using ((id = (select auth.uid())) or (select public.is_treinador()));
alter policy push_inscricoes_proprias_delete on push_inscricoes using (profile_id = (select auth.uid()));
alter policy push_inscricoes_proprias_select on push_inscricoes using (profile_id = (select auth.uid()));
alter policy "Aluno lê template_conhecimento" on template_conhecimento using ((select auth.uid()) is not null);
