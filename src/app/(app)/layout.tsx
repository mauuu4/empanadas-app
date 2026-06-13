import { redirect } from 'next/navigation'
import { getVendedor } from '@/lib/auth'
import { Header } from '@/components/layout/Header'
import { Navbar } from '@/components/layout/Navbar'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const vendedor = await getVendedor()

  if (!vendedor) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-app-shell">
      <Header vendedor={vendedor} />
      <main className="mx-auto max-w-lg px-4 pb-24 pt-5">{children}</main>
      <Navbar />
    </div>
  )
}
