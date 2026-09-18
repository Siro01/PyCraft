// Supabase Auth requiere un email, pero no queremos pedir ni guardar el email
// real de un menor. En su lugar derivamos un email sintético y determinístico
// a partir del username — no se envía ningún correo a esa dirección.
const EMAIL_DOMAIN = 'aula.local'

export function usernameToEmail(username: string): string {
  const local = username
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return `${local || 'alumno'}@${EMAIL_DOMAIN}`
}
