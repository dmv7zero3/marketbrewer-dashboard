import React from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";

export const KeywordsManagement: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">SEO Keywords</h1>
      {!selectedBusiness ? (
        <p className="text-gray-600 mt-2">
          Select a business to manage keywords.
        </p>
      ) : (
        <p className="text-gray-600 mt-2">
          Managing keywords for: {selectedBusiness}
        </p>
      )}
    </DashboardLayout>
  );
};

export default KeywordsManagement;
