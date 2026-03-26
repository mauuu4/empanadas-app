import { createClient } from '@/lib/supabase/server'
import { ProductosList } from '@/components/admin/ProductosList'

export const dynamic = 'force-dynamic'

export default async function ProductosPage() {
  const supabase = await createClient()

  const { data: productos } = await supabase
    .from('productos')
    .select('*')
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true })

  return <ProductosList productos={productos ?? []} />
}
