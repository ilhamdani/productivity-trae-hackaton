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

export type ContentDraft = {
  id: string;
  campaign_id?: string | null;
  channel: "instagram" | "tiktok" | "facebook" | "whatsapp";
  content_type: string;
  caption: string;
  hashtags: string[];
  cta_text?: string | null;
  media_urls: string[];
  notes?: string | null;
  status: "draft" | "scheduled" | "published" | "archived";
  scheduled_at?: string | null;
  timezone?: string | null;
  post_url?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
};
