/**
 * Storefront building blocks.
 *
 * The home page is the hero alone; every other destination is a real page under
 * `./pages`, reached from the navigation. What appears in that navigation is
 * still the owner's landing-page configuration, filtered by the business's
 * capabilities — but each entry now resolves to a route rather than an anchor.
 */
export { StorefrontHome } from './StorefrontHome'
export { StorefrontHero } from './StorefrontHero'
export { StorefrontHeroCanvas } from './StorefrontHeroCanvas'
export { StorefrontNav } from './StorefrontNav'
export { StorefrontThemeToggle } from './StorefrontThemeToggle'
export { StorefrontPage, StorefrontPageUnavailable } from './StorefrontPage'
export type { StorefrontPageProps } from './StorefrontPage'
// export { StorefrontCallToAction } from './StorefrontCallToAction'
// export { StorefrontHowItWorks } from './StorefrontHowItWorks'
export { StorefrontEnquiryForm } from './StorefrontEnquiryForm'
export { StorefrontBookingTray } from './StorefrontBookingTray'
export { StorefrontPaymentPanel } from './StorefrontPaymentPanel'
export { StorefrontServiceCard } from './StorefrontServiceCard'
export { StorefrontTeamCard } from './StorefrontTeamCard'
export {
  StorefrontEmptyState,
  StorefrontErrorState,
  StorefrontSkeletonGrid,
} from './StorefrontStates'
export { StorefrontFilters } from './StorefrontFilters'
export { StorefrontSearchPage } from './StorefrontSearchPage'
export { StorefrontServiceDetail } from './StorefrontServiceDetail'
export { StorefrontTeamMemberDetail } from './StorefrontTeamMemberDetail'
export { StorefrontGallery } from './StorefrontGallery'
export { StorefrontOpeningHours } from './StorefrontOpeningHours'

// Pages
export { ServicesPage } from './pages/ServicesPage'
export { TeamPage } from './pages/TeamPage'
export { AboutPage } from './pages/AboutPage'
export { ContactPage } from './pages/ContactPage'
export { ReviewsPage } from './pages/ReviewsPage'
export { GalleryPage } from './pages/GalleryPage'
export { ServiceDetailPage } from './pages/ServiceDetailPage'
export type { ServiceDetailPageProps } from './pages/ServiceDetailPage'
export { TeamMemberPage } from './pages/TeamMemberPage'
export type { TeamMemberPageProps } from './pages/TeamMemberPage'


