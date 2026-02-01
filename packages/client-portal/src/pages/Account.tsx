import React from "react";

export const Account: React.FC = () => (
  <section className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold">Account</h1>
      <p className="text-slate-400">Manage your profile, contacts, and authorized users.</p>
    </div>
    <div className="rounded-lg border border-dark-800 bg-dark-900 p-6">
      <p className="text-sm text-slate-300">
        Client profile management and contact roles will be handled here.
      </p>
    </div>
  </section>
);
