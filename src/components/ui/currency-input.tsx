import React, { forwardRef, useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface CurrencyInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> {
  value?: number
  onValueChange?: (value: number) => void
  defaultValue?: number
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, defaultValue, name, className, required, ...props }, ref) => {
    const [internalValue, setInternalValue] = useState<number>(value ?? defaultValue ?? 0)

    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value)
      }
    }, [value])

    const displayValue = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(internalValue)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value.replace(/\D/g, '')
      if (!raw) raw = '0'
      const numValue = parseInt(raw, 10) / 100
      if (value === undefined) {
        setInternalValue(numValue)
      }
      onValueChange?.(numValue)
    }

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
          R$
        </span>
        <Input
          {...props}
          ref={ref}
          type="text"
          className={cn('pl-9 font-medium', className)}
          value={displayValue}
          onChange={handleChange}
        />
        {name && <input type="hidden" name={name} value={internalValue} />}
      </div>
    )
  },
)
CurrencyInput.displayName = 'CurrencyInput'
