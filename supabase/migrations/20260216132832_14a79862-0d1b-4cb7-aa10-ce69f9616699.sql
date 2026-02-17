
-- Plano de Contas
CREATE TABLE public.plano_contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reduzido text NOT NULL,
  tipo text NOT NULL,
  cod_conta text NOT NULL,
  descricao text NOT NULL,
  natureza text NOT NULL,
  grau integer NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plano_contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read plano_contas" ON public.plano_contas FOR SELECT USING (true);
CREATE POLICY "Admins manage plano_contas" ON public.plano_contas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- De-Para
CREATE TABLE public.de_para (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_origem text NOT NULL,
  descricao_origem text NOT NULL,
  descricao_destino text NOT NULL,
  categoria text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.de_para ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read de_para" ON public.de_para FOR SELECT USING (true);
CREATE POLICY "Admins manage de_para" ON public.de_para FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Balancetes
CREATE TABLE public.balancetes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo text NOT NULL, -- "YYYY-MM"
  conta text NOT NULL,
  reduzido text NOT NULL,
  descricao text NOT NULL,
  anterior numeric NOT NULL DEFAULT 0,
  debitos numeric NOT NULL DEFAULT 0,
  creditos numeric NOT NULL DEFAULT 0,
  saldo_atual numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.balancetes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read balancetes" ON public.balancetes FOR SELECT USING (true);
CREATE POLICY "Admins manage balancetes" ON public.balancetes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_balancetes_periodo ON public.balancetes(periodo);

-- Custos
CREATE TABLE public.custos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo text NOT NULL,
  rowl integer NOT NULL,
  cod_departamento text NOT NULL DEFAULT '',
  cod_ccusto text NOT NULL DEFAULT '',
  nome_depto text NOT NULL DEFAULT '',
  nome_custo text NOT NULL DEFAULT '',
  vl_custo numeric NOT NULL DEFAULT 0,
  complemento text NOT NULL DEFAULT '',
  v_cod_conta text NOT NULL DEFAULT '',
  conta_contabil text NOT NULL DEFAULT '',
  produto text NOT NULL DEFAULT '',
  historico_mov text NOT NULL DEFAULT '',
  documento text NOT NULL DEFAULT '',
  nome_conta text NOT NULL DEFAULT '',
  data text NOT NULL DEFAULT '',
  cliente_nome text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read custos" ON public.custos FOR SELECT USING (true);
CREATE POLICY "Admins manage custos" ON public.custos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_custos_periodo ON public.custos(periodo);

-- Uploads
CREATE TABLE public.uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  nome_arquivo text NOT NULL,
  data_upload timestamptz NOT NULL DEFAULT now(),
  mes integer,
  ano integer,
  registros integer NOT NULL DEFAULT 0
);

ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read uploads" ON public.uploads FOR SELECT USING (true);
CREATE POLICY "Admins manage uploads" ON public.uploads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Config (conta faturamento etc)
CREATE TABLE public.config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read config" ON public.config FOR SELECT USING (true);
CREATE POLICY "Admins manage config" ON public.config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
