import { createClient } from '@/lib/supabase/server'
import { generateInternalEmail } from '@/lib/utils'
import { NextResponse } from 'next/server'

// POST /api/auth - Crear un vendedor en Supabase Auth
// Se usa cuando el admin crea un nuevo vendedor
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre, pin, vendedor_id } = body

    if (!nombre || !pin || !vendedor_id) {
      return NextResponse.json(
        { error: 'nombre, pin y vendedor_id son requeridos' },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    // Verificar que el usuario actual es admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: currentVendedor } = await supabase
      .from('vendedores')
      .select('rol')
      .eq('id', user.user_metadata.vendedor_id as string)
      .single()

    if (!currentVendedor || currentVendedor.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Solo el administrador puede crear vendedores' },
        { status: 403 },
      )
    }

    const email = generateInternalEmail(nombre)

    // Crear usuario en Supabase Auth con el admin client
    // NOTA: Para crear usuarios se necesita el service_role key
    // Por ahora usamos signUp con el anon key (funciona si no hay restricciones de email)
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password: pin,
      options: {
        data: {
          vendedor_id,
          nombre,
        },
      },
    })

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
