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
  'O VENDEDOR se compromete a entregar o veículo livre e desembaraçado de quaisquer ônus que pese sobre o mesmo.',
  'Fica o COMPRADOR obrigado a efetuar a transferência de veículo supra mencionado, no prazo de 30 (trinta) dias, a contar desta data,(exceto em casos em que o pagamento total ainda não foi efetuado, neste caso, os documentos só serão liberados pelo vendedor quando houver o pagamento total dos meios escolhidos para complementar a compra) para seu nome ou de outrem, caso não o faça, o VENDEDOR, se exime de pagar quaisquer multas, sobre o veículo acima mencionado.',
  'O COMPRADOR se responsabiliza civil e criminalmente por danos causados à terceiros, à partir do momento que se realizou fechamento do negócio.',
  'O COMPRADOR declara ter vistoriado o veículo acima descrito e adquirido o mesmo, no estado em que se encontra nada tendo a reclamar, a que título for respeitando e cumprindo fielmente os termos da presente.',
  'Com o veículo acima descrito, declaro, sob pena da lei, estar ciente da obrigação de adotar as providências necessárias à efetivação da expedição do Certificado de Registro do Veículo para meu nome, no prazo de 30 (trinta) dias, contados do reconhecimento de firma CRV pela vendedora, de acordo com o 1 do artigo do Código de Trânsito Brasileiro, não podendo circular com o veículo sem estar com documentação formalmente transferida após esse período de 30 (trinta) dias.',
  'Assumo expressamente a partir desta data, a responsabilidade civil e criminal por quaisquer danos materiais e/ou pessoais causados a terceiros, desde a retirada do veículo do pátio da loja. Assumo também o pagamento integral de todos os impostos, multas, taxas e licenciamentos, ocorridos a partir desta data, autorizando desde já que a PONTUAÇÃO punitiva por infração seja DIRECIONADA para pontuário da HABILITAÇÃO em meu nome.',
  'Para veículos com correia dentada, o cliente está ciente que deve trocá-la senão perderá garantia do motor, exceto para veículos zero quilômetro. A partir da data deste contrato, se o comprador alterar o tipo de combustível do veículo, perderá a garantia do motor.',
  'O veículo tem garantia durante 90 dias de uso p/ partes internas de caixa de câmbio e motor, excluindo-se qualquer componente agregado.',
  'Esta garantia é exclusiva ao proprietário acima, sendo intransferível em caso de venda deste veículo. Fica convencionado que não caberá reembolso de todo e qualquer serviço realizado fora das oficinas credenciadas pela empresa ou sem prévia e expressa autorização desta. Em caso de negligência e/ou mau uso do veículo, resultará na perda desta garantia.',
  'Os contratantes obrigam-se, por si, seus herdeiros ou sucessores, a cumprir fielmente o presente contrato, honrando com as clausulas e descriminações financeiras descritas neste.',
  'As partes elegem o foro da comarca de RECIFE - PE, para dirimirem quaisquer dúvidas originadas deste contrato, com renúncia de qualquer outro, por mais privilegiado que seja. E, por estarem assim justa e contratadas, aceitam e assinam as partes o presente instrumento, sendo este o mecanismo válido e eficaz para todos os fins de direito.',
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
  editavel?: boolean
}

export default function ContratoVenda({ venda, editavel = false }: Props) {
  const formas = (venda.formas_pagamento_json ?? []) as unknown as FormaPagamentoItem[]
  const financiamento = formas.find((f) => f.tipo === 'financiamento')
  const pagamentosNaoFinanciamento = formas.filter((f) => f.tipo !== 'financiamento')

  const troco = venda.troco ?? 0

  const transferenciaInfo = venda.transferencia_info ?? ''
  const isCortesia = transferenciaInfo.toLowerCase() === 'cortesia'
  const transfTipo = isCortesia
    ? 'POR CONTA DA LOJA'
    : transferenciaInfo
      ? `COBRADO — R$ ${transferenciaInfo}`
      : '—'
  const transfObs = isCortesia
    ? 'TRANSFERÊNCIA DE TITULARIDADE. CORTESIA PRAZO PARA DOCUMENTAÇÃO: 30 DIAS ÚTEIS.'
    : 'TRANSFERÊNCIA DE TITULARIDADE. PRAZO PARA DOCUMENTAÇÃO: 30 DIAS ÚTEIS.'

  const agora = new Date()
  const hora = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`
  const dataExtenso = fmtDataContrato(agora.toISOString())

  const veiculosEntrada = venda.veiculos_entrada ?? []

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
      <div style={{ margin: '8px 0 10px', paddingBottom: '6px', borderBottom: '1px solid #ccc', textAlign: 'center' }}>
        <strong style={{ fontSize: '14px', letterSpacing: '2px' }}>CONTRATO DE VENDA</strong>
      </div>

      {/* ── EMPRESA / VENDEDOR ── */}
      <Secao titulo="EMPRESA">
        <LinhaContrato rotulo="Razão Social" valor={EMPRESA.razaoSocial} editavel={editavel} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
          <LinhaContrato rotulo="CNPJ" valor={EMPRESA.cnpj} editavel={editavel} />
          <LinhaContrato rotulo="Vendedor" valor={venda.vendedor?.nome?.toUpperCase() ?? '—'} editavel={editavel} />
        </div>
      </Secao>

      {/* ── CLIENTE ── */}
      <Secao titulo="CLIENTE">
        <LinhaContrato rotulo="Nome" valor={venda.comprador_nome?.toUpperCase()} editavel={editavel} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px' }}>
          <LinhaContrato rotulo="RG" valor={venda.comprador_rg ?? '—'} editavel={editavel} />
          <LinhaContrato rotulo="CPF/CNPJ" valor={venda.comprador_cpf_cnpj} editavel={editavel} />
          <LinhaContrato rotulo="Profissão" valor={venda.comprador_profissao ?? '—'} editavel={editavel} />
        </div>
        <LinhaContrato rotulo="Endereço" valor={`${venda.comprador_logradouro}, Nº ${venda.comprador_numero}${venda.comprador_complemento ? ', ' + venda.comprador_complemento : ''} — ${venda.comprador_bairro} — CEP ${venda.comprador_cep} — ${venda.comprador_cidade}/${venda.comprador_uf}`} editavel={editavel} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
          <LinhaContrato rotulo="Telefone/Celular" valor={venda.comprador_telefone} editavel={editavel} />
          <LinhaContrato rotulo="E-mail" valor={venda.comprador_email ?? '—'} editavel={editavel} />
        </div>
      </Secao>

      {/* ── VEÍCULO VENDIDO ── */}
      <Secao titulo="VEÍCULO VENDIDO">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px' }}>
          <LinhaContrato rotulo="Marca" valor={venda.marca?.toUpperCase()} editavel={editavel} />
          <LinhaContrato rotulo="Tipo" valor={venda.tipo_veiculo?.toUpperCase() ?? '—'} editavel={editavel} />
          <LinhaContrato rotulo="Placa" valor={venda.placa?.toUpperCase()} editavel={editavel} />
        </div>
        <LinhaContrato rotulo="Veículo (Modelo / Versão)" valor={`${venda.modelo?.toUpperCase()} ${venda.versao?.toUpperCase() ?? ''}`.trim()} editavel={editavel} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px' }}>
          <LinhaContrato rotulo="Ano Fab./Mod." valor={`${venda.ano_fabricacao}/${venda.ano_modelo}`} editavel={editavel} />
          <LinhaContrato rotulo="Renavam" valor={venda.renavam ?? '—'} editavel={editavel} />
          <LinhaContrato rotulo="Chassi" valor={venda.chassi?.toUpperCase() ?? '—'} editavel={editavel} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '2px' }}>
          <LinhaContrato rotulo="Cor" valor={venda.cor?.toUpperCase()} editavel={editavel} />
          <LinhaContrato rotulo="Nr. Motor" valor={venda.nr_motor?.toUpperCase() ?? '—'} editavel={editavel} />
          <LinhaContrato rotulo="Combustível" valor={venda.combustivel?.toUpperCase() ?? '—'} editavel={editavel} />
          <LinhaContrato rotulo="Potência" valor={venda.potencia ? `${venda.potencia} cv` : '—'} editavel={editavel} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
          <LinhaContrato rotulo="Quilometragem" valor={`${venda.quilometragem?.toLocaleString('pt-BR')} km`} editavel={editavel} />
          <LinhaContrato rotulo="Valor da Venda (R$)" valor={moeda(venda.valor_venda)} editavel={editavel} />
        </div>
      </Secao>

      {/* ── PAGAMENTOS ── */}
      <Secao titulo="PAGAMENTOS">
        {editavel ? (
          <div contentEditable suppressContentEditableWarning className="campo-editavel campo-editavel--bloco">
            {pagamentosNaoFinanciamento.length === 0 && !financiamento && <span>—</span>}
            {pagamentosNaoFinanciamento.map((p, i) => (
              <div key={i}>• {labelTipo(p.tipo)} — 1x R$ {moeda(p.valor)}{p.data ? ` (${new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')})` : ''}</div>
            ))}
            {financiamento && <div>• Financiamento — R$ {moeda(financiamento.valor)}</div>}
          </div>
        ) : (
          <>
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
          </>
        )}
        {troco > 0 && (
          <div style={{ marginTop: '4px', color: '#6B21A8' }}>
            {editavel ? (
              <span contentEditable suppressContentEditableWarning className="campo-editavel">
                Troco ao comprador: R$ {moeda(troco)}
              </span>
            ) : (
              <span>Troco ao comprador: R$ {moeda(troco)}</span>
            )}
          </div>
        )}
      </Secao>

      {/* ── FINANCIAMENTO ── */}
      {financiamento && (
        <Secao titulo="FINANCIAMENTO">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
            <LinhaContrato rotulo="Financiadora" valor={financiamento.banco?.toUpperCase() ?? '—'} editavel={editavel} />
            <LinhaContrato rotulo="Valor do Financiamento (R$)" valor={moeda(financiamento.valor)} editavel={editavel} />
            <LinhaContrato rotulo="Valor da Prestação (R$)" valor={financiamento.valor_parcela ? moeda(financiamento.valor_parcela) : '—'} editavel={editavel} />
            <LinhaContrato rotulo="Prazo" valor={financiamento.numero_parcelas ? `${financiamento.numero_parcelas} parcelas` : '—'} editavel={editavel} />
            <LinhaContrato rotulo="1º Pagamento" valor={financiamento.data_primeiro_pagamento ? new Date(financiamento.data_primeiro_pagamento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'} editavel={editavel} />
          </div>
          <div style={{ marginTop: '8px', display: 'flex', gap: '60px' }}>
            <div style={{ flex: 1, borderTop: '1px solid #000', paddingTop: '2px', textAlign: 'center', fontSize: '8px' }}>Assinatura de Concordância do Comprador</div>
          </div>
        </Secao>
      )}

      {/* ── TRANSFERÊNCIA ── */}
      <Secao titulo="TRANSFERÊNCIA">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2px' }}>
          <LinhaContrato rotulo="Tipo" valor={transfTipo} editavel={editavel} />
          <LinhaContrato rotulo="Observação" valor={transfObs} editavel={editavel} />
        </div>
        {venda.ipva_info && (
          <LinhaContrato rotulo="Observação IPVA" valor={venda.ipva_info.toUpperCase()} editavel={editavel} />
        )}
      </Secao>

      {/* ── VEÍCULOS DE ENTRADA ── */}
      {veiculosEntrada.map((ei, idx) => (
        <Secao key={idx} titulo={veiculosEntrada.length > 1 ? `VEÍCULO COMPRADO ${idx + 1} (ENTRADA / TROCA)` : 'VEÍCULO COMPRADO (ENTRADA / TROCA)'}>
          <LinhaContrato rotulo="Veículo" valor={`${ei.marca?.toUpperCase()} ${ei.modelo?.toUpperCase()} ${ei.versao?.toUpperCase() ?? ''}`.trim()} editavel={editavel} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '2px' }}>
            <LinhaContrato rotulo="Placa" valor={ei.placa?.toUpperCase()} editavel={editavel} />
            <LinhaContrato rotulo="Cor" valor={ei.cor?.toUpperCase()} editavel={editavel} />
            <LinhaContrato rotulo="Ano Fab./Mod." valor={`${ei.ano_fabricacao}/${ei.ano_modelo}`} editavel={editavel} />
            <LinhaContrato rotulo="KM" valor={ei.quilometragem ? `${ei.quilometragem.toLocaleString('pt-BR')} km` : '—'} editavel={editavel} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
            <LinhaContrato rotulo="Renavam" valor={ei.renavam ?? '—'} editavel={editavel} />
            <LinhaContrato rotulo="Chassi" valor={ei.chassi?.toUpperCase() ?? '—'} editavel={editavel} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
            <LinhaContrato rotulo="Valor de Compra (R$)" valor={moeda(ei.valor_estimado)} editavel={editavel} />
            <LinhaContrato rotulo="Documento em Nome de" valor={ei.proprietario_nome?.toUpperCase() ?? '—'} editavel={editavel} />
          </div>
          {ei.proprietario_cpf && (
            <LinhaContrato rotulo="CPF do Proprietário" valor={ei.proprietario_cpf} editavel={editavel} />
          )}
          {ei.debitos_json && ei.debitos_json.length > 0 && (
            <div style={{ marginTop: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Débitos a deduzir:</div>
              {editavel ? (
                <div contentEditable suppressContentEditableWarning className="campo-editavel campo-editavel--bloco">
                  {ei.debitos_json.map((d, i) => (
                    <div key={i}>• {d.descricao} — R$ {moeda(d.valor)}</div>
                  ))}
                </div>
              ) : (
                ei.debitos_json.map((d, i) => (
                  <div key={i}>• {d.descricao} — R$ {moeda(d.valor)}</div>
                ))
              )}
            </div>
          )}
        </Secao>
      ))}

      {/* ── CLÁUSULAS ── */}
      <Secao titulo="CLÁUSULAS CONTRATUAIS" semQuebra>
        {CLAUSULAS.map((c, i) => (
          <div key={i} style={{ marginBottom: '4px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <strong>Cláusula {i + 1}ª.</strong>{' '}
            {editavel ? (
              <span contentEditable suppressContentEditableWarning className="campo-editavel">{c}</span>
            ) : c}
          </div>
        ))}
      </Secao>

      {/* ── ASSINATURAS ── */}
      <div style={{ marginTop: '12px', fontSize: '10px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div style={{ marginBottom: '10px' }}>
          {EMPRESA.cidade}, {hora} — {dataExtenso}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '20px' }}>
          <AssinaturaBloco titulo="CLIENTE" nome={venda.comprador_nome?.toUpperCase()} cpf={venda.comprador_cpf_cnpj} editavel={editavel} />
          <AssinaturaBloco titulo="EMPRESA" nome={EMPRESA.razaoSocial} cpf={EMPRESA.cnpj} editavel={editavel} />
        </div>
      </div>

      {/* ── TESTEMUNHAS — Página 2 ── */}
      <div style={{ pageBreakBefore: 'always', paddingTop: '20mm' }}>
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px', marginBottom: '40px' }}>
          TESTEMUNHAS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px' }}>
          <AssinaturaBloco titulo="TESTEMUNHA 1" nome="" cpf="" editavel={editavel} />
          <AssinaturaBloco titulo="TESTEMUNHA 2" nome="" cpf="" editavel={editavel} />
        </div>
      </div>

    </div>
  )
}

// ── Sub-componentes ──────────────────────────────────────────────

function Secao({ titulo, children, semQuebra }: { titulo: string; children: React.ReactNode; semQuebra?: boolean }) {
  return (
    <div style={{
      marginBottom: '8px',
      border: '1px solid #999',
      borderRadius: '2px',
      ...(semQuebra ? {} : { breakInside: 'avoid', pageBreakInside: 'avoid' }),
    }}>
      <div style={{
        background: '#1E40AF', color: '#fff', fontWeight: 'bold',
        padding: '2px 6px', fontSize: '9px', textTransform: 'uppercase',
        letterSpacing: '0.5px', borderRadius: '2px 2px 0 0',
        breakAfter: 'avoid', pageBreakAfter: 'avoid',
      }}>
        {titulo}
      </div>
      <div style={{ padding: '4px 6px', background: '#fff' }}>
        {children}
      </div>
    </div>
  )
}

function LinhaContrato({ rotulo, valor, editavel }: { rotulo: string; valor: string | null | undefined; editavel?: boolean }) {
  return (
    <div style={{ marginBottom: '2px' }}>
      <span style={{ fontWeight: 'bold', fontSize: '8px', color: '#555', textTransform: 'uppercase' }}>{rotulo}: </span>
      {editavel ? (
        <span contentEditable suppressContentEditableWarning className="campo-editavel">{valor ?? '—'}</span>
      ) : (
        <span>{valor ?? '—'}</span>
      )}
    </div>
  )
}

function AssinaturaBloco({ titulo, nome, cpf, editavel }: { titulo: string; nome: string; cpf: string; editavel?: boolean }) {
  return (
    <div>
      <div style={{ borderTop: '1px solid #000', marginTop: '40px', paddingTop: '4px', textAlign: 'center' }}>
        <div style={{ fontWeight: 'bold', fontSize: '9px' }}>{titulo}</div>
        {editavel ? (
          <>
            <div contentEditable suppressContentEditableWarning className="campo-editavel" style={{ fontSize: '9px', minWidth: '80px', display: 'inline-block' }}>{nome || '—'}</div>
            <div contentEditable suppressContentEditableWarning className="campo-editavel" style={{ fontSize: '9px', minWidth: '80px', display: 'inline-block' }}>{cpf ? `CPF/CNPJ: ${cpf}` : '—'}</div>
          </>
        ) : (
          <>
            {nome && <div style={{ fontSize: '9px' }}>{nome}</div>}
            {cpf && <div style={{ fontSize: '9px' }}>CPF/CNPJ: {cpf}</div>}
          </>
        )}
      </div>
    </div>
  )
}
