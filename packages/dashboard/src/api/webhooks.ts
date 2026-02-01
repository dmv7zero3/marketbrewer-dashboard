import apiClient from "./client";

/** Supported webhook event types. */
export type WebhookEvent = "job.completed" | "job.failed";

/** Webhook configuration record. */
export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Response payload for listing webhooks. */
export interface WebhooksResponse {
  webhooks: Webhook[];
}

/** Response payload for a single webhook. */
export interface WebhookResponse {
  webhook: Webhook;
}

/** List configured webhooks. */
export async function getWebhooks(): Promise<WebhooksResponse> {
  const response = await apiClient.get<WebhooksResponse>("/api/webhooks");
  return response.data;
}

/**
 * Create a new webhook.
 * @param payload - Webhook payload (URL, events, optional description).
 */
export async function createWebhook(payload: {
  url: string;
  events: WebhookEvent[];
  description?: string;
}): Promise<WebhookResponse> {
  const response = await apiClient.post<WebhookResponse>("/api/webhooks", payload);
  return response.data;
}

/**
 * Delete a webhook by id.
 * @param webhookId - Webhook identifier.
 */
export async function deleteWebhook(webhookId: string): Promise<void> {
  await apiClient.delete(`/api/webhooks/${webhookId}`);
}
