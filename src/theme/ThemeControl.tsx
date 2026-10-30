import type { ReactNode } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '../lib/cn'
import type { ThemePreference } from './theme'
import { useTheme } from './useTheme'
import { SegmentedControl } from '../components/ui/segmented-control'

const options = [
  {
    value: 'light',
    label: 'Light',
    icon: <Sun className="size-[0.9rem]" aria-hidden="true" />,
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: <Moon className="size-[0.9rem]" aria-hidden="true" />,
  },
  {
    value: 'system',
    label: 'System',
    icon: <Monitor className="size-[0.9rem]" aria-hidden="true" />,
  },
] satisfies readonly {
  value: ThemePreference
  label: string
  icon: ReactNode
}[]

export type ThemeControlProps = {
  className?: string
}

/**
 * Three-way Light / Dark / System switch. Must be rendered under
 * `<ThemeProvider>`.
 */
export function ThemeControl({ className }: ThemeControlProps) {
  const { preference, setPreference } = useTheme()

  return (
    <SegmentedControl
      options={options}
      value={preference}
      onValueChange={setPreference}
      label="Theme"
      className={cn('[&>button]:flex-1', className)}
    />
  )
}
