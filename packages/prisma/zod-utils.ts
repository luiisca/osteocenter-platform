import { z } from "zod";

import { LocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import { slugify } from "@calcom/lib/slugify";

// Let's not import 118kb just to get an enum
export enum Frequency {
  YEARLY = 0,
  MONTHLY = 1,
  WEEKLY = 2,
  DAILY = 3,
  HOURLY = 4,
  MINUTELY = 5,
  SECONDLY = 6,
}

export const eventTypeLocations = z.array(
  z.object({
    // TODO: Couldn't find a way to make it a union of types from App Store locations
    // Creating a dynamic union by iterating over the object doesn't seem to make TS happy
    type: z.string(),
    address: z.string().optional(),
    link: z.string().url().optional(),
    displayLocationPublicly: z.boolean().optional(),
    hostPhoneNumber: z.string().optional(),
  })
);

// Matching RRule.Options: rrule/dist/esm/src/types.d.ts
export const recurringEventType = z
  .object({
    dtstart: z.date().optional(),
    interval: z.number(),
    count: z.number(),
    freq: z.nativeEnum(Frequency),
    until: z.date().optional(),
    tzid: z.string().optional(),
  })
  .nullable();

export const eventTypeSlug = z.string().transform((val) => slugify(val.trim()));

export const stringToDate = z.string().transform((a) => new Date(a));

export const stringOrNumber = z.union([
  z.string().transform((v, ctx) => {
    const parsed = parseInt(v);
    if (isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Not a number",
      });
    }
    return parsed;
  }),
  z.number().int(),
]);

export const stringToDayjs = z.string().transform((val) => dayjs(val));

export const bookingCreateBodySchema = z.object({
  email: z.string(),
  end: z.string(),
  eventTypeId: z.number(),
  eventTypeSlug: z.string().optional(),
  guests: z.array(z.string()).optional(),
  location: z.string(),
  name: z.string(),
  notes: z.string().optional(),
  rescheduleUid: z.string().optional(),
  recurringEventId: z.string().optional(),
  start: z.string(),
  timeZone: z.string(),
  user: z.union([z.string(), z.array(z.string())]).optional(),
  language: z.string(),
  bookingUid: z.string().optional(),
  customInputs: z.array(z.object({ label: z.string(), value: z.union([z.string(), z.boolean()]) })),
  metadata: z.record(z.string()),
  hasHashedBookingLink: z.boolean().optional(),
  hashedLink: z.string().nullish(),
  ethSignature: z.string().optional(),
});

export const requiredCustomInputSchema = z.union([
  // string must be given & nonempty
  z.string().trim().min(1),
  // boolean must be true if set.
  z.boolean().refine((v) => v === true),
]);

export type BookingCreateBody = z.input<typeof bookingCreateBodySchema>;

export const bookingConfirmPatchBodySchema = z.object({
  bookingId: z.number(),
  confirmed: z.boolean(),
  recurringEventId: z.string().optional(),
  reason: z.string().optional(),
});

export const extendedBookingCreateBody = bookingCreateBodySchema.merge(
  z.object({
    noEmail: z.boolean().optional(),
    recurringCount: z.number().optional(),
    rescheduleReason: z.string().optional(),
    smsReminderNumber: z.string().optional(),
  })
);

export const vitalSettingsUpdateSchema = z.object({
  connected: z.boolean().optional(),
  selectedParam: z.string().optional(),
  sleepValue: z.number().optional(),
});

export const createdEventSchema = z
  .object({
    id: z.string(),
    password: z.union([z.string(), z.undefined()]),
    onlineMeetingUrl: z.string().nullable(),
  })
  .passthrough();

export const userMetadata = z
  .object({
    proPaidForByTeamId: z.number().optional(),
    stripeCustomerId: z.string().optional(),
    vitalSettings: vitalSettingsUpdateSchema.optional(),
    isPremium: z.boolean().optional(),
    intentUsername: z.string().optional(),
    checkoutSessionId: z.string().nullable().optional(),
  })
  .nullable();

/**
 * Ensures that it is a valid HTTP URL
 * It automatically avoids
 * -  XSS attempts through javascript:alert('hi')
 * - mailto: links
 */
export const successRedirectUrl = z
  .union([
    z.literal(""),
    z
      .string()
      .url()
      .regex(/^http(s)?:\/\/.*/),
  ])
  .optional();

export const username = z.string().min(4, { message: "min_length_4" });
export const name = z.string().min(5, { message: "min_length_5" });
export const firstName = z.string().min(2, { message: "min_length_2" });
export const lastName = z.string().min(2, { message: "min_length_2" });
export const phoneNumber = z
  .string()
  .min(1, { message: "not_empty" })
  .regex(/^\d+$/, { message: "not_number" })
  .length(9, { message: "required_length_9" })
  .optional();
export const DNI = z
  .string()
  .min(1, { message: "not_empty" })
  .regex(/^\d+$/, { message: "not_number" })
  .length(8, { message: "required_length_8" });

export const profileData = z.object({
  username: z.string().min(4, { message: "min_length_4" }),
  name: z.string().min(5, { message: "min_length_5" }),
  firstName: z.string().min(2, { message: "min_length_2" }),
  lastName: z.string().min(2, { message: "min_length_2" }),
  phoneNumber: z
    .string()
    .min(1, { message: "not_empty" })
    .regex(/^\d+$/, { message: "not_number" })
    .length(9, { message: "required_length_9" })
    .optional(),
  DNI: z
    .string()
    .min(1, { message: "not_empty" })
    .regex(/^\d+$/, { message: "not_number" })
    .length(8, { message: "required_length_8" }),
  email: z.string().email().optional(),
  bio: z.string().optional(),
  avatar: z.string().optional(),
  timeZone: z.string().optional(),
  weekStart: z.string().optional(),
  hideBranding: z.boolean().optional(),
  allowDynamicBooking: z.boolean().optional(),
  brandColor: z.string().optional(),
  darkBrandColor: z.string().optional(),
  theme: z.string().optional().nullable(),
  completedOnboarding: z.boolean().optional(),
  locale: z.string().optional(),
  timeFormat: z.number().optional(),
  disableImpersonation: z.boolean().optional(),
});

export type ProfileDataInputType = z.infer<typeof profileData>;
