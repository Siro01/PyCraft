'use client'

import type { AmuletType } from '@/types'

// Each icon: viewBox 0 0 16 16, each "pixel" = 2×2 SVG units (effective 8×8 grid)
// All use fill="currentColor" — set color on the parent or via the `color` prop

interface IconProps {
  size?: number
  color?: string
  className?: string
}

function Px({ x, y, w = 2, h = 2 }: { x: number; y: number; w?: number; h?: number }) {
  return <rect x={x} y={y} width={w} height={h} />
}

function Icon({ size = 16, color = 'white', className = '', children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{ imageRendering: 'pixelated', display: 'block', flexShrink: 0 }}
    >
      <g fill={color}>{children}</g>
    </svg>
  )
}

// ── Sword (pointing up) ────────────────────────────────────────────────────────
export function IconSword({ size, color, className }: IconProps) {
  return (
    <Icon size={size} color={color} className={className}>
      <Px x={6} y={0} />                  {/* tip */}
      <Px x={4} y={2} w={6} />            {/* blade wide */}
      <Px x={6} y={4} />
      <Px x={6} y={6} />                  {/* blade */}
      <Px x={0} y={8} w={14} />           {/* crossguard */}
      <Px x={6} y={10} />
      <Px x={6} y={12} />                 {/* handle */}
      <Px x={4} y={14} w={6} />           {/* pommel */}
    </Icon>
  )
}

// ── Database (SQL cylinder) ────────────────────────────────────────────────────
export function IconDatabase({ size, color, className }: IconProps) {
  return (
    <Icon size={size} color={color} className={className}>
      <Px x={2} y={0} w={12} />           {/* top cap */}
      <Px x={0} y={2} />
      <Px x={14} y={2} />                 {/* sides */}
      <Px x={0} y={4} w={16} />           {/* middle cap */}
      <Px x={0} y={6} />
      <Px x={14} y={6} />                 {/* sides */}
      <Px x={2} y={8} w={12} />           {/* bottom cap */}
    </Icon>
  )
}

// ── Skull ─────────────────────────────────────────────────────────────────────
export function IconSkull({ size, color, className }: IconProps) {
  return (
    <Icon size={size} color={color} className={className}>
      <Px x={2} y={0} w={12} />           {/* head top */}
      <Px x={0} y={2} w={16} />           {/* head row */}
      {/* row 2 with eye sockets */}
      <Px x={0} y={4} />
      <Px x={4} y={4} w={6} />
      <Px x={12} y={4} w={4} />
      <Px x={0} y={6} w={16} />           {/* head row */}
      <Px x={0} y={8} w={16} />
      {/* teeth */}
      <Px x={2} y={10} />
      <Px x={6} y={10} />
      <Px x={10} y={10} />
    </Icon>
  )
}

// ── Potion (health) ───────────────────────────────────────────────────────────
export function IconPotion({ size, color, className }: IconProps) {
  return (
    <Icon size={size} color={color} className={className}>
      <Px x={6} y={0} w={4} h={4} />     {/* neck */}
      <Px x={4} y={4} w={8} />           {/* shoulder */}
      <Px x={2} y={6} w={12} />          {/* body */}
      <Px x={0} y={8} w={16} />
      <Px x={2} y={10} w={12} />
      <Px x={4} y={12} w={8} />          {/* bottom */}
    </Icon>
  )
}

// ── Crystal / Diamond (teleporter) ────────────────────────────────────────────
export function IconCrystal({ size, color, className }: IconProps) {
  return (
    <Icon size={size} color={color} className={className}>
      <Px x={6} y={0} />
      <Px x={4} y={2} w={6} />
      <Px x={2} y={4} w={10} />
      <Px x={0} y={6} w={16} />          {/* widest */}
      <Px x={2} y={8} w={10} />
      <Px x={4} y={10} w={6} />
      <Px x={6} y={12} />
    </Icon>
  )
}

// ── Portal / Vortex (escape) ──────────────────────────────────────────────────
export function IconEscape({ size, color, className }: IconProps) {
  return (
    <Icon size={size} color={color} className={className}>
      {/* outer ring */}
      <Px x={4} y={0} w={8} />
      <Px x={0} y={2} />
      <Px x={14} y={2} />
      {/* inner ring */}
      <Px x={0} y={4} w={4} />
      <Px x={12} y={4} w={4} />
      <Px x={4} y={4} w={4} />
      <Px x={8} y={4} w={4} />
      {/* center gap row — just sides */}
      <Px x={0} y={6} />
      <Px x={14} y={6} />
      <Px x={4} y={6} w={2} />
      <Px x={10} y={6} w={2} />
      {/* bottom */}
      <Px x={0} y={8} w={4} />
      <Px x={12} y={8} w={4} />
      <Px x={4} y={8} w={4} />
      <Px x={8} y={8} w={4} />
      <Px x={0} y={10} />
      <Px x={14} y={10} />
      <Px x={4} y={12} w={8} />
    </Icon>
  )
}

// ── Wizard Hat (merchant) ─────────────────────────────────────────────────────
export function IconWizard({ size, color, className }: IconProps) {
  return (
    <Icon size={size} color={color} className={className}>
      <Px x={6} y={0} />                  {/* tip */}
      <Px x={4} y={2} w={6} />
      <Px x={2} y={4} w={10} />
      <Px x={2} y={6} w={10} />           {/* hat body */}
      <Px x={0} y={8} w={16} />           {/* brim */}
      {/* stars on hat */}
      <Px x={2} y={5} />
      <Px x={10} y={3} />
    </Icon>
  )
}

// ── Pickaxe (Minecraft) ───────────────────────────────────────────────────────
export function IconPickaxe({ size, color, className }: IconProps) {
  return (
    <Icon size={size} color={color} className={className}>
      {/* head */}
      <Px x={0} y={2} w={12} />
      <Px x={0} y={4} w={12} />
      {/* handle — staircase diagonal */}
      <Px x={8} y={6} w={4} />
      <Px x={10} y={8} w={4} />
      <Px x={12} y={10} w={4} />
      {/* pick tip */}
      <Px x={0} y={0} w={4} />
    </Icon>
  )
}

// ── Crown (final boss) ────────────────────────────────────────────────────────
export function IconCrown({ size, color, className }: IconProps) {
  return (
    <Icon size={size} color={color} className={className}>
      {/* 3 points */}
      <Px x={0} y={2} />
      <Px x={6} y={0} />
      <Px x={12} y={2} />
      {/* crown body */}
      <Px x={0} y={4} w={14} h={6} />
      {/* jewels */}
      <Px x={2} y={6} />
      <Px x={6} y={5} />
      <Px x={10} y={6} />
    </Icon>
  )
}

// ── Lightning bolt (mixed type) ───────────────────────────────────────────────
export function IconBolt({ size, color, className }: IconProps) {
  return (
    <Icon size={size} color={color} className={className}>
      <Px x={6} y={0} w={6} />
      <Px x={4} y={2} w={6} />
      <Px x={2} y={4} w={8} />
      <Px x={2} y={6} w={12} />           {/* center bar */}
      <Px x={6} y={8} w={8} />
      <Px x={8} y={10} w={6} />
      <Px x={10} y={12} w={4} />
    </Icon>
  )
}

// ── Lock (coming soon) ────────────────────────────────────────────────────────
export function IconLock({ size, color, className }: IconProps) {
  return (
    <Icon size={size} color={color} className={className}>
      {/* shackle arc */}
      <Px x={4} y={0} w={8} />
      <Px x={2} y={2} />
      <Px x={12} y={2} />
      <Px x={2} y={4} />
      <Px x={12} y={4} />
      {/* body */}
      <Px x={0} y={6} w={16} />
      <Px x={0} y={8} w={16} />
      <Px x={0} y={10} w={6} />
      <Px x={10} y={10} w={6} />          {/* keyhole gap */}
      <Px x={0} y={12} w={16} />
    </Icon>
  )
}

// ── Sprout / Seedling (Junior) ────────────────────────────────────────────────
export function IconSprout({ size, color, className }: IconProps) {
  return (
    <Icon size={size} color={color} className={className}>
      {/* leaf right */}
      <Px x={8} y={0} w={4} />
      <Px x={6} y={2} w={6} />
      {/* leaf left */}
      <Px x={2} y={2} w={6} />
      <Px x={2} y={4} w={4} />
      {/* stem */}
      <Px x={6} y={4} />
      <Px x={6} y={6} />
      <Px x={6} y={8} />
      {/* ground */}
      <Px x={2} y={10} w={12} />
      <Px x={4} y={12} w={8} />
    </Icon>
  )
}

// ── Dagger (Trainee) ──────────────────────────────────────────────────────────
export function IconDagger({ size, color, className }: IconProps) {
  return (
    <Icon size={size} color={color} className={className}>
      <Px x={6} y={0} />                  {/* tip */}
      <Px x={6} y={2} />
      <Px x={6} y={4} />                  {/* blade */}
      <Px x={0} y={6} w={12} />           {/* guard */}
      <Px x={6} y={8} />
      <Px x={6} y={10} />                 {/* handle */}
      <Px x={4} y={12} w={6} />           {/* pommel */}
    </Icon>
  )
}

// ── Lightbulb (tip / hint) ────────────────────────────────────────────────────
export function IconBulb({ size, color, className }: IconProps) {
  return (
    <Icon size={size} color={color} className={className}>
      {/* bulb */}
      <Px x={4} y={0} w={8} />
      <Px x={2} y={2} w={12} />
      <Px x={2} y={4} w={12} />
      <Px x={2} y={6} w={12} />
      <Px x={4} y={8} w={8} />
      {/* neck */}
      <Px x={6} y={10} w={4} />
      {/* base */}
      <Px x={4} y={12} w={8} />
      <Px x={6} y={14} w={4} />
    </Icon>
  )
}

// ── Snake / Python ────────────────────────────────────────────────────────────
export function IconSnake({ size, color, className }: IconProps) {
  return (
    <Icon size={size} color={color} className={className}>
      {/* head */}
      <Px x={4} y={0} w={10} />
      <Px x={2} y={2} w={12} />
      <Px x={2} y={4} w={10} />
      {/* eye */}
      <Px x={10} y={2} />
      {/* tongue */}
      <Px x={14} y={2} />
      <Px x={14} y={0} />
      {/* body curve */}
      <Px x={2} y={6} w={6} />
      <Px x={0} y={8} w={4} />
      <Px x={0} y={10} w={8} />
      <Px x={4} y={12} w={10} />
      <Px x={12} y={10} w={4} />
      {/* tail */}
      <Px x={14} y={14} />
    </Icon>
  )
}

// ── Check (completado) ──────────────────────────────────────────────────────────
export function IconCheck({ size, color, className }: IconProps) {
  return (
    <Icon size={size} color={color} className={className}>
      <Px x={2} y={6} w={2} />
      <Px x={4} y={8} w={2} />
      <Px x={6} y={10} w={2} />
      <Px x={8} y={8} w={2} />
      <Px x={10} y={6} w={2} />
      <Px x={12} y={4} w={2} />
    </Icon>
  )
}

// ── X (error) ──────────────────────────────────────────────────────────────────
export function IconX({ size, color, className }: IconProps) {
  return (
    <Icon size={size} color={color} className={className}>
      <Px x={2} y={2} w={2} />
      <Px x={4} y={4} w={2} />
      <Px x={6} y={6} w={2} />
      <Px x={8} y={8} w={2} />
      <Px x={10} y={10} w={2} />
      <Px x={12} y={12} w={2} />
      <Px x={12} y={2} w={2} />
      <Px x={10} y={4} w={2} />
      <Px x={8} y={6} w={2} />
      <Px x={4} y={10} w={2} />
      <Px x={2} y={12} w={2} />
    </Icon>
  )
}

// ── Amulet icon resolver ──────────────────────────────────────────────────────
export function AmuletIcon({ type, size = 20, color }: { type: AmuletType; size?: number; color?: string }) {
  switch (type) {
    case 'boss-hp-reduction': return <IconSkull  size={size} color={color} />
    case 'health-potion':     return <IconPotion size={size} color={color} />
    case 'escape':            return <IconEscape size={size} color={color} />
    case 'skip-boss':         return <IconCrystal size={size} color={color} />
  }
}
