/**
 * PROVISIONAL — there is no sessions table yet. These carry only what the
 * member activity dialog renders, and should be replaced by types mirroring
 * the real table once it exists.
 */
export type TeamSessionSummary = {
  id: string;
  title: string;
  startedAt: string;
};

/**
 * The team sessions one member took part in. `started` stays empty for a
 * Member, whose role lacks the `sessions.team.start` permission.
 */
export type MemberTeamSessionActivity = {
  joined: TeamSessionSummary[];
  started: TeamSessionSummary[];
};
