// Arte de los jefes secretos — grillas de luminancia (0..1) dibujadas por código,
// con la misma receta que El Arquitecto (lib/game/architect/art.ts): una imagen
// fuente de 64×80 que render.ts dibuja como ASCII, halftone o braille.
//
// Este archivo no importa nada a propósito: así se puede renderizar desde un
// script de Node para revisar el diseño sin levantar Next.
//
// Cada jefe es una función (t, blink) → Luma. `t` es la fase de la animación
// en reposo (0..2π): la capa se mece, las alas baten, la serpiente gira.

export const W = 64
export const H = 80

export type Luma = Float32Array

export function hash2(x: number, y: number, seed = 0): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const blank = (): Luma => new Float32Array(W * H)
const smooth = (a: number, b: number, v: number) => {
  const k = clamp((v - a) / (b - a))
  return k * k * (3 - 2 * k)
}

/** Distancia de (px,py) al segmento a-b, y la posición (0..1) a lo largo del segmento. */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): [number, number] {
  const vx = bx - ax, vy = by - ay
  const len2 = vx * vx + vy * vy || 1
  const k = clamp(((px - ax) * vx + (py - ay) * vy) / len2)
  return [Math.hypot(px - (ax + vx * k), py - (ay + vy * k)), k]
}

function inPoly(px: number, py: number, poly: number[][]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Elipse rotada: devuelve r (<1 adentro) y las coords normalizadas (u, v). */
function ellipse(px: number, py: number, cx: number, cy: number, rx: number, ry: number, ang = 0) {
  const dx = px - cx, dy = py - cy
  const cs = Math.cos(ang), sn = Math.sin(ang)
  const u = (dx * cs + dy * sn) / rx
  const v = (-dx * sn + dy * cs) / ry
  return { r: u * u + v * v, u, v }
}

function scan(out: Luma, every = 4, k = 0.78) {
  for (let y = 0; y < H; y += every) for (let x = 0; x < W; x++) out[y * W + x] *= k
}

/** Acerca la imagen (zoom k alrededor de cx,cy) con interpolación bilineal. */
function zoom(src: Luma, cx: number, cy: number, k: number): Luma {
  const out = blank()
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : src[y * W + x])
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = cx + (x - cx) / k, sy = cy + (y - cy) / k
      const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0
      out[y * W + x] = (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy
    }
  }
  return out
}

// ═══ I · EL ERRANTE ═════════════════════════════════════════════════════════
// Proceso huérfano del bosque de Python. Encapuchado, espada en alto, una capa
// que se deshace en puntos hacia abajo (como la referencia 1-bit del docente).
export function makeErrante(t = 0, blink = false): Luma {
  const out = blank()
  const sway = Math.sin(t)

  // Capa: triángulo largo que cae hacia la derecha, con jirones abajo.
  for (let y = 40; y < H; y++) {
    const depth = (y - 40) / (H - 40)
    const left = 24 - depth * 6 + Math.sin(y * 0.3 + t) * 0.8
    const right = 44 + depth * 19 + sway * depth * 2.5
    for (let x = 0; x < W; x++) {
      if (x < left || x > right) continue
      // jirones: el borde de abajo se come según ruido por columna
      const tatter = 0.72 + 0.28 * hash2(x, 0, 41) + Math.sin(x * 0.5 + t) * 0.03
      if (depth > tatter) continue
      const rel = (x - left) / (right - left)
      // pliegues diagonales, más densos arriba; la capa se apaga hacia abajo
      const fold = 0.5 + 0.5 * Math.sin(rel * 13 - depth * 5 + sway * 0.6)
      let l = (0.1 + 0.24 * fold * (0.6 + 0.4 * hash2(x, y, 40))) * (1 - depth * 0.6)
      if (rel < 0.06 || rel > 0.95) l += 0.3 * (1 - depth) // bordes con luz
      if (hash2(x, y, 42) < 0.07 * (1 - depth)) l += 0.4 // puntos sueltos
      if (depth > tatter - 0.08 && hash2(x, y, 43) < 0.35) l += 0.35 // flecos
      out[y * W + x] = clamp(l)
    }
  }

  // Brazo: del hombro (42,47) a las manos (19,41), apenas iluminado arriba.
  const hx = 19, hy = 41 + sway * 0.3
  for (let y = 30; y < 58; y++) {
    for (let x = 8; x < 50; x++) {
      const [d, k] = segDist(x, y, 42, 48, hx, hy)
      const rad = 3.6 - k * 1.2
      if (d > rad) continue
      const top = y < 44 + (1 - k) * 4 - k * 3 ? 0.35 : 0
      out[y * W + x] = clamp(0.24 + top + (d > rad - 0.9 ? 0.3 : 0) + (hash2(x, y, 44) < 0.12 ? 0.35 : 0))
    }
  }

  // Capucha: superelipse ladeada hacia la izquierda (mira a su espada).
  const cx = 37, cy = 33
  for (let y = 14; y < 52; y++) {
    for (let x = 18; x < 58; x++) {
      const e = ellipse(x, y, cx, cy, 10.5, 12.5, -0.28)
      const r = Math.pow(Math.abs(e.u), 2.4) + Math.pow(Math.abs(e.v), 2.4)
      if (r >= 1) continue
      let l = 0.34 - e.u * 0.18 - e.v * 0.12 + 0.06 * Math.sin(e.u * 12 + e.v * 4)
      if (r > 0.74) l += 0.55 * ((r - 0.74) / 0.26)
      out[y * W + x] = clamp(l)
    }
  }
  // Abertura del rostro: hacia la izquierda, oscura, con un ojo que brilla.
  for (let y = 18; y < 50; y++) {
    for (let x = 18; x < 56; x++) {
      const e = ellipse(x, y, 33.5, 35, 5.6, 8.4, -0.28)
      if (e.r >= 1) continue
      let l = 0.03
      if (e.r > 0.7 && e.u > 0) l += 0.28 * ((e.r - 0.7) / 0.3)
      out[y * W + x] = l
    }
  }
  const eyeR = blink ? 0.35 : 1.25
  for (let y = 28; y < 40; y++) {
    for (let x = 26; x < 40; x++) {
      const e = ellipse(x, y, 32.2, 33.6, 2.6, eyeR, -0.2)
      if (e.r < 1) out[y * W + x] = 1
      else if (e.r < 3.4) out[y * W + x] = Math.max(out[y * W + x], 0.45 * (1 - (e.r - 1) / 2.4))
    }
  }

  // Espada: hoja larga en diagonal, de la guarda (21,39) a la punta (37,3).
  const gx = 21, gy = 39 + sway * 0.3, tx = 37 + sway * 0.4, ty = 3
  const glint = (Math.sin(t) * 0.5 + 0.5) * 0.85 + 0.08
  for (let y = 0; y < 50; y++) {
    for (let x = 6; x < 46; x++) {
      const [d, k] = segDist(x, y, gx, gy, tx, ty)
      const half = 1.9 * (1 - k * 0.8) + 0.25
      if (d > half + 0.9) continue
      const i = y * W + x
      if (d <= half) {
        // filo con luz y un destello que recorre la hoja
        const shine = Math.exp(-((k - glint) ** 2) / 0.004)
        out[i] = Math.max(out[i], clamp(0.82 + 0.18 * shine - (d / half) * 0.15))
      } else {
        out[i] = Math.max(out[i], 0.32) // halo
      }
    }
  }
  // Guarda (perpendicular a la hoja) y empuñadura hacia abajo-izquierda.
  for (let y = 30; y < 54; y++) {
    for (let x = 6; x < 36; x++) {
      const [dg] = segDist(x, y, gx - 5, gy - 2.6, gx + 5, gy + 2.6)
      const [dh] = segDist(x, y, gx, gy, gx - 4, gy + 7)
      const i = y * W + x
      if (dg < 1.2) out[i] = Math.max(out[i], 0.9)
      else if (dh < 1.3) out[i] = Math.max(out[i], hash2(x, y, 45) < 0.5 ? 0.6 : 0.35)
    }
  }
  // Pomo
  for (let y = 40; y < 56; y++) for (let x = 8; x < 24; x++) {
    if ((x - (gx - 4.6)) ** 2 + (y - (gy + 8)) ** 2 < 2.4) out[y * W + x] = 0.95
  }

  // Polvo que se levanta alrededor (siempre poquito)
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(hash2(i, 1, 46) * W)
    const y = Math.floor(((hash2(i, 2, 46) * H) - t * 3 + H * 4) % H)
    if (out[y * W + x] < 0.1 && hash2(i, 3, 46) < 0.6) out[y * W + x] = 0.5 + 0.3 * hash2(i, 4, 46)
  }

  // Más cerca: así la capucha y el ojo se leen también en ASCII.
  const near = zoom(out, 33, 13, 1.24)
  scan(near)
  return near
}

// ═══ II · LA POLILLA ═════════════════════════════════════════════════════════
// El primer bug de la historia: en 1947 encontraron una polilla atrapada en el
// relé 70 del panel F de la computadora Mark II. Desde entonces, a los errores
// les dicen "bugs". Vive en el agua profunda del archipiélago de las tablas.
export function makePolilla(t = 0, blink = false): Luma {
  const out = blank()
  const cx = 31.5
  // Aleteo: las alas se acercan al cuerpo y vuelven (escala horizontal).
  const flap = 1 - 0.16 * (0.5 - 0.5 * Math.cos(t))
  const lift = Math.sin(t) * 1.2

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const side = x < cx ? -1 : 1
      // Coordenadas del ala (mitad izquierda, espejada): wx = distancia al cuerpo.
      const wx = Math.abs(x - cx) / flap
      const wy = y + lift * (wx / 30)
      const px = cx - wx // punto equivalente en el ala izquierda
      let l = -1

      // Ala de arriba: elipse rotada, con borde festoneado.
      const fw = ellipse(px, wy, 15.5, 25, 16.5, 10.5, -0.42)
      const scallop = 0.06 * Math.sin(Math.atan2(fw.v, fw.u) * 9)
      if (fw.r < 1 + scallop) {
        l = 0.24 + 0.1 * Math.sin(fw.u * 5 + fw.v * 2)
        if (fw.r > 0.8 + scallop) l = 0.62 // banda del borde
        // nervaduras: rayos desde la raíz del ala
        const ang = Math.atan2(wy - 27, px - 30)
        if (Math.abs(Math.sin(ang * 7)) < 0.12 && fw.r < 0.8) l += 0.25
        // ocelo (ojo falso) en el ala
        const oc = Math.hypot(px - 12.5, wy - 22.5)
        if (oc < 5.4) l = oc < 1.6 ? (blink ? 0.2 : 1) : oc < 2.9 ? 0.04 : oc < 4.2 ? 0.85 : 0.12
      }
      // Ala de abajo: más chica y redonda.
      const hw = ellipse(px, wy, 19, 44, 12, 9, 0.55)
      if (hw.r < 1 && l < 0) {
        l = 0.18 + 0.08 * Math.sin(hw.u * 6)
        if (hw.r > 0.74) l = 0.5
        const oc = Math.hypot(px - 15, wy - 47)
        if (oc < 2.6) l = oc < 1.1 ? 0.9 : 0.06
        if (hash2(x, y, 51) < 0.06) l += 0.3
      }
      if (l >= 0) {
        // polvillo de las alas
        if (hash2(x, y, 52) < 0.05) l += 0.25
        out[y * W + x] = clamp(l)
      }
      void side
    }
  }

  // Cuerpo: abdomen segmentado, tórax peludo, cabeza.
  for (let y = 14; y < 70; y++) {
    for (let x = 22; x < 42; x++) {
      const i = y * W + x
      const ab = ellipse(x, y, cx, 46, 4.2, 15)
      const th = ellipse(x, y, cx, 28, 5.2, 6)
      const hd = ellipse(x, y, cx, 19.5, 3.6, 3.2)
      if (ab.r < 1) {
        const seg = 0.5 + 0.5 * Math.cos((y - 31) * 1.3)
        out[i] = clamp(0.3 + 0.35 * seg - ab.u * 0.15 + (ab.r > 0.75 ? 0.25 : 0))
      } else if (th.r < 1) {
        out[i] = clamp(0.5 - th.u * 0.2 + (hash2(x, y, 53) < 0.35 ? 0.3 : 0))
      } else if (hd.r < 1) {
        out[i] = clamp(0.55 - hd.u * 0.2)
      }
    }
  }
  // Ojos compuestos
  for (const ex of [cx - 2.6, cx + 2.6]) {
    for (let y = 16; y < 23; y++) for (let x = 26; x < 38; x++) {
      if ((x - ex) ** 2 + (y - 19.2) ** 2 < 2.2) out[y * W + x] = blink ? 0.3 : 1
    }
  }
  // Antenas plumosas: curvas hacia arriba y afuera, con barbitas.
  for (const side of [-1, 1]) {
    for (let s = 0; s <= 1; s += 0.01) {
      const ax = cx + side * (2 + s * 15 * flap)
      const ay = 17 - s * 14 + s * s * 4 - Math.sin(t + s * 3) * 0.6
      const xi = Math.round(ax), yi = Math.round(ay)
      if (xi >= 0 && xi < W && yi >= 0 && yi < H) out[yi * W + xi] = 0.85
      if (s > 0.2 && Math.round(s * 100) % 6 === 0) {
        for (let b = 1; b <= 2; b++) {
          const bx = Math.round(ax + side * b * 0.7), by = Math.round(ay - b)
          if (bx >= 0 && bx < W && by >= 0) out[by * W + bx] = Math.max(out[by * W + bx], 0.55)
        }
      }
    }
  }
  // Patitas finas debajo del tórax
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      for (let s = 0; s <= 1; s += 0.08) {
        const x = Math.round(cx + side * (4 + s * 6))
        const y = Math.round(31 + k * 2.5 + s * s * 7)
        if (y < H) out[y * W + x] = Math.max(out[y * W + x], 0.45)
      }
    }
  }
  // Escamas que caen
  for (let i = 0; i < 22; i++) {
    const x = Math.floor(hash2(i, 1, 54) * W)
    const y = Math.floor((hash2(i, 2, 54) * H + t * 4) % H)
    if (out[y * W + x] < 0.1) out[y * W + x] = 0.45
  }
  scan(out)
  return out
}

// ═══ III · EL OUROBOROS ══════════════════════════════════════════════════════
// La serpiente que se muerde la cola: el bucle que nunca termina (while True).
// Vive en el bosque más allá de la frontera.
export function makeOuroboros(t = 0, blink = false): Luma {
  const out = blank()
  const cx = 31, cy = 45, R = 19
  const headA = -Math.PI / 2 // la cabeza arriba, de perfil, mirando a la derecha
  const TAU = Math.PI * 2

  // Adentro del anillo: bits sueltos, como el vacío del Arquitecto.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - cx, y - cy)
    if (d < R - 6 && hash2(x, y, 61) < 0.03) out[y * W + x] = 0.3 + 0.25 * hash2(x, y, 62)
  }

  // Cuerpo: del cuello (s=0) a la punta de la cola (s=1), girando en sentido horario.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - cy
      const d = Math.hypot(dx, dy)
      const a = Math.atan2(dy, dx)
      const s = ((headA - a) % TAU + TAU) % TAU / TAU // 0 en la cabeza, crece hacia atrás
      const thick = 6.4 - 4.8 * Math.pow(s, 1.2)
      const off = d - R
      if (Math.abs(off) > thick) continue
      if (s > 0.95) continue // la punta se mete en la boca
      const n = off / thick // -1 adentro … 1 afuera
      // Luz de arriba a la izquierda: el lado del anillo que mira a la luz brilla más.
      const nx = Math.cos(a) * n, ny = Math.sin(a) * n
      const lit = 0.5 + 0.5 * (-nx * 0.6 - ny * 0.8)
      let l = 0.06 + 0.42 * lit * Math.sqrt(1 - n * n)
      // Escamas: rombos que avanzan con t (la serpiente "gira").
      const u = s * 74 - t * 1.6
      const v = n * 2.2
      const sc = Math.abs(((u + v) % 2 + 2) % 2 - 1) + Math.abs(((u - v) % 2 + 2) % 2 - 1)
      if (sc < 0.38) l += 0.32
      if (Math.abs(n) > 0.82) l += 0.22 // contorno
      // Panza clara (lado de adentro)
      if (n < -0.55) l = Math.max(l, 0.3 + 0.2 * Math.sin(s * 140))
      out[y * W + x] = clamp(l)
    }
  }

  // Cabeza: en coordenadas propias (u hacia la cola, v hacia afuera del anillo).
  // Contorno brillante y adentro oscuro, para que se lea contra el cuerpo.
  const hx = cx + Math.cos(headA) * R, hy = cy + Math.sin(headA) * R
  const tang = headA + Math.PI / 2 // la trompa mira hacia la punta de la cola
  const tu = [Math.cos(tang), Math.sin(tang)], tv = [Math.cos(headA), Math.sin(headA)]
  const pulse = 0.85 + 0.15 * Math.sin(t * 2)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = x - hx, py = y - hy
      const u = px * tu[0] + py * tu[1]
      const v = px * tv[0] + py * tv[1] + (u * u) / (2 * R) // sigue la curva del anillo
      if (u < -8 || u > 15) continue
      const hw = u < 0 ? 8.6 + u * 0.15 : 8.6 * (1 - Math.pow(u / 15.5, 1.6)) + 0.8
      const vc = v - 0.8
      if (Math.abs(vc) > hw) continue
      const i = y * W + x
      // Boca abierta: cuña desde u=2 hasta la punta; adentro asoma la cola.
      if (u > 3 && Math.abs(vc + 0.8) < (u - 3) * 0.48) {
        const d = Math.hypot(x - cx, y - cy)
        out[i] = Math.abs(d - R) < 1.8 && u < 13 ? 0.75 : 0.0
        continue
      }
      let l = 0.16 + 0.1 * Math.sin(u * 2.2) * Math.sin(vc * 2.2)
      if (Math.abs(vc) > hw - 1.25) l = 0.9 // contorno
      if (u < -6.6) l = Math.max(l, 0.45) // nuca
      // Ojo arriba (lado de afuera), con halo que late
      const er = ((u - 2) / 2.8) ** 2 + ((vc - 4) / (blink ? 0.45 : 1.8)) ** 2
      if (er < 1) l = pulse
      else if (er < 2.6) l = Math.max(l, 0.5)
      // Fosa nasal
      if (Math.hypot(u - 12.4, vc - 2.4) < 0.9) l = 0.85
      out[i] = clamp(l)
    }
  }

  // "while True:" escrito con puntos debajo del anillo (bits que caen)
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(10 + hash2(i, 1, 64) * 44)
    const y = Math.floor(68 + ((hash2(i, 2, 64) * 12 + t * 2) % 12))
    if (y < H) out[y * W + x] = 0.4
  }
  scan(out)
  return out
}

// ═══ IV · EL VIGÍA ═══════════════════════════════════════════════════════════
// El demonio (daemon) que el Arquitecto dejó corriendo en el fondo del sistema:
// `while 1: vigila()`. Un ojo enorme, ojitos alrededor y datos que gotean.
export function makeVigia(t = 0, blink = false): Luma {
  const out = blank()
  const cx = 32, cy = 34
  const open = blink ? 0.08 : 1
  const lookX = Math.sin(t) * 4.2
  const lookY = Math.sin(t * 2) * 1.2

  // Lluvia de datos que gotea desde el ojo hacia abajo.
  for (let x = 4; x < W - 4; x += 3) {
    const len = 8 + Math.floor(hash2(x, 0, 71) * 30)
    const start = 46 + Math.floor(hash2(x, 1, 71) * 6)
    const head = (t / (Math.PI * 2)) * len * 2 + hash2(x, 2, 71) * len
    for (let k = 0; k < len; k++) {
      const y = start + k
      if (y >= H) break
      const fade = 1 - k / len
      const lit = ((k - head) % len + len) % len < 3 ? 0.65 : 0.18
      if (hash2(x, y, 72) < 0.75) out[y * W + x] = Math.max(out[y * W + x], lit * fade)
    }
  }

  // Párpados: almendra = intersección de dos círculos grandes.
  const half = 28, lidH = 15 * open
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x - cx) / half
      if (Math.abs(nx) >= 1) continue
      const edge = lidH * (1 - nx * nx) // alto de la almendra en esa columna
      const dy = y - cy
      const i = y * W + x
      // Párpado: banda de piel arriba y abajo del ojo
      const lidTop = edge + 4.5 * (1 - nx * nx)
      if (Math.abs(dy) < lidTop && Math.abs(dy) >= edge) {
        const k = (Math.abs(dy) - edge) / Math.max(0.01, lidTop - edge)
        out[i] = clamp(0.5 - k * 0.3 + (dy < 0 ? 0.12 : 0) + (k < 0.2 ? 0.35 : 0))
        continue
      }
      if (Math.abs(dy) >= edge) continue
      // Esclerótica tenue con venitas
      let l = 0.16 + 0.1 * (1 - Math.abs(dy) / Math.max(1, edge))
      if (Math.abs(Math.sin(Math.atan2(dy, x - cx) * 11 + nx * 4)) < 0.06 && Math.abs(nx) > 0.45) l += 0.25
      // Iris: anillos y rayos que brillan
      const ix = x - (cx + lookX), iy = y - (cy + lookY)
      const ir = Math.hypot(ix, iy)
      if (ir < 11) {
        const ang = Math.atan2(iy, ix)
        const rays = 0.5 + 0.5 * Math.sin(ang * 23 + hash2(Math.round(ang * 30), 0, 73) * 3)
        l = 0.4 + 0.35 * rays * (ir / 11)
        if (ir > 9.6) l = 0.95 // aro
        if (ir < 4.8) l = 0.02 // pupila
        if (Math.hypot(ix + 1.8, iy + 1.8) < 1.5) l = 1 // brillo
      }
      out[i] = clamp(l)
    }
  }
  // Pestañas: rayitas desde el borde de arriba hacia afuera.
  for (let k = -6; k <= 6; k++) {
    const nx = k / 7.2
    const bx = cx + nx * half
    const by = cy - (lidH + 4.5) * (1 - nx * nx)
    const ang = -Math.PI / 2 + nx * 1.1
    for (let s = 1; s <= 4; s++) {
      const x = Math.round(bx + Math.cos(ang) * s), y = Math.round(by + Math.sin(ang) * s)
      if (x >= 0 && x < W && y >= 0 && y < H) out[y * W + x] = Math.max(out[y * W + x], 0.75 - s * 0.1)
    }
  }

  // Ojitos que vigilan alrededor: parpadean por turnos.
  const smalls: [number, number, number][] = [[8, 12, 2.6], [24, 7, 2], [44, 8, 2.4], [57, 15, 2.8], [5, 52, 2.2], [59, 50, 2.4]]
  smalls.forEach(([sx, sy, sr], j) => {
    const closed = blink || Math.sin(t * 1.5 + j * 1.7) > 0.93
    for (let y = Math.floor(sy - sr - 2); y <= sy + sr + 2; y++) {
      for (let x = Math.floor(sx - sr * 1.8 - 2); x <= sx + sr * 1.8 + 2; x++) {
        if (x < 0 || x >= W || y < 0 || y >= H) continue
        const e = ellipse(x, y, sx, sy, sr * 1.8, closed ? 0.5 : sr)
        const i = y * W + x
        if (e.r < 1) {
          const p = Math.hypot(x - sx - lookX * 0.25, y - sy)
          out[i] = closed ? 0.6 : p < sr * 0.55 ? 0.95 : 0.3
        } else if (e.r < 1.5) out[i] = Math.max(out[i], 0.55)
      }
    }
  })

  // Halo del ojo grande
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    if (out[i] > 0) continue
    const d = Math.hypot((x - cx) / 32, (y - cy) / 19)
    if (d < 1.15 && d > 0.98 && hash2(x, y, 74) < 0.3) out[i] = 0.3
  }
  scan(out)
  return out
}

export type SecretArtId = 'errante' | 'polilla' | 'ouroboros' | 'vigia'

export const SECRET_ART: Record<SecretArtId, (t: number, blink: boolean) => Luma> = {
  errante: makeErrante,
  polilla: makePolilla,
  ouroboros: makeOuroboros,
  vigia: makeVigia,
}

/** Cuadros de la animación en reposo (+ el parpadeo al final). */
export const IDLE_FRAMES = 12

export function makeFrames(id: SecretArtId): { idle: Luma[]; blink: Luma } {
  const fn = SECRET_ART[id]
  const idle = Array.from({ length: IDLE_FRAMES }, (_, i) => fn((i / IDLE_FRAMES) * Math.PI * 2, false))
  return { idle, blink: fn(0, true) }
}

// Silencia el aviso de función sin usar (smooth queda para retoques del arte).
void smooth
