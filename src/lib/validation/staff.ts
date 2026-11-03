import { z } from 'zod'

/**
 * Zod schemas mirroring the API's staff rules, so the browser catches what it
 * can know and the server stays the authority — a rejected save renders the
 * server's message rather than pretending the input was fine.
 *
 * The limits match `StaffManagementService` and the entity annotations:
 * 100-character names, 20-character phone numbers, 300-character bios and
 * specialities, 0–80 years of experience, and a 1–1000 daily goal.
 */

export const staffProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Give this teammate a name.')
    .max(100, 'Name must be 100 characters or fewer.'),
  phoneNumber: z
    .string()
    .trim()
    .max(20, 'Phone number must be 20 characters or fewer.')
    .optional()
    .or(z.literal('')),
  bio: z
    .string()
    .trim()
    .max(300, 'Biography must be 300 characters or fewer.')
    .optional()
    .or(z.literal('')),
  /** Free text; the storefront splits it on commas. Empty clears it. */
  specialities: z
    .string()
    .trim()
    .max(300, 'Specialities must be 300 characters or fewer.')
    .optional()
    .or(z.literal('')),
  /**
   * Whole years of experience, or null for "not stated". Zero is a real answer
   * (someone new to the trade), so it is not treated as empty.
   */
  yearsOfExperience: z
    .number({ error: 'Enter a whole number of years, or leave it blank.' })
    .int('Years of experience must be a whole number.')
    .min(0, 'Years of experience cannot be negative.')
    .max(80, 'Years of experience must be 80 or less.')
    .nullable()
    .optional(),
  /** Empty string means "no title", which the API reads as clearing it. */
  positionId: z.string().optional().or(z.literal('')),
  dailyGoalOverride: z
    .number({ error: 'Enter a whole number, or leave it blank.' })
    .int('The goal must be a whole number.')
    .min(1, 'The goal must be at least 1.')
    .max(1000, 'The goal must be 1,000 or less.')
    .nullable()
    .optional(),
  appointmentDailyGoalOverride: z
    .number({ error: 'Enter a whole number, or leave it blank.' })
    .int('The goal must be a whole number.')
    .min(1, 'The goal must be at least 1.')
    .max(1000, 'The goal must be 1,000 or less.')
    .nullable()
    .optional(),
})

export type StaffProfileValues = z.input<typeof staffProfileSchema>
export type StaffProfileOutput = z.output<typeof staffProfileSchema>

/** One weekday row in the working-hours editor. */
export const staffAvailabilityDaySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isWorking: z.boolean(),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(0).max(1440),
    breakStartMinute: z.number().int().min(0).max(1439).nullable(),
    breakEndMinute: z.number().int().min(0).max(1440).nullable(),
  })
  .refine((day) => !day.isWorking || day.endMinute > day.startMinute, {
    message: 'The end time must be after the start time.',
    path: ['endMinute'],
  })
  .refine(
    (day) =>
      !day.isWorking ||
      (day.breakStartMinute === null) === (day.breakEndMinute === null),
    { message: 'A break needs both a start and an end.', path: ['breakStartMinute'] },
  )
  .refine(
    (day) =>
      !day.isWorking ||
      day.breakStartMinute === null ||
      day.breakEndMinute === null ||
      (day.breakStartMinute >= day.startMinute && day.breakEndMinute <= day.endMinute),
    { message: 'The break must sit inside the working hours.', path: ['breakStartMinute'] },
  )
  .refine(
    (day) =>
      !day.isWorking ||
      day.breakStartMinute === null ||
      day.breakEndMinute === null ||
      day.breakEndMinute > day.breakStartMinute,
    { message: 'The break must end after it starts.', path: ['breakEndMinute'] },
  )

export const staffAvailabilitySchema = z.object({
  days: z.array(staffAvailabilityDaySchema).length(7, 'All seven days are required.'),
})

export type StaffAvailabilityValues = z.input<typeof staffAvailabilitySchema>

/** Dated time off. */
export const staffTimeOffSchema = z
  .object({
    from: z.string().min(1, 'Choose a start date.'),
    to: z.string().min(1, 'Choose an end date.'),
    reason: z.string().trim().max(200, 'The reason must be 200 characters or fewer.').optional().or(z.literal('')),
  })
  .refine((value) => value.to >= value.from, {
    message: 'The end date must be on or after the start date.',
    path: ['to'],
  })

export type StaffTimeOffValues = z.input<typeof staffTimeOffSchema>

/** Invitation. The API accepts an email; the address is the onboarding key. */
export const staffInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter their work email.')
    .email('Enter a valid email address.'),
})

export type StaffInviteValues = z.input<typeof staffInviteSchema>
