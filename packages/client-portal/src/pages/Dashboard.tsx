import React from "react";

export const Dashboard: React.FC = () => (
  <section className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="text-slate-400">Track your campaigns, reporting, and billing status.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-lg border border-dark-800 bg-dark-900 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Active Locations</p>
        <p className="mt-2 text-2xl font-semibold">0</p>
        <p className="text-xs text-slate-500">Connect your business to load data.</p>
      </div>
      <div className="rounded-lg border border-dark-800 bg-dark-900 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">SEO Tasks</p>
        <p className="mt-2 text-2xl font-semibold">0</p>
        <p className="text-xs text-slate-500">Your queue will appear here.</p>
      </div>
      <div className="rounded-lg border border-dark-800 bg-dark-900 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Next Invoice</p>
        <p className="mt-2 text-2xl font-semibold">—</p>
        <p className="text-xs text-slate-500">Stripe sync coming next.</p>
      </div>
    </div>
  </section>
);
