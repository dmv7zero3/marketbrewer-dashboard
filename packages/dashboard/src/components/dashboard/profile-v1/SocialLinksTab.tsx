import React, { useState } from "react";
import { SocialLinksForm, type SocialLinkInput } from "./SocialLinksForm";

interface SocialLinksTabProps {
  isSaving: boolean;
}

export const SocialLinksTab: React.FC<SocialLinksTabProps> = ({ isSaving }) => {
  const [socialLinks, setSocialLinks] = useState<SocialLinkInput[]>([]);

  return (
    <div className="space-y-8">
      {/* Social Media Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Social Media Links
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Connect your social media profiles. This helps with brand awareness
          and customer engagement across platforms.
        </p>
        <SocialLinksForm
          value={socialLinks}
          onChange={setSocialLinks}
          disabled={isSaving}
        />
      </section>

      {/* Future Social Features */}
      <section className="border-t pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Social Presence Tips
        </h3>
        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
          <div className="flex gap-3">
            <span className="text-xl">📱</span>
            <div>
              <p className="font-medium text-gray-900">Keep it consistent</p>
              <p className="text-sm text-gray-600">
                Use the same business name and branding across all platforms
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl">🔗</span>
            <div>
              <p className="font-medium text-gray-900">
                Link back to your site
              </p>
              <p className="text-sm text-gray-600">
                Include your website URL in all social profiles
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl">👥</span>
            <div>
              <p className="font-medium text-gray-900">Engage with followers</p>
              <p className="text-sm text-gray-600">
                Regular posting and engagement boost your local SEO
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SocialLinksTab;
