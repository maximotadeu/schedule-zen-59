-- Create table public.grupos
CREATE TABLE IF NOT EXISTS public.grupos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo_convite TEXT NOT NULL UNIQUE,
  dono_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table public.grupo_membros
CREATE TABLE IF NOT EXISTS public.grupo_membros (
  grupo_id UUID NOT NULL REFERENCES public.grupos ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (grupo_id, user_id)
);

-- Add column grupo_id to public.agendamentos
ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES public.grupos ON DELETE SET NULL;

-- Grant permissions to authenticated and service role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_membros TO authenticated;
GRANT ALL ON public.grupos TO service_role;
GRANT ALL ON public.grupo_membros TO service_role;

-- Enable Row Level Security (RLS)
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_membros ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public.grupos
CREATE POLICY "Users view groups they belong to" ON public.grupos
  FOR SELECT TO authenticated
  USING (dono_id = auth.uid() OR id IN (SELECT grupo_id FROM public.grupo_membros WHERE user_id = auth.uid()));

CREATE POLICY "Users can create groups" ON public.grupos
  FOR INSERT TO authenticated
  WITH CHECK (dono_id = auth.uid());

CREATE POLICY "Owners manage own groups" ON public.grupos
  FOR ALL TO authenticated
  USING (dono_id = auth.uid())
  WITH CHECK (dono_id = auth.uid());

-- RLS Policies for public.grupo_membros
CREATE POLICY "Members view group memberships" ON public.grupo_membros
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR grupo_id IN (SELECT gm.grupo_id FROM public.grupo_membros gm WHERE gm.user_id = auth.uid()) OR grupo_id IN (SELECT g.id FROM public.grupos g WHERE g.dono_id = auth.uid()));

CREATE POLICY "Users join group with code" ON public.grupo_membros
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users leave group or owners remove members" ON public.grupo_membros
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR grupo_id IN (SELECT g.id FROM public.grupos g WHERE g.dono_id = auth.uid()));

-- RLS Policies for public.agendamentos (Group sharing)
CREATE POLICY "Users select group agendamentos" ON public.agendamentos
  FOR SELECT TO authenticated
  USING (grupo_id IN (SELECT gm.grupo_id FROM public.grupo_membros gm WHERE gm.user_id = auth.uid()));

CREATE POLICY "Users insert group agendamentos" ON public.agendamentos
  FOR INSERT TO authenticated
  WITH CHECK (grupo_id IN (SELECT gm.grupo_id FROM public.grupo_membros gm WHERE gm.user_id = auth.uid()));

CREATE POLICY "Users update group agendamentos" ON public.agendamentos
  FOR UPDATE TO authenticated
  USING (grupo_id IN (SELECT gm.grupo_id FROM public.grupo_membros gm WHERE gm.user_id = auth.uid()))
  WITH CHECK (grupo_id IN (SELECT gm.grupo_id FROM public.grupo_membros gm WHERE gm.user_id = auth.uid()));

CREATE POLICY "Users delete group agendamentos" ON public.agendamentos
  FOR DELETE TO authenticated
  USING (grupo_id IN (SELECT gm.grupo_id FROM public.grupo_membros gm WHERE gm.user_id = auth.uid()));

-- Indices for performance
CREATE INDEX IF NOT EXISTS grupo_membros_user_idx ON public.grupo_membros(user_id);
CREATE INDEX IF NOT EXISTS agendamentos_grupo_idx ON public.agendamentos(grupo_id);
