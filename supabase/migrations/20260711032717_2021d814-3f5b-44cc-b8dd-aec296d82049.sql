
CREATE TABLE public.agendamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  cliente TEXT NOT NULL,
  data_servico DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  descricao TEXT,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'em_aberto' CHECK (status IN ('em_aberto','pago')),
  data_pagamento TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agendamentos TO authenticated;
GRANT ALL ON public.agendamentos TO service_role;

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agendamentos"
ON public.agendamentos FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  -- auto set/clear data_pagamento based on status transitions
  IF NEW.status = 'pago' AND (OLD.status IS DISTINCT FROM 'pago') THEN
    IF NEW.data_pagamento IS NULL THEN
      NEW.data_pagamento = now();
    END IF;
  ELSIF NEW.status = 'em_aberto' THEN
    NEW.data_pagamento = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER agendamentos_updated
BEFORE UPDATE ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_pago_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pago' AND NEW.data_pagamento IS NULL THEN
    NEW.data_pagamento = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER agendamentos_insert_pago
BEFORE INSERT ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.set_pago_on_insert();

CREATE INDEX agendamentos_user_data_idx ON public.agendamentos(user_id, data_servico);
