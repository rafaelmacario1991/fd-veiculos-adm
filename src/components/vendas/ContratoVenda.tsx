import logoFD from '@/assets/fd-logo.png'
import type { DetalheVenda } from '@/services/detalhes'

const EMPRESA = {
  razaoSocial: 'FD MULTIMARCAS COMÉRCIO DE VEÍCULOS AUTOMOTIVOS LTDA',
  cnpj: '35.114.425/0001-06',
  logradouro: 'AVENIDA MARECHAL MASCARENHAS DE MORAES',
  numero: '4930',
  bairro: 'IBURA',
  cep: '51210-000',
  cidade: 'RECIFE - PE',
  telefone: '(81) 98812-3368',
}

const CLAUSULAS = [
  'Fica claro entre as partes que o veículo objeto deste contrato é vendido no estado em que se encontra, sendo de responsabilidade do comprador quaisquer avarias, danos mecânicos, elétricos ou estruturais não identificados no momento da venda.',
  'A transferência do veículo deverá ser realizada no prazo estipulado neste contrato. Caso o comprador não efetue a transferência dentro do prazo, o vendedor não se responsabilizará por multas, infrações ou quaisquer débitos gerados após a data de venda.',
  'O comprador declara estar ciente das condições gerais do veículo e que teve plena oportunidade de inspecioná-lo antes da conclusão deste negócio.',
  'Em caso de financiamento, o comprador é responsável pelo pagamento das parcelas nas datas acordadas com a financiadora. A FD Veículos não se responsabiliza por eventuais inadimplências.',
  'As partes elegem o foro da comarca de Recife - PE para dirimir quaisquer dúvidas ou litígios oriundos deste contrato, renunciando a qualquer outro por mais privilegiado que seja.',
  'O veículo será entregue ao comprador somente após a confirmação do pagamento integral ou liberação de crédito pela financiadora.',
  'Quaisquer acessórios ou itens adicionais ao veículo somente integram este contrato se expressamente mencionados neste documento.',
  'O comprador declara que os documentos pessoais fornecidos para elaboração deste contrato são verdadeiros e autênticos, responsabilizando-se civil e criminalmente em caso de falsidade.',
  'As informações sobre débitos do veículo (IPVA, multas, licenciamento) foram fornecidas com base em consulta prévia e podem estar sujeitas a alterações. O comprador deverá verificar a situação atualizada junto aos órgãos competentes.',
  'Este contrato é firmado em caráter irrevogável e irretratável, obrigando as partes e seus sucessores.',
  'Para todos os efeitos legais, a assinatura deste instrumento representa plena concordância com todos os termos e condições aqui estabelecidos.',
]

function moeda(v: number | null | undefined) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDataContrato(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso + (iso.includes('T') ? '' : 'T12:00:00'))
  const meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO']
  return `${String(d.getDate()).padStart(2, '0')} de ${meses[d.getMonth()]} de ${d.getFullYear()}`
}

interface FormaPagamentoItem {
  tipo: string
  valor: number
  data?: string
  banco?: string
  numero_parcelas?: number
  valor_parcela?: number
  data_primeiro_pagamento?: string
}

function labelTipo(tipo: string) {
  const mapa: Record<string, string> = {
    dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão',
    financiamento: 'Financiamento', promissoria: 'Promissória',
  }
  return mapa[tipo] ?? tipo
}

interface Props {
  venda: DetalheVenda
}

export default function ContratoVenda({ venda }: Props) {
  const formas = (venda.formas_pagamento_json ?? []) as unknown as FormaPagamentoItem[]
  const financiamento = formas.find((f) => f.tipo === 'financiamento')
  const pagamentosNaoFinanciamento = formas.filter((f) => f.tipo !== 'financiamento')

  const transferenciaInfo = venda.transferencia_info ?? ''
  const transfTipo = transferenciaInfo.toLowerCase() === 'cortesia'
    ? 'POR CONTA DA LOJA'
    : transferenciaInfo
      ? `COBRADO — R$ ${transferenciaInfo}`
      : '—'

  const agora = new Date()
  const hora = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`
  const dataExtenso = fmtDataContrato(agora.toISOString())

  const ei = venda.veiculo_entrada

  return (
    <div className="contrato-print-area" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#000', background: '#fff', padding: '20mm 15mm', maxWidth: '210mm', margin: '0 auto', lineHeight: 1.4 }}>

      {/* ── CABEÇALHO ── */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '0' }}>
        <img src={logoFD} alt="FD Veículos" style={{ height: '60px', marginRight: '16px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{EMPRESA.razaoSocial}</div>
          <div>CNPJ: {EMPRESA.cnpj}</div>
          <div>{EMPRESA.logradouro}, Nº {EMPRESA.numero} — {EMPRESA.bairro} — CEP {EMPRESA.cep} — {EMPRESA.cidade}</div>
          <div>Tel: {EMPRESA.telefone}</div>
        </div>
      </div>

      {/* ── TÍTULO ── */}
      <div style={{ textAlign: 'center', margin: '8px 0 10px', padding: '6px 0', borderBottom: '1px solid #ccc' }}>
        <span style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px' }}>CONTRATO DE VENDA</span>
      </div>

      {/* ── EMPRESA / VENDEDOR ── */}
      <Secao titulo="EMPRESA">
        <LinhaContrato rotulo="Razão Social" valor={EMPRESA.razaoSocial} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
          <LinhaContrato rotulo="CNPJ" valor={EMPRESA.cnpj} />
          <LinhaContrato rotulo="Vendedor" valor={venda.vendedor?.nome?.toUpperCase() ?? '—'} />
        </div>
      </Secao>

      {/* ── CLIENTE ── */}
      <Secao titulo="CLIENTE">
        <LinhaContrato rotulo="Nome" valor={venda.comprador_nome?.toUpperCase()} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px' }}>
          <LinhaContrato rotulo="RG" valor={venda.comprador_rg ?? '—'} />
          <LinhaContrato rotulo="CPF/CNPJ" valor={venda.comprador_cpf_cnpj} />
          <LinhaContrato rotulo="Profissão" valor={venda.comprador_profissao ?? '—'} />
        </div>
        <LinhaContrato rotulo="Endereço" valor={`${venda.comprador_logradouro}, Nº ${venda.comprador_numero}${venda.comprador_complemento ? ', ' + venda.comprador_complemento : ''} — ${venda.comprador_bairro} — CEP ${venda.comprador_cep} — ${venda.comprador_cidade}/${venda.comprador_uf}`} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
          <LinhaContrato rotulo="Telefone/Celular" valor={venda.comprador_telefone} />
          <LinhaContrato rotulo="E-mail" valor={venda.comprador_email ?? '—'} />
        </div>
      </Secao>

      {/* ── VEÍCULO VENDIDO ── */}
      <Secao titulo="VEÍCULO VENDIDO">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px' }}>
          <LinhaContrato rotulo="Marca" valor={venda.marca?.toUpperCase()} />
          <LinhaContrato rotulo="Tipo" valor={venda.tipo_veiculo?.toUpperCase() ?? '—'} />
          <LinhaContrato rotulo="Placa" valor={venda.placa?.toUpperCase()} />
        </div>
        <LinhaContrato rotulo="Veículo (Modelo / Versão)" valor={`${venda.modelo?.toUpperCase()} ${venda.versao?.toUpperCase() ?? ''}`.trim()} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px' }}>
          <LinhaContrato rotulo="Ano Fab./Mod." valor={`${venda.ano_fabricacao}/${venda.ano_modelo}`} />
          <LinhaContrato rotulo="Renavam" valor={venda.renavam ?? '—'} />
          <LinhaContrato rotulo="Chassi" valor={venda.chassi?.toUpperCase() ?? '—'} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '2px' }}>
          <LinhaContrato rotulo="Cor" valor={venda.cor?.toUpperCase()} />
          <LinhaContrato rotulo="Nr. Motor" valor={venda.nr_motor?.toUpperCase() ?? '—'} />
          <LinhaContrato rotulo="Combustível" valor={venda.combustivel?.toUpperCase() ?? '—'} />
          <LinhaContrato rotulo="Potência" valor={venda.potencia ? `${venda.potencia} cv` : '—'} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
          <LinhaContrato rotulo="Quilometragem" valor={`${venda.quilometragem?.toLocaleString('pt-BR')} km`} />
          <LinhaContrato rotulo="Valor da Venda (R$)" valor={moeda(venda.valor_venda)} />
        </div>
      </Secao>

      {/* ── PAGAMENTOS ── */}
      <Secao titulo="PAGAMENTOS">
        {pagamentosNaoFinanciamento.length === 0 && !financiamento && (
          <p style={{ color: '#666' }}>—</p>
        )}
        {pagamentosNaoFinanciamento.map((p, i) => (
          <div key={i} style={{ marginBottom: '2px' }}>
            • {labelTipo(p.tipo)} — 1x R$ {moeda(p.valor)}{p.data ? ` (${new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')})` : ''}
          </div>
        ))}
        {financiamento && (
          <div>• Financiamento — R$ {moeda(financiamento.valor)}</div>
        )}
      </Secao>

      {/* ── FINANCIAMENTO ── */}
      {financiamento && (
        <Secao titulo="FINANCIAMENTO">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
            <LinhaContrato rotulo="Financiadora" valor={financiamento.banco?.toUpperCase() ?? '—'} />
            <LinhaContrato rotulo="Valor do Financiamento (R$)" valor={moeda(financiamento.valor)} />
            <LinhaContrato rotulo="Valor da Prestação (R$)" valor={financiamento.valor_parcela ? moeda(financiamento.valor_parcela) : '—'} />
            <LinhaContrato rotulo="Prazo" valor={financiamento.numero_parcelas ? `${financiamento.numero_parcelas} parcelas` : '—'} />
            <LinhaContrato rotulo="1º Pagamento" valor={financiamento.data_primeiro_pagamento ? new Date(financiamento.data_primeiro_pagamento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'} />
          </div>
          <div style={{ marginTop: '8px', display: 'flex', gap: '60px' }}>
            <div style={{ flex: 1, borderTop: '1px solid #000', paddingTop: '2px', textAlign: 'center', fontSize: '8px' }}>Assinatura de Concordância do Comprador</div>
          </div>
        </Secao>
      )}

      {/* ── TRANSFERÊNCIA ── */}
      <Secao titulo="TRANSFERÊNCIA">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2px' }}>
          <LinhaContrato rotulo="Tipo" valor={transfTipo} />
          <LinhaContrato rotulo="Observação" valor={`TRANSFERÊNCIA DE TITULARIDADE. PRAZO PARA DOCUMENTAÇÃO: 30 DIAS ÚTEIS.`} />
        </div>
        {venda.ipva_info && (
          <LinhaContrato rotulo="Observação IPVA" valor={venda.ipva_info.toUpperCase()} />
        )}
      </Secao>

      {/* ── VEÍCULO DE ENTRADA ── */}
      {ei && (
        <Secao titulo="VEÍCULO COMPRADO (ENTRADA / TROCA)">
          <LinhaContrato rotulo="Veículo" valor={`${ei.marca?.toUpperCase()} ${ei.modelo?.toUpperCase()} ${ei.versao?.toUpperCase() ?? ''}`.trim()} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '2px' }}>
            <LinhaContrato rotulo="Placa" valor={ei.placa?.toUpperCase()} />
            <LinhaContrato rotulo="Cor" valor={ei.cor?.toUpperCase()} />
            <LinhaContrato rotulo="Ano Fab./Mod." valor={`${ei.ano_fabricacao}/${ei.ano_modelo}`} />
            <LinhaContrato rotulo="KM" valor={ei.quilometragem ? `${ei.quilometragem.toLocaleString('pt-BR')} km` : '—'} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
            <LinhaContrato rotulo="Renavam" valor={ei.renavam ?? '—'} />
            <LinhaContrato rotulo="Chassi" valor={ei.chassi?.toUpperCase() ?? '—'} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
            <LinhaContrato rotulo="Valor de Compra (R$)" valor={moeda(ei.valor_estimado)} />
            <LinhaContrato rotulo="Documento em Nome de" valor={ei.proprietario_nome?.toUpperCase() ?? '—'} />
          </div>
          {ei.proprietario_cpf && (
            <LinhaContrato rotulo="CPF do Proprietário" valor={ei.proprietario_cpf} />
          )}
          {ei.debitos_json && ei.debitos_json.length > 0 && (
            <div style={{ marginTop: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Débitos a deduzir:</div>
              {ei.debitos_json.map((d, i) => (
                <div key={i}>• {d.descricao} — R$ {moeda(d.valor)}</div>
              ))}
            </div>
          )}
        </Secao>
      )}

      {/* ── CLÁUSULAS ── */}
      <Secao titulo="CLÁUSULAS CONTRATUAIS">
        {CLAUSULAS.map((c, i) => (
          <div key={i} style={{ marginBottom: '4px' }}>
            <strong>Cláusula {i + 1}ª.</strong> {c}
          </div>
        ))}
      </Secao>

      {/* ── ASSINATURAS ── */}
      <div style={{ marginTop: '12px', fontSize: '10px' }}>
        <div style={{ marginBottom: '10px' }}>
          {EMPRESA.cidade}, {hora} — {dataExtenso}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '20px' }}>
          <AssinaturaBloco titulo="CLIENTE" nome={venda.comprador_nome?.toUpperCase()} cpf={venda.comprador_cpf_cnpj} />
          <AssinaturaBloco titulo="EMPRESA" nome={EMPRESA.razaoSocial} cpf={EMPRESA.cnpj} />
        </div>
      </div>

      {/* ── TESTEMUNHAS — Página 2 ── */}
      <div style={{ pageBreakBefore: 'always', paddingTop: '20mm' }}>
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px', marginBottom: '40px' }}>
          TESTEMUNHAS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px' }}>
          <AssinaturaBloco titulo="TESTEMUNHA 1" nome="" cpf="" />
          <AssinaturaBloco titulo="TESTEMUNHA 2" nome="" cpf="" />
        </div>
      </div>

    </div>
  )
}

// ── Sub-componentes ──────────────────────────────────────────────

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '8px', border: '1px solid #999', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ background: '#1E40AF', color: '#fff', fontWeight: 'bold', padding: '2px 6px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {titulo}
      </div>
      <div style={{ padding: '4px 6px', background: '#fff' }}>
        {children}
      </div>
    </div>
  )
}

function LinhaContrato({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div style={{ marginBottom: '2px' }}>
      <span style={{ fontWeight: 'bold', fontSize: '8px', color: '#555', textTransform: 'uppercase' }}>{rotulo}: </span>
      <span>{valor ?? '—'}</span>
    </div>
  )
}

function AssinaturaBloco({ titulo, nome, cpf }: { titulo: string; nome: string; cpf: string }) {
  return (
    <div>
      <div style={{ borderTop: '1px solid #000', marginTop: '40px', paddingTop: '4px', textAlign: 'center' }}>
        <div style={{ fontWeight: 'bold', fontSize: '9px' }}>{titulo}</div>
        {nome && <div style={{ fontSize: '9px' }}>{nome}</div>}
        {cpf && <div style={{ fontSize: '9px' }}>CPF/CNPJ: {cpf}</div>}
      </div>
    </div>
  )
}
