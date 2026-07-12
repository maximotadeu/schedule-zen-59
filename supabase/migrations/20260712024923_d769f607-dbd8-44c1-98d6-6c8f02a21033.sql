
-- 1) grupos
CREATE TABLE IF NOT EXISTS public.grupos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  codigo_convite text NOT NULL UNIQUE,
  dono_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos TO authenticated;
GRANT ALL ON public.grupos TO service_role;
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;

-- 2) grupo_membros
CREATE TABLE IF NOT EXISTS public.grupo_membros (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grupo_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_membros TO authenticated;
GRANT ALL ON public.grupo_membros TO service_role;
ALTER TABLE public.grupo_membros ENABLE ROW LEVEL SECURITY;

-- 3) grupo_id em agendamentos
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS grupo_id uuid REFERENCES public.grupos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS agendamentos_grupo_id_idx ON public.agendamentos(grupo_id);

-- 4) Função security-definer para evitar recursão em RLS
CREATE OR REPLACE FUNCTION public.is_grupo_membro(_grupo_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.grupo_membros
    WHERE grupo_id = _grupo_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_grupo_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT grupo_id FROM public.grupo_membros WHERE user_id = _user_id;
$$;

-- 5) Políticas para grupos
DROP POLICY IF EXISTS "membros veem grupo" ON public.grupos;
CREATE POLICY "membros veem grupo" ON public.grupos
  FOR SELECT TO authenticated
  USING (dono_id = auth.uid() OR public.is_grupo_membro(id, auth.uid()));

DROP POLICY IF EXISTS "autenticados criam grupo" ON public.grupos;
CREATE POLICY "autenticados criam grupo" ON public.grupos
  FOR INSERT TO authenticated
  WITH CHECK (dono_id = auth.uid());

DROP POLICY IF EXISTS "dono atualiza grupo" ON public.grupos;
CREATE POLICY "dono atualiza grupo" ON public.grupos
  FOR UPDATE TO authenticated
  USING (dono_id = auth.uid()) WITH CHECK (dono_id = auth.uid());

DROP POLICY IF EXISTS "dono exclui grupo" ON public.grupos;
CREATE POLICY "dono exclui grupo" ON public.grupos
  FOR DELETE TO authenticated
  USING (dono_id = auth.uid());

-- 6) Políticas para grupo_membros
DROP POLICY IF EXISTS "ver membros do mesmo grupo" ON public.grupo_membros;
CREATE POLICY "ver membros do mesmo grupo" ON public.grupo_membros
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_grupo_membro(grupo_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.grupos g WHERE g.id = grupo_id AND g.dono_id = auth.uid())
  );

DROP POLICY IF EXISTS "usuario entra em grupo" ON public.grupo_membros;
CREATE POLICY "usuario entra em grupo" ON public.grupo_membros
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "sair ou dono remove" ON public.grupo_membros;
CREATE POLICY "sair ou dono remove" ON public.grupo_membros
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.grupos g WHERE g.id = grupo_id AND g.dono_id = auth.uid())
  );

-- 7) Substituir políticas de agendamentos para incluir compartilhamento por grupo
DROP POLICY IF EXISTS "Users manage own agendamentos" ON public.agendamentos;

CREATE POLICY "ver agendamentos proprios ou do grupo" ON public.agendamentos
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (grupo_id IS NOT NULL AND public.is_grupo_membro(grupo_id, auth.uid()))
  );

CREATE POLICY "criar agendamento proprio ou do grupo" ON public.agendamentos
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      grupo_id IS NULL
      OR public.is_grupo_membro(grupo_id, auth.uid())
    )
  );

CREATE POLICY "atualizar agendamentos proprios ou do grupo" ON public.agendamentos
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (grupo_id IS NOT NULL AND public.is_grupo_membro(grupo_id, auth.uid()))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (grupo_id IS NOT NULL AND public.is_grupo_membro(grupo_id, auth.uid()))
  );

CREATE POLICY "excluir agendamentos proprios ou do grupo" ON public.agendamentos
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (grupo_id IS NOT NULL AND public.is_grupo_membro(grupo_id, auth.uid()))
  );
