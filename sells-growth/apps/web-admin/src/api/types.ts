export type AdminUser = {
  id: string;
  username?: string | null;
  role: string;
  created_at: string;
};

export type AdminUserSubscription = {
  pricing_plan_id?: string | null;
  plan_key: string;
  pricing_plan?: PricingPlanBrief | null;
  status: string;
  started_at: string;
  current_period_end?: string | null;
};

export type AdminUserListItem = {
  user: AdminUser;
  subscription?: AdminUserSubscription | null;
};

export type AdminUserListResponse = {
  page: number;
  page_size: number;
  total: number;
  items: AdminUserListItem[];
};

export type AdminUserDetailResponse = {
  user: AdminUser;
  subscription?: AdminUserSubscription | null;
};

export type AdminUserSubscriptionUpdateRequest = {
  pricing_plan_id?: string;
  plan_key?: string;
  status?: string;
  current_period_end?: string | null;
};

export type PricingPlanBrief = {
  id: string;
  key: string;
  name: string;
  price_amount: number;
  currency: string;
  interval: string;
  is_active: boolean;
  campaign_monthly_limit?: number | null;
  user_seats_limit?: number | null;
};

export type PricingPlan = {
  id: string;
  key: string;
  name: string;
  price_amount: number;
  currency: string;
  interval: string;
  is_active: boolean;
  campaign_monthly_limit?: number | null;
  user_seats_limit?: number | null;
  created_at: string;
  updated_at: string;
};

export type PricingPlanListResponse = {
  items: PricingPlan[];
};

export type PricingPlanCreateRequest = {
  key: string;
  name: string;
  price_amount: number;
  currency: string;
  interval: string;
  is_active: boolean;
  campaign_monthly_limit?: number | null;
  user_seats_limit?: number | null;
};

export type PricingPlanCreateResponse = {
  id: string;
};

export type PricingPlanUpdateRequest = {
  name: string;
  price_amount: number;
  currency: string;
  interval: string;
  is_active: boolean;
  campaign_monthly_limit?: number | null;
  user_seats_limit?: number | null;
};

export type AdminDashboardPlanItem = {
  key: string;
  name: string;
  user_count: number;
};

export type AdminDashboardResponse = {
  total_users: number;
  users_by_plan: AdminDashboardPlanItem[];
};

export type AdminTeam = {
  id: string;
  owner_user_id: string;
  owner_username?: string | null;
  name: string;
  created_at: string;
};

export type AdminTeamMember = {
  id: string;
  user_id: string;
  username?: string | null;
  role: string;
  created_at: string;
};

export type AdminTeamListResponse = {
  items: AdminTeam[];
};

export type AdminTeamDetailResponse = {
  team: AdminTeam;
  members: AdminTeamMember[];
};

export type AdminTeamCreateRequest = {
  owner_user_id?: string;
  owner_username?: string;
  name: string;
};

export type AdminTeamCreateResponse = {
  id: string;
};

export type AdminTeamMemberAddRequest = {
  user_id: string;
  role: string;
};

export type AdminUserUsage = {
  campaigns_this_month: number;
  campaign_monthly_limit?: number | null;
  team_id?: string | null;
  team_size?: number | null;
  user_seats_limit?: number | null;
};

export type AdminUserUsageListItem = {
  user: AdminUser;
  subscription?: AdminUserSubscription | null;
  usage: AdminUserUsage;
};

export type AdminUserUsageListResponse = {
  page: number;
  page_size: number;
  total: number;
  items: AdminUserUsageListItem[];
};

export type AdminBillingRunResponse = {
  status: string;
  started_at: string;
  finished_at?: string | null;
  upgraded: number;
  downgraded: number;
  error_message?: string | null;
};
