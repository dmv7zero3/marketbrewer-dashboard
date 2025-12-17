import React from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";

export const PromptsManagement: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">Prompt Management</h1>
      {!selectedBusiness ? (
        <p className="text-gray-600 mt-2">
          Select a business to manage prompts.
        </p>
      ) : (
        <p className="text-gray-600 mt-2">
          Managing prompts for: {selectedBusiness}
        </p>
      )}
    </DashboardLayout>
  );
};

export default PromptsManagement;
