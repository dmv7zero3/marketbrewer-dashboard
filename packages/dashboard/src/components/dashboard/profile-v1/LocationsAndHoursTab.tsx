import React, { useState } from "react";
import { LocationForm, type LocationInput } from "./LocationForm";
import {
  BusinessHoursForm,
  type BusinessHoursInput,
} from "./BusinessHoursForm";

interface LocationsAndHoursTabProps {
  businessId: string;
  isLoading: boolean;
  isSaving: boolean;
}

export const LocationsAndHoursTab: React.FC<LocationsAndHoursTabProps> = ({
  businessId,
  isLoading,
  isSaving,
}) => {
  const [locations, setLocations] = useState<LocationInput[]>([]);
  const [hours, setHours] = useState<BusinessHoursInput[]>([]);

  return (
    <div className="space-y-8">
      {/* Service Locations Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Service Locations
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Add all physical locations where you operate, including address,
          location type, and whether it's your primary location.
        </p>
        <LocationForm
          value={locations}
          disabled={isSaving}
          onChange={setLocations}
        />
      </section>

      {/* Business Hours Section */}
      <section className="border-t pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Business Hours
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Set your operating hours for each day of the week. Helps customers
          know when you're available.
        </p>
        <BusinessHoursForm
          value={hours}
          disabled={isSaving}
          onChange={setHours}
        />
      </section>
    </div>
  );
};

export default LocationsAndHoursTab;
