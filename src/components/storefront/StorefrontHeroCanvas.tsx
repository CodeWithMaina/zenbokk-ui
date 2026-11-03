/**
 * The hero's fallback canvas.
 *
 * A business that has not uploaded a storefront background still gets a
 * finished hero rather than an empty panel. This draws the design's own
 * treatment — a warm dark field, a gold hairline horizon and a row of arches —
 * as inline SVG so every colour comes from the premium tokens and the panel
 * stays legible in both themes without shipping a second image asset.
 */
export function StorefrontHeroCanvas() {
  return (
    <svg
      className="sf-hero-canvas"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="1600" height="900" fill="var(--premium-bg)" />
      <circle cx="1130" cy="290" r="240" fill="var(--surface-raised)" opacity="0.55" />
      <g
        fill="none"
        stroke="var(--premium-gold)"
        strokeOpacity="0.3"
        strokeWidth="1.5"
      >
        <circle cx="1130" cy="290" r="278" />
        <path d="M0 786H1600" />
      </g>
      <g fill="var(--surface-raised)" fillOpacity="0.5">
        <path d="M820 900V540a75 75 0 0 1 150 0V900Z" />
        <path d="M990 900V400a75 75 0 0 1 150 0V900Z" />
        <path d="M1160 900V480a75 75 0 0 1 150 0V900Z" />
        <path d="M1330 900V330a75 75 0 0 1 150 0V900Z" />
      </g>
      <g
        fill="none"
        stroke="var(--premium-gold)"
        strokeOpacity="0.22"
        strokeWidth="1.5"
      >
        <path d="M834 900V554a61 61 0 0 1 122 0V900" />
        <path d="M1004 900V414a61 61 0 0 1 122 0V900" />
        <path d="M1174 900V494a61 61 0 0 1 122 0V900" />
        <path d="M1344 900V344a61 61 0 0 1 122 0V900" />
      </g>
      <circle cx="1130" cy="290" r="5" fill="var(--premium-gold)" />
    </svg>
  )
}
