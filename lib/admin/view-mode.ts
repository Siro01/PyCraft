// Vista del docente cuando juega: "admin" muestra las herramientas de prueba
// (simular aciertos, matar al jefe, forzar la derrota, reiniciar); "alumno"
// muestra exactamente la pantalla que ve un alumno. En las dos el docente
// puede entrar a cualquier jefe y a cualquier lugar del mapa.
export type AdminView = 'admin' | 'alumno'

export const ADMIN_VIEW_COOKIE = 'pysql_admin_view'

export function parseAdminView(value?: string): AdminView {
  return value === 'alumno' ? 'alumno' : 'admin'
}
