import { useState } from 'react'
import { Input } from './input'

interface InputMoedaProps {
  value: string
  onChange: (valor: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

function parseBRL(v: string): number {
  if (!v || !v.trim()) return 0
  const s = v.trim()
  // Se tem vírgula → separador decimal pt-BR: "1.500,50" ou "1500,50"
  if (s.includes(',')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
  }
  // Sem vírgula: pode ser "1500" ou "1500.50" (en-US)
  return parseFloat(s) || 0
}

function formatBRL(num: number): string {
  if (!num) return ''
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function InputMoeda({ value, onChange, placeholder = '0,00', className, disabled }: InputMoedaProps) {
  const [editando, setEditando] = useState(false)
  const [textoEdit, setTextoEdit] = useState('')

  function handleFocus() {
    setEditando(true)
    const num = parseBRL(value)
    // Sem separador de milhar para facilitar edição
    if (num > 0) {
      const partes = num.toFixed(2).split('.')
      setTextoEdit(partes[0] + ',' + partes[1])
    } else {
      setTextoEdit('')
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Só permite dígitos, vírgula e ponto
    const raw = e.target.value.replace(/[^\d,\.]/g, '')
    setTextoEdit(raw)
  }

  function handleBlur() {
    setEditando(false)
    const num = parseBRL(textoEdit)
    onChange(num > 0 ? String(num) : '')
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={editando ? textoEdit : formatBRL(parseBRL(value))}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  )
}
