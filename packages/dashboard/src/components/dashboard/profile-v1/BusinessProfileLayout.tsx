import React, { ReactNode, useState } from "react";
import { DashboardLayout } from "../DashboardLayout";

export type ProfileSection = "essentials" | "locations" | "social" | "content";

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
      id: "gbp",
      label: "Google Business Profile",
      description: "GBP URL, primary location",
      section: "essentials",
    },
  ],
  locations: [
    {
      id: "service-locations",
      label: "Service Locations",
      description: "Addresses & types",
      section: "locations",
    },
    {
      id: "business-hours",
      label: "Business Hours",
      description: "Operating hours",
      section: "locations",
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
      id: "services",
      label: "Services",
      description: "Offerings & descriptions",
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
  { name: "locations", label: "Location & Hours", icon: "📍" },
  { name: "social", label: "Social & Links", icon: "🔗" },
  { name: "content", label: "Content Profile", icon: "✍️" },
];

export const BusinessProfileLayout: React.FC<BusinessProfileLayoutProps> = ({
  activeSection,
  onSectionChange,
  children,
  completenessScore = 0,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  return (
    <DashboardLayout>
      <div className="pb-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold">Business Profile</h1>
          <p className="text-gray-600">
            Manage your business information and profile details for content
            generation.
          </p>
        </div>

        {/* Main container with sidebar */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sidebar Navigation */}
          <div className={`lg:col-span-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:col-span-0 lg:w-0 lg:overflow-hidden' : 'lg:col-span-1'}`}>
            <div className="sticky bg-white border rounded-lg shadow-sm top-4">
              {/* Collapse Toggle Button */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className={`font-semibold text-gray-900 transition-opacity ${sidebarCollapsed ? 'hidden lg:hidden' : 'block'}`}>
                  Profile Sections
                </h2>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="hidden lg:flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-colors"
                  title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {sidebarCollapsed ? (
                    <span className="text-lg">▶</span>
                  ) : (
                    <span className="text-lg">◀</span>
                  )}
                </button>
              </div>

              <nav className="p-4 space-y-2">
                {SECTION_GROUPS.map((group) => (
                  <div key={group.name}>
                    <button
                      onClick={() => onSectionChange(group.name)}
                      className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-colors ${
                        activeSection === group.name
                          ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="mr-2">{group.icon}</span>
                      <span className={`transition-opacity ${sidebarCollapsed ? 'hidden lg:hidden' : 'inline'}`}>{group.label}</span>
                    </button>

                    {/* Submenu items */}
                    {activeSection === group.name && !sidebarCollapsed && (
                      <div className="mt-2 ml-4 space-y-1">
                        {PROFILE_SECTIONS[group.name].map((item) => (
                          <button
                            key={item.id}
                            className="w-full px-4 py-2 text-xs text-left text-gray-600 transition-colors rounded hover:bg-blue-50 hover:text-blue-600"
                          >
                            <div className="font-medium">{item.label}</div>
                            <div className="text-xs text-gray-500">
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
              <div className={`p-4 border-t transition-opacity ${sidebarCollapsed ? 'hidden lg:hidden' : 'block'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-600">
                    Completeness
                  </span>
                  <span className="text-xs font-bold text-gray-900">
                    {completenessScore}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 transition-all duration-300 bg-blue-600 rounded-full"
                    style={{ width: `${completenessScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:col-span-4' : 'lg:col-span-3'}`}>
            <div className="p-6 bg-white border rounded-lg shadow-sm">
              {children}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BusinessProfileLayout;
