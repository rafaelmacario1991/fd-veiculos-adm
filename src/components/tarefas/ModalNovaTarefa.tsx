import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, addDays } from 'date-fns'
import { X, Paperclip, File as FileIcon } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { criarTarefa, uploadAnexoTarefa } from '@/services/tarefas'
import { useAuthStore } from '@/store/authStore'

const schema = z.object({
  titulo: z.string().min(3, 'Mínimo 3 caracteres'),
  descricao: z.string().optional(),
  setor_responsavel: z.string().optional(),
  usuario_responsavel_id: z.string().optional(),
  prazo: z.string().min(1, 'Informe o prazo'),
})

type FormData = z.infer<typeof schema>

interface UsuarioSimples {
  id: string
  nome: string
  perfis: string[]
}

interface Props {
  aberto: boolean
  onFechar: () => void
  onCriada: () => void
  setorPadrao?: string
}

const SETORES = [
  { value: 'contratos',     label: 'Contratos' },
  { value: 'financeiro',    label: 'Financeiro' },
  { value: 'fiscal',        label: 'Fiscal' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'supervisor',    label: 'Supervisor' },
  { value: 'vendedor',      label: 'Vendedor' },
]

const TIPOS_ACEITOS = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp'
const TAMANHO_MAX  = 10 * 1024 * 1024   // 10 MB

export default function ModalNovaTarefa({ aberto, onFechar, onCriada, setorPadrao }: Props) {
  const { usuario } = useAuthStore()
  const [usuarios,  setUsuarios]  = useState<UsuarioSimples[]>([])
  const [salvando,  setSalvando]  = useState(false)
  const [erro,      setErro]      = useState('')
  const [arquivo,   setArquivo]   = useState<File | null>(null)
  const inputArquivoRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      setor_responsavel: setorPadrao ?? '',
      prazo: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
    },
  })

  const setorSelecionado = watch('setor_responsavel')

  useEffect(() => {
    if (!aberto) return
    async function carregar() {
      const { data } = await supabase
        .from('users')
        .select('id, nome, user_roles(perfil)')
        .eq('ativo', true)
      if (!data) return
      const lista: UsuarioSimples[] = data.map((u: any) => ({
        id: u.id,
        nome: u.nome,
        perfis: (u.user_roles ?? []).map((r: any) => r.perfil),
      }))
      setUsuarios(lista)
    }
    carregar()
  }, [aberto])

  // Ao fechar, limpa estado
  useEffect(() => {
    if (!aberto) {
      reset()
      setArquivo(null)
      setErro('')
    }
  }, [aberto, reset])

  const usuariosFiltrados = setorSelecionado
    ? usuarios.filter((u) => u.perfis.includes(setorSelecionado))
    : usuarios

  function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (file.size > TAMANHO_MAX) {
      setErro('Arquivo muito grande. Limite: 10 MB')
      return
    }
    setErro('')
    setArquivo(file)
  }

  function removerArquivo() {
    setArquivo(null)
    if (inputArquivoRef.current) inputArquivoRef.current.value = ''
  }

  async function onSubmit(dados: FormData) {
    if (!usuario) return
    setSalvando(true)
    setErro('')
    try {
      // 1. Cria a tarefa
      const tarefa = await criarTarefa(
        {
          titulo: dados.titulo,
          descricao: dados.descricao || undefined,
          setor_responsavel: dados.setor_responsavel || undefined,
          usuario_responsavel_id: dados.usuario_responsavel_id || undefined,
          prazo: new Date(dados.prazo).toISOString(),
        },
        usuario.id,
      )

      // 2. Se há arquivo, faz upload e atualiza tarefa
      if (arquivo) {
        const { path, nome } = await uploadAnexoTarefa(tarefa.id, arquivo)
        await supabase
          .from('tarefas')
          .update({ anexo_path: path, anexo_nome: nome })
          .eq('id', tarefa.id)
      }

      reset()
      setArquivo(null)
      onCriada()
      onFechar()
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao criar atividade')
    } finally {
      setSalvando(false)
    }
  }

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onFechar} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">Nova Atividade</h2>
          <button
            onClick={onFechar}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Título */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
            <input
              {...register('titulo')}
              type="text"
              placeholder="Ex: Verificar documentação do cliente"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.titulo && <p className="text-xs text-red-600 mt-1">{errors.titulo.message}</p>}
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              {...register('descricao')}
              rows={3}
              placeholder="Detalhes adicionais..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Setor responsável */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Setor Responsável</label>
              <select
                {...register('setor_responsavel')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {SETORES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Pessoa responsável */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pessoa Responsável</label>
              <select
                {...register('usuario_responsavel_id')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Nenhuma</option>
                {usuariosFiltrados.map((u) => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Prazo */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data/Hora Limite *</label>
            <input
              {...register('prazo')}
              type="datetime-local"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.prazo && <p className="text-xs text-red-600 mt-1">{errors.prazo.message}</p>}
          </div>

          {/* Anexo (opcional) */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Documento Anexo <span className="font-normal text-gray-400">(opcional)</span>
            </label>

            {arquivo ? (
              /* Arquivo selecionado — preview */
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <FileIcon size={14} className="text-blue-600 flex-shrink-0" />
                <span className="text-xs text-blue-700 truncate flex-1">{arquivo.name}</span>
                <span className="text-[10px] text-blue-400 flex-shrink-0">
                  {(arquivo.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  onClick={removerArquivo}
                  className="text-blue-400 hover:text-blue-700 flex-shrink-0"
                  title="Remover arquivo"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              /* Área de seleção */
              <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors group">
                <Paperclip size={14} className="text-gray-400 group-hover:text-blue-500" />
                <span className="text-xs text-gray-500 group-hover:text-blue-600">
                  Clique para selecionar um arquivo
                </span>
                <span className="text-[10px] text-gray-300 ml-auto">PDF, DOC, XLS, imagens · máx. 10 MB</span>
                <input
                  ref={inputArquivoRef}
                  type="file"
                  accept={TIPOS_ACEITOS}
                  className="sr-only"
                  onChange={selecionarArquivo}
                />
              </label>
            )}
          </div>

          {erro && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2 text-sm font-medium text-white bg-[#1E40AF] rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-60"
            >
              {salvando ? (arquivo ? 'Enviando...' : 'Salvando...') : 'Criar Atividade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
