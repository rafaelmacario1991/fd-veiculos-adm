// ============================================================
// Tipos globais — FD Veículos
// ============================================================

export type Perfil =
  | 'vendedor'
  | 'contratos'
  | 'financeiro'
  | 'fiscal'
  | 'transferencia'
  | 'supervisor'

export type StatusVenda = 'iniciada' | 'pendencia_vendedor' | 'concluida'

export type FormaPagamento = string

export interface MetodoPagamentoItem {
  tipo: string
  valor: number
  banco?: string
  numero_parcelas?: number
  valor_parcela?: number
  data_primeiro_pagamento?: string
}

export type StatusTransferencia = 'enviado' | 'pendencia' | 'concluido'

export type TipoPendenciaVendedor = 'vistoria' | 'firma'

export type StatusPendenciaVendedor = 'aberta' | 'aguardando_aprovacao' | 'aprovada'

export type SetorAtividade = 'contratos' | 'financeiro' | 'fiscal' | 'transferencia'

export type StatusAtividade = 'pendente' | 'concluida'

// ------------------------------------------------------------

export interface Usuario {
  id: string
  nome: string
  email: string
  whatsapp?: string
  ativo: boolean
  avatar_url?: string
  criado_em: string
  perfis: Perfil[]
}

export interface Venda {
  id: string
  vendedor_id: string
  status: StatusVenda
  // Dados do veículo
  marca: string
  modelo: string
  versao?: string
  ano_fabricacao: number
  ano_modelo: number
  cor: string
  placa: string
  renavam: string
  chassi: string
  quilometragem: number
  valor_venda: number
  // Dados do comprador
  comprador_nome: string
  comprador_cpf_cnpj: string
  comprador_rg?: string
  comprador_nascimento?: string
  comprador_logradouro: string
  comprador_numero: string
  comprador_complemento?: string
  comprador_bairro: string
  comprador_cidade: string
  comprador_uf: string
  comprador_cep: string
  comprador_telefone: string
  comprador_email?: string
  // Dados da negociação
  forma_pagamento: FormaPagamento
  banco_financeira?: string
  valor_entrada?: number
  valor_financiado?: number
  numero_parcelas?: number
  observacoes?: string
  // Metadados
  criado_em: string
  atualizado_em: string
  // Relações
  vendedor?: Usuario
  atividades?: AtividadeSetor[]
  pendencias_vendedor?: PendenciaVendedor[]
}

export interface AtividadeSetor {
  id: string
  sale_id: string
  setor: SetorAtividade
  status: StatusAtividade
  prazo?: string
  dados_json?: Record<string, unknown>
  concluido_em?: string
  concluido_por?: string
  criado_em: string
}

export interface Tarefa {
  id: string
  titulo: string
  descricao?: string
  setor_responsavel?: string
  usuario_responsavel_id?: string
  criado_por_id: string
  sale_id?: string
  prazo: string
  status: 'aberta' | 'concluida'
  criado_em: string
  concluido_em?: string
  concluido_por_id?: string
  anexo_path?: string
  anexo_nome?: string
  // Dados de join (preenchidos por listarTarefas)
  criado_por?: { id: string; nome: string }
  responsavel?: { id: string; nome: string }
  concluido_por?: { id: string; nome: string }
}

export interface PendenciaVendedor {
  id: string
  sale_id: string
  vendedor_id: string
  tipo: TipoPendenciaVendedor
  status: StatusPendenciaVendedor
  prazo: string
  concluido_em?: string
  aprovado_por?: string
  aprovado_em?: string
  criado_em: string
  // Relações
  venda?: Venda
}

export interface PendenciaFinanceira {
  id: string
  sale_id: string
  setor: SetorAtividade
  descricao: string
  status: 'aberta' | 'encerrada'
  registrado_por: string
  encerrado_por?: string
  criado_em: string
  encerrado_em?: string
}

export interface ProcessoTransferencia {
  id: string
  sale_id: string
  despachante_id: string
  status: StatusTransferencia
  data_envio: string
  prazo: string
  descricao_pendencia?: string
  atualizado_em: string
  criado_em: string
  // Relações
  despachante?: Despachante
  venda?: Venda
}

export interface Despachante {
  id: string
  nome: string
  telefone: string
  empresa?: string
  ativo: boolean
  criado_em: string
}

export interface AnexoVenda {
  id: string
  sale_id: string
  tipo: string
  storage_path: string
  url: string
  nome_arquivo: string
  criado_em: string
}
