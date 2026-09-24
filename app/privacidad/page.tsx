import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { LegalSection } from '@/components/legal/LegalPage'
import { SITE } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Política de privacidad · PyCraft BossRush',
  description: 'Información sobre los datos que trata PyCraft BossRush, su finalidad y las medidas adoptadas para la protección de los menores participantes.',
}

export default function PrivacidadPage() {
  const contacto = SITE.contactEmail
    ? <>, o bien dirigiendo una comunicación a <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a></>
    : null

  return (
    <LegalPage
      file="PRIVACIDAD.TXT"
      title="Política de privacidad"
      intro="PyCraft BossRush es una plataforma web de carácter educativo. Su diseño responde al principio de minimización: se trata la menor cantidad posible de datos."
    >
      <LegalSection n={1} title="Finalidad educativa y principio general">
        <p>
          {SITE.name} es una plataforma web educativa, sin fines comerciales, destinada a talleres de introducción a la programación en Python y SQL para niñas y niños de entre 10 y 13 años. El acceso está restringido a los participantes de cada taller, cuyas cuentas son creadas por el docente a cargo.
        </p>
        <p className="legal-note">
          <strong>La plataforma no recopila ni conserva datos personales sensibles ni información identificatoria de los menores.</strong> Respecto de los alumnos, únicamente se utiliza un <strong>alias o sobrenombre</strong>. Para la entrega del proyecto final se registra el <strong>correo electrónico del tutor responsable</strong>, y en ningún caso el del menor.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Datos tratados y finalidad">
        <table className="legal-table">
          <thead><tr><th>Dato</th><th>Finalidad</th></tr></thead>
          <tbody>
            <tr><td>Alias o sobrenombre</td><td>Identificar al participante dentro de la plataforma. Se recomienda que no coincida con su nombre real ni permita identificarlo.</td></tr>
            <tr><td>Correo electrónico del tutor</td><td>Exclusivamente, hacer llegar el proyecto final elaborado por el alumno. No se utiliza con fines publicitarios ni se cede a terceros.</td></tr>
            <tr><td>Progreso de juego</td><td>Jefes superados, intentos y código escrito en los ejercicios, a fin de permitir la continuidad de la actividad y el seguimiento pedagógico del grupo por parte del docente.</td></tr>
            <tr><td>Aula asignada</td><td>Organización de los participantes por grupo, a cargo del docente.</td></tr>
            <tr><td>Opinión final (optativa)</td><td>Una puntuación de 1 a 5 y comentarios breves, con el único fin de mejorar el taller. Se solicita no consignar datos personales en dichos comentarios.</td></tr>
          </tbody>
        </table>
      </LegalSection>

      <LegalSection n={3} title="Datos que no se solicitan ni se conservan">
        <ul>
          <li>Nombre y apellido del menor.</li>
          <li>Correo electrónico, teléfono, domicilio o número de documento del menor.</li>
          <li>Imágenes, registros de voz, geolocalización o fecha de nacimiento.</li>
          <li>Información con fines publicitarios, de elaboración de perfiles o de seguimiento por parte de terceros.</li>
        </ul>
        <p>Por razones técnicas, el sistema de autenticación genera internamente una dirección de correo derivada del alias. Dicha dirección es ficticia y no se remite ninguna comunicación a ella.</p>
      </LegalSection>

      <LegalSection n={4} title="Almacenamiento">
        <ul>
          <li><strong>Base de datos de la plataforma</strong>, alojada en los servicios de Supabase: alias, aula, progreso y opiniones.</li>
          <li><strong>Navegador del participante</strong>: preferencias de uso (tema de colores, sonido) y borradores del proyecto. Esta información permanece en el dispositivo y no se transmite a la plataforma. Se detalla en la <Link href="/cookies">política de cookies</Link>.</li>
        </ul>
      </LegalSection>

      <LegalSection n={5} title="Plazo de conservación">
        <p>Los datos se conservan durante el desarrollo del taller y por el período razonablemente necesario para la entrega del proyecto final. Concluido dicho plazo, se procede a la supresión de las cuentas de los participantes y de los correos electrónicos de los tutores. El tutor podrá solicitar la supresión anticipada en cualquier momento.</p>
      </LegalSection>

      <LegalSection n={6} title="Derechos del titular y del tutor">
        <p>El tutor responsable puede ejercer, en representación del menor, los derechos de <strong>acceso, rectificación y supresión</strong> de los datos, así como retirar su consentimiento en cualquier momento, comunicándose con el docente a cargo del taller{contacto}.</p>
        <p>El tratamiento se rige por la Ley N.º 25.326 de Protección de los Datos Personales de la República Argentina. La Agencia de Acceso a la Información Pública, en su carácter de órgano de control de dicha ley, tiene la atribución de atender las denuncias y reclamos que se interpongan con motivo del incumplimiento de las normas sobre protección de datos personales.</p>
      </LegalSection>

      <LegalSection n={7} title="Seguridad">
        <p>No existe registro abierto: las cuentas son creadas por el docente. Las contraseñas no se almacenan en texto plano y el acceso a la información de cada aula se encuentra restringido al personal docente. La recolección limitada de datos constituye, asimismo, una medida de protección en sí misma.</p>
      </LegalSection>

      <LegalSection n={8} title="Modificaciones y contacto">
        <p>Cualquier modificación de esta política será reflejada mediante la actualización de la fecha consignada al inicio. Para consultas, el tutor puede dirigirse al docente a cargo del taller{contacto}.</p>
        <p>Plataforma desarrollada por {SITE.author}.</p>
      </LegalSection>
    </LegalPage>
  )
}
