import { describe, expect, it } from 'vitest'
import { ARQUETIPOS, duelo, mazoDe, simularBalance } from '@/lib/game/cartas/balance'
import { alAzar, crearRng, porPoder, validarMazo } from '@/lib/game/cartas/reglas'

// Si alguien cambia una constante de REGLAS y el juego se desequilibra, esto falla.
// Para ver la tabla completa: `pnpm sim:balance`.

describe('balance de la Arena de Cartas', () => {
  it('los 5 arquetipos son mazos válidos', () => {
    for (const [nombre, poderes] of Object.entries(ARQUETIPOS)) {
      const mazo = mazoDe(poderes, crearRng(1), nombre)
      expect(validarMazo(mazo.map((c) => ({ ...c }))).ok, nombre).toBe(true)
    }
  })

  it('con colores y órdenes al azar, ningún arquetipo sale del 42 %–58 %', () => {
    const tabla = simularBalance({ partidas: 20000 })
    console.table(tabla.map((f) => ({ arquetipo: f.arquetipo, '%': f.porcentaje.toFixed(1) })))
    for (const f of tabla) {
      expect(f.porcentaje, f.arquetipo).toBeGreaterThanOrEqual(42)
      expect(f.porcentaje, f.arquetipo).toBeLessThanOrEqual(58)
    }
  })

  // Con la estrategia por defecto en los dos lados (lo que pasa en la muestra
  // si nadie programó elegir() ni cambió el orden), hoy el reparto plano queda
  // en ~40 % y el polarizado en ~59 %. Banda más ancha: avisa si empeora.
  it('con la estrategia por defecto en los dos lados no empeora (38 %–62 %)', () => {
    const tabla = simularBalance({ partidas: 20000, estrategia: porPoder })
    console.table(tabla.map((f) => ({ arquetipo: f.arquetipo, '% (porPoder)': f.porcentaje.toFixed(1) })))
    for (const f of tabla) {
      expect(f.porcentaje, f.arquetipo).toBeGreaterThanOrEqual(38)
      expect(f.porcentaje, f.arquetipo).toBeLessThanOrEqual(62)
    }
  })

  it('decidir pesa, pero no aplasta: dejar afuera la más débil gana 55 %–68 % contra el azar', () => {
    const pct = duelo(porPoder, alAzar)
    console.log(`porPoder vs alAzar: ${pct.toFixed(1)} %`)
    expect(pct).toBeGreaterThanOrEqual(55)
    expect(pct).toBeLessThanOrEqual(68)
  })
})
