'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Producto } from '@/types'
import { Button, Input, useToast } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

interface ProductoFormProps {
  producto?: Producto | null
  onClose: () => void
}

function ProductoForm({ producto, onClose }: ProductoFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [nombre, setNombre] = useState(producto?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? '')
  const [unidades, setUnidades] = useState(
    producto?.unidades_por_bandeja?.toString() ?? '',
  )
  const [precio, setPrecio] = useState(producto?.precio?.toString() ?? '')
  const [orden, setOrden] = useState(producto?.orden?.toString() ?? '0')

  const isEditing = !!producto

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const unidadesNum = parseInt(unidades, 10)
    const precioNum = parseFloat(precio)
    const ordenNum = parseInt(orden, 10)

    if (!nombre.trim()) {
      setError('El nombre es requerido')
      return
    }
    if (isNaN(unidadesNum) || unidadesNum <= 0) {
      setError('Las unidades deben ser mayor a 0')
      return
    }
    if (isNaN(precioNum) || precioNum < 0) {
      setError('El precio debe ser mayor o igual a 0')
      return
    }

    setLoading(true)

    if (isEditing) {
      const { error: updateError } = await supabase
        .from('productos')
        .update({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          unidades_por_bandeja: unidadesNum,
          precio: precioNum,
          orden: isNaN(ordenNum) ? 0 : ordenNum,
        })
        .eq('id', producto.id)

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }
    } else {
      const { error: insertError } = await supabase.from('productos').insert({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        unidades_por_bandeja: unidadesNum,
        precio: precioNum,
        orden: isNaN(ordenNum) ? 0 : ordenNum,
      })

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    onClose()
    router.refresh()
    toast(isEditing ? 'Producto actualizado' : 'Producto creado')
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-card border border-gray-100/80">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        {isEditing ? 'Editar producto' : 'Nuevo producto'}
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          id="nombre"
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Empanadas de verde"
          required
        />
        <Input
          id="descripcion"
          label="Descripcion (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej: Pollo y queso"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="unidades"
            label="Unidades/bandeja"
            type="number"
            min="1"
            value={unidades}
            onChange={(e) => setUnidades(e.target.value)}
            placeholder="5"
            required
          />
          <Input
            id="precio"
            label="Precio ($)"
            type="number"
            min="0"
            step="0.01"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="1.75"
            required
          />
        </div>
        <Input
          id="orden"
          label="Orden de aparicion"
          type="number"
          min="0"
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          placeholder="0"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={loading} className="flex-1">
            {isEditing ? 'Guardar cambios' : 'Crear producto'}
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

interface ProductoRowProps {
  producto: Producto
  onEdit: (producto: Producto) => void
}

function ProductoRow({ producto, onEdit }: ProductoRowProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [toggling, setToggling] = useState(false)

  async function toggleActivo() {
    setToggling(true)
    await supabase
      .from('productos')
      .update({ activo: !producto.activo })
      .eq('id', producto.id)
    setToggling(false)
    router.refresh()
    toast(producto.activo ? 'Producto desactivado' : 'Producto activado')
  }

  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-card border border-gray-100/80 ${!producto.activo ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{producto.nombre}</h4>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                producto.activo
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/60'
                  : 'bg-gray-100 text-gray-500 ring-gray-200/60'
              }`}
            >
              {producto.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          {producto.descripcion && (
            <p className="mt-0.5 text-sm text-gray-500">
              {producto.descripcion}
            </p>
          )}
          <div className="mt-2 flex gap-4 text-sm text-gray-600">
            <span>{producto.unidades_por_bandeja} uds/bandeja</span>
            <span className="font-medium text-orange-600">
              {formatCurrency(producto.precio)}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => onEdit(producto)}>
          Editar
        </Button>
        <Button
          size="sm"
          variant={producto.activo ? 'danger' : 'secondary'}
          onClick={toggleActivo}
          loading={toggling}
        >
          {producto.activo ? 'Desactivar' : 'Activar'}
        </Button>
      </div>
    </div>
  )
}

interface ProductosListProps {
  productos: Producto[]
}

export function ProductosList({ productos }: ProductosListProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null)

  function handleEdit(producto: Producto) {
    setEditingProduct(producto)
    setShowForm(true)
  }

  function handleClose() {
    setShowForm(false)
    setEditingProduct(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Productos</h1>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            Agregar
          </Button>
        )}
      </div>

      {showForm && (
        <ProductoForm producto={editingProduct} onClose={handleClose} />
      )}

      {productos.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          No hay productos registrados.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {productos.map((producto) => (
            <ProductoRow
              key={producto.id}
              producto={producto}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}
