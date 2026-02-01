import React, { useMemo, useState } from "react";
import openclawClient, { getOpenclawBaseUrl } from "../api/openclaw";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const QUICK_ACTIONS = [
  "Ship nash-and-smashed-website --live",
  "Status marketbrewer-website",
  "Edit marketbrewer-website index.html replace 'Old' with 'New'",
  "List websites",
];

export const CodingAssist: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Send a task for the coding agents. I will queue it to OpenClaw.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const baseUrl = useMemo(() => getOpenclawBaseUrl(), []);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await openclawClient.post("/chat", {
        prompt: trimmed,
        source: "dashboard-coding",
      });
      const reply = response.data?.response || "Queued. Check Tasks for status.";
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Failed to reach OpenClaw. Check the API status and try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container py-10">
      <div className="max-w-4xl">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-dark-400">Coding Agents</p>
          <h1 className="mt-2 text-3xl font-semibold text-dark-50">OpenClaw Chat</h1>
          <p className="mt-2 text-sm text-dark-300">
            Connected to {baseUrl}. Keep tasks focused on website edits, deploys, and fixes.
          </p>
        </header>

        <div className="rounded-2xl border border-dark-700 bg-dark-800 p-5 shadow-xl">
          <div className="space-y-4 max-h-[55vh] overflow-auto pr-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-2xl px-4 py-3 text-sm ${
                  message.role === "user"
                    ? "bg-metro-orange text-dark-900 ml-auto"
                    : "bg-dark-900 text-dark-100 border border-dark-700"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className="text-[11px] opacity-70 mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-dark-700 bg-dark-800 p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => setInput(action)}
                className="rounded-full border border-dark-600 px-3 py-1 text-xs text-dark-200 hover:border-metro-orange hover:text-metro-orange transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Describe the task for OpenClaw..."
            className="w-full min-h-[140px] rounded-xl border border-dark-600 bg-dark-900 p-4 text-sm text-dark-100 placeholder:text-dark-500 focus:outline-none focus:border-metro-orange"
          />
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-dark-400">
              Example: “Ship babes-club-website --live” or “Edit hero copy on Nash site.”
            </p>
            <button
              type="button"
              onClick={sendMessage}
              className="rounded-full bg-metro-orange px-5 py-2 text-sm font-semibold text-dark-900 hover:bg-metro-orange/80 transition-colors disabled:opacity-60"
              disabled={isSending}
            >
              {isSending ? "Sending..." : "Send to OpenClaw"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingAssist;
