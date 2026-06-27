import { useState, useRef } from 'react'
import { uploadFoto, deletarFotoTemp, type AnexoVenda } from '@/services/anexos'
import { ImagePlus, X, Loader2, AlertCircle } from 'lucide-react'

const MIN_FOTOS = 3
const MAX_FOTOS = 5

interface Props {
  saleId: string
  fotos: AnexoVenda[]
  onChange: (fotos: AnexoVenda[]) => void
}

export default function UploadFotos({ saleId, fotos, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSelecao(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? [])
    if (!arquivos.length) return

    const disponiveis = MAX_FOTOS - fotos.length
    if (arquivos.length > disponiveis) {
      setErro(`Máximo de ${MAX_FOTOS} fotos. Você pode adicionar mais ${disponiveis}.`)
      return
    }

    setErro(null)
    setEnviando(true)
    try {
      const novas: AnexoVenda[] = []
      for (const arquivo of arquivos) {
        const anexo = await uploadFoto(saleId, arquivo)
        novas.push(anexo)
      }
      onChange([...fotos, ...novas])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e)
      console.error('[UploadFotos] erro:', e)
      setErro(`Erro ao enviar foto: ${msg}`)
    } finally {
      setEnviando(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemover(anexo: AnexoVenda) {
    try {
      await deletarFotoTemp(anexo)
      onChange(fotos.filter((f) => f.id !== anexo.id))
    } catch {
      setErro('Erro ao remover foto.')
    }
  }

  const faltam = Math.max(0, MIN_FOTOS - fotos.length)

  return (
    <div className="space-y-3">
      {/* Grade de fotos */}
      {fotos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {fotos.map((foto) => (
            <div key={foto.id} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
              <img
                src={foto.url}
                alt={foto.nome_arquivo}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemover(foto)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {/* Botão adicionar mais */}
          {fotos.length < MAX_FOTOS && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={enviando}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-blue-500 transition-colors"
            >
              {enviando ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
              <span className="text-[10px]">{enviando ? 'Enviando...' : 'Adicionar'}</span>
            </button>
          )}
        </div>
      )}

      {/* Área de upload inicial */}
      {fotos.length === 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
          className="w-full border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-8 flex flex-col items-center gap-2 text-gray-400 hover:text-blue-500 transition-colors"
        >
          {enviando ? (
            <Loader2 size={28} className="animate-spin" />
          ) : (
            <ImagePlus size={28} />
          )}
          <p className="text-sm font-medium">
            {enviando ? 'Enviando...' : 'Clique para adicionar fotos'}
          </p>
          <p className="text-xs">Mínimo {MIN_FOTOS} fotos — JPG, PNG ou WEBP — até 10 MB cada</p>
        </button>
      )}

      {/* Contador e alerta de mínimo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {faltam > 0 && (
            <>
              <AlertCircle size={13} className="text-amber-500" />
              <span className="text-xs text-amber-600">
                Adicione mais {faltam} {faltam === 1 ? 'foto' : 'fotos'} (mínimo {MIN_FOTOS})
              </span>
            </>
          )}
          {faltam === 0 && fotos.length > 0 && (
            <span className="text-xs text-green-600">{fotos.length} foto{fotos.length > 1 ? 's' : ''} adicionada{fotos.length > 1 ? 's' : ''}</span>
          )}
        </div>
        <span className="text-xs text-gray-400">{fotos.length}/{MAX_FOTOS}</span>
      </div>

      {erro && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={12} /> {erro}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
        multiple
        className="hidden"
        onChange={handleSelecao}
      />
    </div>
  )
}
