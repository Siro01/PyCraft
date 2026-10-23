// Fechas de las temporadas y el script del <head> que las aplica antes de
// pintar. Va aparte de season.ts porque el layout (componente de servidor)
// lo importa y ese otro archivo tiene hooks de React.

// Del viernes 23/10 al viernes 30/10 inclusive (hora local de la PC).
// Mes en base 0, como Date: 9 = octubre, 10 = noviembre.
export const HALLOWEEN_FROM: [number, number, number] = [2026, 9, 23]
export const HALLOWEEN_UNTIL: [number, number, number] = [2026, 9, 31] // exclusivo: se apaga el sábado 31/10 a las 00:00

export const OVERRIDE_KEY = 'pysql:season'

/** Páginas que no se disfrazan: el manual de marca se exporta a PDF con sus colores. */
export const EXCLUDED = ['/demo/manual']

/** Script del <head>: pone data-season antes de pintar, sin parpadeo de colores. */
export const SEASON_BOOT_SCRIPT = `
try {
  var q = new URLSearchParams(location.search).get('halloween');
  if (q === '1') sessionStorage.setItem('${OVERRIDE_KEY}', 'on');
  else if (q === '0') sessionStorage.setItem('${OVERRIDE_KEY}', 'off');
  else if (q === 'auto') sessionStorage.removeItem('${OVERRIDE_KEY}');
  var o = sessionStorage.getItem('${OVERRIDE_KEY}');
  var n = Date.now();
  var on = o === 'on' || (o !== 'off' && n >= new Date(${HALLOWEEN_FROM.join(',')}).getTime() && n < new Date(${HALLOWEEN_UNTIL.join(',')}).getTime());
  var ex = ${JSON.stringify(EXCLUDED)}.some(function (p) { return location.pathname.indexOf(p) === 0 });
  if (on && !ex) document.documentElement.setAttribute('data-season', 'halloween');
} catch (e) {}
`
