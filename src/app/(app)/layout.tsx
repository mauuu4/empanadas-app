import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Navbar } from '@/components/layout/Navbar'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
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

  // Obtener datos del vendedor
  const { data: vendedor } = await supabase
    .from('vendedores')
    .select('*')
    .eq('id', user.user_metadata.vendedor_id as string)
    .single()

  if (!vendedor) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header vendedor={vendedor} />
      <main className="mx-auto max-w-lg px-4 pb-20 pt-4">{children}</main>
      <Navbar />
    </div>
  )
}
