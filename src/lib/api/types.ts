/**
 * Wire types for the Punched API (`/v1/*`).
 *
 * Property names mirror the backend `[JsonPropertyName]` values exactly, so no
 * transformation layer is needed. Every response is wrapped in the
 * `ApiResponse<T>` envelope defined in `Application/DTOs/ApiResponse.cs`.
 */

export type ApiErrorPayload = {
  code: string
  message: string
}

/** `{ success, data, error }` — the single shape every endpoint returns. */
export type ApiEnvelope<T> = {
  success: boolean
  data: T | null
  error: ApiErrorPayload | null
}

/** `Domain/Entities/UserRole.cs`, serialised as a string. */
export type UserRole = 'Customer' | 'Business' | 'Staff' | 'Admin'

export type PaginatedResponse<T> = {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export type PaginationMeta = {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export type MessageResponse = {
  message: string
}

// ─────────────────────────────────────────────────────────────
//  Auth
// ─────────────────────────────────────────────────────────────

export type UserProfile = {
  id: string
  email: string
  phone: string | null
  fullName: string
  avatarUrl: string | null
  avatarMediaId: string | null
  dateOfBirth: string | null
  gender: string | null
  role: UserRole
  createdAt: string
}

export type AuthResponse = {
  accessToken: string
  refreshToken: string
  /** Lifetime of the access token, in seconds. */
  expiresIn: number
  user: UserProfile
}

export type TokenResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export type LoginRequest = {
  email: string
  password: string
  /** Tenant hint — the server re-resolves and verifies membership. */
  businessSlug?: string | null
}

export type RegisterRequest = {
  email: string
  password: string
  fullName: string
  /** Defaults to `Customer` server-side; the storefront never sends anything else. */
  role?: UserRole
  sourceProvider?: string | null
  sourceCampaign?: string | null
  /** Tenant the sign-up happened on; server-verified before membership is written. */
  businessSlug?: string | null
}

export type RegisterResponse = MessageResponse

/**
 * `PATCH /v1/users/profile` — the profile fields a signed-in user may edit.
 *
 * Public registration collects only email, password and full name, so anything
 * else (a phone number, for instance) is written here after the account exists.
 */
export type UpdateProfileRequest = {
  fullName?: string | null
  phoneNumber?: string | null
  avatarUrl?: string | null
  dateOfBirth?: string | null
  gender?: string | null
}

export type VerifyEmailRequest = {
  email: string
  code: string
  businessSlug?: string | null
}

export type RequestEmailVerification = {
  email: string
}

export type ForgotPasswordRequest = {
  email: string
}

export type ResetPasswordRequest = {
  email: string
  code: string
  newPassword: string
}

export type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
}

export type RefreshTokenRequest = {
  refreshToken?: string | null
  businessSlug?: string | null
}


// ─────────────────────────────────────────────────────────────
//  Media + business (public)
// ─────────────────────────────────────────────────────────────

export type ImageVariant = {
  url: string
  width: number
  height: number
  format: string
}

/** Every customer capability key; always present, `false` when unavailable. */
export type CustomerCapabilities = Record<string, boolean>

/** Active loyalty programme summary sent with the public business profile. */
export type PublicLoyaltyProgramSummary = {
  name: string
  stampsRequired: number
  rewardDescription: string
  defaultEnrollmentStamps: number
}

export type PublicBusinessProfile = {
  id: string
  slug: string | null
  name: string
  category: string
  location: string
  description: string | null
  logoUrl: string | null
  logoMediaId: string | null
  logoVariants: ImageVariant[]
  coverMediaId: string | null
  galleryMediaIds: string[]
  phoneNumber: string | null
  email: string | null
  hasAppointments: boolean
  hasLoyalty: boolean
  hasReferralProgram: boolean
  capabilities: CustomerCapabilities
  /** Null when loyalty is disabled or no programme is active. */
  loyaltyProgram: PublicLoyaltyProgramSummary | null
}

export type LandingPageCta = {
  enabled: boolean
  /** `book` | `loyalty` | `contact` | … (presentation only). */
  type: string
  label: string
}

export type PublicLandingPageSection = {
  key: string
  order: number
  title: string | null
  description: string | null
}

export type PublicLandingPage = {
  businessId: string
  heroTitle: string
  heroTagline: string
  heroDescription: string | null
  showLogo: boolean
  heroBackgroundMediaId: string | null
  heroBackgroundVariants: ImageVariant[]
  navigation: Record<string, boolean>
  sections: PublicLandingPageSection[]
  primaryCta: LandingPageCta
  secondaryCta: LandingPageCta
  /**
   * The rich Storefront Builder projection when the business has published one.
   * Null/absent for businesses still on the legacy simple landing page, in which
   * case the flat fields above remain the source of truth for the renderer.
   */
  storefront?: PublicStorefront | null
}

export type StorefrontBootstrap = {
  businessId: string
  slug: string
  /** True when the requested slug was superseded — redirect to `slug`. */
  moved: boolean
  business: PublicBusinessProfile
  landingPage: PublicLandingPage
}

// ─────────────────────────────────────────────────────────────
//  Services + staff (public)
// ─────────────────────────────────────────────────────────────

export type ServiceCatalogItem = {
  id: string
  businessId: string
  businessName: string | null
  name: string
  description: string | null
  durationMinutes: number
  price: number
  isActive: boolean
  /** Filed away by the business; never bookable and never public. */
  isArchived: boolean
  /** `active | paused | archived`, derived server-side from the two flags. */
  status: string
  showcase: boolean
  categoryId: string | null
  categoryName: string | null
  categorySortOrder: number | null
  /** The cover image's media id (index 0 of `images`). */
  imageMediaId: string | null
  imageStatus: string | null
  imageVariants: ImageVariant[]
  /** Every image, in gallery order; index 0 is the cover. */
  images: ServiceImage[]
  createdAt: string
}

/**
 * One image attached to a service. `displayOrder` is the gallery position and
 * `isCover` is true for the single image at order 0.
 */
export type ServiceImage = {
  id: string
  mediaId: string
  url: string | null
  status: string
  width: number | null
  height: number | null
  displayOrder: number
  isCover: boolean
  variants: ImageVariant[]
}

/** `PUT /v1/services/me/{id}/images` — array order IS the gallery order. */
export type SetServiceImagesRequest = {
  mediaIds: string[]
}

export type EligibleStaff = {
  userId: string
  fullName: string
  avatarUrl: string | null
  phoneNumber: string | null
  /**
   * The services this member is assigned to within the business, restricted to
   * the publicly visible ones. This is what lets the storefront show "who does
   * what" and offer a specialist without one request per service.
   */
  serviceIds: string[]
  /**
   * The member's business-assigned job title ("Senior Stylist", "Master
   * Barber"), or null when the business has not set one. Purely descriptive —
   * a position grants no permission and no eligibility.
   */
  positionName: string | null
  /**
   * The business's short biography for this member. Null when it has not
   * written one — the profile page then omits the section rather than
   * inventing a paragraph.
   */
  bio: string | null
  /**
   * What the member is known for, as free text ("Balayage, Curly cuts").
   * Null when the business has not stated any.
   */
  specialities: string | null
  /**
   * Whole years of professional experience as the business states it. Null
   * when not stated — distinct from `0`, which is a real answer.
   */
  yearsOfExperience: number | null
}

/**
 * `POST /v1/businesses/{businessId}/enquiries` — an anonymous storefront
 * enquiry. The business decides what it does with it; the platform records it
 * as a notification for the owner and returns the reference to quote.
 */
export type StorefrontEnquiryRequest = {
  /** One of `services | event | booking | other`. */
  topic: string
  /** The visitor's answers, in the order they were given. */
  answers: string[]
  name: string
  phoneNumber: string
  message: string | null
}

export type StorefrontEnquiryResponse = {
  reference: string
  businessName: string
  receivedAt: string
}

// ─────────────────────────────────────────────────────────────
//  Reviews (public)
// ─────────────────────────────────────────────────────────────

export type ReviewImageVariant = {
  url: string
  width: number
  height: number
  format: string
}

export type ReviewImageMedia = {
  mediaId: string
  variants: ReviewImageVariant[]
}

/**
 * `GET /v1/reviews/businesses/{businessId}/reviews` — published reviews only.
 * The server strips customer and appointment identifiers, so a review carries a
 * display name and nothing that identifies the person behind it.
 */
export type PublicReview = {
  id: string
  businessId: string
  rating: number
  comment: string | null
  reviewerDisplayName: string | null
  reviewerAvatar: string | null
  reviewerAvatarMediaId: string | null
  imageMediaIds: string[]
  imageMedia: ReviewImageMedia[]
  createdAt: string
  updatedAt: string
}

/** `GET …/reviews/summary`. `ratingCounts` is keyed by rating ("1"…"5"). */
export type ReviewSummary = {
  businessId: string
  averageRating: number
  totalCount: number
  ratingCounts: Record<string, number>
}

// ─────────────────────────────────────────────────────────────
//  Availability
// ─────────────────────────────────────────────────────────────

export type SlotStatus = 'available' | 'booked' | 'off_duty' | 'past'

export type AvailabilityStaffRef = {
  staffUserId: string
  staffName: string
  avatarUrl: string | null
}

export type AvailabilitySlot = {
  startAtUtc: string
  endAtUtc: string
  staffUserId: string | null
  staffName: string
  serviceIds: string[]
  status: SlotStatus | string
  isAvailable: boolean
  /** Business-local date, `yyyy-MM-dd`. */
  localDate: string
  /** Business-local start time, `HH:mm`. */
  localTime: string
  /** `morning` | `afternoon` | `evening`, business-local. */
  dayPart: string
  /** Other staff free at this exact time — enables an instant swap. */
  alternativeStaff: AvailabilityStaffRef[]
}

export type StaffAvailabilitySuggestion = AvailabilityStaffRef & {
  availableSlotCount: number
  nextAvailableUtc: string | null
  nextAvailableLocalTime: string | null
}

export type DayAvailability = {
  date: string
  weekday: string
  dayOfMonth: number
  isOpen: boolean
  totalSlots: number
  availableSlots: number
  firstAvailableUtc: string | null
  slots: AvailabilitySlot[]
  suggestions: StaffAvailabilitySuggestion[]
}

export type AvailabilityCalendar = {
  businessId: string
  businessName: string
  timeZoneId: string
  serviceIds: string[]
  totalDurationMinutes: number
  slotIntervalMinutes: number
  leadTimeMinutes: number
  staffUserId: string | null
  staffName: string | null
  days: DayAvailability[]
  noticeCode: string | null
  notice: string | null
}

// ─────────────────────────────────────────────────────────────
//  Appointments
// ─────────────────────────────────────────────────────────────

export type AppointmentServiceSnapshot = {
  serviceCatalogItemId: string
  name: string
  durationMinutes: number
  price: number
  sortOrder: number
}

export type Appointment = {
  id: string
  businessId: string
  customerId: string
  staffUserId: string | null
  scheduledAt: string
  endAt: string
  status: string
  services: AppointmentServiceSnapshot[]
  createdAt: string
  updatedAt: string
  pendingReschedule: {
    id: string
    proposedScheduledAt: string
    proposedEndAt: string
    proposedStaffUserId: string | null
    proposedServices: AppointmentServiceSnapshot[]
    requestedAt: string
  } | null
  reminderOptOut: boolean
  /** The business's working note for the booking; null when none is written. */
  note: string | null
}

export type CreateAppointmentRequest = {
  businessId: string
  serviceIds: string[]
  staffUserId?: string | null
  scheduledAt: string
  note?: string | null
}

/** POST /v1/appointments/{id}/cancel and the owner/staff cancel routes. */
export type CancelAppointmentRequest = {
  note?: string | null
}

/** `GET /v1/payments/appointment/{id}` — server-computed payment summary. */
export type AppointmentPayment = {
  id: string
  type: string
  method: string
  provider: string
  status: string
  amount: number
  currency: string
  reference: string
  createdAt: string
  completedAt: string | null
}

export type AppointmentPaymentSummary = {
  appointmentId: string
  serviceTotal: number
  /** What the business asks for up front, from its configured booking-fee percentage. */
  bookingFee: number
  /** The configured percentage `bookingFee` was computed from. */
  bookingFeePercentage: number
  amountPaid: number
  balance: number
  /** `unpaid` | `partially_paid` | `paid`. */
  paymentStatus: string
  /** `none` | `pending` | `awaiting_verification` | `verified` | `rejected`. */
  verificationStatus: string
  payments: AppointmentPayment[]
}

/**
 * `POST /v1/businesses/me/appointments` — the owner books on a customer's
 * behalf. `customerId` is required (the customer must already be enrolled), and
 * `businessId` is the caller's own business, resolved from the dashboard
 * context rather than hardcoded.
 */
export type CreateAppointmentOnBehalfRequest = {
  businessId: string
  serviceIds: string[]
  staffUserId?: string | null
  scheduledAt: string
  customerId: string
  note?: string | null
}

/** Customer and owner reschedule routes. Only `scheduledAt` is required. */
export type RescheduleAppointmentRequest = {
  scheduledAt: string
  serviceIds?: string[] | null
  staffUserId?: string | null
  note?: string | null
}

// ─────────────────────────────────────────────────────────────
//  Owner / staff console
// ─────────────────────────────────────────────────────────────

export type AppointmentDashboardItem = {
  id: string
  businessId: string
  scheduledAt: string
  endAt: string
  status: string
  serviceId: string
  serviceName: string
  customerId: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  staffUserId: string | null
  staffName: string | null
  staffEmail: string | null
  createdAt: string
  updatedAt: string
}

export type CustomerDashboardItem = {
  userId: string
  fullName: string
  email: string
  phoneNumber: string | null
  enrolledAt: string
  status: string
  totalStamps: number
  lastStampAt: string | null
}

export type StaffDashboardItem = {
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  phoneNumber: string | null
}

export type ServiceDashboardItem = {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  price: number
  isActive: boolean
  showcase: boolean
}

export type AppointmentDashboard = {
  meta: PaginationMeta
  appointments: AppointmentDashboardItem[]
  customers: CustomerDashboardItem[]
  staff: StaffDashboardItem[]
  services: ServiceDashboardItem[]
}

// ─────────────────────────────────────────────────────────────
//  Staff (owner view)
// ─────────────────────────────────────────────────────────────

export type StaffMember = {
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  stampsIssued: number
  dailyGoalOverride: number | null
  dailyGoal: number | null
  dailyGoalType: string
  appointmentDailyGoalOverride: number | null
  appointmentDailyGoal: number | null
  appointmentsToday: number
  stampsToday?: number
  lastActiveAt?: string | null
  status?: string
  /** Trailing-window counters the roster reports alongside today's. */
  appointmentsLast7d?: number
  stampsLast7d?: number
  /** `lastActivityAt` is the staff list's own name for the same timestamp. */
  lastActivityAt?: string | null
  positionId?: string | null
  positionName?: string | null
  positionIsActive?: boolean | null
  /** `Active` | `Suspended` — the roster keeps deactivated members visible. */
  membershipStatus?: string
}

export type StaffListResponse = {
  items: StaffMember[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type StaffOverview = {
  totalStaff: number
  activeStaff7d: number
  inactiveStaff: number
  pendingInvitations: number
  stampsToday: number
  stampsThisWeek: number
  goalsMetToday: number
  staffWithGoals: number
  topPerformers: StaffMember[]
  needsAttention: StaffMember[]
  recentlyActive: StaffMember[]
}

// ─────────────────────────────────────────────────────────────
//  Staff management (one member)
// ─────────────────────────────────────────────────────────────

/** A job title (position). Descriptive only — it grants nothing. */
export type StaffPosition = {
  id: string
  businessId: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  assignedStaffCount: number
  createdAt: string
  updatedAt: string
}

/** One service a staff member is assigned to deliver. */
export type StaffServiceLink = {
  serviceId: string
  name: string
  categoryId: string | null
  categoryName: string | null
  durationMinutes: number
  price: number | null
  isActive: boolean
  showcase: boolean
}

/** One weekday of the recurring working week. `dayOfWeek` is 0 = Sunday. */
export type StaffAvailabilityDay = {
  dayOfWeek: number
  dayName: string
  isWorking: boolean
  startMinute: number
  endMinute: number
  breakStartMinute: number | null
  breakEndMinute: number | null
}

/** A dated exception to the recurring week (a day off, or a one-off change). */
export type StaffTimeOff = {
  date: string
  isWorking: boolean
  startMinute: number
  endMinute: number
  reason: string | null
}

/**
 * `GET /v1/businesses/me/staff/{id}` — the member's management profile.
 *
 * Per-visit data (bookings, attendance events, commission ledger) is served by
 * the module that owns it, so this payload stays a stable description of the
 * person and their employment.
 */
export type StaffDetail = {
  userId: string
  fullName: string
  email: string
  phoneNumber: string | null
  avatarUrl: string | null
  avatarMediaId: string | null

  /** `Active` | `Invited` | `Suspended` | `Left`. */
  membershipStatus: string
  isActive: boolean
  joinedAt: string
  endedAt: string | null

  positionId: string | null
  positionName: string | null

  bio: string | null
  /** What the member is known for, comma-separated. Null when not stated. */
  specialities: string | null
  /** Whole years of experience. Null when not stated (distinct from 0). */
  yearsOfExperience: number | null
  isPublic: boolean
  isBookable: boolean

  dailyGoalOverride: number | null
  appointmentDailyGoalOverride: number | null
  dailyGoal: number | null
  appointmentDailyGoal: number | null
  dailyGoalType: string

  stampsIssued: number
  stampsToday: number
  stampsLast7d: number
  appointmentsToday: number
  appointmentsLast7d: number
  lastActivityAt: string | null

  services: StaffServiceLink[]
  availability: StaffAvailabilityDay[]
  /** `pattern` | `roster` | `business` — where the working week comes from. */
  availabilitySource: string
  timeOff: StaffTimeOff[]

  bookingOpenMinute: number
  bookingCloseMinute: number
  timeZoneId: string | null
}

/**
 * Partial update. An omitted field is never touched, so two screens editing
 * different parts of the same profile cannot overwrite each other. Email is
 * absent by design: it is the sign-in identity.
 */
export type UpdateStaffRequest = {
  fullName?: string
  phoneNumber?: string
  bio?: string
  /** Free text; an empty string clears it. */
  specialities?: string
  /** Whole years (0–80); omit to leave untouched. */
  yearsOfExperience?: number | null
  /** Explicitly clear the stated experience rather than leaving it untouched. */
  clearYearsOfExperience?: boolean
  isPublic?: boolean
  isBookable?: boolean
  positionId?: string | null
  clearPosition?: boolean
  dailyGoalOverride?: number | null
  appointmentDailyGoalOverride?: number | null
  clearDailyGoalOverride?: boolean
  clearAppointmentDailyGoalOverride?: boolean
  avatarMediaId?: string | null
}

export type StaffStatusResponse = {
  userId: string
  membershipStatus: string
  isActive: boolean
  endedAt: string | null
  message: string
}

export type SetStaffServicesRequest = {
  serviceIds: string[]
}

export type StaffAvailabilityDayInput = {
  dayOfWeek: number
  isWorking: boolean
  startMinute: number
  endMinute: number
  breakStartMinute?: number | null
  breakEndMinute?: number | null
}

export type SetStaffAvailabilityRequest = {
  days: StaffAvailabilityDayInput[]
}

export type AddStaffTimeOffRequest = {
  from: string
  to: string
  reason?: string | null
}


// ─────────────────────────────────────────────────────────────
//  Attendance (owner view)
// ─────────────────────────────────────────────────────────────

/** One member's clock state for a single day. */
export type AttendanceOverviewStaffItem = {
  staffUserId: string
  fullName: string
  avatarUrl: string | null
  /** `not_clocked_in` | `clocked_in` | `clocked_out`. */
  state: string
  openedAt: string | null
  closedAt: string | null
  workedMinutes: number | null
  locationName: string | null
}

export type AttendanceOverview = {
  date: string
  totalStaffCount: number
  clockedInCount: number
  completedShiftCount: number
  notClockedInCount: number
  totalWorkedMinutes: number
  staff: AttendanceOverviewStaffItem[]
}

/** One clock event in a member's history. */
export type AttendanceHistoryItem = {
  id: string
  /** `CLOCK_IN` | `CLOCK_OUT`. */
  eventType: string
  occurredAt: string
  locationId: string | null
  locationName: string | null
  sessionId: string | null
  workedMinutes: number | null
  inProgress: boolean
}

/** A manually recorded clock event for one member. */
export type OwnerAttendanceClockRequest = {
  locationId?: string | null
  note?: string | null
}

export type OwnerAttendanceClockResponse = {
  staffUserId: string
  state: string
  eventType: string
  occurredAt: string
  locationId: string | null
  locationName: string | null
  openedAt: string | null
  workedMinutes: number | null
}

// ─────────────────────────────────────────────────────────────
//  Commission (owner view)
// ─────────────────────────────────────────────────────────────

/** Amounts owed to (or held from) one member. */
export type CommissionStaffBalance = {
  staffUserId: string
  staffName: string | null
  currency: string
  pendingAmount: number
  approvedAmount: number
  payableAmount: number
  paidAmount: number
  disputedAmount: number
  reversedAmount: number
  outstandingAmount: number
  lifetimeEarnedAmount: number
}

// ─────────────────────────────────────────────────────────────
//  Customers (owner view)
// ─────────────────────────────────────────────────────────────

/**
 * One roster row from `GET /v1/businesses/me/customers`.
 *
 * The roster is anchored on the persisted Customer ↔ Business enrollment, so a
 * customer who is enrolled but has no loyalty card yet still appears (`cardId`
 * null, stamp counters at zero).
 */
export type BusinessCustomer = {
  userId: string
  fullName: string
  email: string
  phoneNumber: string | null
  dateOfBirth: string | null
  gender: string | null
  avatarUrl: string | null
  cardId: string | null
  /** Persisted enrollment status: `active` | `left` | `blocked`. */
  enrollmentStatus: string
  totalStamps: number
  lifetimeStamps: number
  totalRedemptions: number
  enrolledAt: string
  /** Last stamp on this business's card; null when the customer never stamped. */
  lastStampAt: string | null
  /** Effective reward threshold for this customer's card; null without a card. */
  stampsRequired: number | null
}

export type CustomerOverview = {
  totalCustomers: number
  active7d: number
  rewardReady: number
  newThisWeek: number
  atRisk: number
  stampsThisWeek: number
  topCustomers: BusinessCustomer[]
  soonToReward: BusinessCustomer[]
  recentlyActive?: BusinessCustomer[]
}

/**
 * `GET /v1/businesses/me/customers/{id}/details` — one aggregated request for
 * the details Overview shell: identity + status + metrics + loyalty summary.
 * Appointments and activity stay on their own paginated endpoints.
 */
export type CustomerDetailsCustomerBlock = {
  userId: string
  fullName: string
  email: string
  phoneNumber: string | null
  dateOfBirth: string | null
  gender: string | null
  avatarUrl: string | null
  enrolledAt: string
  lastStampAt: string | null
}

export type CustomerDetailsStatusBlock = {
  /** `active` | `left` | `blocked`. */
  enrollmentStatus: string
  hasLoyaltyCard: boolean
}

export type CustomerDetailsMetricsBlock = {
  stampsIn7d: number
  visitsIn7d: number
  lifetimeStamps: number
  totalRedemptions: number
  totalVisits: number
  lastVisitAt: string | null
}

/** The customer's single loyalty card for this business, with its design. */
export type CustomerDetailsLoyaltySummary = {
  cardId: string
  programId: string
  programName: string
  totalStamps: number
  stampsRequired: number
  rewardDescription: string
  rewardReady: boolean
  cardDesignId: string | null
  cardDesignName: string | null
  cardDesignIsDefault: boolean
  /** Server-rendered card markup. Never injected into the DOM as HTML. */
  cardDesignHtml: string | null
  rewardValue: number
  rewardExpirationHours: number
}

export type CustomerDetailsResponse = {
  customer: CustomerDetailsCustomerBlock
  status: CustomerDetailsStatusBlock
  metrics: CustomerDetailsMetricsBlock
  loyalty: CustomerDetailsLoyaltySummary | null
  serverMs: number
}

/** `GET …/customers/{id}/activity` — one stamp or redemption row. */
export type CustomerActivityItem = {
  activityId: string
  /** `stamp` | `redemption`. */
  activityType: string
  stampNumber: number
  rewardValue: number | null
  /** Actor for the action; null when the customer acted alone. */
  staffName: string | null
  timestamp: string
}

export type CustomerActivityFeedResponse = {
  customerId: string
  customerName: string
  items: CustomerActivityItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** `GET …/customers/{id}/stats?period=today|7d|30d|all`. */
export type CustomerPeriodStats = {
  period: string
  stampsInPeriod: number
  visitsInPeriod: number
  lastVisitInPeriod: string | null
}

// ─────────────────────────────────────────────────────────────
//  Loyalty stamping (manual adjustment + ledger)
// ─────────────────────────────────────────────────────────────

/** `Domain/Entities/StampAdjustmentReason.cs`, serialised as a string. */
export type StampAdjustmentReason =
  | 'VoidMistake'
  | 'ManualCorrection'
  | 'Goodwill'
  | 'SystemFix'

/** `POST /v1/stamps/adjust` — owner-only correction with a reason code. */
export type StampAdjustmentRequest = {
  cardId: string
  /** Non-zero, positive or negative delta. */
  delta: number
  reason: StampAdjustmentReason
  note?: string | null
}

export type StampAdjustmentResponse = {
  cardId: string
  totalStampsBefore: number
  totalStampsAfter: number
  delta: number
  customerName: string
  stampsRequired: number
  rewardReady: boolean
  adjustedAt: string
}

/** `POST /v1/loyalty/stamps/manual` — ledger-backed manual award/correction. */
export type ManualStampRequest = {
  cardId: string
  /** Non-zero; negative records a correction. */
  amount: number
  /** Required by the API for every manual action; max 500 chars. */
  reason: string
}

/** One append-only ledger entry (`stamp_transactions`). */
export type StampTransaction = {
  id: string
  businessId: string
  programId: string
  programName: string
  cardId: string
  customerId: string
  customerName: string | null
  /** Always positive; the sign lives in `signedAmount` / `direction`. */
  amount: number
  /** `Credit` | `Debit`. */
  direction: string
  /** Signed balance effect (+credit / −debit). */
  signedAmount: number
  /** APPOINTMENT | SCAN | SERVICE | REFERRAL | MANUAL | ENROLLMENT | REDEMPTION | ADJUSTMENT. */
  source: string
  sourceId: string | null
  earningRuleId: string | null
  isAutomatic: boolean
  reason: string | null
  createdByUserId: string | null
  createdByName: string | null
  createdByRole: string | null
  createdAt: string
}

export type ManualStampResponse = {
  cardId: string
  customerId: string
  amount: number
  totalStamps: number
  stampsRequired: number
  transaction: StampTransaction
  unlockedReward: { id: string; rewardName: string } | null
}

/** `GET /v1/loyalty/stamps/activity` — the business's loyalty audit log. */
export type LoyaltyActivityPage = {
  items: StampTransaction[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

// ─────────────────────────────────────────────────────────────
//  Dashboard bootstrap (owner/staff shell)
// ─────────────────────────────────────────────────────────────

export type DashboardBusiness = {
  id: string
  name: string
  category: string | null
  location: string | null
  description: string | null
  logoUrl: string | null
  phoneNumber: string | null
  email: string | null
  slug: string
  hasLoyaltyProgram: boolean
  hasReferralProgram: boolean
}

export type CallerPlanInfo = {
  key: string
  name: string
  status: string
  endsAt: string | null
}

/**
 * `GET /v1/me/modules` — the caller's effective modules and permissions,
 * resolved server-side against the business the request was made in.
 *
 * This is the role-agnostic bootstrap primitive: an owner, a staff member, a
 * customer and a platform administrator all get an answer (admins get the full
 * catalog, customers get the customer-facing read modules). The navigation is
 * built from this payload — never from a hardcoded list in the client.
 */
export type MyModules = {
  /** Explicitly entitled module keys (nav list — no dependency closure). */
  entitlements: string[]
  /** Permission codes granted to the caller's role, filtered to entitled modules. */
  permissions: string[]
  /** The business's current plan (null for Admin/Customer). */
  plan: CallerPlanInfo | null
}

export type DashboardBootstrap = {
  business: DashboardBusiness
  /** Effective module keys (plan + purchases + trials + overrides). */
  entitlements: string[]
  permissions: string[]
  plan: CallerPlanInfo | null
  navigation: {
    tabs: string[]
    enabledModules: string[]
    permissions: string[]
  }
  settings: {
    reminderPolicyEnabled: boolean
    reminderOffsetMinutes: number[] | null
    reminderChannels: string[] | null
  }
}

// ─────────────────────────────────────────────────────────────
//  Service writes (owner)
// ─────────────────────────────────────────────────────────────

export type CreateServiceRequest = {
  name: string
  description?: string | null
  durationMinutes: number
  price: number
  showcase?: boolean
  categoryId?: string | null
}

export type UpdateServiceRequest = Partial<CreateServiceRequest> & {
  isActive?: boolean
  /** Archiving also deactivates; clearing it restores the service to active. */
  isArchived?: boolean
  clearCategory?: boolean
}

export type StaffInvitation = {
  id: string
  businessId: string
  email: string
  /** Server-side enum value; use `statusLabel` for display. */
  status: number
  statusLabel: string
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
  revokedAt: string | null
  resendCount: number
  isExpired: boolean
}

export type UpdateBusinessRequest = {
  name?: string
  category?: string | null
  location?: string | null
  phoneNumber?: string | null
  email?: string | null
  description?: string | null
  logoUrl?: string | null
  mpesaNumber?: string | null
}

/**
 * `GET /v1/businesses/me/associated` (Customer role) — the businesses a
 * customer is attached to, and which relationship attaches them.
 *
 * The payload carries no slug, so a client that wants to *open* one of these
 * businesses has to resolve the address through `GET /v1/businesses/{id}`.
 */
export type CustomerAssociatedBusiness = {
  id: string
  name: string
  logoUrl: string | null
  category: string | null
  location: string | null
  viaCard: boolean
  viaAppointment: boolean
  viaReferral: boolean
  viaEnrollment: boolean
}

// ─────────────────────────────────────────────────────────────
//  Admin
// ─────────────────────────────────────────────────────────────

export type AdminDashboard = {
  totalCustomers: number
  totalBusinesses: number
  totalStaff: number
  totalStamps: number
  totalRedemptions: number
  totalCards: number
  totalReferrals: number
  newCustomersToday: number
  newBusinessesToday: number
  stampsToday: number
  redemptionsToday: number
  newCustomers7d: number
  newBusinesses7d: number
  stamps7d: number
  redemptions7d: number
  churnedBusinesses: number
}

// ─────────────────────────────────────────────────────────────
//  Owner dashboard stats (analytics module)
// ─────────────────────────────────────────────────────────────

export type StaffMini = {
  userId: string
  fullName: string
  avatarUrl: string | null
}

export type BusinessDashboard = {
  businessId: string
  businessName: string
  activeCards: number
  totalStampsIssued: number
  stampsToday: number
  totalRedemptions: number
  rewardReadyCards: number
  staffMini: StaffMini[]
}

// ─────────────────────────────────────────────────────────────
//  Business provisioning (owner onboarding)
// ─────────────────────────────────────────────────────────────

export type CreateBusinessRequest = {
  name: string
  category: string
  location: string
  phoneNumber?: string | null
  email?: string | null
  description?: string | null
  logoUrl?: string | null
  mpesaNumber?: string
}

/** `GET/POST /v1/businesses` — the owner's persisted business record. */
export type BusinessResponse = {
  id: string
  slug: string | null
  name: string
  category: string
  location: string
  phoneNumber: string | null
  email: string | null
  description: string | null
  logoUrl: string | null
  logoMediaId: string | null
  coverMediaId: string | null
  galleryMediaIds: string[]
  ownerId: string | null
  /** Business-level default stamp goal for staff (null = not configured). */
  defaultDailyGoal: number | null
  /** Which metric the daily goal tracks: `stamps` | `appointments`. */
  dailyGoalType: string
  /** Business-level default appointment goal. */
  defaultAppointmentDailyGoal: number | null
  hasReferralProgram: boolean
  createdAt: string
  /** Absent (null) means platform reminder defaults apply. */
  reminderPolicy: BusinessReminderPolicy | null
}

// ─────────────────────────────────────────────────────────────
//  Settings — business, modules, reminders, notifications, support
// ─────────────────────────────────────────────────────────────

/** `BusinessReminderPolicyResponse` — the business's appointment reminder ladder. */
export type BusinessReminderPolicy = {
  enabled: boolean
  /** Offsets, in minutes before the appointment (e.g. `[1440, 60]`). */
  offsetMinutes: number[]
  /** Channel allow-list (`in_app`, `email`, `sms`, `push`). */
  channels: string[]
}

/** `PUT /v1/businesses/me/reminder-policy` — omitted fields are left untouched. */
export type UpdateBusinessReminderPolicyRequest = {
  enabled?: boolean
  offsetMinutes?: number[]
  channels?: string[]
}

/** `PUT /v1/businesses/me/daily-goal`. */
export type UpdateBusinessDailyGoalRequest = {
  dailyGoal?: number | null
  dailyGoalType?: string
  appointmentDailyGoal?: number | null
}

/**
 * `BusinessModuleDetail` — one module's effective entitlement for the owner
 * view (`GET /v1/businesses/me/modules`). `hasAccess` is the effective flag
 * (enabled AND covered by an active subscription); `enabled` is the raw
 * plan/override state.
 */
export type BusinessModuleDetail = {
  key: string
  name: string
  description: string | null
  enabled: boolean
  /** `PLAN` | `OVERRIDE` | `ADMIN`. */
  source: string
  hasAccess: boolean
  dependencies: string[]
  isCore: boolean
  reason: string | null
}

export type BusinessModulesResponse = {
  modules: BusinessModuleDetail[]
  plan: CallerPlanInfo | null
}

/**
 * `ResolvedPreferenceDto` — one (category × channel) cell of the notification
 * matrix, already resolved through business + user overrides server-side.
 * `available` is false when this deployment ships no sender for the channel, so
 * the client greys the control instead of offering a choice that cannot be
 * honoured.
 */
export type ResolvedNotificationPreference = {
  category: string
  channel: string
  enabled: boolean
  available: boolean
  /** `system` | `business` | `user` — which level decided the value. */
  source: string
}

export type NotificationPreferenceItem = {
  category: string
  channel: string
  enabled: boolean
}

export type UpdateNotificationPreferencesRequest = {
  /** Scopes the override to one business; null writes a global user preference. */
  businessId?: string | null
  preferences: NotificationPreferenceItem[]
}

/** `GET /v1/support` — platform support channels resolved from server config. */
export type SupportHour = {
  days: string
  hours: string
}

export type SupportContact = {
  email: string
  phone: string
  whatsApp: string
  helpCenterUrl: string
  responseNote: string
  hoursTimeZone: string
  hours: SupportHour[]
}

// ─────────────────────────────────────────────────────────────
//  Staff console
// ─────────────────────────────────────────────────────────────

export type StaffBusiness = {
  businessId: string
  businessName: string
}

export type StaffAnalytics = {
  businessId: string
  businessName: string
  staffName: string
  stampsToday: number
  stampsThisWeek: number
  stampsThisMonth: number
  totalStamps: number
  totalCustomers: number
  rewardReadyCount: number
  dailyGoal: number | null
  dailyGoalType: string
  appointmentDailyGoal: number | null
  appointmentsToday: number
  recentActivity: {
    activityId: string | null
    activityType: string
    customerName: string
    customerId: string | null
    stampNumber: number
    status: string | null
    rewardValue: number | null
    stampedAt: string
  }[]
}

// ─────────────────────────────────────────────────────────────
//  Staff invitations
// ─────────────────────────────────────────────────────────────

export type StaffInvitationValidation = {
  valid: boolean
  businessId: string
  businessName: string
  businessLogoUrl: string | null
  email: string
  expiresAt: string
  errorCode: string | null
  errorMessage: string | null
}

export type AcceptStaffInvitationRequest = {
  fullName: string
  password: string
  emailConfirmation: string
}

// ─────────────────────────────────────────────────────────────
//  Platform administration
// ─────────────────────────────────────────────────────────────

export type AdminBusinessSummary = {
  id: string
  name: string
  category: string
  location: string
  ownerName: string
  ownerEmail: string
  totalCustomers: number
  totalStamps: number
  totalRedemptions: number
  totalStaff: number
  programCount: number
  slug: string | null
}

export type AdminUserSummary = {
  id: string
  email: string
  fullName: string
  phoneNumber: string | null
  avatarUrl: string | null
  dateOfBirth: string | null
  gender: string | null
  role: UserRole
  isVerified: boolean
  createdAt: string
}

/**
 * `GET /v1/admin/growth` — one series per metric. Each point is
 * `{ date, count }`, mirroring `GrowthDataPoint` on the server.
 */
export type AdminGrowthPoint = {
  date: string
  count: number
}

export type AdminGrowth = {
  period: string
  customers: AdminGrowthPoint[]
  businesses: AdminGrowthPoint[]
  stamps: AdminGrowthPoint[]
  redemptions: AdminGrowthPoint[]
}


// ─────────────────────────────────────────────────────────────
//  Public storefront reads (gallery, opening hours, search)
//  Mirrors Application/DTOs/Storefront{Gallery,Hours,Search}DTOs.cs.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  Guest booking (account-free)
//  Mirrors Application/DTOs/GuestBookingDTOs.cs. The visitor proves
//  control of an inbox with a one-time code and receives a short-lived
//  CUSTOMER token, which is then used against the ordinary customer
//  appointment API — so no booking rule is bypassed for guests.
// ─────────────────────────────────────────────────────────────

export type GuestBookingStartRequest = {
  fullName: string
  /** Kenyan mobile number, in any of the shapes people type. */
  phoneNumber: string
  /** The inbox the one-time code is sent to. */
  email: string
}

export type GuestBookingStartResponse = {
  /** Masked (`p•••@example.com`); the full address is never echoed back. */
  email: string
  phoneNumber: string
  expiresAt: string
  resendAvailableAt: string
  codeLength: number
  /** `email` — the only channel the platform verifies by today. */
  deliveryChannel: string
}

export type GuestBookingVerifyRequest = {
  phoneNumber: string
  code: string
}

export type GuestBookingCustomer = {
  fullName: string
  phoneNumber: string
  /** Masked. */
  email: string
}

export type GuestBookingVerifyResponse = {
  /** A short-lived customer access token scoped to the business. No refresh token. */
  accessToken: string
  expiresIn: number
  tokenType: string
  businessId: string
  customer: GuestBookingCustomer
}

/** One published image in a business's public gallery. */
export type PublicGalleryImage = {
  mediaId: string
  /** Owner-written caption, or null when none was written. */
  caption: string | null
  sortOrder: number
  featured: boolean
  width: number | null
  height: number | null
  /** Ready variants only; empty while an image is still processing. */
  variants: ImageVariant[]
}

/** `GET /v1/businesses/{businessId}/gallery`. */
export type PublicGallery = {
  businessId: string
  images: PublicGalleryImage[]
}

/** One opening period in a day, with the staff break inside it (if any). */
export type OpeningHoursPeriod = {
  /** Local `HH:mm`. */
  opensAt: string
  closesAt: string
  breakStartsAt: string | null
  breakEndsAt: string | null
}

export type OpeningHoursDay = {
  /** Lower-case English day name (`monday` … `sunday`). */
  day: string
  /** 0 = Sunday … 6 = Saturday. */
  dayOfWeek: number
  isClosed: boolean
  periods: OpeningHoursPeriod[]
}

/** A dated exception to the weekly pattern (a holiday or a special day). */
export type SpecialOpeningHours = {
  /** Business-local `yyyy-MM-dd`. */
  date: string
  isClosed: boolean
  label: string | null
  periods: OpeningHoursPeriod[]
}

/** `GET /v1/businesses/{businessId}/opening-hours`. */
export type PublicOpeningHours = {
  businessId: string
  timeZoneId: string
  /** False when the hours fall back to the business's own booking window. */
  hasStaffSchedule: boolean
  days: OpeningHoursDay[]
  specialHours: SpecialOpeningHours[]
}

/** One search hit. `type` is `service` or `staff`. */
export type StorefrontSearchResult = {
  type: 'service' | 'staff'
  id: string
  title: string
  subtitle: string | null
  description: string | null
  categoryName: string | null
  price: number | null
  durationMinutes: number | null
  imageVariants: ImageVariant[]
  avatarUrl: string | null
  serviceIds: string[]
}

/** `GET /v1/businesses/{businessId}/search`. */
export type StorefrontSearchResponse = {
  query: string
  /** The normalised scope the server applied (`all` | `services` | `team`). */
  type: string
  items: StorefrontSearchResult[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  /** The business's active, published category names. */
  categories: string[]
}

// ─────────────────────────────────────────────────────────────
//  Platform administration — business management
//  Mirrors Application/DTOs/AdminBusinessManagementDTOs.cs.
// ─────────────────────────────────────────────────────────────

/** Platform-administration lifecycle of a business (independent of soft delete). */
export type BusinessStatus = 'active' | 'suspended' | 'deactivated'

/** Subscription lifecycle states the backend can persist. */
export type SubscriptionStatus =
  | 'active'
  | 'trial'
  | 'past_due'
  | 'paused'
  | 'canceled'
  | 'expired'
  | 'deactivated'

/** Subscription-plan lifecycle (tier) states. */
export type PlanLifecycle = 'Draft' | 'Active' | 'Inactive' | 'Archived'

/** `GET /v1/admin/businesses/stats`. */
export type AdminBusinessStats = {
  total: number
  active: number
  suspended: number
  deactivated: number
  trial: number
  activeSubscriptions: number
  expiredSubscriptions: number
  expiringSoon: number
  noSubscription: number
}

/** One row of `GET /v1/admin/businesses/managed`. */
export type AdminBusinessListItem = {
  id: string
  name: string
  category: string
  location: string
  logoUrl: string | null
  slug: string | null
  tenantUrl: string | null
  email: string | null
  phoneNumber: string | null
  status: string
  ownerId: string | null
  ownerName: string
  ownerEmail: string
  planKey: string | null
  planName: string | null
  subscriptionStatus: string | null
  subscriptionEndsAt: string | null
  enabledModules: string[]
  totalStaff: number
  totalCustomers: number
  totalStamps: number
  lastActivityAt: string | null
  createdAt: string
}

export type AdminBusinessOwnerInfo = {
  id: string | null
  fullName: string
  email: string
  phoneNumber: string | null
  avatarUrl: string | null
}

export type AdminBusinessSubscriptionInfo = {
  subscriptionId: string | null
  planId: string | null
  planKey: string | null
  planName: string | null
  billingInterval: string | null
  price: number | null
  status: string | null
  startsAt: string | null
  currentPeriodStartsAt: string | null
  endsAt: string | null
  canceledAt: string | null
  pausedAt: string | null
  pauseReason: string | null
  isTrial: boolean
  daysUntilExpiry: number | null
}

/** `GET /v1/admin/businesses/{id}/profile`. */
export type AdminBusinessDetail = {
  id: string
  name: string
  category: string
  location: string
  description: string | null
  logoUrl: string | null
  email: string | null
  phoneNumber: string | null
  mpesaNumber: string | null
  timeZoneId: string | null
  slug: string | null
  tenantUrl: string | null
  status: string
  suspendedAt: string | null
  suspendedReason: string | null
  deactivatedAt: string | null
  createdAt: string
  lastActivityAt: string | null
  owner: AdminBusinessOwnerInfo
  subscription: AdminBusinessSubscriptionInfo | null
  totalStaff: number
  totalCustomers: number
  totalStamps: number
  totalRedemptions: number
  programCount: number
}

/** `PUT /v1/admin/businesses/{id}` — every field optional; null leaves it unchanged. */
export type AdminBusinessUpdateRequest = {
  name?: string | null
  category?: string | null
  location?: string | null
  description?: string | null
  email?: string | null
  phoneNumber?: string | null
  mpesaNumber?: string | null
  logoUrl?: string | null
  timeZoneId?: string | null
  reason?: string | null
}

/** One member of a business (`GET /v1/admin/businesses/{id}/users`). */
export type AdminBusinessUserItem = {
  userId: string
  fullName: string
  email: string
  phoneNumber: string | null
  role: string
  status: string
  joinedAt: string
  endedAt: string | null
  globalRole: string
  isVerified: boolean
}

// ─────────────────────────────────────────────────────────────
//  Platform administration — subscription management
// ─────────────────────────────────────────────────────────────

/** `GET /v1/admin/subscriptions/stats`. */
export type AdminSubscriptionStats = {
  total: number
  active: number
  trial: number
  paused: number
  canceled: number
  expired: number
  pastDue: number
  deactivated: number
  renewingIn7Days: number
  monthlyRecurringRevenue: number
  annualRecurringRevenue: number
}

/** One row of `GET /v1/admin/subscriptions`. */
export type AdminSubscriptionListItem = {
  subscriptionId: string
  businessId: string
  businessName: string
  businessStatus: string
  planId: string
  planKey: string
  planName: string
  billingInterval: string
  price: number
  status: string
  startsAt: string | null
  endsAt: string | null
  pausedAt: string | null
  canceledAt: string | null
  createdAt: string
  enabledModuleCount: number
}

/** Result of a subscription lifecycle action. */
export type AdminSubscriptionActionResult = {
  businessId: string
  affectedRows: number
  status: string | null
  endsAt: string | null
  message: string
}

// ─────────────────────────────────────────────────────────────
//  Platform administration — plan (tier) catalogue
//  Mirrors Application/DTOs/SubscriptionAdminDTOs.cs.
// ─────────────────────────────────────────────────────────────

/** A module membership on a plan (`AdminTierDetail.modules` / tier module editor). */
export type TierModuleView = {
  key: string
  name: string
  description: string | null
  isCore: boolean
  visibility: string
  included: boolean
  dependencies: string[]
}

/** A plan (tier) row. */
export type AdminTierSummary = {
  id: string
  key: string
  name: string
  description: string | null
  price: number
  billingInterval: string
  lifecycle: string
  isDefault: boolean
  displayOrder: number | null
  moduleCount: number
  businessCount: number
  createdAt: string
  updatedAt: string | null
}

/** Full plan (tier) detail, including its module set. */
export type AdminTierDetail = {
  id: string
  key: string
  name: string
  description: string | null
  price: number
  billingInterval: string
  lifecycle: string
  isDefault: boolean
  displayOrder: number | null
  publishedAt: string | null
  deactivatedAt: string | null
  archivedAt: string | null
  lastPublishedByUserId: string | null
  createdAt: string
  moduleCount: number
  businessCount: number
  modules: TierModuleView[]
}

/** `POST /v1/admin/subscription-tiers`. */
export type AdminTierCreateRequest = {
  key: string
  name: string
  description?: string | null
  price: number
  billingInterval: string
  displayOrder?: number | null
  isDefault?: boolean
  moduleKeys?: string[]
}

/** `PUT /v1/admin/subscription-tiers/{id}`. */
export type AdminTierUpdateRequest = {
  name?: string | null
  description?: string | null
  price?: number | null
  billingInterval?: string | null
  displayOrder?: number | null
}

/** `PUT /v1/admin/subscription-tiers/{id}/modules`. */
export type AdminTierModulesRequest = {
  moduleKeys: string[]
}

/** Response of the tier module endpoints. */
export type AdminTierModulesResponse = {
  tierId: string
  modules: TierModuleView[]
}

/** A business subscribed to a plan (`GET /v1/admin/subscription-tiers/{id}/businesses`). */
export type AdminTierBusinessItem = {
  id: string
  name: string
  category: string | null
  location: string | null
  status: string
  startsAt: string | null
  endsAt: string | null
  moduleCount: number
}

/** A module with its resolved effective access for one business. */
export type AdminBusinessEffectiveModule = {
  key: string
  name: string
  description: string | null
  isCore: boolean
  isEnabled: boolean
  hasAccess: boolean
  source: string
  reason: string | null
  dependencies: string[]
}

/** Aggregate business → subscription view (`GET /v1/admin/subscriptions/{businessId}`). */
export type AdminBusinessSubscriptionDetail = {
  businessId: string
  businessName: string
  currentTier: AdminTierSummary | null
  subscriptionStatus: string | null
  startsAt: string | null
  endsAt: string | null
  effectiveModules: AdminBusinessEffectiveModule[]
  auditHistory: SubscriptionAuditLogEntry[]
}

/** One append-only subscription/business audit record. */
export type SubscriptionAuditLogEntry = {
  id: string
  action: string
  actorUserId: string | null
  actorName: string | null
  targetBusinessId: string | null
  targetPlanId: string | null
  payload: Record<string, unknown> | null
  reason: string | null
  createdAt: string
}

// ─────────────────────────────────────────────────────────────
//  Platform administration — module catalogue
// ─────────────────────────────────────────────────────────────

/** One module of the admin catalogue (`GET /v1/admin/module-catalog`). */
export type AdminModuleCatalogItem = {
  key: string
  name: string
  description: string | null
  isCore: boolean
  visibility: string
  version: string
  isActive: boolean
  dependencies: string[]
  planCount: number
  businessCount: number
}

/** `GET /v1/admin/module-catalog`. */
export type AdminModuleCatalogResponse = {
  modules: AdminModuleCatalogItem[]
}

/** `PUT /v1/admin/modules/{key}`. */
export type AdminModuleUpdateRequest = {
  name?: string | null
  description?: string | null
  isActive?: boolean | null
  reason?: string | null
}


// ─────────────────────────────────────────────────────────────
//  Storefront Builder (rich, section-based storefront)
//  Mirrors PunchedApi/Application/DTOs/StorefrontBuilderDTOs.cs.
// ─────────────────────────────────────────────────────────────

/** Global design tokens, applied as CSS variables across the storefront. */
export type StorefrontTheme = {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  mutedText: string
  buttonBackground: string
  buttonText: string
  border: string
  headingFont: string
  bodyFont: string
  headingWeight: number
  bodyWeight: number
  baseFontSize: number
  headingScale: string
  lineHeight: string
  letterSpacing: string
  contentWidth: number
  sectionSpacing: string
  containerPadding: string
  radius: string
  cardStyle: string
  shadow: string
  imageRatio: string
  /** `rounded` | `pill` | `square` | `outline` | `filled`. */
  buttonStyle: string
  /** `solid` | `gradient` | `image`. */
  backgroundStyle: string
  backgroundImageMediaId: string | null
  gradientFrom: string
  gradientTo: string
}

export type StorefrontHeader = {
  variant: string
  showLogo: boolean
  logoMediaId: string | null
  logoSize: string
  showBusinessName: boolean
  sticky: boolean
  transparent: boolean
  background: string
  textColor: string
  alignment: string
  spacing: string
  mobileStyle: string
  ctaEnabled: boolean
  ctaLabel: string
  ctaType: string
}

export type StorefrontHero = {
  variant: string
  enabled: boolean
  eyebrow: string | null
  heading: string | null
  subheading: string | null
  description: string | null
  primaryCtaLabel: string
  primaryCtaType: string
  secondaryCtaLabel: string
  secondaryCtaType: string
  backgroundMediaId: string | null
  carouselMediaIds: string[]
  /** Optional background video for the `video` hero variant (direct MP4/WebM URL). */
  videoUrl: string | null
  overlayOpacity: number
  backgroundColor: string
  textAlign: string
  height: string
  contentWidth: string
  imagePosition: string
  mobileLayout: string
  showLogo: boolean
  showFacts: boolean
}

/** One independently-configurable storefront section instance. */
export type StorefrontSection = {
  id: string
  key: string
  variant: string
  enabled: boolean
  order: number
  title: string | null
  description: string | null
  settings: Record<string, string>
}

export type StorefrontSocialLink = {
  platform: string
  url: string
}

export type StorefrontNavLink = {
  label: string
  href: string
}

export type StorefrontFooter = {
  variant: string
  showLogo: boolean
  logoMediaId: string | null
  description: string | null
  showContact: boolean
  showAddress: boolean
  showHours: boolean
  showSocial: boolean
  socials: StorefrontSocialLink[]
  showNav: boolean
  showLegal: boolean
  legalLinks: StorefrontNavLink[]
  copyright: string | null
  backgroundColor: string
  textColor: string
}

export type StorefrontPage = {
  id: string
  title: string
  slug: string
  /** home | services | about | contact | team | gallery | reviews | booking | custom */
  kind: string
  showInNav: boolean
  order: number
  seoTitle: string | null
  seoDescription: string | null
}

export type StorefrontSeo = {
  title: string | null
  description: string | null
  ogTitle: string | null
  ogDescription: string | null
  ogImageMediaId: string | null
  faviconMediaId: string | null
  keywords: string | null
}

/** The complete storefront configuration (draft or published). */
export type StorefrontConfig = {
  templateId: string
  theme: StorefrontTheme
  header: StorefrontHeader
  hero: StorefrontHero
  sections: StorefrontSection[]
  footer: StorefrontFooter
  pages: StorefrontPage[]
  seo: StorefrontSeo
}

/** The public, sanitized projection of the published storefront. */
export type PublicStorefront = StorefrontConfig & {
  isPublished: boolean
  publishedAt: string | null
  heroBackgroundVariants: ImageVariant[]
  heroCarouselVariants: ImageVariant[][]
  themeBackgroundVariants: ImageVariant[]
  headerLogoVariants: ImageVariant[]
  footerLogoVariants: ImageVariant[]
  ogImageVariants: ImageVariant[]
  faviconVariants: ImageVariant[]
}

/** Owner builder state: draft + published + publication metadata. */
export type StorefrontBuilderState = {
  businessId: string
  templateId: string
  isPublished: boolean
  publishedAt: string | null
  updatedAt: string | null
  hasDraft: boolean
  hasUnpublishedChanges: boolean
  draft: StorefrontConfig
  published: StorefrontConfig | null
}

/** Component variant selections and configurations for the three-component landing page builder. */

export type NavigationVariantConfig = {
  variant: string
  logoMediaId: string | null
  logoSize: string
  showBusinessName: boolean
  businessNameLabel: string | null
  navigationLinks: StorefrontNavLink[]
  ctaEnabled: boolean
  ctaLabel: string | null
  ctaDestination: string | null
  backgroundColor: string
  textColor: string
  linkColor: string
  borderStyle: string
  borderColor: string
  boxShadow: string
  transparency: number
  headerHeight: string
  horizontalSpacing: string
  verticalSpacing: string
  sticky: boolean
  scrollBehavior: string
  mobileStyle: string
}

export type HeroVariantConfig = {
  variant: string
  // Content
  eyebrow: string | null
  heading: string
  description: string | null
  primaryCtaLabel: string
  primaryCtaDestination: string | null
  secondaryCtaLabel: string | null
  secondaryCtaDestination: string | null
  decorativeText: string | null
  // Background
  backgroundStyle: 'solid' | 'gradient' | 'image' | 'video'
  backgroundMediaId: string | null
  backgroundColor: string
  gradientFrom: string
  gradientTo: string
  videoUrl: string | null
  imagePosition: string
  imageFocalPoint: string
  imageScale: number
  overlayColor: string
  overlayOpacity: number
  // Layout
  height: string
  contentAlignment: string
  textAlign: string
  contentMaxWidth: string
  horizontalPosition: string
  verticalPosition: string
  sectionPadding: string
  // Typography
  headingFont: string
  headingSize: string
  headingWeight: number
  headingColor: string
  bodyFont: string
  bodySize: string
  bodyColor: string
  lineHeight: string
  letterSpacing: string
  // CTA
  buttonStyle: string
  buttonColor: string
  buttonTextColor: string
  buttonBorderRadius: string
  buttonSize: string
  buttonAlignment: string
  primaryCtaVisible: boolean
  secondaryCtaVisible: boolean
}

export type FooterVariantConfig = {
  variant: string
  logoMediaId: string | null
  logoVisible: boolean
  businessNameVisible: boolean
  descriptionText: string | null
  showContact: boolean
  phoneNumber: string | null
  email: string | null
  address: string | null
  showNavigation: boolean
  navigationLinks: StorefrontNavLink[]
  showSocial: boolean
  socialLinks: StorefrontSocialLink[]
  showCopyright: boolean
  copyrightText: string | null
  backgroundColor: string
  textColor: string
  linkColor: string
  spacing: string
  contentAlignment: string
}

export type SaveStorefrontDraftRequest = {
  config: StorefrontConfig
}

export type PublishStorefrontRequest = {
  config?: StorefrontConfig | null
}

