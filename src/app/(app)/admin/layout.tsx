import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: vendedor } = await supabase
    .from('vendedores')
    .select('rol')
    .eq('id', user.user_metadata.vendedor_id as string)
    .single()

  if (!vendedor || vendedor.rol !== 'admin') {
    redirect('/dashboard')
  }

  return <>{children}</>
}
