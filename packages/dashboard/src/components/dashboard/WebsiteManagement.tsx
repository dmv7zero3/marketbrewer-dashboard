import React from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";

export const WebsiteManagement: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">Website Management</h1>
      {!selectedBusiness ? (
        <p className="text-gray-600 mt-2">
          Select a business to manage websites.
        </p>
      ) : (
        <p className="text-gray-600 mt-2">
          Managing websites for: {selectedBusiness}
        </p>
      )}
    </DashboardLayout>
  );
};

export default WebsiteManagement;
