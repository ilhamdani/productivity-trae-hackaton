export type Money = {
  currency: "IDR";
  amount: number;
};

export type CampaignListItem = {
  id: string;
  product_name: string;
  status: "draft" | "running" | "complete" | "failed";
  created_at: string;
};

export type CampaignDetail = {
  id: string;
  product_name: string;
  product_description: string;
  price: Money;
  category: string;
  status: "draft" | "running" | "complete" | "failed";
  approval_status: "none" | "pending_storyboard" | "approved_storyboard" | "rejected_storyboard";
  assets: Array<{ id: string; asset_type: string; public_url?: string | null }>;
};

export type ProgressStep = {
  step_key: string;
  status: "queued" | "running" | "success" | "failed";
  duration_ms?: number | null;
};

export type ProgressResponse = {
  campaign_id: string;
  campaign_status: "draft" | "running" | "complete" | "failed";
  approval_status: "none" | "pending_storyboard" | "approved_storyboard" | "rejected_storyboard";
  current_step_key?: string | null;
  steps: ProgressStep[];
  error?: { code: string; message: string; retryable: boolean; step_key: string } | null;
  action_required?: { type: string; step_key: string } | null;
};

