-- Migração para tabela de servicos_adicionais e correções de RLS

-- 1) Criar tabela de servicos_adicionais
CREATE TABLE IF NOT EXISTS public.servicos_adicionais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grupo_id uuid REFERENCES public.grupos(id) ON DELETE SET NULL,
  nome text NOT NULL,
  preco_padrao numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicos_adicionais TO authenticated;
GRANT ALL ON public.servicos_adicionais TO service_role;

-- RLS
ALTER TABLE public.servicos_adicionais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gerenciar servicos adicionais proprios ou do grupo" ON public.servicos_adicionais;
CREATE POLICY "gerenciar servicos adicionais proprios ou do grupo" ON public.servicos_adicionais
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR (grupo_id IS NOT NULL AND public.is_grupo_membro(grupo_id, auth.uid()))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (grupo_id IS NOT NULL AND public.is_grupo_membro(grupo_id, auth.uid()))
  );

-- 2) Corrigir a política de SELECT de grupos para permitir busca por código de convite
DROP POLICY IF EXISTS "membros veem grupo" ON public.grupos;
CREATE POLICY "membros veem grupo ou qualquer autenticado ve para entrar" ON public.grupos
  FOR SELECT TO authenticated
  USING (true);
