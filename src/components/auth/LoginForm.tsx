'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateInternalEmail } from '@/lib/utils'
import { PinInput } from './PinInput'
import { Button } from '@/components/ui'
import type { Vendedor } from '@/types'

export function LoginForm() {
  const router = useRouter()
  const supabase = createClient()

  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [selectedVendedor, setSelectedVendedor] = useState<Vendedor | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [authenticating, setAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadVendedores() {
      const { data, error } = await supabase
        .from('vendedores')
        .select('*')
        .eq('activo', true)
        .order('nombre')

      if (error) {
        setError('Error al cargar vendedores')
        console.error(error)
      } else {
        setVendedores(data || [])
      }
      setLoading(false)
    }

    loadVendedores()
  }, [supabase])

  const handleSelectVendedor = (vendedor: Vendedor) => {
    setSelectedVendedor(vendedor)
    setError(null)
  }

  const handleBack = () => {
    setSelectedVendedor(null)
    setError(null)
  }

  const handlePinComplete = async (pin: string) => {
    if (!selectedVendedor) return

    setAuthenticating(true)
    setError(null)

    try {
      const email = generateInternalEmail(selectedVendedor.nombre)

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: pin,
      })

      if (authError) {
        setError('PIN incorrecto')
        setAuthenticating(false)
        return
      }

      window.location.href = '/dashboard'
    } catch {
      setError('Error al iniciar sesion')
      setAuthenticating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-500" />
      </div>
    )
  }

  if (vendedores.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
          <svg className="h-6 w-6 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
          </svg>
        </div>
        <p className="font-medium text-gray-600">No hay vendedores registrados.</p>
        <p className="mt-1.5 text-sm text-gray-400">
          El administrador debe crear los vendedores primero.
        </p>
      </div>
    )
  }

  // Pantalla de PIN
  if (selectedVendedor) {
    return (
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 self-start text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
          Cambiar vendedor
        </button>

        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/25">
            <span className="text-2xl font-bold text-white">
              {selectedVendedor.nombre.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900">
            {selectedVendedor.nombre}
          </h2>
          <p className="mt-1 text-sm text-gray-400">Ingresa tu PIN</p>
        </div>

        <PinInput
          onComplete={handlePinComplete}
          disabled={authenticating}
          error={!!error}
        />

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 ring-1 ring-inset ring-red-200/60 animate-slide-up">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {authenticating && (
          <div className="flex items-center gap-2.5 text-sm text-gray-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
            Ingresando...
          </div>
        )}
      </div>
    )
  }

  // Pantalla de seleccion de vendedor
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <p className="text-center text-sm font-medium text-gray-400">
        Selecciona tu nombre
      </p>

      <div className="grid gap-2.5">
        {vendedores.map((vendedor) => (
          <button
            key={vendedor.id}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-left transition-all duration-150 hover:border-orange-200 hover:bg-orange-50/50 active:scale-[0.98]"
            onClick={() => handleSelectVendedor(vendedor)}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-white shadow-sm">
              {vendedor.nombre.charAt(0).toUpperCase()}
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">
                {vendedor.nombre}
              </span>
              <span className="text-xs text-gray-400">
                {vendedor.rol === 'admin' ? 'Administrador' : 'Vendedor'}
              </span>
            </span>
            <svg className="ml-auto h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}
