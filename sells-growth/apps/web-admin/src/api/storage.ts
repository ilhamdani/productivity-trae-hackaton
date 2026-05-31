const API_KEY_KEY = "aigc_admin.apiKey";

export function getApiKey(): string {
  return (localStorage.getItem(API_KEY_KEY) || "").trim();
}

export function setApiKey(value: string) {
  localStorage.setItem(API_KEY_KEY, value.trim());
}
