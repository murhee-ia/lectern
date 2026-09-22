export type OrganizationMember = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatarPath: string | null;
  role: string;
  joinedAt: string;
};

export type WorkspaceOrganization = {
  id: string;
  name: string;
  plan: string;
  created_by: string;
  created_at: string;
};

export type Organization = WorkspaceOrganization & {
  members: OrganizationMember[];
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};