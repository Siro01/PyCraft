import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { LegalSection } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Política de cookies · PyCraft BossRush',
  description: 'Información sobre las cookies y el almacenamiento local que utiliza PyCraft BossRush y el modo de eliminarlos.',
}

export default function CookiesPage() {
  return (
    <LegalPage
      file="COOKIES.TXT"
      title="Política de cookies"
      intro="La plataforma utiliza únicamente los recursos técnicos indispensables para su funcionamiento. No emplea publicidad ni herramientas de seguimiento."
    >
      <LegalSection n={1} title="Resumen">
        <p className="legal-note">
          Solo se utilizan cookies y mecanismos de almacenamiento <strong>estrictamente necesarios</strong> para el inicio de sesión, la conservación del progreso y el recuerdo de las preferencias del usuario. <strong>No se emplean cookies publicitarias, analíticas ni de terceros.</strong> Por dicho motivo, no se requiere un aviso de aceptación.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Información almacenada en el navegador">
        <table className="legal-table">
          <thead><tr><th>Nombre</th><th>Finalidad</th></tr></thead>
          <tbody>
            <tr><td>Cookie de sesión</td><td>Mantiene la sesión iniciada mediante el alias del usuario. Resulta necesaria para el uso de la plataforma y se elimina al cerrar sesión.</td></tr>
            <tr><td>theme</td><td>Conserva el tema de colores elegido (negro, rojo o blanco).</td></tr>
            <tr><td>pysql:sfx-muted</td><td>Conserva la preferencia de silenciar los efectos de sonido.</td></tr>
            <tr><td>pysql:progress, pysql:tier, pysql:amulets</td><td>Progreso, nivel de dificultad y amuletos en el modo local o de demostración.</td></tr>
            <tr><td>pysql:finale, pysql:finale-deco</td><td>Borrador del proyecto final y su decoración, a fin de evitar la pérdida del trabajo realizado.</td></tr>
            <tr><td>pysql:user, pysql:enabled, pysql:feedback</td><td>Datos del modo local: alias, jefes habilitados y opinión final.</td></tr>
          </tbody>
        </table>
        <p>Los elementos identificados con el prefijo <strong>pysql:</strong>, así como <strong>theme</strong>, se almacenan únicamente en el dispositivo del usuario y no se transmiten a ningún servidor.</p>
      </LegalSection>

      <LegalSection n={3} title="Eliminación">
        <p>El usuario puede eliminar las cookies y los datos del sitio desde la configuración de su navegador (en Google Chrome: Configuración, Privacidad y seguridad, Cookies y otros datos de sitios). Como consecuencia, se cerrará la sesión y se perderán las preferencias y los borradores conservados en ese dispositivo.</p>
      </LegalSection>

      <LegalSection n={4} title="Información adicional">
        <p>Para conocer los datos personales tratados y su finalidad, consulte la <Link href="/privacidad">política de privacidad</Link>.</p>
      </LegalSection>
    </LegalPage>
  )
}
