import React from "react";
import { Business } from "@marketbrewer/shared";
import { BusinessDetailsForm } from "../BusinessDetailsForm";
import { PrimaryLocationCard } from "./PrimaryLocationCard";
import { GoogleBusinessProfileCard } from "./GoogleBusinessProfileCard";

interface EssentialsTabProps {
  business: Business | null;
  validationErrors: Record<string, string | null>;
  onChange: (business: Business) => void;
  disabled: boolean;
}

export const EssentialsTab: React.FC<EssentialsTabProps> = ({
  business,
  validationErrors,
  onChange,
  disabled,
}) => {
  if (!business) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading business details...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ============================================ */}
      {/* SECTION 1: Business Details (Core Identity) */}
      {/* ============================================ */}
      <section id="business-details">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Business Details
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Core information about your business including name, industry, and
          contact details.
        </p>
        <BusinessDetailsForm
          business={business}
          validationErrors={validationErrors}
          onChange={onChange}
          disabled={disabled}
        />
      </section>

      {/* ============================================ */}
      {/* SECTION 2: Primary Location */}
      {/* ============================================ */}
      <section id="primary-location" className="border-t pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Primary Location
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Your main business location used for local SEO targeting.
        </p>
        <PrimaryLocationCard
          business={business}
          validationErrors={validationErrors}
          onChange={onChange}
          disabled={disabled}
        />
      </section>

      {/* ============================================ */}
      {/* SECTION 3: Google Business Profile */}
      {/* ============================================ */}
      <section id="google-business-profile" className="border-t pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Google Business Profile
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Link your Google Business Profile for verification and local SEO
          benefits.
        </p>
        <GoogleBusinessProfileCard
          business={business}
          validationErrors={validationErrors}
          onChange={onChange}
          disabled={disabled}
        />
      </section>
    </div>
  );
};

export default EssentialsTab;
