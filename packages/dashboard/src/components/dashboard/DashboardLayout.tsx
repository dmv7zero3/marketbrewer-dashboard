import React from "react";
import { BusinessProvider } from "../../contexts/BusinessContext";
import { Sidebar } from "./Sidebar";

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <BusinessProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </BusinessProvider>
  );
};

export default DashboardLayout;
