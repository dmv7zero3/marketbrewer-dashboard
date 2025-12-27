import React, { useMemo } from "react";
import { SocialLinksForm, type SocialLinkInput } from "./SocialLinksForm";
import type { QuestionnaireDataStructure } from "@marketbrewer/shared";
import type { SocialPlatform } from "@marketbrewer/shared";

interface SocialLinksTabProps {
  isSaving: boolean;
  socialProfiles: QuestionnaireDataStructure["socialProfiles"];
  onSocialProfilesChange: (profiles: QuestionnaireDataStructure["socialProfiles"]) => void;
}

export const SocialLinksTab: React.FC<SocialLinksTabProps> = ({
  isSaving,
  socialProfiles,
  onSocialProfilesChange,
}) => {
  // Convert socialProfiles object to SocialLinkInput array for the form
  const socialLinks: SocialLinkInput[] = useMemo(() => {
    if (!socialProfiles) return [];
    return Object.entries(socialProfiles)
      .filter(([_, url]) => url && url.trim() !== "")
      .map(([platform, url]) => ({
        platform: platform as SocialPlatform,
        url: url as string,
      }));
  }, [socialProfiles]);

  // Convert SocialLinkInput array back to socialProfiles object
  const handleSocialLinksChange = (links: SocialLinkInput[]) => {
    // Start with current profiles or empty defaults
    const newProfiles: QuestionnaireDataStructure["socialProfiles"] = {
      instagram: "",
      facebook: "",
      twitter: "",
      linkedin: "",
      google: "",
      linktree: "",
      youtube: "",
      tiktok: "",
      yelp: "",
    };

    // Populate with values from links array
    links.forEach((link) => {
      if (newProfiles) {
        newProfiles[link.platform] = link.url;
      }
    });

    onSocialProfilesChange(newProfiles);
  };

  return (
    <div className="space-y-8">
      {/* Social Media Section */}
      <section>
        <h3 className="text-lg font-semibold text-dark-100 mb-4">
          Social Media Links
        </h3>
        <p className="text-sm text-dark-400 mb-6">
          Connect your social media profiles. This helps with brand awareness
          and customer engagement across platforms.
        </p>
        <SocialLinksForm
          value={socialLinks}
          onChange={handleSocialLinksChange}
          disabled={isSaving}
        />
      </section>

      {/* Future Social Features */}
      <section className="border-t pt-8">
        <h3 className="text-lg font-semibold text-dark-100 mb-4">
          Social Presence Tips
        </h3>
        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
          <div className="flex gap-3">
            <span className="text-xl">📱</span>
            <div>
              <p className="font-medium text-dark-100">Keep it consistent</p>
              <p className="text-sm text-dark-400">
                Use the same business name and branding across all platforms
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl">🔗</span>
            <div>
              <p className="font-medium text-dark-100">
                Link back to your site
              </p>
              <p className="text-sm text-dark-400">
                Include your website URL in all social profiles
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl">👥</span>
            <div>
              <p className="font-medium text-dark-100">Engage with followers</p>
              <p className="text-sm text-dark-400">
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
