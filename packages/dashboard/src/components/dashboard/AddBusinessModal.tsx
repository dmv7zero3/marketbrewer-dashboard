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
      <label className="block text-sm font-medium mb-1">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        type={key === "email" ? "email" : "text"}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={`w-full border rounded px-3 py-2 ${
          errors[key] ? "border-red-500" : ""
        }`}
        placeholder={label}
      />
      {errors[key] && (
        <p className="text-red-500 text-xs mt-1">{errors[key]}</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Add Business</h2>
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
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
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
