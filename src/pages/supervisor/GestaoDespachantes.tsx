import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRequererPerfil } from '@/hooks/useAuth'
import { supabase } from '@/services/supabase'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserPlus, Pencil } from 'lucide-react'
import type { Despachante } from '@/types'

const schemaDespachante = z.object({
  nome: z.string().min(2, 'Obrigatório'),
  telefone: z.string().min(10, 'Telefone inválido'),
  empresa: z.string().optional(),
})

type FormDespachante = z.infer<typeof schemaDespachante>

export default function GestaoDespachantes() {
  useRequererPerfil(['supervisor'])

  const [despachantes, setDespachantes] = useState<Despachante[]>([])
  const [carregando, setCarregando] = useState(true)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [editando, setEditando] = useState<Despachante | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormDespachante>({
    resolver: zodResolver(schemaDespachante),
  })

  async function carregar() {
    setCarregando(true)
    const { data } = await supabase.from('dispatchers').select('*').order('nome')
    setDespachantes((data ?? []) as Despachante[])
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [])

  function abrirNovo() {
    setEditando(null)
    setErro(null)
    reset({ nome: '', telefone: '', empresa: '' })
    setDialogAberto(true)
  }

  function abrirEdicao(d: Despachante) {
    setEditando(d)
    setErro(null)
    reset({ nome: d.nome, telefone: d.telefone, empresa: d.empresa ?? '' })
    setDialogAberto(true)
  }

  async function salvar(dados: FormDespachante) {
    setEnviando(true)
    setErro(null)
    try {
      if (editando) {
        await supabase.from('dispatchers').update(dados).eq('id', editando.id)
      } else {
        await supabase.from('dispatchers').insert(dados)
      }
      setDialogAberto(false)
      await carregar()
    } catch {
      setErro('Erro ao salvar despachante.')
    } finally {
      setEnviando(false)
    }
  }

  async function toggleAtivo(d: Despachante) {
    await supabase.from('dispatchers').update({ ativo: !d.ativo }).eq('id', d.id)
    await carregar()
  }

  const acoes = (
    <Button size="sm" onClick={abrirNovo}>
      <UserPlus size={14} className="mr-1.5" />
      Novo Despachante
    </Button>
  )

  return (
    <div className="flex flex-col flex-1">
      <Header titulo="Gestão de Despachantes" acoes={acoes} />

      <div className="flex-1 p-4 md:p-6">
        {carregando ? (
          <p className="text-gray-400 text-sm">Carregando...</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despachantes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400 text-sm py-8">
                      Nenhum despachante cadastrado
                    </TableCell>
                  </TableRow>
                )}
                {despachantes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-sm">{d.nome}</TableCell>
                    <TableCell className="text-sm text-gray-500">{d.empresa ?? '—'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{d.telefone}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${d.ativo ? 'text-green-600' : 'text-gray-400'}`}>
                        {d.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => abrirEdicao(d)}>
                          <Pencil size={12} className="mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-7 px-2 text-xs ${d.ativo ? 'text-red-600' : 'text-green-600'}`}
                          onClick={() => toggleAtivo(d)}
                        >
                          {d.ativo ? 'Desativar' : 'Ativar'}
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

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Despachante' : 'Novo Despachante'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(salvar)} className="space-y-3 pt-2">
            <div>
              <Label className="text-xs font-medium">Nome *</Label>
              <Input {...register('nome')} className="mt-1" placeholder="Nome do despachante" />
              {errors.nome && <p className="text-xs text-red-600 mt-1">{errors.nome.message}</p>}
            </div>
            <div>
              <Label className="text-xs font-medium">Empresa</Label>
              <Input {...register('empresa')} className="mt-1" placeholder="Nome da empresa (opcional)" />
            </div>
            <div>
              <Label className="text-xs font-medium">Telefone *</Label>
              <Input {...register('telefone')} className="mt-1" placeholder="(81) 99999-9999" />
              {errors.telefone && <p className="text-xs text-red-600 mt-1">{errors.telefone.message}</p>}
            </div>
            {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{erro}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={enviando} className="flex-1">
                {enviando ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
