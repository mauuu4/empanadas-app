'use client'

import { useState } from 'react'
import Link from 'next/link'

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

interface MesFilterProps {
  currentYear: number
  currentMonth: number
  availableYears: number[]
}

export function MesFilter({
  currentYear,
  currentMonth,
  availableYears,
}: MesFilterProps) {
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <select
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value))}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
        >
          {MESES.map((m, i) => (
            <option key={i} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <Link
        href={`/historial/mes/${year}/${month}`}
        className="rounded-lg bg-orange-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-orange-600"
      >
        Ver resumen de {MESES[month - 1]} {year}
      </Link>
    </div>
  )
}
