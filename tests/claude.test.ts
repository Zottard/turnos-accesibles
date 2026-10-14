import { describe, expect, it } from 'vitest'
import { MODELO_CLAUDE, armarPedidoClaude } from '../server/utils/claude'
import { dentroDelLimite, type Contador } from '../server/utils/limite'

const ESPECIALIDADES = [
  { id: 3, nombre: 'Oftalmología', nombreSimple: 'Oculista', descripcion: '', palabrasClave: ['ojos', 'vista'] },
  { id: 7, nombre: 'Odontología', nombreSimple: 'Dentista', descripcion: '', palabrasClave: ['dientes'] },
]

// Miércoles 14 de octubre de 2026, 10:00 en Argentina.
const AHORA = new Date('2026-10-14T13:00:00Z')

describe('armarPedidoClaude', () => {
  const pedido = armarPedidoClaude('oculista cerca de casa', ESPECIALIDADES, AHORA)

  it('usa el modelo, esfuerzo bajo y una respuesta con formato fijo', () => {
    expect(pedido.model).toBe(MODELO_CLAUDE)
    expect(pedido.output_config.effort).toBe('low')
    expect(pedido.output_config.format.type).toBe('json_schema')
    expect(pedido.output_config.format.schema.required).toEqual(['especialidadId', 'cerca', 'franja', 'desde'])
    expect(pedido.output_config.format.schema.additionalProperties).toBe(false)
  })

  it('manda la fecha de hoy, la lista de especialidades y el pedido', () => {
    const contenido = pedido.messages[0]!.content
    expect(contenido).toContain('2026-10-14')
    expect(contenido).toContain('3: Oculista (Oftalmología). Palabras: ojos, vista')
    expect(contenido).toContain('"""oculista cerca de casa"""')
  })

  it('las instrucciones van en system y no cambian con el pedido', () => {
    expect(armarPedidoClaude('otra cosa', ESPECIALIDADES, AHORA).system).toBe(pedido.system)
  })
})

describe('dentroDelLimite', () => {
  it('deja 10 pedidos por minuto y después corta', () => {
    const contadores = new Map<string, Contador>()
    const inicio = 1_000_000
    for (let i = 0; i < 10; i++) {
      expect(dentroDelLimite(contadores, 'ip-1', 10, inicio + i)).toBe(true)
    }
    expect(dentroDelLimite(contadores, 'ip-1', 10, inicio + 10)).toBe(false)
    // Otra persona no se ve afectada.
    expect(dentroDelLimite(contadores, 'ip-2', 10, inicio + 10)).toBe(true)
    // Al minuto, vuelve a empezar.
    expect(dentroDelLimite(contadores, 'ip-1', 10, inicio + 60_000)).toBe(true)
  })
})
