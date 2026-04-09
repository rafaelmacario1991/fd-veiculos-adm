import { addHours, addDays, differenceInHours, differenceInDays, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { format } from 'date-fns'

export const PRAZO_PENDENCIA_VENDEDOR_HORAS = 72
export const PRAZO_TRANSFERENCIA_DIAS = 30
export const ALERTA_VENDEDOR_HORAS = 12  // alerta quando restar ≤ 12h
export const ALERTA_TRANSFERENCIA_DIAS = 5 // alerta quando restar ≤ 5 dias

export function calcularPrazo72h(dataInicio: Date | string): Date {
  return addHours(new Date(dataInicio), PRAZO_PENDENCIA_VENDEDOR_HORAS)
}

export function calcularPrazo30dias(dataInicio: Date | string): Date {
  return addDays(new Date(dataInicio), PRAZO_TRANSFERENCIA_DIAS)
}

export type StatusPrazo = 'ok' | 'alerta' | 'vencido'

export function statusPrazo72h(prazo: Date | string): StatusPrazo {
  const dataPrazo = new Date(prazo)
  if (isPast(dataPrazo)) return 'vencido'
  const horasRestantes = differenceInHours(dataPrazo, new Date())
  if (horasRestantes <= ALERTA_VENDEDOR_HORAS) return 'alerta'
  return 'ok'
}

export function statusPrazo30dias(prazo: Date | string): StatusPrazo {
  const dataPrazo = new Date(prazo)
  if (isPast(dataPrazo)) return 'vencido'
  const diasRestantes = differenceInDays(dataPrazo, new Date())
  if (diasRestantes <= ALERTA_TRANSFERENCIA_DIAS) return 'alerta'
  return 'ok'
}

export function horasRestantes(prazo: Date | string): number {
  return Math.max(0, differenceInHours(new Date(prazo), new Date()))
}

export function diasRestantes(prazo: Date | string): number {
  return Math.max(0, differenceInDays(new Date(prazo), new Date()))
}

export function formatarData(data: Date | string): string {
  return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatarDataCurta(data: Date | string): string {
  return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR })
}

export function estaVencido(prazo: Date | string): boolean {
  return isPast(new Date(prazo))
}

export function estaNoAlerta72h(prazo: Date | string): boolean {
  return (
    !estaVencido(prazo) &&
    differenceInHours(new Date(prazo), new Date()) <= ALERTA_VENDEDOR_HORAS
  )
}

export function estaNoAlerta30dias(prazo: Date | string): boolean {
  return (
    !estaVencido(prazo) &&
    differenceInDays(new Date(prazo), new Date()) <= ALERTA_TRANSFERENCIA_DIAS
  )
}

// Retorna classe de cor Tailwind baseada no status do prazo
export function corPorStatusPrazo(status: StatusPrazo): string {
  switch (status) {
    case 'ok': return 'text-green-600'
    case 'alerta': return 'text-amber-600'
    case 'vencido': return 'text-red-600'
  }
}

export function bgPorStatusPrazo(status: StatusPrazo): string {
  switch (status) {
    case 'ok': return 'bg-green-50 border-green-200'
    case 'alerta': return 'bg-amber-50 border-amber-200'
    case 'vencido': return 'bg-red-50 border-red-200'
  }
}
