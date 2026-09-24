export type OrganizationMember = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarPath: string | null;
  role: string;
  joinedAt: string;
};

export type WorkspaceOrganization = {
  id: string;
  name: string;
  plan: string;
};

export type WorkspaceOrganizationMembership = WorkspaceOrganization & {
  role: string;
};

export type Organization = WorkspaceOrganization & {
  members: OrganizationMember[];
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  created_by: string;
  created_at: string;
};
