# FD Veículos — Sistema de Gestão Comercial e Administrativa

## Visão Geral

Sistema web interno para controle de execução de atividades de uma loja de seminovos.
Integra o setor comercial (vendedores) ao administrativo (Contratos, Financeiro, Fiscal e
Transferência), centralizando acompanhamento de pendências, prazos e status de cada venda.

**Importante:** o sistema NÃO emite contratos, notas fiscais ou processa pagamentos —
apenas registra e rastreia o status de cada etapa.

- Cliente: FD Veículos — Av. Marechal Mascarenhas de Moraes, 4930, Imbiribeira, Recife/PE
- Desenvolvedor: Rafael Macario (MK AutoSolution)
- Data de início: Abril de 2026

---

## Stack Tecnológica

| Camada             | Tecnologia                          | Observação                                      |
|--------------------|-------------------------------------|-------------------------------------------------|
| Frontend           | React 18 + Vite + TypeScript        | SPA                                             |
| Estilo             | TailwindCSS v4 + shadcn/ui          | Componentes Radix UI prontos                    |
| Roteamento         | React Router v6                     | Redirect por perfil no login                    |
| Estado global      | Zustand                             | Stores por domínio (auth, vendas, pendencias)   |
| Formulários        | React Hook Form + Zod               | Validação tipada                                |
| Backend / Auth     | Supabase (PostgreSQL + Auth + RLS)  | Sem backend próprio                             |
| Upload de arquivos | Supabase Storage (buckets)          | Fotos e documentos do Resumo de Vendas          |
| Automações         | n8n (instância própria — a definir) | Webhooks → WhatsApp Business API                |
| WhatsApp           | Evolution API (agentesmkpro.cloud)  | Mesma instância do MKReport                     |
| Hospedagem         | VPS Hostinger + Supabase Cloud      | https://sistemafdveiculos.com.br (Nginx + SSL)  |
| Ícones             | Lucide React                        | Padrão shadcn/ui                                |
| Datas              | date-fns                            | Cálculo de prazos (72h, 30 dias)                |

---

## Identidade Visual

- **Cores da marca:** azul `#1E40AF` e vermelho `#DC2626` (confirmar com FD Veículos)
- **Logo:** `src/assets/logo.png` (512x512)
- **Design:** funcional, limpo e objetivo — priorizar clareza de status, visibilidade de prazos

Variáveis CSS (configuradas em `src/index.css`):
```
--primary (shadcn): oklch(0.396 0.193 264.376)  → azul #1E40AF
--destructive (shadcn): oklch(0.577 0.245 27.325) → vermelho #DC2626
```

---

## Estrutura de Diretórios

```
projeto-fd-veiculos-adm/
├── CLAUDE.md
├── components.json           # shadcn/ui config
├── migrations/               # SQLs Supabase (001, 002...)
├── public/
└── src/
    ├── assets/
    │   └── logo.png
    ├── components/
    │   ├── ui/               # shadcn/ui (gerado pelo CLI)
    │   ├── layout/           # Sidebar, Header, Layout wrapper
    │   ├── vendedor/
    │   ├── contratos/
    │   ├── financeiro/
    │   ├── fiscal/
    │   ├── transferencia/
    │   └── supervisor/
    ├── pages/
    │   ├── Login.tsx
    │   ├── Dashboard.tsx     # Redireciona por perfil
    │   ├── vendedor/
    │   │   ├── PainelVendedor.tsx
    │   │   └── ResumoVendas.tsx
    │   ├── setores/
    │   │   ├── PainelContratos.tsx
    │   │   ├── PainelFinanceiro.tsx
    │   │   ├── PainelFiscal.tsx
    │   │   └── PainelTransferencia.tsx
    │   └── supervisor/
    │       ├── PainelSupervisor.tsx
    │       ├── GestaoUsuarios.tsx
    │       └── GestaoDespachantes.tsx
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── usePendencias.ts
    │   └── useVendas.ts
    ├── store/
    │   ├── authStore.ts
    │   ├── vendasStore.ts
    │   └── pendenciasStore.ts
    ├── services/
    │   ├── supabase.ts       # Cliente Supabase + tipos
    │   ├── vendas.ts
    │   ├── pendencias.ts
    │   ├── transferencias.ts
    │   └── notificacoes.ts   # Disparo de webhooks n8n
    ├── types/
    │   └── index.ts          # Tipos globais TypeScript
    └── lib/
        ├── utils.ts          # cn() — gerado pelo shadcn
        └── prazos.ts         # Cálculo de 72h e 30 dias
```

---

## Perfis de Usuário

Um único usuário pode ter **múltiplos perfis simultaneamente**.

| Perfil        | Valor no banco   | Descrição                                   |
|---------------|------------------|---------------------------------------------|
| Vendedor      | `vendedor`       | Cria Resumo de Vendas, monitora pendências  |
| Contratos     | `contratos`      | Formaliza contrato                          |
| Financeiro    | `financeiro`     | Confirma pagamento, registra pendências     |
| Fiscal        | `fiscal`         | Registra emissão de NF-e                    |
| Transferência | `transferencia`  | Gestão do despachante e status              |
| Supervisor    | `supervisor`     | Visão completa, aprovações, cadastros       |

---

## Fluxo Principal

```
VENDEDOR cadastra Resumo de Vendas
    │
    ├──► CONTRATOS    → registra "Contrato Formalizado" → marca venda como Concluída
    ├──► FINANCEIRO   → confirma pagamento OU registra Pendência Financeira
    ├──► FISCAL       → registra número e data da NF-e
    └──► TRANSFERÊNCIA → seleciona despachante → atualiza status (prazo: 30 dias)

VENDEDOR recebe automaticamente 2 pendências (prazo 72h):
    ├── Vistoria do veículo
    └── Reconhecimento de Firma / Assinatura GOV.BR
```

### Status da Venda (painel do Vendedor)

| Status                | Condição                                            |
|-----------------------|-----------------------------------------------------|
| Venda Iniciada        | Resumo de Vendas submetido                          |
| Pendência do Vendedor | Uma ou ambas as pendências de 72h ainda abertas     |
| Venda Concluída       | Setor de Contratos registrou a formalização         |

### Status do Processo de Transferência

| Status                    | Descrição                                           |
|---------------------------|-----------------------------------------------------|
| Enviado ao Despachante    | Processo encaminhado, aguardando andamento          |
| Processo com Pendência    | Problema identificado (inserido manualmente)        |
| Processo Concluído        | Transferência finalizada com sucesso                |

---

## Regras de Negócio

1. O envio do Resumo de Vendas dispara **simultaneamente** demandas para os 4 setores
2. O envio cria automaticamente **2 pendências do vendedor** com prazo de **72 horas**
3. Conclusão de pendência do vendedor precisa de **aprovação do Supervisor**
4. Pendências entre setores **não bloqueiam** outros setores — coexistem como registros abertos
5. Processo de transferência tem prazo máximo de **30 dias** a partir do envio ao despachante
6. Status "Processo com Pendência" é inserido **manualmente** pelo setor de Transferência
7. Pode haver **múltiplas pendências financeiras** em uma mesma venda
8. Venda aparece como "Concluída" **somente após** formalização do Contratos
9. Usuário pode ter **múltiplos perfis** — exibe painéis de todos os setores habilitados
10. Sistema NÃO emite contratos, NF-e ou processa pagamentos — apenas registra status

---

## Modelo de Dados — Tabelas Supabase

```sql
-- Usuários (espelho do Supabase Auth)
users (id uuid PK, nome text, email text, whatsapp text, ativo boolean, criado_em timestamptz)

-- Papéis/setores por usuário (N:N)
user_roles (id uuid PK, user_id uuid FK, perfil text, criado_em timestamptz)
-- perfil ∈ {vendedor, contratos, financeiro, fiscal, transferencia, supervisor}

-- Vendas (Resumo de Vendas)
sales (
  id uuid PK, vendedor_id uuid FK, status text,
  marca text, modelo text, versao text, ano_fabricacao int, ano_modelo int,
  cor text, placa text, renavam text, chassi text, quilometragem int, valor_venda numeric,
  comprador_nome text, comprador_cpf_cnpj text, comprador_rg text,
  comprador_nascimento date, comprador_logradouro text, comprador_numero text,
  comprador_complemento text, comprador_bairro text, comprador_cidade text,
  comprador_uf char(2), comprador_cep text, comprador_telefone text, comprador_email text,
  forma_pagamento text,
  formas_pagamento_json jsonb,          -- múltiplos métodos {tipo, valor, banco, parcelas...}
  banco_financeira text, valor_entrada numeric,
  valor_financiado numeric, numero_parcelas int,
  transferencia_info text,              -- "Cortesia" | valor cobrado (R$)
  ipva_info text,                       -- texto livre
  observacoes text,
  criado_em timestamptz, atualizado_em timestamptz
)

-- Veículo de entrada (troca)
trade_in_vehicles (
  id uuid PK, sale_id uuid FK UNIQUE,
  marca text, modelo text, versao text, cor text,
  ano_fabricacao int, ano_modelo int, placa text, renavam text, chassi text,
  quilometragem int, valor_estimado numeric, proprietario_nome text, observacoes text,
  debitos_json jsonb DEFAULT '[]',      -- [{descricao, valor}] deduzidos da entrada
  criado_em timestamptz
)

-- Anexos (Supabase Storage)
sale_attachments (id uuid PK, sale_id uuid FK, tipo text, storage_path text, url text, nome_arquivo text, criado_em timestamptz)

-- Atividades por setor (geradas no envio da venda)
sector_activities (id uuid PK, sale_id uuid FK, setor text, status text, dados_json jsonb, concluido_em timestamptz, concluido_por uuid FK, criado_em timestamptz)

-- Pendências do vendedor (vistoria e firma)
seller_pendencies (id uuid PK, sale_id uuid FK, vendedor_id uuid FK, tipo text, status text, prazo timestamptz, concluido_em timestamptz, aprovado_por uuid FK, aprovado_em timestamptz, criado_em timestamptz)

-- Pendências financeiras (múltiplas por venda)
pendencies (id uuid PK, sale_id uuid FK, setor text, descricao text, status text, registrado_por uuid FK, encerrado_por uuid FK, criado_em timestamptz, encerrado_em timestamptz)

-- Processo de transferência
transfer_processes (id uuid PK, sale_id uuid FK, despachante_id uuid FK, status text, data_envio timestamptz, prazo timestamptz, descricao_pendencia text, atualizado_em timestamptz, criado_em timestamptz)

-- Despachantes cadastrados
dispatchers (id uuid PK, nome text, telefone text, empresa text, ativo boolean, criado_em timestamptz)

-- Log de notificações
notifications_log (id uuid PK, sale_id uuid FK, evento text, destinatario_id uuid FK, whatsapp text, payload_json jsonb, enviado_em timestamptz, sucesso boolean)
```

---

## Notificações WhatsApp (n8n → Evolution API)

**Instância Evolution:** `evolution.agentesmkpro.cloud/MKAutosolution`
**n8n:** instância própria para FD Veículos (a configurar)

| Evento                                             | Destinatário                            |
|----------------------------------------------------|-----------------------------------------|
| Novo Resumo de Vendas submetido                    | Supervisor + responsáveis de cada setor |
| Pendência do vendedor próxima do vencimento (≤12h) | Vendedor + Supervisor                   |
| Pendência do vendedor vencida (72h)                | Vendedor + Supervisor                   |
| Nova pendência financeira registrada               | Supervisor                              |
| Transferência próxima do vencimento (≤5 dias)      | Transferência + Supervisor              |
| Transferência vencida (30 dias)                    | Transferência + Supervisor              |
| Pendência do vendedor marcada concluída            | Supervisor (para aprovação)             |

---

## Autenticação e Segurança

- Login: e-mail + senha via Supabase Auth
- Sessão: JWT Supabase (persistido em localStorage)
- Após login → verificar perfis em `user_roles` → redirecionar para dashboard correto
- **RLS obrigatório** em todas as tabelas
- Usuário Admin inicial: `suporte@mkautosolution.cloud`
- Criação de usuários: apenas pelo Supervisor via painel de Gestão de Usuários

---

## Deploy e Variáveis de Ambiente

- **Frontend:** VPS Hostinger (72.62.10.198) — build local + scp + nginx reload
- **Script de deploy:** `.\deploy\deploy-fdveiculos.ps1`
- **SSH key:** `~/.ssh/mkreport_vps`
- **Domínio:** https://sistemafdveiculos.com.br
- **Backend:** Supabase Cloud (projeto: cobrxwpplqzejdwyabqi)
- `.env.local`:
  ```
  VITE_SUPABASE_URL=
  VITE_SUPABASE_ANON_KEY=
  VITE_N8N_WEBHOOK_URL=
  ```

---

## Convenções de Desenvolvimento

- **Linguagem do código:** Português (variáveis, funções, componentes, comentários)
- **Tipagem:** TypeScript estrito — sem `any`
- **Alias de importação:** `@/` aponta para `src/`
- **Componentes:** funcionais com hooks — sem class components
- **Estilo:** Tailwind classes no JSX — sem CSS modules
- **Formulários:** React Hook Form + Zod
- **Queries Supabase:** centralizadas em `src/services/` — nunca direto no componente
- **Datas/prazos:** usar `date-fns` — nunca `new Date()` raw para cálculos de prazo
- **Commits:** mensagens em português, descritivas
- **shadcn/ui:** adicionar componentes via `npx shadcn@latest add <componente>`

---

## Rotas Implementadas

| Rota | Componente | Acesso |
|------|-----------|--------|
| `/vendedor` | PainelVendedor | vendedor, supervisor |
| `/vendedor/nova-venda` | NovaVenda | vendedor, supervisor |
| `/vendedor/editar-venda/:id` | NovaVenda (modo edição) | vendedor (se ≠ concluida), supervisor (qualquer) |
| `/vendedor/comissoes` | MinhasComissoes | vendedor |
| `/setor/contratos` | PainelContratos | contratos |
| `/setor/financeiro` | PainelFinanceiro | financeiro |
| `/setor/fiscal` | PainelFiscal | fiscal |
| `/setor/transferencia` | PainelTransferencia | transferencia |
| `/supervisor` | PainelSupervisor | supervisor |
| `/supervisor/lista` | ListaSupervisor | supervisor |
| `/supervisor/aprovacoes` | Aprovacoes | supervisor |
| `/supervisor/quadro-vendas` | QuadroVendas | supervisor |
| `/supervisor/usuarios` | GestaoUsuarios | supervisor |
| `/supervisor/despachantes` | GestaoDespachantes | supervisor |
| `/venda/:saleId` | DetalheVenda | todos |
| `/inicio` | Inicio | todos |
| `/configuracoes` | Configuracoes | todos |

---

## Armadilhas Conhecidas

- **`seller_pendencies` tem 2 FKs para `users`** (`vendedor_id_fkey` e `aprovado_por_fkey`) — sempre usar FK explícito: `users!seller_pendencies_vendedor_id_fkey(nome)`. Sem o hint o Supabase retorna erro silencioso e lista vazia.
- **`gen_salt`/`crypt`** em funções SQL: usar `SET search_path = public, extensions` e `extensions.crypt()` / `extensions.gen_salt()`.
- **Fotos no modo edição:** `salvarFotosNoBanco` faz INSERT. Rastrear IDs existentes com `useRef<Set<string>>` e filtrar antes de salvar. Mesmo padrão para documentos de entrada.
- **`listarTodasVendas`:** usa `users!vendedor_id(nome)` para evitar ambiguidade no join.
- **Deploy SSH:** o comando `ssh rm -rf /tmp/fdveiculos_upload` às vezes pendura — matar o processo e rodar novamente.

---

## Fases de Desenvolvimento

| Fase | Descrição | Status |
|------|-----------|--------|
| 0 | Preparação e validação com cliente | ✅ Concluída |
| 1 | Base: setup, Supabase, auth, usuários | ✅ Concluída |
| 2 | Fluxo principal: Resumo de Vendas, demandas, pendências | ✅ Concluída |
| 3 | Painéis administrativos por setor | ✅ Concluída |
| 4 | Dashboard do Supervisor, monitoramento, edição de vendas | ✅ Concluída |
| 5 | Notificações WhatsApp (n8n) | ⬜ Não iniciada |
| 6 | QA, ajustes UX e deploy em produção | 🔄 Em andamento |
