import { z } from 'zod';

export const joinCodeSchema = z.string().trim().min(1).max(64);

/** An email invitation: never for the Admin role, which only a handoff grants. */
export const invitationSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  role: z.enum(['member', 'session_leader']),
});
