type BadgeColor = 'primary' | 'success' | 'warning' | 'error' | 'neutral'

export interface Estado {
  value: string
  label: string
  icon: string
  color: BadgeColor
}

export const ESTADOS: Estado[] = [
  { value: 'disponible', label: 'Disponible', icon: 'i-lucide-circle-check', color: 'success' },
  { value: 'reservado', label: 'Ocupado', icon: 'i-lucide-circle-minus', color: 'neutral' },
  { value: 'bloqueado', label: 'No disponible', icon: 'i-lucide-ban', color: 'neutral' },
  { value: 'confirmada', label: 'Confirmado', icon: 'i-lucide-calendar-check', color: 'success' },
  { value: 'cancelada', label: 'Cancelado', icon: 'i-lucide-circle-x', color: 'error' },
  { value: 'reprogramada', label: 'Cambiado de fecha', icon: 'i-lucide-calendar-sync', color: 'warning' },
  { value: 'completada', label: 'Ya fuiste', icon: 'i-lucide-check-check', color: 'neutral' },
  { value: 'ausente', label: 'No fuiste', icon: 'i-lucide-user-x', color: 'warning' },
]

export const estado = (value: string): Estado =>
  ESTADOS.find((e) => e.value === value) ?? { value, label: value, icon: 'i-lucide-circle-help', color: 'neutral' }
