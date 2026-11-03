import { Monitor, Moon, Sun } from 'lucide-react'
import { Menu } from '../ui/menu'
import type { MenuItem } from '../ui/menu'
import { useTheme } from '../../theme'

/**
 * Light / Dark / System, as a single icon button in the storefront header.
 *
 * This is the *visitor's* preference for how they read the page — the same
 * `ThemeProvider` and the same `zb-theme` storage key the dashboard uses, so the
 * choice is remembered across both and never flashes. It is deliberately not a
 * second theme system, and it is deliberately not the business's brand colour:
 * a business decides how its storefront looks, a visitor decides whether they
 * read it light or dark.
 *
 * Three items rather than a cycling button, because "System" is a real answer
 * that a toggle cannot express.
 */
export function StorefrontThemeToggle() {
  const { preference, setPreference } = useTheme()

  const items: MenuItem[] = [
    {
      label: 'Light',
      icon: <Sun className="size-4" />,
      onSelect: () => setPreference('light'),
    },
    {
      label: 'Dark',
      icon: <Moon className="size-4" />,
      onSelect: () => setPreference('dark'),
    },
    {
      label: 'System',
      icon: <Monitor className="size-4" />,
      onSelect: () => setPreference('system'),
    },
  ]

  const Icon = preference === 'dark' ? Moon : preference === 'light' ? Sun : Monitor

  return (
    <Menu
      items={items}
      label={`Appearance: ${preference}`}
      triggerLabel={`Appearance, currently ${preference}. Change theme`}
      align="end"
      triggerClassName="sf-icon-btn"
      trigger={<Icon className="size-[1.05rem]" aria-hidden="true" />}
    />
  )
}
