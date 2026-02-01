import React, { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { createWebhook, deleteWebhook, getWebhooks, type WebhookEvent } from "../../api/webhooks";
import { useToast } from "../../contexts/ToastContext";

const WEBHOOK_EVENTS: Array<{ id: WebhookEvent; label: string; description: string }> = [
  { id: "job.completed", label: "Job completed", description: "Fires when all pages complete successfully." },
  { id: "job.failed", label: "Job failed", description: "Fires when a job finishes with failed pages." },
];

export const WebhooksManagement: React.FC = () => {
  const { addToast } = useToast();
  const [webhooks, setWebhooks] = useState<Array<{
    id: string;
    url: string;
    events: WebhookEvent[];
    description?: string | null;
    created_at?: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([
    "job.completed",
    "job.failed",
  ]);

  const selectedEventSet = useMemo(() => new Set(selectedEvents), [selectedEvents]);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const response = await getWebhooks();
      setWebhooks(response.webhooks || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWebhooks();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim()) {
      addToast("Webhook URL is required", "error");
      return;
    }
    try {
      new URL(url);
    } catch {
      addToast("Webhook URL must be valid (http/https)", "error");
      return;
    }
    if (!selectedEvents.length) {
      addToast("Select at least one event", "error");
      return;
    }

    try {
      setSaving(true);
      await createWebhook({
        url: url.trim(),
        events: selectedEvents,
        description: description.trim() || undefined,
      });
      setUrl("");
      setDescription("");
      setSelectedEvents(["job.completed", "job.failed"]);
      await loadWebhooks();
      addToast("Webhook saved", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to save webhook", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm("Delete this webhook? This cannot be undone.");
    if (!ok) return;
    try {
      await deleteWebhook(id);
      await loadWebhooks();
      addToast("Webhook deleted", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to delete webhook", "error");
    }
  };

  return (
    <DashboardLayout title="Webhooks">
      <div className="space-y-6">
        <section className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-dark-100">Live Data Actions</h2>
              <p className="text-sm text-dark-400">
                Trigger downstream automations the moment jobs finish. Payloads include job + business IDs.
              </p>
            </div>
            <div className="text-xs text-dark-400 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2">
              Recommended: point to your CRM or ops queue listener.
            </div>
          </div>
        </section>

        <section className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <h3 className="text-base font-semibold text-dark-100 mb-4">Create Webhook</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1">Webhook URL</label>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/webhooks/marketbrewer"
                className="w-full px-4 py-2 bg-dark-800 text-dark-100 placeholder:text-dark-500 border border-dark-600 rounded-lg focus:ring-2 focus:ring-metro-orange focus:border-metro-orange"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Description</label>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional notes for the team"
                className="w-full px-4 py-2 bg-dark-800 text-dark-100 placeholder:text-dark-500 border border-dark-600 rounded-lg focus:ring-2 focus:ring-metro-orange focus:border-metro-orange"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-2">Events</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {WEBHOOK_EVENTS.map((evt) => (
                  <label
                    key={evt.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedEventSet.has(evt.id)
                        ? "border-metro-orange bg-metro-orange/10"
                        : "border-dark-700 bg-dark-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedEventSet.has(evt.id)}
                        onChange={(event) => {
                          const next = new Set(selectedEventSet);
                          if (event.target.checked) {
                            next.add(evt.id);
                          } else {
                            next.delete(evt.id);
                          }
                          setSelectedEvents(Array.from(next));
                        }}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-sm font-semibold text-dark-100">{evt.label}</div>
                        <div className="text-xs text-dark-400">{evt.description}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-metro-orange text-dark-950 px-4 py-2 rounded-lg font-medium hover:bg-metro-orange-600 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Webhook"}
            </button>
          </form>
        </section>

        <section className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-dark-100">Active Webhooks</h3>
            <button
              type="button"
              onClick={loadWebhooks}
              className="text-xs text-dark-300 border border-dark-600 rounded-lg px-3 py-1 hover:bg-dark-800"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-dark-400">Loading webhooks...</div>
          ) : error ? (
            <div className="text-sm text-metro-red">{error}</div>
          ) : webhooks.length === 0 ? (
            <div className="text-sm text-dark-400">No webhooks configured yet.</div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((hook) => (
                <div
                  key={hook.id}
                  className="border border-dark-700 rounded-lg p-4 bg-dark-950 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
                >
                  <div>
                    <div className="text-sm text-dark-100 font-semibold">{hook.url}</div>
                    <div className="text-xs text-dark-400">
                      {hook.description || "No description"}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(hook.events || []).map((evt) => (
                        <span
                          key={evt}
                          className="text-xs bg-dark-800 border border-dark-700 text-dark-200 px-2 py-0.5 rounded-full"
                        >
                          {evt}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {hook.created_at && (
                      <span className="text-xs text-dark-500">
                        Added {new Date(hook.created_at).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(hook.id)}
                      className="text-xs text-metro-red hover:text-metro-red-300 border border-metro-red-900/60 px-3 py-1 rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default WebhooksManagement;
