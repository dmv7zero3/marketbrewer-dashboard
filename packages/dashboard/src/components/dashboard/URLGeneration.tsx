import React from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";

export const URLGeneration: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">URL Generation</h1>
      {!selectedBusiness ? (
        <p className="text-gray-600 mt-2">
          Select a business to generate URLs.
        </p>
      ) : (
        <p className="text-gray-600 mt-2">
          Generating URLs for: {selectedBusiness}
        </p>
      )}
    </DashboardLayout>
  );
};

export default URLGeneration;
