import React, { useState } from "react";
import {
  BusinessHoursForm,
  type BusinessHoursInput,
} from "./BusinessHoursForm";

interface BusinessHoursTabProps {
  businessId: string;
  isLoading: boolean;
  isSaving: boolean;
}

export const LocationsAndHoursTab: React.FC<BusinessHoursTabProps> = ({
  businessId,
  isLoading,
  isSaving,
}) => {
  const [hours, setHours] = useState<BusinessHoursInput[]>([]);

  return (
    <div className="space-y-8">
      {/* Business Hours Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Business Hours
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Set your general operating hours for each day of the week. Helps
          customers know when you're available.
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
