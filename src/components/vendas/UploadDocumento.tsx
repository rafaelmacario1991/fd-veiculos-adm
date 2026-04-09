import { useRef, useState } from 'react'
import {
  uploadDocumentoEntrada,
  deletarDocumentoEntrada,
  type DocumentoEntrada,
} from '@/services/entradaVeiculo'
import { FileUp, Loader2, X, FileCheck, AlertCircle } from 'lucide-react'

interface Props {
  saleId: string
  tipo: DocumentoEntrada['tipo']
  label: string
  documentos: DocumentoEntrada[]
  onChange: (docs: DocumentoEntrada[]) => void
}

export default function UploadDocumento({ saleId, tipo, label, documentos, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const docsDoTipo = documentos.filter((d) => d.tipo === tipo)

  async function handleSelecao(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? [])
    if (!arquivos.length) return
    setErro(null)
    setEnviando(true)
    try {
      const novos: DocumentoEntrada[] = []
      for (const arquivo of arquivos) {
        const doc = await uploadDocumentoEntrada(saleId, tipo, arquivo)
        novos.push(doc)
      }
      onChange([...documentos, ...novos])
    } catch {
      setErro('Erro ao enviar arquivo. Tente novamente.')
    } finally {
      setEnviando(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemover(doc: DocumentoEntrada) {
    try {
      await deletarDocumentoEntrada(doc)
      onChange(documentos.filter((d) => d.id !== doc.id))
    } catch {
      setErro('Erro ao remover arquivo.')
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-700">{label}</p>

      {/* Arquivos enviados */}
      {docsDoTipo.length > 0 && (
        <div className="space-y-1.5">
          {docsDoTipo.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileCheck size={14} className="text-green-600 flex-shrink-0" />
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-800 hover:underline truncate"
                >
                  {doc.nome_arquivo}
                </a>
              </div>
              <button
                type="button"
                onClick={() => handleRemover(doc)}
                className="text-green-400 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botão de upload */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={enviando}
        className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg text-xs text-gray-500 hover:text-blue-600 transition-colors w-full"
      >
        {enviando ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <FileUp size={13} />
        )}
        {enviando ? 'Enviando...' : docsDoTipo.length > 0 ? 'Substituir / Adicionar outro' : 'Anexar arquivo'}
        <span className="ml-auto text-[10px] text-gray-400">PDF, JPG, PNG — até 20 MB</span>
      </button>

      {erro && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={11} /> {erro}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,application/pdf"
        multiple
        className="hidden"
        onChange={handleSelecao}
      />
    </div>
  )
}
