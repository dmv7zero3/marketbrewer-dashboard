import React, { useMemo, useState } from "react";
import { DashboardLayout } from "./DashboardLayout";

type RoadmapTab = "now" | "next" | "later" | "backlog";

const TABS: Array<{ key: RoadmapTab; label: string }> = [
  { key: "now", label: "Now" },
  { key: "next", label: "Next" },
  { key: "later", label: "Later" },
  { key: "backlog", label: "Backlog" },
];

type RoadmapItem = {
  title: string;
  items: string[];
  owner?: string;
  target?: string;
  status: "planned" | "in-progress" | "blocked" | "shipped";
};

const ROADMAP_CONTENT: Record<RoadmapTab, RoadmapItem[]> = {
  now: [
    {
      title: "Core Platform",
      status: "in-progress",
      owner: "MarketBrewer Ops",
      target: "This week",
      items: [
        "Finalize production API domain at api.marketbrewer.com",
        "Confirm Google Workspace OAuth client for GIS login",
        "Deploy serverless stack (API + worker) with Claude tokens",
      ],
    },
    {
      title: "Client Operations",
      status: "in-progress",
      owner: "Operations",
      target: "This week",
      items: [
        "Business profile + locations + hours flow",
        "Job tracking with immutable cost ledger",
        "Prompt templates and preview flows",
      ],
    },
    {
      title: "Dashboard UX",
      status: "planned",
      owner: "Product",
      target: "This week",
      items: [
        "Roadmap tab for internal visibility",
        "Polish navigation + error states",
      ],
    },
  ],
  next: [
    {
      title: "Stripe Experience",
      status: "planned",
      owner: "Billing",
      target: "Next sprint",
      items: [
        "Stripe customer + subscription lifecycle",
        "Usage-based add-ons per generation",
        "Customer billing portal flow",
      ],
    },
    {
      title: "Reporting",
      status: "planned",
      owner: "Analytics",
      target: "Next sprint",
      items: [
        "Cost dashboard by business + job",
        "Job performance summary cards",
        "Downloadable job outputs",
      ],
    },
  ],
  later: [
    {
      title: "Platform Expansion",
      status: "planned",
      owner: "Leadership",
      target: "Q2",
      items: [
        "Role-based access (admin vs operator)",
        "Client portal (read-only KPI view)",
        "Automations for recurring jobs",
      ],
    },
    {
      title: "Integrations",
      status: "planned",
      owner: "Partnerships",
      target: "Q2",
      items: [
        "CRM exports",
        "GBP/GSC data ingest",
        "Webhook support",
      ],
    },
  ],
  backlog: [
    {
      title: "Ideas + R&D",
      status: "planned",
      owner: "R&D",
      target: "When ready",
      items: [
        "Multi-region support",
        "Advanced content QA workflows",
        "Audit trail for all generation edits",
      ],
    },
  ],
};

export const Roadmap: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RoadmapTab>("now");
  const statusStyles = useMemo(
    () => ({
      planned: "bg-dark-800 text-dark-300",
      "in-progress": "bg-metro-orange/15 text-metro-orange",
      blocked: "bg-metro-red/15 text-metro-red",
      shipped: "bg-emerald-500/10 text-emerald-300",
    }),
    []
  );

  return (
    <DashboardLayout title="Dashboard Roadmap">
      <div className="space-y-6">
        <section className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-dark-100">Execution Plan</h2>
              <p className="text-sm text-dark-400">
                Internal roadmap for MarketBrewer’s client management dashboard.
              </p>
            </div>
            <div className="flex gap-2 text-xs text-dark-400">
              <span className="px-2.5 py-1 rounded-full bg-dark-800">
                Owner: MarketBrewer Ops
              </span>
              <span className="px-2.5 py-1 rounded-full bg-dark-800">
                Updated: {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>

          <nav className="flex flex-wrap gap-3" aria-label="Roadmap tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-metro-orange text-white"
                    : "bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-dark-100"
                }`}
                aria-current={activeTab === tab.key ? "page" : undefined}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </section>

        <section className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ROADMAP_CONTENT[activeTab].map((section) => (
              <div
                key={section.title}
                className="bg-dark-950 border border-dark-700 rounded-lg p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-dark-100">
                      {section.title}
                    </h3>
                    <p className="text-xs text-dark-400">
                      {section.owner ?? "Owner TBD"} • {section.target ?? "Target TBD"}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusStyles[section.status]}`}
                  >
                    {section.status.replace("-", " ")}
                  </span>
                </div>
                <ul className="space-y-2 text-sm text-dark-300">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-metro-orange">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Roadmap;
