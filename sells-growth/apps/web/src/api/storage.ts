const API_BASE_URL_KEY = "aigc.apiBaseUrl";
const API_KEY_KEY = "aigc.apiKey";

export function getApiBaseUrl(): string {
  const v = localStorage.getItem(API_BASE_URL_KEY);
  return (v && v.trim()) || "http://localhost:8000";
}

export function setApiBaseUrl(value: string) {
  localStorage.setItem(API_BASE_URL_KEY, value.trim());
}

export function getApiKey(): string {
  return (localStorage.getItem(API_KEY_KEY) || "").trim();
}

export function setApiKey(value: string) {
  localStorage.setItem(API_KEY_KEY, value.trim());
}

