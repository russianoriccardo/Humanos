import { useId } from 'react'
import { ChevronDown } from 'lucide-react'

type FieldOption = {
  label: string
  value: string
}

type FieldProps = {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'number' | 'select'
  suffix?: string
  options?: FieldOption[]
  inputMode?: 'text' | 'numeric' | 'decimal'
  enterKeyHint?: 'next' | 'done'
  // One inline line under the field; also marks the input invalid.
  error?: string
}

const inputStyles =
  'h-14 w-full rounded-[14px] border border-border bg-surface px-4 text-base text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'

export function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = 'text',
  suffix,
  options,
  inputMode,
  enterKeyHint,
  error,
}: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-medium tracking-wide text-muted uppercase">
        {label}
        {required && <span className="text-accent-text"> *</span>}
      </label>

      {type === 'select' ? (
        <div className="relative">
          <select
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={[inputStyles, 'appearance-none pr-10', value === '' ? 'text-muted' : ''].join(' ')}
          >
            <option value="" disabled hidden>
              {placeholder ?? 'Select'}
            </option>
            {options?.map((option) => (
              <option key={option.value} value={option.value} className="text-text">
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted"
          />
        </div>
      ) : (
        <div className="relative">
          <input
            id={id}
            type={type}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            inputMode={inputMode}
            enterKeyHint={enterKeyHint}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={[inputStyles, suffix ? 'pr-12' : '', error ? 'border-warning focus:border-warning focus:ring-warning' : ''].join(' ')}
          />
          {suffix && (
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted">
              {suffix}
            </span>
          )}
        </div>
      )}

      {error && (
        <p id={errorId} className="text-xs text-warning">
          {error}
        </p>
      )}
    </div>
  )
}
