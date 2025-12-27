import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../../contexts/BusinessContext";
import { useToast } from "../../contexts/ToastContext";
import {
  validateBusinessName,
  validateIndustry,
  validateURL,
  validatePhone,
  validateEmail,
} from "../../lib/validation";

interface AddBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBusinessModal: React.FC<AddBusinessModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addBusiness, setSelectedBusiness } = useBusiness();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    industry: "",
    website: "",
    phone: "",
    email: "",
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const nextErrors = {
      name: validateBusinessName(form.name),
      industry: validateIndustry(form.industry),
      website: form.website ? validateURL(form.website) : null,
      phone: form.phone ? validatePhone(form.phone) : null,
      email: form.email ? validateEmail(form.email) : null,
    };
    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSubmit = async (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const business = await addBusiness({
        name: form.name.trim(),
        industry: form.industry.trim(),
        website: form.website.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      setSelectedBusiness(business.id);
      addToast("Business created", "success");
      onClose();
      navigate("/dashboard/business-profile");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create business";
      addToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (
    key: keyof typeof form,
    label: string,
    required?: boolean
  ) => (
    <div>
      <label className="block text-sm font-medium text-dark-300 mb-1">
        {label}
        {required && <span className="text-metro-red ml-1">*</span>}
      </label>
      <input
        type={key === "email" ? "email" : "text"}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={`w-full bg-dark-800 border rounded-lg px-3 py-2 text-dark-100 placeholder:text-dark-500
                   focus:ring-2 focus:ring-metro-orange focus:border-metro-orange transition-colors ${
          errors[key] ? "border-metro-red" : "border-dark-600"
        }`}
        placeholder={label}
      />
      {errors[key] && (
        <p className="text-metro-red text-xs mt-1">{errors[key]}</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-dark-800 border border-dark-700 rounded-lg shadow-dark-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-dark-100 mb-4">Add Business</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {renderField("name", "Business Name", true)}
          {renderField("industry", "Industry", true)}
          {renderField("website", "Website")}
          {renderField("phone", "Phone")}
          {renderField("email", "Email")}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-dark-300 hover:text-dark-100 hover:bg-dark-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-metro-orange text-dark-950 rounded-lg font-medium hover:bg-metro-orange-600 hover:shadow-glow-orange disabled:bg-dark-600 disabled:text-dark-400 transition-all"
            >
              {submitting ? "Adding..." : "Add Business"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBusinessModal;
