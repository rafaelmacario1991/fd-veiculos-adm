import { useState, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Camera, User, Lock, CheckCircle2, AlertCircle, Phone, Mail,
  Shield,
} from 'lucide-react'

type Secao = 'perfil' | 'seguranca'

type Feedback = { tipo: 'ok' | 'erro'; msg: string }

function MsgFeedback({ feedback }: { feedback: Feedback }) {
  if (feedback.tipo === 'ok') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
        <CheckCircle2 size={15} className="flex-shrink-0" />
        {feedback.msg}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
      <AlertCircle size={15} className="flex-shrink-0" />
      {feedback.msg}
    </div>
  )
}

export default function Configuracoes() {
  const { usuario, definirUsuario } = useAuthStore()
  const [secao, setSecao] = useState<Secao>('perfil')

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

  const inicial = usuario?.nome?.charAt(0).toUpperCase() ?? '?'

  async function uploadAvatar(file: File) {
    if (!usuario?.id) return
    setEnviandoAvatar(true)
    setFeedbackPerfil(null)
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
      setFeedbackPerfil({ tipo: 'ok', msg: 'Foto de perfil atualizada.' })
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

  const SECOES = [
    { key: 'perfil' as Secao,    label: 'Perfil',    icone: User,   desc: 'Nome, foto e contato' },
    { key: 'seguranca' as Secao, label: 'Segurança', icone: Shield, desc: 'Senha de acesso' },
  ]

  return (
    <div className="flex-1 p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie suas informações pessoais e segurança</p>
      </div>

      <div className="flex gap-6 flex-col md:flex-row">

        {/* Coluna esquerda — navegação */}
        <div className="md:w-56 flex-shrink-0">
          {/* Card do usuário */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 flex flex-col items-center text-center">
            <div className="relative group mb-3">
              <button
                onClick={() => inputRef.current?.click()}
                className="block"
                disabled={enviandoAvatar}
                title="Alterar foto"
              >
                {usuario?.avatar_url ? (
                  <img
                    src={usuario.avatar_url}
                    alt="avatar"
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#1E40AF] flex items-center justify-center border-2 border-[#1E40AF]">
                    <span className="text-white text-xl font-bold">{inicial}</span>
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/50 hidden group-hover:flex items-center justify-center">
                  {enviandoAvatar
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera size={16} className="text-white" />
                  }
                </div>
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
            </div>
            <p className="text-sm font-semibold text-gray-900 truncate w-full">{usuario?.nome}</p>
            <p className="text-xs text-gray-400 truncate w-full">{usuario?.email}</p>
            <div className="flex flex-wrap gap-1 justify-center mt-2">
              {usuario?.perfis.map(p => (
                <span key={p} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-full font-medium capitalize">
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Navegação */}
          <nav className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {SECOES.map((s, i) => {
              const Icone = s.icone
              return (
                <button
                  key={s.key}
                  onClick={() => setSecao(s.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    i > 0 ? 'border-t border-gray-100' : ''
                  } ${
                    secao === s.key
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${secao === s.key ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Icone size={14} className={secao === s.key ? 'text-blue-600' : 'text-gray-500'} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-none">{s.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{s.desc}</p>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Coluna direita — conteúdo */}
        <div className="flex-1 min-w-0">

          {/* Perfil */}
          {secao === 'perfil' && (
            <div className="bg-white border border-gray-200 rounded-xl">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Dados Pessoais</h2>
                <p className="text-xs text-gray-500 mt-0.5">Atualize seu nome e informações de contato</p>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div>
                  <Label className="text-xs font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
                    <User size={12} className="text-gray-400" />
                    Nome completo
                  </Label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
                    <Mail size={12} className="text-gray-400" />
                    E-mail
                  </Label>
                  <Input
                    value={usuario?.email ?? ''}
                    disabled
                    className="bg-gray-50 text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">O e-mail não pode ser alterado.</p>
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
                    <Phone size={12} className="text-gray-400" />
                    WhatsApp
                  </Label>
                  <Input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(81) 99999-9999"
                  />
                </div>

                {feedbackPerfil && <MsgFeedback feedback={feedbackPerfil} />}

                <div className="pt-1">
                  <Button
                    onClick={salvarPerfil}
                    disabled={salvandoPerfil || !nome.trim()}
                  >
                    {salvandoPerfil ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Segurança */}
          {secao === 'seguranca' && (
            <div className="bg-white border border-gray-200 rounded-xl">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Alterar Senha</h2>
                <p className="text-xs text-gray-500 mt-0.5">Use uma senha forte com no mínimo 6 caracteres</p>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div>
                  <Label className="text-xs font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
                    <Lock size={12} className="text-gray-400" />
                    Senha atual
                  </Label>
                  <Input
                    type="password"
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    placeholder="••••••"
                    autoComplete="current-password"
                  />
                </div>

                <div className="border-t border-gray-100 pt-5 space-y-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
                      <Lock size={12} className="text-gray-400" />
                      Nova senha
                    </Label>
                    <Input
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
                      <Lock size={12} className="text-gray-400" />
                      Confirmar nova senha
                    </Label>
                    <Input
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Repita a nova senha"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {/* Indicador de força da senha */}
                {novaSenha && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-gray-500 font-medium">Força da senha</p>
                    <div className="flex gap-1">
                      {[
                        novaSenha.length >= 6,
                        /[A-Z]/.test(novaSenha),
                        /[0-9]/.test(novaSenha),
                        /[^A-Za-z0-9]/.test(novaSenha),
                      ].map((ok, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            ok
                              ? novaSenha.length < 6 ? 'bg-red-400'
                                : [ok, /[A-Z]/.test(novaSenha), /[0-9]/.test(novaSenha), /[^A-Za-z0-9]/.test(novaSenha)].filter(Boolean).length <= 2
                                  ? 'bg-amber-400'
                                  : 'bg-green-500'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {(() => {
                        const pts = [novaSenha.length >= 6, /[A-Z]/.test(novaSenha), /[0-9]/.test(novaSenha), /[^A-Za-z0-9]/.test(novaSenha)].filter(Boolean).length
                        if (pts <= 1) return 'Fraca — adicione letras maiúsculas, números e símbolos'
                        if (pts === 2) return 'Razoável — adicione mais complexidade'
                        if (pts === 3) return 'Boa — quase lá!'
                        return 'Forte'
                      })()}
                    </p>
                  </div>
                )}

                {feedbackSenha && <MsgFeedback feedback={feedbackSenha} />}

                <div className="pt-1">
                  <Button
                    onClick={alterarSenha}
                    disabled={salvandoSenha || !senhaAtual || !novaSenha || !confirmarSenha}
                  >
                    {salvandoSenha ? 'Alterando...' : 'Alterar Senha'}
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
