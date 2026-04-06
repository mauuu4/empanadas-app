'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Vendedor, Rol } from '@/types'
import { Button, Input, useToast } from '@/components/ui'
import { PIN_LENGTH } from '@/lib/constants'

interface VendedorFormProps {
  vendedor?: Vendedor | null
  onClose: () => void
}

function VendedorForm({ vendedor, onClose }: VendedorFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [nombre, setNombre] = useState(vendedor?.nombre ?? '')
  const [pin, setPin] = useState('')
  const [rol, setRol] = useState<Rol>(vendedor?.rol ?? 'vendedor')

  const isEditing = !!vendedor

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!nombre.trim()) {
      setError('El nombre es requerido')
      return
    }

    if (!isEditing && pin.length !== PIN_LENGTH) {
      setError(`El PIN debe tener ${PIN_LENGTH} digitos`)
      return
    }

    if (pin && !/^\d+$/.test(pin)) {
      setError('El PIN solo debe contener numeros')
      return
    }

    if (isEditing && pin && pin.length !== PIN_LENGTH) {
      setError(`El PIN debe tener ${PIN_LENGTH} digitos`)
      return
    }

    setLoading(true)

    if (isEditing) {
      // Actualizar vendedor en la tabla
      const updateData: { nombre?: string; pin?: string; rol?: Rol } = {
        nombre: nombre.trim(),
        rol,
      }
      if (pin) {
        updateData.pin = pin
      }

      const { error: updateError } = await supabase
        .from('vendedores')
        .update(updateData)
        .eq('id', vendedor.id)

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }
    } else {
      // Crear vendedor en la tabla
      const { data: newVendedor, error: insertError } = await supabase
        .from('vendedores')
        .insert({
          nombre: nombre.trim(),
          pin,
          rol,
        })
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }

      // Crear usuario en Supabase Auth via API
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          pin,
          vendedor_id: newVendedor.id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Error al crear usuario de autenticacion')
        // Rollback: eliminar el vendedor creado
        await supabase.from('vendedores').delete().eq('id', newVendedor.id)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    onClose()
    router.refresh()
    toast(isEditing ? 'Vendedor actualizado' : 'Vendedor creado')
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-card border border-gray-100/80">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        {isEditing ? 'Editar vendedor' : 'Nuevo vendedor'}
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          id="nombre"
          label="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Juan Perez"
          required
        />
        <Input
          id="pin"
          label={isEditing ? 'Nuevo PIN (dejar vacio para no cambiar)' : 'PIN'}
          type="password"
          inputMode="numeric"
          maxLength={PIN_LENGTH}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder={'*'.repeat(PIN_LENGTH)}
          required={!isEditing}
        />
        <div>
          <label
            htmlFor="rol"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Rol
          </label>
          <select
            id="rol"
            value={rol}
            onChange={(e) => setRol(e.target.value as Rol)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-base text-gray-900 transition-all duration-150 hover:border-gray-300 hover:bg-white focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            <option value="vendedor">Vendedor</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={loading} className="flex-1">
            {isEditing ? 'Guardar cambios' : 'Crear vendedor'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}

interface VendedorRowProps {
  vendedor: Vendedor
  onEdit: (vendedor: Vendedor) => void
}

function VendedorRow({ vendedor, onEdit }: VendedorRowProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [toggling, setToggling] = useState(false)

  async function toggleActivo() {
    setToggling(true)
    await supabase
      .from('vendedores')
      .update({ activo: !vendedor.activo })
      .eq('id', vendedor.id)
    setToggling(false)
    router.refresh()
    toast(vendedor.activo ? 'Vendedor desactivado' : 'Vendedor activado')
  }

  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-card border border-gray-100/80 ${!vendedor.activo ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-white shadow-sm">
              {vendedor.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{vendedor.nombre}</h4>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    vendedor.rol === 'admin'
                      ? 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200/60'
                      : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200/60'
                  }`}
                >
                  {vendedor.rol === 'admin' ? 'Admin' : 'Vendedor'}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    vendedor.activo
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/60'
                      : 'bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200/60'
                  }`}
                >
                  {vendedor.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => onEdit(vendedor)}>
          Editar
        </Button>
        <Button
          size="sm"
          variant={vendedor.activo ? 'danger' : 'secondary'}
          onClick={toggleActivo}
          loading={toggling}
        >
          {vendedor.activo ? 'Desactivar' : 'Activar'}
        </Button>
      </div>
    </div>
  )
}

interface VendedoresListProps {
  vendedores: Vendedor[]
}

export function VendedoresList({ vendedores }: VendedoresListProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null)

  function handleEdit(vendedor: Vendedor) {
    setEditingVendedor(vendedor)
    setShowForm(true)
  }

  function handleClose() {
    setShowForm(false)
    setEditingVendedor(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Vendedores</h1>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            Agregar
          </Button>
        )}
      </div>

      {showForm && (
        <VendedorForm vendedor={editingVendedor} onClose={handleClose} />
      )}

      {vendedores.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          No hay vendedores registrados.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {vendedores.map((vendedor) => (
            <VendedorRow
              key={vendedor.id}
              vendedor={vendedor}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}
