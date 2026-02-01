import apiClient from "./client";

export type WebhookEvent = "job.completed" | "job.failed";

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WebhooksResponse {
  webhooks: Webhook[];
}

export interface WebhookResponse {
  webhook: Webhook;
}

export async function getWebhooks(): Promise<WebhooksResponse> {
  const response = await apiClient.get<WebhooksResponse>("/api/webhooks");
  return response.data;
}

export async function createWebhook(payload: {
  url: string;
  events: WebhookEvent[];
  description?: string;
}): Promise<WebhookResponse> {
  const response = await apiClient.post<WebhookResponse>("/api/webhooks", payload);
  return response.data;
}

export async function deleteWebhook(webhookId: string): Promise<void> {
  await apiClient.delete(`/api/webhooks/${webhookId}`);
}
