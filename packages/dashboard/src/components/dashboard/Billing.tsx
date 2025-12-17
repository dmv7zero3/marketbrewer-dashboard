import React from "react";
import { DashboardLayout } from "./DashboardLayout";

export const Billing: React.FC = () => {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="text-gray-600 mt-2">Billing details and usage (stub).</p>
    </DashboardLayout>
  );
};

export default Billing;
