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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  if (vendedores.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-600">No hay vendedores registrados.</p>
        <p className="mt-2 text-sm text-gray-500">
          El administrador debe crear los vendedores primero.
        </p>
      </div>
    )
  }

  // Pantalla de PIN
  if (selectedVendedor) {
    return (
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={handleBack}
          className="self-start text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Cambiar vendedor
        </button>

        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <span className="text-2xl font-bold text-orange-600">
              {selectedVendedor.nombre.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedVendedor.nombre}
          </h2>
          <p className="mt-1 text-sm text-gray-500">Ingresa tu PIN</p>
        </div>

        <PinInput
          onComplete={handlePinComplete}
          disabled={authenticating}
          error={!!error}
        />

        {error && (
          <p className="text-center text-sm font-medium text-red-500">
            {error}
          </p>
        )}

        {authenticating && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            Ingresando...
          </div>
        )}
      </div>
    )
  }

  // Pantalla de seleccion de vendedor
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-gray-500">Selecciona tu nombre</p>

      <div className="grid gap-3">
        {vendedores.map((vendedor) => (
          <Button
            key={vendedor.id}
            variant="secondary"
            size="lg"
            className="justify-start gap-3 text-left"
            onClick={() => handleSelectVendedor(vendedor)}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
              {vendedor.nombre.charAt(0).toUpperCase()}
            </span>
            <span className="flex flex-col">
              <span className="font-semibold">{vendedor.nombre}</span>
              <span className="text-xs text-gray-500">
                {vendedor.rol === 'admin' ? 'Administrador' : 'Vendedor'}
              </span>
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}
