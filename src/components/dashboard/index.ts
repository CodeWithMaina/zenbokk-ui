/**
 * Dashboard-only widgets.
 *
 * They are compositions of the shared primitives (`SectionCard`, `StatusPill`,
 * `Progress`, `SegmentedControl`) rather than a second design system: each one
 * exists because no existing component answers the same question, and they stay
 * here so the console's shared components keep one story.
 */
export { DashboardHero } from './DashboardHero'
export type { DashboardHeroProps, HeroStat } from './DashboardHero'

export { AttentionPanel } from './AttentionPanel'
export type { AttentionItem, AttentionPanelProps } from './AttentionPanel'

export { StatisticsPanel } from './StatisticsPanel'
export type { StatGroup, StatMetric, StatisticsPanelProps } from './StatisticsPanel'

export { SchedulePanel } from './SchedulePanel'
export type { SchedulePanelProps } from './SchedulePanel'

export { TeamPanel } from './TeamPanel'
export type { TeamPanelProps } from './TeamPanel'

export { ActivityPanel } from './ActivityPanel'
export type { ActivityEntry, ActivityPanelProps } from './ActivityPanel'

export { PerformersPanel } from './PerformersPanel'
export type { PerformerRow, PerformersPanelProps } from './PerformersPanel'

export { WebsitePreviewFrame, WebsitePreviewPanel } from './WebsitePreviewPanel'
