'use client'

import {
  IconTag, IconBranch, IconLoop, IconStack, IconFx, IconGrid,
  IconDatabase, IconQuery, IconSigma, IconEdit, IconLink, IconCrown,
} from '@/components/ui/PixelIcons'

// Un glifo mono por jefe, según el tema de la clase — no el color del jefe.
// Mismo lenguaje que la grilla de íconos de referencia: geométrico, de una
// sola tinta, legible a tamaño chico.
const ICON_BY_BOSS: Record<string, typeof IconTag> = {
  'creeper-formulario': IconTag,      // variables y tipos de datos
  'guardian-puerta': IconBranch,      // if / elif / else
  'golem-infinito': IconLoop,         // for / while
  'mercader-abismo': IconStack,       // listas de diccionarios
  'maestro-craftero': IconFx,         // funciones
  'archivista': IconGrid,             // de listas a tablas
  'constructor-vacio': IconDatabase,  // CREATE TABLE · INSERT INTO
  'oraculo-oscuro': IconQuery,        // SELECT · WHERE · ORDER BY
  'contador-almas': IconSigma,        // COUNT · SUM · AVG · GROUP BY
  'falsificador': IconEdit,           // UPDATE · DELETE
  'el-nexo': IconLink,                // Python + sqlite3
  'la-hydra': IconStack,              // agregar y listar
  'dragon-rojo': IconEdit,            // buscar, quitar, actualizar
  'el-arquitecto': IconCrown,         // sistema completo
}

export default function BossTopicIcon({ bossId, size = 15, color }: { bossId: string; size?: number; color?: string }) {
  const Cmp = ICON_BY_BOSS[bossId] ?? IconTag
  return <Cmp size={size} color={color} />
}
