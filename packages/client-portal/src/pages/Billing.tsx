import React from "react";

export const Billing: React.FC = () => (
  <section className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold">Billing</h1>
      <p className="text-slate-400">Stripe invoices, payment methods, and subscription details.</p>
    </div>
    <div className="rounded-lg border border-dark-800 bg-dark-900 p-6">
      <p className="text-sm text-slate-300">
        Stripe customer portal and invoice history will appear here.
      </p>
    </div>
  </section>
);
