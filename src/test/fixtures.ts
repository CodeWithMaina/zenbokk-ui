import type {
  EligibleStaff,
  ImageVariant,
  PublicBusinessProfile,
  PublicGallery,
  PublicLandingPage,
  PublicOpeningHours,
  ServiceCatalogItem,
  StorefrontBootstrap,
  StorefrontSearchResponse,
} from '../lib/api/types'

/**
 * Test fixtures.
 *
 * Every builder returns a complete, valid payload of the shape the backend
 * really sends, and takes overrides so a test states only the field it cares
 * about. Nothing here is "fake data standing in for a feature" — the fixtures
 * describe the wire contract, and the handlers that serve them are the same
 * routes the app calls in production.
 */

export const TEST_BUSINESS_ID = '11111111-1111-1111-1111-111111111111'
export const TEST_SLUG = 'nuru-studio'

export function variant(width: number, url = `https://cdn.example/${width}.webp`): ImageVariant {
  return { url, width, height: Math.round(width * 0.75), format: 'webp' }
}

export function makeBusinessProfile(
  overrides: Partial<PublicBusinessProfile> = {},
): PublicBusinessProfile {
  return {
    id: TEST_BUSINESS_ID,
    slug: TEST_SLUG,
    name: 'Nuru Studio',
    category: 'salon',
    location: 'Ngong Road, Nairobi',
    description: 'A calm studio for hair, nails and skin.',
    logoUrl: null,
    logoMediaId: null,
    logoVariants: [],
    coverMediaId: null,
    galleryMediaIds: [],
    phoneNumber: '+254712345678',
    email: 'hello@nurustudio.example',
    hasAppointments: true,
    hasLoyalty: false,
    hasReferralProgram: false,
    capabilities: {
      services: true,
      appointments: true,
      loyalty: false,
      rewards: false,
      referrals: false,
      payments: true,
      notifications: true,
      reviews: true,
      gallery: true,
      galleryReviews: true,
    },
    loyaltyProgram: null,
    ...overrides,
  }
}

export function makeLandingPage(overrides: Partial<PublicLandingPage> = {}): PublicLandingPage {
  return {
    businessId: TEST_BUSINESS_ID,
    heroTitle: 'Unhurried care, beautifully booked.',
    heroTagline: 'Hair, nails and skin on Ngong Road',
    heroDescription: 'Book a specialist in under a minute.',
    showLogo: true,
    heroBackgroundMediaId: null,
    heroBackgroundVariants: [],
    navigation: {
      services: true,
      booking: true,
      reviews: true,
      gallery: true,
      about: true,
      contact: true,
      loyalty: false,
      businessinfo: false,
    },
    sections: [
      { key: 'services', order: 0, title: 'Our services', description: null },
      { key: 'gallery', order: 1, title: null, description: null },
    ],
    primaryCta: { enabled: true, type: 'book', label: 'Book an appointment' },
    secondaryCta: { enabled: true, type: 'contact', label: 'Ask a question' },
    ...overrides,
  }
}

export function makeBootstrap(overrides: Partial<StorefrontBootstrap> = {}): StorefrontBootstrap {
  return {
    businessId: TEST_BUSINESS_ID,
    slug: TEST_SLUG,
    moved: false,
    business: makeBusinessProfile(),
    landingPage: makeLandingPage(),
    ...overrides,
  }
}

export function makeGallery(
  count = 2,
  overrides: Partial<PublicGallery> = {},
): PublicGallery {
  return {
    businessId: TEST_BUSINESS_ID,
    images: Array.from({ length: count }, (_, index) => ({
      mediaId: `2222222${index}-2222-2222-2222-222222222222`,
      caption: null,
      sortOrder: index,
      featured: index === 0,
      width: 1280,
      height: 960,
      variants: [variant(320), variant(640), variant(1280)],
    })),
    ...overrides,
  }
}

export function makeOpeningHours(
  overrides: Partial<PublicOpeningHours> = {},
): PublicOpeningHours {
  const day = (name: string, dayOfWeek: number, closed: boolean) => ({
    day: name,
    dayOfWeek,
    isClosed: closed,
    periods: closed
      ? []
      : [{ opensAt: '09:00', closesAt: '18:00', breakStartsAt: null, breakEndsAt: null }],
  })

  return {
    businessId: TEST_BUSINESS_ID,
    timeZoneId: 'Africa/Nairobi',
    hasStaffSchedule: true,
    days: [
      day('sunday', 0, true),
      day('monday', 1, false),
      day('tuesday', 2, false),
      day('wednesday', 3, false),
      day('thursday', 4, false),
      day('friday', 5, false),
      day('saturday', 6, false),
    ],
    specialHours: [],
    ...overrides,
  }
}

export function makeService(overrides: Partial<ServiceCatalogItem> = {}): ServiceCatalogItem {
  return {
    id: '33333333-3333-3333-3333-333333333333',
    businessId: TEST_BUSINESS_ID,
    businessName: 'Nuru Studio',
    name: 'Deluxe Fade',
    description: 'A clean, close fade.',
    durationMinutes: 45,
    price: 900,
    isActive: true,
    isArchived: false,
    status: 'active',
    showcase: true,
    categoryId: null,
    categoryName: 'Haircuts',
    categorySortOrder: 0,
    imageMediaId: null,
    imageStatus: null,
    imageVariants: [],
    images: [],
    createdAt: '2026-01-01T08:00:00Z',
    ...overrides,
  }
}

export function makeStaff(overrides: Partial<EligibleStaff> = {}): EligibleStaff {
  return {
    userId: '44444444-4444-4444-4444-444444444444',
    fullName: 'Zawadi Mwangi',
    avatarUrl: null,
    phoneNumber: null,
    serviceIds: [],
    positionName: 'Nail Artist',
    bio: null,
    specialities: null,
    yearsOfExperience: null,
    ...overrides,
  }
}

export function makeSearchResponse(
  overrides: Partial<StorefrontSearchResponse> = {},
): StorefrontSearchResponse {
  return {
    query: 'fade',
    type: 'all',
    items: [
      {
        type: 'service',
        id: '33333333-3333-3333-3333-333333333333',
        title: 'Deluxe Fade',
        subtitle: 'Haircuts',
        description: 'A clean, close fade.',
        categoryName: 'Haircuts',
        price: 900,
        durationMinutes: 45,
        imageVariants: [],
        avatarUrl: null,
        serviceIds: [],
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 12,
    totalPages: 1,
    categories: ['Haircuts', 'Beard'],
    ...overrides,
  }
}
