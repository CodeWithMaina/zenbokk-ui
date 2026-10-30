import { getInitials } from '../../lib/format'
import { cn } from '../../lib/cn'

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'
export type AvatarTint = 1 | 2 | 3

const sizeClass: Record<AvatarSize, string> = {
  sm: 'size-[2.2rem] text-[0.8rem]',
  md: 'size-[2.9rem] text-body',
  lg: 'size-[4rem] text-[1.4rem]',
  xl: 'size-[4.4rem] text-metric',
}

export type AvatarProps = {
  name?: string
  /** Override the generated initials. */
  initials?: string
  tint?: AvatarTint
  size?: AvatarSize
  shape?: 'circle' | 'square'
  src?: string
  alt?: string
  /** Hide the avatar from assistive technology when the name is repeated. */
  decorative?: boolean
  className?: string
}

/** Tinted initials avatar, with an optional photo. */
export function Avatar({
  name = '',
  initials,
  tint = 1,
  size = 'md',
  shape = 'circle',
  src,
  alt,
  decorative = false,
  className,
}: AvatarProps) {
  const label = name || initials || 'Avatar'
  const shapeClass = shape === 'square' ? 'rounded-card' : ''

  return (
    <span
      className={cn('avatar overflow-hidden', sizeClass[size], shapeClass, className)}
      data-tint={tint}
      role={decorative || src ? undefined : 'img'}
      aria-label={decorative || src ? undefined : label}
      aria-hidden={decorative || undefined}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? (decorative ? '' : label)}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initials ?? getInitials(name)}</span>
      )}
    </span>
  )
}
