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
  if (s.includes(',')) {
    // pt-BR com vírgula: "1.500,50" ou "1500,50" → remove pontos (milhar), troca vírgula por ponto
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
  }
  if (s.includes('.')) {
    // Sem vírgula, com ponto: verifica se é milhar (3 dígitos após o ponto) ou decimal
    const afterDot = s.split('.').pop() ?? ''
    if (afterDot.length === 3) {
      // "2.334" → milhar pt-BR → 2334
      return parseFloat(s.replace(/\./g, '')) || 0
    }
    // "1500.50" → decimal en-US → 1500.5
    return parseFloat(s) || 0
  }
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
    // Só dígitos e vírgula — ponto é separador de milhar e não deve ser digitado
    const raw = e.target.value.replace(/[^\d,]/g, '')
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
