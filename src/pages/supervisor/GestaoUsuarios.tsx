import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRequererPerfil } from '@/hooks/useAuth'
import {
  listarUsuarios, criarUsuario, atualizarPerfis, alternarAtivo,
  alterarDadosUsuario, alterarSenhaUsuario, excluirUsuario, atualizarUnidade,
  type UsuarioComPerfis,
} from '@/services/usuarios'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertTriangle, Pencil, Trash2, UserPlus } from 'lucide-react'
import type { Perfil, Unidade } from '@/types'

const PERFIS: { valor: Perfil; label: string }[] = [
  { valor: 'vendedor',      label: 'Vendedor' },
  { valor: 'contratos',     label: 'Contratos' },
  { valor: 'financeiro',    label: 'Financeiro' },
  { valor: 'fiscal',        label: 'Fiscal' },
  { valor: 'transferencia', label: 'Transferência' },
  { valor: 'supervisor',    label: 'Supervisor' },
]

const schemaNovoUsuario = z.object({
  nome:  z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormNovoUsuario = z.infer<typeof schemaNovoUsuario>

export default function GestaoUsuarios() {
  useRequererPerfil(['supervisor'])

  const [usuarios, setUsuarios]                     = useState<UsuarioComPerfis[]>([])
  const [carregando, setCarregando]                 = useState(true)
  const [dialogAberto, setDialogAberto]             = useState(false)
  const [usuarioEditando, setUsuarioEditando]       = useState<UsuarioComPerfis | null>(null)
  const [perfisSelecionados, setPerfisSelecionados] = useState<Perfil[]>([])
  const [enviando, setEnviando]                     = useState(false)
  const [erro, setErro]                             = useState<string | null>(null)

  // Unidade (apenas para perfil vendedor)
  const [unidadeNovo, setUnidadeNovo]     = useState<Unidade>('fd_veiculos')
  const [unidadeEditando, setUnidadeEditando] = useState<Unidade>('fd_veiculos')

  // Campos do modo edição
  const [nomeEditando, setNomeEditando]           = useState('')
  const [novaSenha, setNovaSenha]                 = useState('')
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormNovoUsuario>({
    resolver: zodResolver(schemaNovoUsuario),
  })

  async function carregar() {
    setCarregando(true)
    try {
      setUsuarios(await listarUsuarios())
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  function abrirNovoUsuario() {
    setUsuarioEditando(null)
    setPerfisSelecionados([])
    setUnidadeNovo('fd_veiculos')
    setErro(null)
    reset()
    setDialogAberto(true)
  }

  function abrirEdicao(usuario: UsuarioComPerfis) {
    setUsuarioEditando(usuario)
    setNomeEditando(usuario.nome)
    setPerfisSelecionados(usuario.user_roles.map((r) => r.perfil))
    setUnidadeEditando((usuario.unidade as Unidade | undefined) ?? 'fd_veiculos')
    setNovaSenha('')
    setConfirmandoExclusao(false)
    setErro(null)
    setDialogAberto(true)
  }

  function togglePerfil(perfil: Perfil) {
    setPerfisSelecionados((prev) =>
      prev.includes(perfil) ? prev.filter((p) => p !== perfil) : [...prev, perfil]
    )
  }

  async function salvarNovoUsuario(dados: FormNovoUsuario) {
    if (perfisSelecionados.length === 0) { setErro('Selecione ao menos um perfil.'); return }
    setEnviando(true)
    setErro(null)
    try {
      const novoId = await criarUsuario(dados.nome, dados.email, dados.senha, perfisSelecionados)
      if (perfisSelecionados.includes('vendedor')) {
        await atualizarUnidade(novoId, unidadeNovo)
      }
      setDialogAberto(false)
      await carregar()
    } catch {
      setErro('Erro ao criar usuário. Verifique se o e-mail já está cadastrado.')
    } finally {
      setEnviando(false)
    }
  }

  async function salvarEdicao() {
    if (!usuarioEditando) return
    if (!nomeEditando.trim())          { setErro('Nome é obrigatório.'); return }
    if (perfisSelecionados.length === 0) { setErro('Selecione ao menos um perfil.'); return }
    if (novaSenha && novaSenha.length < 6) { setErro('Nova senha deve ter ao menos 6 caracteres.'); return }

    setEnviando(true)
    setErro(null)
    try {
      const tarefas: Promise<void>[] = [
        alterarDadosUsuario(usuarioEditando.id, nomeEditando.trim()),
        atualizarPerfis(usuarioEditando.id, perfisSelecionados),
      ]
      if (novaSenha) tarefas.push(alterarSenhaUsuario(usuarioEditando.id, novaSenha))
      if (perfisSelecionados.includes('vendedor')) tarefas.push(atualizarUnidade(usuarioEditando.id, unidadeEditando))
      await Promise.all(tarefas)
      setDialogAberto(false)
      await carregar()
    } catch {
      setErro('Erro ao salvar alterações.')
    } finally {
      setEnviando(false)
    }
  }

  async function confirmarExclusao() {
    if (!usuarioEditando) return
    setEnviando(true)
    setErro(null)
    try {
      await excluirUsuario(usuarioEditando.id)
      setDialogAberto(false)
      await carregar()
    } catch {
      setErro('Não foi possível excluir. O usuário pode ter dados vinculados — considere desativá-lo.')
      setConfirmandoExclusao(false)
    } finally {
      setEnviando(false)
    }
  }

  async function toggleAtivo(usuario: UsuarioComPerfis) {
    try {
      await alternarAtivo(usuario.id, !usuario.ativo)
      await carregar()
    } catch { /* silent */ }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        titulo="Gestão de Usuários"
        acoes={
          <Button size="sm" onClick={abrirNovoUsuario}>
            <UserPlus size={14} className="mr-1.5" />
            Novo Usuário
          </Button>
        }
      />

      <div className="flex-1 p-4 md:p-6">
        {carregando ? (
          <p className="text-gray-400 text-sm">Carregando...</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-sm">{u.nome}</TableCell>
                    <TableCell className="text-sm text-gray-500">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.user_roles.map((r) => (
                          <Badge key={r.perfil} className="text-xs px-1.5 py-0 bg-blue-50 text-blue-700 border-0 rounded-full">
                            {r.perfil}
                          </Badge>
                        ))}
                        {u.user_roles.some((r) => r.perfil === 'vendedor') && u.unidade && (
                          <Badge className={`text-xs px-1.5 py-0 border-0 rounded-full ${
                            u.unidade === 'fd_motos'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-blue-50 text-blue-800'
                          }`}>
                            {u.unidade === 'fd_motos' ? 'FD Motos' : 'FD Veículos'}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${u.ativo ? 'text-green-600' : 'text-gray-400'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                          onClick={() => abrirEdicao(u)}>
                          <Pencil size={12} className="mr-1" />
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost"
                          className={`h-7 px-2 text-xs ${u.ativo ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                          onClick={() => toggleAtivo(u)}>
                          {u.ativo ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ── Dialog ── */}
      <Dialog open={dialogAberto} onOpenChange={(v) => { setDialogAberto(v); if (!v) setConfirmandoExclusao(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {usuarioEditando ? `Editar — ${usuarioEditando.nome}` : 'Novo Usuário'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">

            {/* ── Criar usuário ── */}
            {!usuarioEditando && (
              <>
                <div>
                  <Label className="text-xs font-medium">Nome *</Label>
                  <Input {...register('nome')} className="mt-1" placeholder="Nome completo" />
                  {errors.nome && <p className="text-xs text-red-600 mt-1">{errors.nome.message}</p>}
                </div>
                <div>
                  <Label className="text-xs font-medium">E-mail *</Label>
                  <Input {...register('email')} type="email" className="mt-1" placeholder="email@empresa.com" />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label className="text-xs font-medium">Senha temporária *</Label>
                  <Input {...register('senha')} type="password" className="mt-1" placeholder="Mínimo 6 caracteres" />
                  {errors.senha && <p className="text-xs text-red-600 mt-1">{errors.senha.message}</p>}
                </div>
              </>
            )}

            {/* ── Editar: nome ── */}
            {usuarioEditando && (
              <div>
                <Label className="text-xs font-medium">Nome *</Label>
                <Input
                  className="mt-1"
                  value={nomeEditando}
                  onChange={(e) => setNomeEditando(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
            )}

            {/* Perfis */}
            <div>
              <Label className="text-xs font-medium block mb-2">Perfis *</Label>
              <div className="grid grid-cols-2 gap-2">
                {PERFIS.map(({ valor, label }) => (
                  <label key={valor} className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={perfisSelecionados.includes(valor)}
                      onCheckedChange={() => togglePerfil(valor)}
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Unidade — só aparece quando vendedor está selecionado */}
            {perfisSelecionados.includes('vendedor') && (
              <div>
                <Label className="text-xs font-medium block mb-2">Unidade *</Label>
                <div className="flex gap-2">
                  {(['fd_veiculos', 'fd_motos'] as Unidade[]).map((u) => {
                    const ativo = (usuarioEditando ? unidadeEditando : unidadeNovo) === u
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => usuarioEditando ? setUnidadeEditando(u) : setUnidadeNovo(u)}
                        className={`flex-1 text-sm py-1.5 rounded-lg border transition-colors ${
                          ativo
                            ? u === 'fd_motos' ? 'bg-red-600 text-white border-red-600' : 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-200 text-gray-600 hover:border-blue-300'
                        }`}
                      >
                        {u === 'fd_motos' ? 'FD Motos' : 'FD Veículos'}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Editar: nova senha (opcional) ── */}
            {usuarioEditando && (
              <div>
                <Label className="text-xs font-medium">Nova senha</Label>
                <Input
                  type="password"
                  className="mt-1"
                  placeholder="Deixe em branco para manter a atual"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  autoComplete="new-password"
                />
                {novaSenha && novaSenha.length < 6 && (
                  <p className="text-xs text-amber-600 mt-1">Mínimo 6 caracteres</p>
                )}
              </div>
            )}

            {/* Erro */}
            {erro && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {erro}
              </p>
            )}

            {/* Botões principais */}
            <div className="flex gap-2 pt-1">
              {usuarioEditando ? (
                <Button onClick={salvarEdicao} disabled={enviando} className="flex-1">
                  {enviando ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              ) : (
                <Button onClick={handleSubmit(salvarNovoUsuario)} disabled={enviando} className="flex-1">
                  {enviando ? 'Criando...' : 'Criar Usuário'}
                </Button>
              )}
              <Button variant="outline" onClick={() => setDialogAberto(false)}>
                Cancelar
              </Button>
            </div>

            {/* ── Zona destrutiva: excluir ── */}
            {usuarioEditando && (
              <div className="pt-2 border-t border-gray-100">
                {!confirmandoExclusao ? (
                  <button
                    onClick={() => setConfirmandoExclusao(true)}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={13} />
                    Excluir usuário
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle size={14} />
                      <span className="text-sm font-medium">Confirmar exclusão?</span>
                    </div>
                    <p className="text-xs text-red-600">
                      <strong>{usuarioEditando.nome}</strong> será removido permanentemente.
                      Se o usuário tiver vendas ou dados vinculados, prefira <strong>Desativar</strong>.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" className="h-7 text-xs"
                        onClick={confirmarExclusao} disabled={enviando}>
                        {enviando ? 'Excluindo...' : 'Confirmar exclusão'}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => setConfirmandoExclusao(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
