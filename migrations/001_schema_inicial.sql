-- ============================================================
-- Migration 001 — Schema inicial FD Veículos
-- Executar no SQL Editor do Supabase
-- ============================================================

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- Usuários (espelho do Supabase Auth)
-- ------------------------------------------------------------
CREATE TABLE users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  email       text NOT NULL UNIQUE,
  whatsapp    text,
  ativo       boolean NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Perfis/papéis por usuário (N:N)
-- ------------------------------------------------------------
CREATE TYPE tipo_perfil AS ENUM (
  'vendedor', 'contratos', 'financeiro', 'fiscal', 'transferencia', 'supervisor'
);

CREATE TABLE user_roles (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  perfil      tipo_perfil NOT NULL,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, perfil)
);

-- ------------------------------------------------------------
-- Despachantes
-- ------------------------------------------------------------
CREATE TABLE dispatchers (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        text NOT NULL,
  telefone    text NOT NULL,
  empresa     text,
  ativo       boolean NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Vendas (Resumo de Vendas)
-- ------------------------------------------------------------
CREATE TYPE status_venda AS ENUM ('iniciada', 'pendencia_vendedor', 'concluida');
CREATE TYPE forma_pagamento AS ENUM ('a_vista', 'cartao', 'financiamento');

CREATE TABLE sales (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendedor_id           uuid NOT NULL REFERENCES users(id),
  status                status_venda NOT NULL DEFAULT 'iniciada',
  -- Veículo
  marca                 text NOT NULL,
  modelo                text NOT NULL,
  versao                text,
  ano_fabricacao        integer NOT NULL,
  ano_modelo            integer NOT NULL,
  cor                   text NOT NULL,
  placa                 text NOT NULL,
  renavam               text NOT NULL,
  chassi                text NOT NULL,
  quilometragem         integer NOT NULL,
  valor_venda           numeric(12,2) NOT NULL,
  -- Comprador
  comprador_nome        text NOT NULL,
  comprador_cpf_cnpj    text NOT NULL,
  comprador_rg          text,
  comprador_nascimento  date,
  comprador_logradouro  text NOT NULL,
  comprador_numero      text NOT NULL,
  comprador_complemento text,
  comprador_bairro      text NOT NULL,
  comprador_cidade      text NOT NULL,
  comprador_uf          char(2) NOT NULL,
  comprador_cep         text NOT NULL,
  comprador_telefone    text NOT NULL,
  comprador_email       text,
  -- Negociação
  forma_pagamento       forma_pagamento NOT NULL,
  banco_financeira      text,
  valor_entrada         numeric(12,2),
  valor_financiado      numeric(12,2),
  numero_parcelas       integer,
  observacoes           text,
  -- Metadados
  criado_em             timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Anexos (referência ao Supabase Storage)
-- ------------------------------------------------------------
CREATE TABLE sale_attachments (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id       uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  tipo          text NOT NULL,
  storage_path  text NOT NULL,
  url           text NOT NULL,
  nome_arquivo  text NOT NULL,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Atividades por setor (geradas automaticamente)
-- ------------------------------------------------------------
CREATE TYPE tipo_setor AS ENUM ('contratos', 'financeiro', 'fiscal', 'transferencia');
CREATE TYPE status_atividade AS ENUM ('pendente', 'concluida');

CREATE TABLE sector_activities (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id         uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  setor           tipo_setor NOT NULL,
  status          status_atividade NOT NULL DEFAULT 'pendente',
  dados_json      jsonb,
  concluido_em    timestamptz,
  concluido_por   uuid REFERENCES users(id),
  criado_em       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sale_id, setor)
);

-- ------------------------------------------------------------
-- Pendências do vendedor (vistoria e firma)
-- ------------------------------------------------------------
CREATE TYPE tipo_pendencia_vendedor AS ENUM ('vistoria', 'firma');
CREATE TYPE status_pendencia_vendedor AS ENUM ('aberta', 'aguardando_aprovacao', 'aprovada');

CREATE TABLE seller_pendencies (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id         uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  vendedor_id     uuid NOT NULL REFERENCES users(id),
  tipo            tipo_pendencia_vendedor NOT NULL,
  status          status_pendencia_vendedor NOT NULL DEFAULT 'aberta',
  prazo           timestamptz NOT NULL,
  concluido_em    timestamptz,
  aprovado_por    uuid REFERENCES users(id),
  aprovado_em     timestamptz,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sale_id, tipo)
);

-- ------------------------------------------------------------
-- Pendências financeiras (múltiplas por venda)
-- ------------------------------------------------------------
CREATE TABLE pendencies (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id         uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  setor           tipo_setor NOT NULL DEFAULT 'financeiro',
  descricao       text NOT NULL,
  status          text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'encerrada')),
  registrado_por  uuid NOT NULL REFERENCES users(id),
  encerrado_por   uuid REFERENCES users(id),
  criado_em       timestamptz NOT NULL DEFAULT now(),
  encerrado_em    timestamptz
);

-- ------------------------------------------------------------
-- Processo de transferência
-- ------------------------------------------------------------
CREATE TYPE status_transferencia AS ENUM ('enviado', 'pendencia', 'concluido');

CREATE TABLE transfer_processes (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id               uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  despachante_id        uuid NOT NULL REFERENCES dispatchers(id),
  status                status_transferencia NOT NULL DEFAULT 'enviado',
  data_envio            timestamptz NOT NULL DEFAULT now(),
  prazo                 timestamptz NOT NULL,
  descricao_pendencia   text,
  atualizado_em         timestamptz NOT NULL DEFAULT now(),
  criado_em             timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sale_id)
);

-- ------------------------------------------------------------
-- Log de notificações WhatsApp
-- ------------------------------------------------------------
CREATE TABLE notifications_log (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id         uuid REFERENCES sales(id),
  evento          text NOT NULL,
  destinatario_id uuid REFERENCES users(id),
  whatsapp        text,
  payload_json    jsonb,
  enviado_em      timestamptz NOT NULL DEFAULT now(),
  sucesso         boolean NOT NULL DEFAULT false
);

-- ------------------------------------------------------------
-- Trigger: atualiza atualizado_em em sales
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_atualizado_em
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER transfer_atualizado_em
  BEFORE UPDATE ON transfer_processes
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

-- ------------------------------------------------------------
-- RLS — Row Level Security
-- ------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_pendencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pendencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: verifica se o usuário tem determinado perfil
CREATE OR REPLACE FUNCTION tem_perfil(p tipo_perfil)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND perfil = p
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Função auxiliar: verifica se é supervisor
CREATE OR REPLACE FUNCTION eh_supervisor()
RETURNS boolean AS $$
  SELECT tem_perfil('supervisor');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- users: usuário vê apenas o próprio registro; supervisor vê todos
CREATE POLICY "users_leitura" ON users FOR SELECT
  USING (id = auth.uid() OR eh_supervisor());

CREATE POLICY "users_supervisor_escrita" ON users FOR ALL
  USING (eh_supervisor());

-- user_roles: supervisor gerencia todos
CREATE POLICY "user_roles_leitura" ON user_roles FOR SELECT
  USING (user_id = auth.uid() OR eh_supervisor());

CREATE POLICY "user_roles_supervisor" ON user_roles FOR ALL
  USING (eh_supervisor());

-- sales: vendedor vê as próprias; setores e supervisor veem todas
CREATE POLICY "sales_vendedor" ON sales FOR SELECT
  USING (vendedor_id = auth.uid() OR eh_supervisor()
    OR tem_perfil('contratos') OR tem_perfil('financeiro')
    OR tem_perfil('fiscal') OR tem_perfil('transferencia'));

CREATE POLICY "sales_criar" ON sales FOR INSERT
  WITH CHECK (tem_perfil('vendedor') AND vendedor_id = auth.uid());

CREATE POLICY "sales_atualizar" ON sales FOR UPDATE
  USING (eh_supervisor() OR tem_perfil('contratos'));

-- sector_activities: setores veem e atualizam as suas
CREATE POLICY "sector_activities_leitura" ON sector_activities FOR SELECT
  USING (eh_supervisor()
    OR tem_perfil(setor::text::tipo_perfil)
    OR EXISTS (SELECT 1 FROM sales WHERE id = sale_id AND vendedor_id = auth.uid()));

CREATE POLICY "sector_activities_atualizar" ON sector_activities FOR UPDATE
  USING (eh_supervisor() OR tem_perfil(setor::text::tipo_perfil));

-- seller_pendencies: vendedor vê as próprias; supervisor vê todas
CREATE POLICY "seller_pendencies_leitura" ON seller_pendencies FOR SELECT
  USING (vendedor_id = auth.uid() OR eh_supervisor());

CREATE POLICY "seller_pendencies_vendedor_atualizar" ON seller_pendencies FOR UPDATE
  USING (vendedor_id = auth.uid() OR eh_supervisor());

-- pendencies: financeiro e supervisor
CREATE POLICY "pendencies_leitura" ON pendencies FOR SELECT
  USING (eh_supervisor() OR tem_perfil('financeiro'));

CREATE POLICY "pendencies_escrita" ON pendencies FOR ALL
  USING (eh_supervisor() OR tem_perfil('financeiro'));

-- transfer_processes: transferência e supervisor
CREATE POLICY "transfer_leitura" ON transfer_processes FOR SELECT
  USING (eh_supervisor() OR tem_perfil('transferencia')
    OR EXISTS (SELECT 1 FROM sales WHERE id = sale_id AND vendedor_id = auth.uid()));

CREATE POLICY "transfer_escrita" ON transfer_processes FOR ALL
  USING (eh_supervisor() OR tem_perfil('transferencia'));

-- dispatchers: todos leem; supervisor gerencia
CREATE POLICY "dispatchers_leitura" ON dispatchers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "dispatchers_supervisor" ON dispatchers FOR ALL
  USING (eh_supervisor());

-- sale_attachments: mesma regra que sales
CREATE POLICY "attachments_leitura" ON sale_attachments FOR SELECT
  USING (eh_supervisor() OR tem_perfil('contratos') OR tem_perfil('financeiro')
    OR tem_perfil('fiscal') OR tem_perfil('transferencia')
    OR EXISTS (SELECT 1 FROM sales WHERE id = sale_id AND vendedor_id = auth.uid()));

CREATE POLICY "attachments_inserir" ON sale_attachments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM sales WHERE id = sale_id AND vendedor_id = auth.uid())
    OR eh_supervisor());
