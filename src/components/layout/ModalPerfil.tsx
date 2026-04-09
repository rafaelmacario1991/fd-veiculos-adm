import { useState, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/services/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Camera, User, Lock, CheckCircle2, AlertCircle } from 'lucide-react'

interface Props {
  aberto: boolean
  onFechar: () => void
}

type Aba = 'perfil' | 'senha'

type Feedback = { tipo: 'ok' | 'erro'; msg: string }

export default function ModalPerfil({ aberto, onFechar }: Props) {
  const { usuario, definirUsuario } = useAuthStore()
  const [aba, setAba] = useState<Aba>('perfil')

  // Perfil
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [whatsapp, setWhatsapp] = useState(usuario?.whatsapp ?? '')
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)
  const [feedbackPerfil, setFeedbackPerfil] = useState<Feedback | null>(null)

  // Avatar
  const inputRef = useRef<HTMLInputElement>(null)
  const [enviandoAvatar, setEnviandoAvatar] = useState(false)

  // Senha
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [feedbackSenha, setFeedbackSenha] = useState<Feedback | null>(null)

  function resetarEstado() {
    setAba('perfil')
    setNome(usuario?.nome ?? '')
    setWhatsapp(usuario?.whatsapp ?? '')
    setFeedbackPerfil(null)
    setSenhaAtual('')
    setNovaSenha('')
    setConfirmarSenha('')
    setFeedbackSenha(null)
  }

  function fechar() {
    resetarEstado()
    onFechar()
  }

  async function uploadAvatar(file: File) {
    if (!usuario?.id) return
    setEnviandoAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${usuario.id}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatares')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('avatares').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      await supabase.from('users').update({ avatar_url: url }).eq('id', usuario.id)
      definirUsuario({ ...usuario, avatar_url: url })
      setFeedbackPerfil({ tipo: 'ok', msg: 'Foto atualizada com sucesso.' })
    } catch {
      setFeedbackPerfil({ tipo: 'erro', msg: 'Falha ao enviar a foto. Tente novamente.' })
    } finally {
      setEnviandoAvatar(false)
    }
  }

  async function salvarPerfil() {
    if (!usuario?.id || !nome.trim()) return
    setSalvandoPerfil(true)
    setFeedbackPerfil(null)
    try {
      const { error } = await supabase
        .from('users')
        .update({ nome: nome.trim(), whatsapp: whatsapp.trim() || null })
        .eq('id', usuario.id)
      if (error) throw error
      definirUsuario({ ...usuario, nome: nome.trim(), whatsapp: whatsapp.trim() || undefined })
      setFeedbackPerfil({ tipo: 'ok', msg: 'Dados atualizados com sucesso.' })
    } catch {
      setFeedbackPerfil({ tipo: 'erro', msg: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setSalvandoPerfil(false)
    }
  }

  async function alterarSenha() {
    setFeedbackSenha(null)
    if (!novaSenha || novaSenha.length < 6) {
      setFeedbackSenha({ tipo: 'erro', msg: 'A nova senha deve ter no mínimo 6 caracteres.' })
      return
    }
    if (novaSenha !== confirmarSenha) {
      setFeedbackSenha({ tipo: 'erro', msg: 'As senhas não coincidem.' })
      return
    }
    setSalvandoSenha(true)
    try {
      // Verifica senha atual fazendo re-autenticação
      const { error: reAuthErr } = await supabase.auth.signInWithPassword({
        email: usuario?.email ?? '',
        password: senhaAtual,
      })
      if (reAuthErr) {
        setFeedbackSenha({ tipo: 'erro', msg: 'Senha atual incorreta.' })
        return
      }
      const { error } = await supabase.auth.updateUser({ password: novaSenha })
      if (error) throw error
      setFeedbackSenha({ tipo: 'ok', msg: 'Senha alterada com sucesso.' })
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
    } catch {
      setFeedbackSenha({ tipo: 'erro', msg: 'Erro ao alterar senha. Tente novamente.' })
    } finally {
      setSalvandoSenha(false)
    }
  }

  const inicial = usuario?.nome?.charAt(0).toUpperCase() ?? '?'

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && fechar()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Minha Conta</DialogTitle>
        </DialogHeader>

        {/* Avatar grande centralizado */}
        <div className="flex flex-col items-center py-5 px-6 border-b border-gray-100">
          <button
            onClick={() => inputRef.current?.click()}
            className="relative group"
            disabled={enviandoAvatar}
          >
            {usuario?.avatar_url ? (
              <img
                src={usuario.avatar_url}
                alt="avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#1E40AF] flex items-center justify-center border-2 border-[#1E40AF]">
                <span className="text-white text-2xl font-bold">{inicial}</span>
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/50 hidden group-hover:flex items-center justify-center flex-col gap-0.5">
              <Camera size={18} className="text-white" />
              <span className="text-white text-[10px] font-medium">Alterar foto</span>
            </div>
            {enviandoAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadAvatar(f)
              e.target.value = ''
            }}
          />
          <p className="text-sm font-semibold text-gray-900 mt-3">{usuario?.nome}</p>
          <p className="text-xs text-gray-400">{usuario?.email}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {usuario?.perfis.join(' · ')}
          </p>
        </div>

        {/* Abas */}
        <div className="flex border-b border-gray-100">
          {([
            { chave: 'perfil' as Aba, label: 'Dados Pessoais', icone: User },
            { chave: 'senha' as Aba, label: 'Segurança', icone: Lock },
          ] as const).map(({ chave, label, icone: Icone }) => (
            <button
              key={chave}
              onClick={() => setAba(chave)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                aba === chave
                  ? 'border-[#1E40AF] text-[#1E40AF]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icone size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Conteúdo das abas */}
        <div className="px-6 py-5 space-y-4">
          {aba === 'perfil' && (
            <>
              <div>
                <Label className="text-xs font-medium">Nome completo</Label>
                <Input
                  className="mt-1"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">E-mail</Label>
                <Input
                  className="mt-1 bg-gray-50 text-gray-400 cursor-not-allowed"
                  value={usuario?.email ?? ''}
                  disabled
                />
                <p className="text-[10px] text-gray-400 mt-1">O e-mail não pode ser alterado.</p>
              </div>
              <div>
                <Label className="text-xs font-medium">WhatsApp</Label>
                <Input
                  className="mt-1"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(81) 99999-9999"
                />
              </div>

              {feedbackPerfil && (
                <MsgFeedback feedback={feedbackPerfil} />
              )}

              <div className="flex gap-2 pt-1">
                <Button onClick={salvarPerfil} disabled={salvandoPerfil || !nome.trim()} className="flex-1">
                  {salvandoPerfil ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
                <Button variant="outline" onClick={fechar}>Cancelar</Button>
              </div>
            </>
          )}

          {aba === 'senha' && (
            <>
              <div>
                <Label className="text-xs font-medium">Senha atual</Label>
                <Input
                  className="mt-1"
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="••••••"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Nova senha</Label>
                <Input
                  className="mt-1"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Confirmar nova senha</Label>
                <Input
                  className="mt-1"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                />
              </div>

              {feedbackSenha && (
                <MsgFeedback feedback={feedbackSenha} />
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={alterarSenha}
                  disabled={salvandoSenha || !senhaAtual || !novaSenha || !confirmarSenha}
                  className="flex-1"
                >
                  {salvandoSenha ? 'Alterando...' : 'Alterar Senha'}
                </Button>
                <Button variant="outline" onClick={fechar}>Cancelar</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MsgFeedback({ feedback }: { feedback: { tipo: 'ok' | 'erro'; msg: string } }) {
  if (feedback.tipo === 'ok') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        <CheckCircle2 size={14} />
        {feedback.msg}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
      <AlertCircle size={14} />
      {feedback.msg}
    </div>
  )
}
