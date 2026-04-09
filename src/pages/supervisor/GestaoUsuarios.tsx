import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRequererPerfil } from '@/hooks/useAuth'
import { listarUsuarios, criarUsuario, atualizarPerfis, alternarAtivo, type UsuarioComPerfis } from '@/services/usuarios'
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
import { UserPlus, Pencil } from 'lucide-react'
import type { Perfil } from '@/types'

const PERFIS: { valor: Perfil; label: string }[] = [
  { valor: 'vendedor', label: 'Vendedor' },
  { valor: 'contratos', label: 'Contratos' },
  { valor: 'financeiro', label: 'Financeiro' },
  { valor: 'fiscal', label: 'Fiscal' },
  { valor: 'transferencia', label: 'Transferência' },
  { valor: 'supervisor', label: 'Supervisor' },
]

const schemaNovoUsuario = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormNovoUsuario = z.infer<typeof schemaNovoUsuario>

export default function GestaoUsuarios() {
  useRequererPerfil(['supervisor'])

  const [usuarios, setUsuarios] = useState<UsuarioComPerfis[]>([])
  const [carregando, setCarregando] = useState(true)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioComPerfis | null>(null)
  const [perfisSelecionados, setPerfisSelecionados] = useState<Perfil[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormNovoUsuario>({
    resolver: zodResolver(schemaNovoUsuario),
  })

  async function carregar() {
    setCarregando(true)
    try {
      const dados = await listarUsuarios()
      setUsuarios(dados)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  function abrirNovoUsuario() {
    setUsuarioEditando(null)
    setPerfisSelecionados([])
    setErro(null)
    reset()
    setDialogAberto(true)
  }

  function abrirEdicaoPerfis(usuario: UsuarioComPerfis) {
    setUsuarioEditando(usuario)
    setPerfisSelecionados(usuario.user_roles.map((r) => r.perfil))
    setErro(null)
    setDialogAberto(true)
  }

  function togglePerfil(perfil: Perfil) {
    setPerfisSelecionados((prev) =>
      prev.includes(perfil) ? prev.filter((p) => p !== perfil) : [...prev, perfil]
    )
  }

  async function salvarNovoUsuario(dados: FormNovoUsuario) {
    if (perfisSelecionados.length === 0) {
      setErro('Selecione ao menos um perfil.')
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      await criarUsuario(dados.nome, dados.email, dados.senha, perfisSelecionados)
      setDialogAberto(false)
      await carregar()
    } catch {
      setErro('Erro ao criar usuário. Verifique se o e-mail já está cadastrado.')
    } finally {
      setEnviando(false)
    }
  }

  async function salvarPerfis() {
    if (!usuarioEditando) return
    if (perfisSelecionados.length === 0) {
      setErro('Selecione ao menos um perfil.')
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      await atualizarPerfis(usuarioEditando.id, perfisSelecionados)
      setDialogAberto(false)
      await carregar()
    } catch {
      setErro('Erro ao atualizar perfis.')
    } finally {
      setEnviando(false)
    }
  }

  async function toggleAtivo(usuario: UsuarioComPerfis) {
    try {
      await alternarAtivo(usuario.id, !usuario.ativo)
      await carregar()
    } catch {
      // silent
    }
  }

  const acoes = (
    <Button size="sm" onClick={abrirNovoUsuario}>
      <UserPlus size={14} className="mr-1.5" />
      Novo Usuário
    </Button>
  )

  return (
    <div className="flex flex-col flex-1">
      <Header titulo="Gestão de Usuários" acoes={acoes} />

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
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${u.ativo ? 'text-green-600' : 'text-gray-400'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => abrirEdicaoPerfis(u)}
                        >
                          <Pencil size={12} className="mr-1" />
                          Perfis
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-7 px-2 text-xs ${u.ativo ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                          onClick={() => toggleAtivo(u)}
                        >
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

      {/* Dialog — Novo usuário ou Editar perfis */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {usuarioEditando ? `Perfis — ${usuarioEditando.nome}` : 'Novo Usuário'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
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

            {erro && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {erro}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              {usuarioEditando ? (
                <Button onClick={salvarPerfis} disabled={enviando} className="flex-1">
                  {enviando ? 'Salvando...' : 'Salvar Perfis'}
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
