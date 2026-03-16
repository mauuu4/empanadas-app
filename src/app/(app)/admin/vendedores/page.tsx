import { createClient } from '@/lib/supabase/server'
import { VendedoresList } from '@/components/admin/VendedoresList'

export default async function VendedoresPage() {
  const supabase = await createClient()

  const { data: vendedores } = await supabase
    .from('vendedores')
    .select('*')
    .order('nombre', { ascending: true })

  return <VendedoresList vendedores={vendedores ?? []} />
}
