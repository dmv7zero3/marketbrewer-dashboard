import React from "react";
import { DashboardLayout } from "./DashboardLayout";

const KEY_PATTERNS = [
  { label: "Business", pk: "BUSINESS", sk: "BUSINESS#{businessId}" },
  { label: "Questionnaire", pk: "BUSINESS#{businessId}", sk: "QUESTIONNAIRE" },
  { label: "Keyword", pk: "BUSINESS#{businessId}", sk: "KEYWORD#{keywordId}" },
  { label: "Service Area", pk: "BUSINESS#{businessId}", sk: "SERVICE_AREA#{areaId}" },
  { label: "SEO Location", pk: "BUSINESS#{businessId}", sk: "LOCATION#{locationId}" },
  { label: "Profile Location", pk: "BUSINESS#{businessId}", sk: "PROFILE_LOCATION#{locationId}" },
  { label: "Business Hours", pk: "BUSINESS#{businessId}", sk: "HOURS" },
  { label: "Social Link", pk: "BUSINESS#{businessId}", sk: "SOCIAL#{platform}" },
  { label: "Prompt", pk: "BUSINESS#{businessId}", sk: "PROMPT#{promptId}" },
  { label: "Job", pk: "BUSINESS#{businessId}", sk: "JOB#{jobId}" },
  { label: "Job Page", pk: "JOB#{jobId}", sk: "PAGE#{pageId}" },
  { label: "Job Cost", pk: "JOB#{jobId}", sk: "COST#{timestamp}#{uuid}" },
  { label: "Webhook", pk: "WEBHOOK", sk: "WEBHOOK#{webhookId}" },
];

export const DataStorageOverview: React.FC = () => {
  return (
    <DashboardLayout title="Data Storage">
      <div className="space-y-6">
        <section className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-dark-100">Single Table, Predictable Keys</h2>
          <p className="text-sm text-dark-400 mt-2">
            MarketBrewer stores all dashboard data in one DynamoDB table. Consistency comes from
            deterministic PK/SK patterns that every service and UI feature follows.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
            <div className="bg-dark-950 border border-dark-700 rounded-lg p-4">
              <div className="text-dark-100 font-semibold mb-1">Partition Keys (PK)</div>
              <p className="text-dark-400">
                Group by business or job to keep related items queryable in one read path.
              </p>
            </div>
            <div className="bg-dark-950 border border-dark-700 rounded-lg p-4">
              <div className="text-dark-100 font-semibold mb-1">Sort Keys (SK)</div>
              <p className="text-dark-400">
                Define item type and identity for precise reads or prefix scans.
              </p>
            </div>
            <div className="bg-dark-950 border border-dark-700 rounded-lg p-4">
              <div className="text-dark-100 font-semibold mb-1">Immutable Events</div>
              <p className="text-dark-400">
                Cost ledger entries and jobs are append-only to preserve history.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <h3 className="text-base font-semibold text-dark-100 mb-4">Key Patterns</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-dark-700 rounded-lg overflow-hidden">
              <thead className="bg-dark-950">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">
                    PK
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">
                    SK
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800 bg-dark-900">
                {KEY_PATTERNS.map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 py-3 text-dark-100 font-medium">{row.label}</td>
                    <td className="px-4 py-3 text-dark-300 font-mono">{row.pk}</td>
                    <td className="px-4 py-3 text-dark-300 font-mono">{row.sk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <h3 className="text-base font-semibold text-dark-100 mb-4">Consistency Rules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-dark-950 border border-dark-700 rounded-lg p-4">
              <div className="text-dark-100 font-semibold mb-2">Write Paths</div>
              <ul className="space-y-2 text-dark-400">
                <li>Use the same PK for all entities related to a business.</li>
                <li>Prefix SK with a stable entity tag (JOB#, KEYWORD#, PROMPT#).</li>
                <li>Keep timestamps on every mutable entity for auditability.</li>
              </ul>
            </div>
            <div className="bg-dark-950 border border-dark-700 rounded-lg p-4">
              <div className="text-dark-100 font-semibold mb-2">Read Paths</div>
              <ul className="space-y-2 text-dark-400">
                <li>List views query by PK + begins_with(SK, prefix).</li>
                <li>Job pages use PK = JOB#&lt;jobId&gt; for fast page scans.</li>
                <li>Webhook delivery reads from PK = WEBHOOK.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default DataStorageOverview;
