import React from "react";
import { QuestionnaireForm } from "../QuestionnaireForm";
import { QuestionnaireDataStructure } from "@marketbrewer/shared";

interface ContentProfileTabProps {
  data: QuestionnaireDataStructure;
  onDataChange: (data: QuestionnaireDataStructure) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  businessId?: string;
}

export const ContentProfileTab: React.FC<ContentProfileTabProps> = ({
  data,
  onDataChange,
  onSave,
  onCancel,
  isSaving,
  isLoading,
  hasUnsavedChanges,
  businessId,
}) => {
  return (
    <div className="space-y-2">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-dark-100 mb-2">
          Content Profile
        </h3>
        <p className="text-sm text-dark-400">
          Define your brand voice, target audience, services, and identity to
          tailor AI-generated content to your business needs.
        </p>
      </div>

      <QuestionnaireForm
        data={data}
        onDataChange={onDataChange}
        onSave={onSave}
        onCancel={onCancel}
        isSaving={isSaving}
        isLoading={isLoading}
        hasUnsavedChanges={hasUnsavedChanges}
        businessId={businessId}
      />
    </div>
  );
};

export default ContentProfileTab;
