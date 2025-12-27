import React from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";

export const LocalSEOPhotos: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">Local SEO Photos</h1>
      {!selectedBusiness ? (
        <p className="text-dark-400 mt-2">
          Select a business to upload photos.
        </p>
      ) : (
        <p className="text-dark-400 mt-2">
          Photo uploads for: {selectedBusiness}
        </p>
      )}
    </DashboardLayout>
  );
};

export default LocalSEOPhotos;
