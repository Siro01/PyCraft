// True when LOCAL_MODE flag is set OR when Supabase env vars are absent/placeholder.
export function isLocalMode(): boolean {
  if (process.env.NEXT_PUBLIC_LOCAL_MODE === 'true') return true
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !url || url.includes('placeholder') || url === 'your-supabase-url'
}
