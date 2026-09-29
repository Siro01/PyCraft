'use client'

import { IconTag, IconPrint, IconPrompt, IconBranch, IconLoop } from '@/components/ui/PixelIcons'

const ICON_BY_KEY: Record<string, typeof IconTag> = {
  tag: IconTag,
  print: IconPrint,
  input: IconPrompt,
  branch: IconBranch,
  loop: IconLoop,
}

export default function PlaygroundTopicIcon({ icon, size = 15, color }: { icon: string; size?: number; color?: string }) {
  const Cmp = ICON_BY_KEY[icon] ?? IconTag
  return <Cmp size={size} color={color} />
}
