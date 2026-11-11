// Gasto de tokens de Claude Code en este proyecto, por modelo y por sesión.
// Lee las transcripciones locales (~/.claude/projects/<carpeta>/*.jsonl); no manda nada a ningún lado.
// Uso: pnpm uso:tokens            → últimos 7 días
//      pnpm uso:tokens -- --dias 30
//      pnpm uso:tokens -- --todo
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const valor = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const dias = args.includes('--todo') ? Infinity : Number(valor('--dias') ?? 7);
const desde = dias === Infinity ? 0 : Date.now() - dias * 864e5;
const carpeta = valor('--dir') ?? path.join(os.homedir(), '.claude', 'projects', process.cwd().replace(/[^a-zA-Z0-9]/g, '-'));

if (!fs.existsSync(carpeta)) {
  console.error(`No encontré las transcripciones en ${carpeta}`);
  process.exit(1);
}

const archivos = [];
(function recorrer(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) recorrer(p);
    else if (f.name.endsWith('.jsonl')) archivos.push(p);
  }
})(carpeta);

const vacio = () => ({ respuestas: 0, salida: 0, releido: 0, nuevo: 0 });
const sumar = (t, u) => {
  t.respuestas++;
  t.salida += u.output_tokens ?? 0;
  t.releido += u.cache_read_input_tokens ?? 0;
  t.nuevo += (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
};

const porModelo = {};
const sesiones = [];
const vistos = new Set();

for (const archivo of archivos) {
  if (fs.statSync(archivo).mtimeMs < desde) continue;
  const esAgente = archivo.includes(`${path.sep}subagents${path.sep}`);
  const s = { fecha: '', titulo: '', modelos: new Set(), t: vacio(), esAgente };
  for (const linea of fs.readFileSync(archivo, 'utf8').split('\n')) {
    if (!linea) continue;
    let j;
    try { j = JSON.parse(linea); } catch { continue; }
    if (j.timestamp && Date.parse(j.timestamp) < desde) continue;
    if (!s.fecha && j.timestamp) s.fecha = j.timestamp.slice(0, 10);
    if (!s.titulo && j.type === 'user' && typeof j.message?.content === 'string') {
      s.titulo = j.message.content.replace(/<([\w-]+)[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
    }
    const m = j.message;
    if (j.type !== 'assistant' || !m?.usage || m.model === '<synthetic>') continue;
    const clave = `${m.id}:${j.requestId}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    const modelo = (m.model ?? '?') + (esAgente ? ' (agente)' : '');
    sumar((porModelo[modelo] ??= vacio()), m.usage);
    sumar(s.t, m.usage);
    s.modelos.add(m.model?.replace('claude-', ''));
  }
  if (s.t.respuestas) sesiones.push(s);
}

const M = (x) => (x / 1e6).toFixed(1).padStart(7) + 'M';
const K = (x) => (x / 1e3).toFixed(0).padStart(6) + 'k';
const total = Object.values(porModelo).reduce((a, t) => a + t.releido + t.nuevo, 0) || 1;

console.log(`\nGasto de tokens — ${dias === Infinity ? 'todo el historial' : `últimos ${dias} días`}\n`);
console.log('POR MODELO'.padEnd(34), 'resp.'.padStart(6), 'escrito'.padStart(8), 'releído'.padStart(8), 'nuevo'.padStart(8), 'contexto/resp.'.padStart(15), '% del total'.padStart(12));
for (const [modelo, t] of Object.entries(porModelo).sort((a, b) => b[1].releido - a[1].releido)) {
  const pct = (((t.releido + t.nuevo) / total) * 100).toFixed(0) + ' %';
  console.log(modelo.padEnd(34), String(t.respuestas).padStart(6), M(t.salida), M(t.releido), M(t.nuevo), K((t.releido + t.nuevo) / t.respuestas).padStart(15), pct.padStart(12));
}

const principales = sesiones.filter((s) => !s.esAgente).sort((a, b) => b.t.releido - a.t.releido);
console.log(`\nSESIONES MÁS PESADAS (${principales.length} en total)`);
for (const s of principales.slice(0, 10)) {
  const aviso = s.t.respuestas > 150 ? '  ← muy larga' : '';
  console.log(s.fecha, M(s.t.releido + s.t.nuevo), String(s.t.respuestas).padStart(5), 'resp.', [...s.modelos].join('+').padEnd(16), s.titulo + aviso);
}
console.log('\nReleído = contexto que se vuelve a leer en cada respuesta (más barato, pero es casi todo el volumen).');
console.log('Las sesiones "muy largas" conviene cortarlas: abrir una sesión nueva por tarea.\n');
