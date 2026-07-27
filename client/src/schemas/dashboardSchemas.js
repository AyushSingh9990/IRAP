import { z } from 'zod';

function isValidTimeZone(value) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const accountSettingsSchema = z.object({
  displayName: z.string().trim().min(2, 'Display name is required.').max(160),
  telephone: z.string().trim().max(30, 'Telephone is too long.'),
  preferredLanguage: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/, 'Enter a valid language tag.'),
  timeZone: z
    .string()
    .trim()
    .min(2, 'Time zone is required.')
    .max(100)
    .refine(isValidTimeZone, 'Enter a valid IANA time zone.'),
});
