import { describe, expect, it } from 'vitest'
import {
  applyRelay, applySolve, initialTasks, myTask, relayCandidate, relayState, releaseTasks, solvedBy, timeoutWinner,
  TEAM_EXERCISES, type RoomSeat, type SeatRole, type Slot, type Team,
} from '@/lib/game/arena/team'

// Reglas del 2 vs 2 (lib/game/arena/team.ts). El duelo real las corre en SQL
// (016_arena_2v2.sql); esto fija el comportamiento que las dos tienen que cumplir.

const seat = (team: Team, slot: Slot, userId: string, role: SeatRole = 'alumno'): RoomSeat =>
  ({ team, slot, userId, username: userId, role, ready: true, relays: 0, gone: false })

function fourPlayers() {
  const juana = seat('espada', 1, 'juana')
  const tomi = seat('espada', 2, 'tomi')
  const romi = seat('escudo', 1, 'romi')
  const ana = seat('escudo', 2, 'ana')
  return { juana, tomi, romi, ana, seats: [juana, tomi, romi, ana] }
}

describe('reparto inicial', () => {
  it('arma 6 tareas por equipo y cada uno arranca con el primero de su columna', () => {
    const { seats } = fourPlayers()
    const tasks = initialTasks(seats)
    expect(tasks).toHaveLength(TEAM_EXERCISES * 2)
    expect(myTask(tasks, 'espada', 'juana')?.idx).toBe(0)
    expect(myTask(tasks, 'espada', 'tomi')?.idx).toBe(3)
    expect(myTask(tasks, 'escudo', 'romi')?.idx).toBe(0)
    expect(myTask(tasks, 'escudo', 'ana')?.idx).toBe(3)
  })

  it('los dos equipos reciben los mismos ejercicios', () => {
    const tasks = initialTasks(fourPlayers().seats)
    const ex = (team: Team) => tasks.filter((t) => t.team === team).map((t) => t.ex)
    expect(ex('espada')).toEqual([0, 1, 2, 3, 4, 5])
    expect(ex('escudo')).toEqual(ex('espada'))
  })

  it('la columna del docente usa los ejercicios más difíciles (6-8)', () => {
    const { juana, tomi, romi } = fourPlayers()
    const profe = seat('escudo', 2, 'profe', 'docente')
    const tasks = initialTasks([juana, tomi, romi, profe])
    expect(tasks.filter((t) => t.team === 'escudo' && t.ownerSlot === 2).map((t) => t.ex)).toEqual([6, 7, 8])
    expect(tasks.filter((t) => t.team === 'escudo' && t.ownerSlot === 1).map((t) => t.ex)).toEqual([0, 1, 2])
  })
})

describe('resolver', () => {
  it('al resolver toma el siguiente de su columna', () => {
    const { juana, seats } = fourPlayers()
    let tasks = initialTasks(seats)
    tasks = applySolve(tasks, juana, 1)
    expect(myTask(tasks, 'espada', 'juana')?.idx).toBe(1)
    tasks = applySolve(tasks, juana, 2)
    tasks = applySolve(tasks, juana, 3)
    expect(myTask(tasks, 'espada', 'juana')).toBeNull()
    expect(solvedBy(tasks, 'espada')).toBe(3)
  })

  it('sin ejercicio tomado, resolver no cambia nada', () => {
    const { juana, seats } = fourPlayers()
    let tasks = initialTasks(seats)
    for (let i = 0; i < 3; i++) tasks = applySolve(tasks, juana, i)
    expect(applySolve(tasks, juana, 9)).toBe(tasks)
  })
})

describe('relevo', () => {
  it('mientras tengo trabajo en mi columna, no hay relevo', () => {
    const { juana, seats } = fourPlayers()
    expect(relayState(initialTasks(seats), seats, juana)).toBe('busy')
  })

  it('al terminar mi columna me llevo el ÚLTIMO libre de mi compañero', () => {
    const { juana, seats } = fourPlayers()
    let tasks = initialTasks(seats)
    for (let i = 0; i < 3; i++) tasks = applySolve(tasks, juana, i)
    expect(relayState(tasks, seats, juana)).toBe('ready')
    expect(relayCandidate(tasks, 'espada', 1)?.idx).toBe(5)
    tasks = applyRelay(tasks, juana)
    expect(myTask(tasks, 'espada', 'juana')?.idx).toBe(5)
  })

  it('nunca le saca al compañero el ejercicio que está resolviendo', () => {
    const { juana, tomi, seats } = fourPlayers()
    let tasks = initialTasks(seats)
    for (let i = 0; i < 3; i++) tasks = applySolve(tasks, juana, i)
    // Tomi está en el idx 3: el relevo nunca lo elige.
    tasks = applyRelay(tasks, juana)
    expect(myTask(tasks, 'espada', 'tomi')?.idx).toBe(3)
    expect(myTask(tasks, 'espada', 'juana')?.idx).not.toBe(3)
  })

  it('un solo relevo por duelo: el más lento resuelve al menos 2', () => {
    const { juana, tomi, seats } = fourPlayers()
    let tasks = initialTasks(seats)
    for (let i = 0; i < 3; i++) tasks = applySolve(tasks, juana, i)
    tasks = applyRelay(tasks, juana); juana.relays = 1
    tasks = applySolve(tasks, juana, 10) // resolvió el idx 5
    expect(relayState(tasks, seats, juana)).toBe('used') // el idx 4 sigue libre, pero ya usó su relevo
    tasks = applySolve(tasks, tomi, 11) // idx 3
    tasks = applySolve(tasks, tomi, 12) // idx 4
    expect(tasks.filter((t) => t.solvedBy === 'tomi')).toHaveLength(2)
    expect(solvedBy(tasks, 'espada')).toBe(TEAM_EXERCISES)
  })

  it('cuando se encuentran en el último, avisa que no queda nada libre', () => {
    const { juana, tomi, seats } = fourPlayers()
    let tasks = initialTasks(seats)
    for (let i = 0; i < 3; i++) tasks = applySolve(tasks, juana, i)
    tasks = applyRelay(tasks, juana); juana.relays = 1
    tasks = applySolve(tasks, tomi, 5) // Tomi pasa al idx 4
    tasks = applySolve(tasks, juana, 6) // Juana resuelve el idx 5
    expect(relayState(tasks, seats, juana)).toBe('none')
  })

  it('si el compañero se fue, sus ejercicios quedan libres y se puede seguir tomando', () => {
    const { juana, tomi, seats } = fourPlayers()
    let tasks = initialTasks(seats)
    for (let i = 0; i < 3; i++) tasks = applySolve(tasks, juana, i)
    tasks = applyRelay(tasks, juana); juana.relays = 1
    tasks = applySolve(tasks, juana, 9)
    tasks = releaseTasks(tasks, 'tomi')
    tomi.gone = true
    expect(relayState(tasks, seats, juana)).toBe('ready')
    tasks = applyRelay(tasks, juana)
    expect(myTask(tasks, 'espada', 'juana')?.idx).toBe(4)
  })

  it('el docente no hace relevo', () => {
    const { juana, tomi, romi } = fourPlayers()
    const profe = seat('escudo', 2, 'profe', 'docente')
    const seats = [juana, tomi, romi, profe]
    let tasks = initialTasks(seats)
    for (let i = 0; i < 3; i++) tasks = applySolve(tasks, profe, i)
    expect(relayState(tasks, seats, profe)).toBe('teacher')
  })
})

describe('se terminó el tiempo', () => {
  it('nadie resolvió nada: empate', () => {
    expect(timeoutWinner(initialTasks(fourPlayers().seats))).toBeNull()
  })

  it('gana el equipo que resolvió más', () => {
    const { romi, juana, ana, seats } = fourPlayers()
    let tasks = initialTasks(seats)
    tasks = applySolve(tasks, juana, 5)
    tasks = applySolve(tasks, romi, 6)
    tasks = applySolve(tasks, ana, 7)
    expect(timeoutWinner(tasks)).toBe('escudo')
  })

  it('empatados en cantidad: gana el que llegó primero a ese número', () => {
    const { romi, juana, tomi, ana, seats } = fourPlayers()
    let tasks = initialTasks(seats)
    tasks = applySolve(tasks, juana, 5)
    tasks = applySolve(tasks, romi, 6)
    tasks = applySolve(tasks, tomi, 7) // Espada llega a 2 en t=7
    tasks = applySolve(tasks, ana, 8) // Escudo llega a 2 en t=8
    expect(timeoutWinner(tasks)).toBe('espada')
  })
})
