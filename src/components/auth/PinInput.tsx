'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { PIN_LENGTH } from '@/lib/constants'

interface PinInputProps {
  onComplete: (pin: string) => void
  disabled?: boolean
  error?: boolean
}

export function PinInput({
  onComplete,
  disabled = false,
  error = false,
}: PinInputProps) {
  const [values, setValues] = useState<string[]>(Array(PIN_LENGTH).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const focusInput = (index: number) => {
    if (index >= 0 && index < PIN_LENGTH) {
      inputRefs.current[index]?.focus()
    }
  }

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)

    const newValues = [...values]
    newValues[index] = digit
    setValues(newValues)

    if (digit && index < PIN_LENGTH - 1) {
      focusInput(index + 1)
    }

    if (digit && index === PIN_LENGTH - 1) {
      const pin = newValues.join('')
      if (pin.length === PIN_LENGTH) {
        onComplete(pin)
      }
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (values[index]) {
        const newValues = [...values]
        newValues[index] = ''
        setValues(newValues)
      } else if (index > 0) {
        focusInput(index - 1)
        const newValues = [...values]
        newValues[index - 1] = ''
        setValues(newValues)
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '')
    const digits = pastedData.slice(0, PIN_LENGTH).split('')

    const newValues = [...values]
    digits.forEach((digit, i) => {
      newValues[i] = digit
    })
    setValues(newValues)

    if (digits.length >= PIN_LENGTH) {
      onComplete(newValues.join(''))
    } else {
      focusInput(digits.length)
    }
  }

  return (
    <div className="flex justify-center gap-3">
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          className={cn(
            'h-14 w-14 rounded-2xl border-2 bg-gray-50/50 text-center text-2xl font-bold transition-all duration-150',
            'focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-red-400 bg-red-50/50'
              : value
                ? 'border-orange-400 bg-orange-50/50'
                : 'border-gray-200',
          )}
          autoComplete="off"
        />
      ))}
    </div>
  )
}
