import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Cached per-request auth helpers (server-cache-react).
 * Deduplicates getUser/getVendedor calls across layout and pages
 * within the same server request.
 */

export const getUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export const getVendedor = cache(async () => {
  const user = await getUser()
  if (!user) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('vendedores')
    .select('*')
    .eq('id', user.user_metadata.vendedor_id as string)
    .single()
  return data
})
