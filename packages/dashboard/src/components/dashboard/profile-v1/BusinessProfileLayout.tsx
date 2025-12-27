import React, { ReactNode } from "react";
import { DashboardLayout } from "../DashboardLayout";

export type ProfileSection = "essentials" | "hours" | "social" | "content";

interface SectionItem {
  id: string;
  label: string;
  description: string;
  section: ProfileSection;
}

interface BusinessProfileLayoutProps {
  activeSection: ProfileSection;
  onSectionChange: (section: ProfileSection) => void;
  children: ReactNode;
  completenessScore?: number;
}

const PROFILE_SECTIONS: Record<ProfileSection, SectionItem[]> = {
  essentials: [
    {
      id: "business-details",
      label: "Business Details",
      description: "Name, industry, contact",
      section: "essentials",
    },
    {
      id: "primary-location",
      label: "Primary Location",
      description: "City, state for local SEO",
      section: "essentials",
    },
    {
      id: "google-business-profile",
      label: "Google Business Profile",
      description: "GBP URL for verification",
      section: "essentials",
    },
  ],
  hours: [
    {
      id: "business-hours",
      label: "Business Hours",
      description: "Operating hours",
      section: "hours",
    },
  ],
  social: [
    {
      id: "social-media",
      label: "Social Media",
      description: "Platforms & URLs",
      section: "social",
    },
  ],
  content: [
    {
      id: "identity",
      label: "Identity",
      description: "Tagline, owner, history",
      section: "content",
    },
    {
      id: "audience",
      label: "Audience",
      description: "Target description",
      section: "content",
    },
    {
      id: "brand",
      label: "Brand Voice",
      description: "Tone & communication",
      section: "content",
    },
  ],
};

const SECTION_GROUPS: Array<{
  name: ProfileSection;
  label: string;
  icon: string;
}> = [
  { name: "essentials", label: "Essentials", icon: "📋" },
  { name: "hours", label: "Business Hours", icon: "🕐" },
  { name: "social", label: "Social & Links", icon: "🔗" },
  { name: "content", label: "Content Profile", icon: "✍️" },
];

export const BusinessProfileLayout: React.FC<BusinessProfileLayoutProps> = ({
  activeSection,
  onSectionChange,
  children,
  completenessScore = 0,
}) => {
  return (
    <DashboardLayout>
      <div className="pb-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold">Business Profile</h1>
          <p className="text-dark-400">
            Manage your business information and profile details for content
            generation.
          </p>
        </div>

        {/* Main container with sidebar */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky bg-dark-800 border rounded-lg shadow-sm top-4">
              <nav className="p-4 space-y-2">
                {SECTION_GROUPS.map((group) => (
                  <div key={group.name}>
                    <button
                      onClick={() => onSectionChange(group.name)}
                      className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-colors ${
                        activeSection === group.name
                          ? "bg-blue-50 text-metro-orange border-l-4 border-blue-600"
                          : "text-dark-200 hover:bg-dark-900"
                      }`}
                    >
                      <span className="mr-2">{group.icon}</span>
                      {group.label}
                    </button>

                    {/* Submenu items */}
                    {activeSection === group.name && (
                      <div className="mt-2 ml-4 space-y-1">
                        {PROFILE_SECTIONS[group.name].map((item) => (
                          <button
                            key={item.id}
                            className="w-full px-4 py-2 text-xs text-left text-dark-400 transition-colors rounded hover:bg-blue-50 hover:text-metro-orange"
                          >
                            <div className="font-medium">{item.label}</div>
                            <div className="text-xs text-dark-400">
                              {item.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>

              {/* Progress Bar */}
              <div className="p-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-dark-400">
                    Completeness
                  </span>
                  <span className="text-xs font-bold text-dark-100">
                    {completenessScore}%
                  </span>
                </div>
                <div className="w-full h-2 bg-dark-700 rounded-full">
                  <div
                    className="h-2 transition-all duration-300 bg-metro-orange rounded-full"
                    style={{ width: `${completenessScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="p-6 bg-dark-800 border rounded-lg shadow-sm">
              {children}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BusinessProfileLayout;
