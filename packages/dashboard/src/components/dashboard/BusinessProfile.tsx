import React, { useEffect, useState } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";
import {
  getBusiness,
  updateBusiness,
  getQuestionnaire,
  updateQuestionnaire,
} from "../../api/businesses";
import type { Business, Questionnaire } from "@marketbrewer/shared";

export const BusinessProfile: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  const [business, setBusiness] = useState<Business | null>(null);
  const [questionnaire, setQuestionnaire] = useState<
    (Questionnaire & { data: Record<string, unknown> }) | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [savingBiz, setSavingBiz] = useState(false);
  const [savingQ, setSavingQ] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qText, setQText] = useState<string>("{}");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedBusiness) return;
      try {
        setLoading(true);
        setError(null);
        const [{ business }, { questionnaire }] = await Promise.all([
          getBusiness(selectedBusiness),
          getQuestionnaire(selectedBusiness),
        ]);
        if (!mounted) return;
        setBusiness(business);
        setQuestionnaire(questionnaire);
        setQText(JSON.stringify(questionnaire.data ?? {}, null, 2));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load profile";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    setBusiness(null);
    setQuestionnaire(null);
    setQText("{}");
    load();
    return () => {
      mounted = false;
    };
  }, [selectedBusiness]);

  const handleBizChange = (field: keyof Business, value: string) => {
    if (!business) return;
    setBusiness({ ...business, [field]: value });
  };

  const handleSaveBusiness = async () => {
    if (!selectedBusiness || !business) return;
    try {
      setSavingBiz(true);
      setError(null);
      const payload = {
        name: business.name,
        industry: business.industry,
        website: business.website ?? null,
        phone: business.phone ?? null,
        email: business.email ?? null,
      };
      const { business: updated } = await updateBusiness(
        selectedBusiness,
        payload
      );
      setBusiness(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save business";
      setError(msg);
    } finally {
      setSavingBiz(false);
    }
  };

  const handleSaveQuestionnaire = async () => {
    if (!selectedBusiness) return;
    try {
      setSavingQ(true);
      setError(null);
      let dataObj: Record<string, unknown> = {};
      try {
        dataObj = JSON.parse(qText || "{}");
      } catch (parseErr) {
        setError("Questionnaire JSON is invalid");
        setSavingQ(false);
        return;
      }
      const { questionnaire: updated } = await updateQuestionnaire(
        selectedBusiness,
        dataObj
      );
      setQuestionnaire(updated);
      setQText(JSON.stringify(updated.data ?? {}, null, 2));
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to save questionnaire";
      setError(msg);
    } finally {
      setSavingQ(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Business Profile</h1>
        {!selectedBusiness ? (
          <p className="text-gray-600">
            Select a business to manage its profile.
          </p>
        ) : loading ? (
          <p className="text-gray-500">Loading profile...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Business details */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Details</h2>
              <label className="block text-sm">Name</label>
              <input
                className="border rounded px-2 py-1 w-full"
                value={business?.name ?? ""}
                onChange={(e) => handleBizChange("name", e.target.value)}
              />
              <label className="block text-sm">Industry</label>
              <input
                className="border rounded px-2 py-1 w-full"
                value={business?.industry ?? ""}
                onChange={(e) => handleBizChange("industry", e.target.value)}
              />
              <label className="block text-sm">Website</label>
              <input
                className="border rounded px-2 py-1 w-full"
                value={business?.website ?? ""}
                onChange={(e) => handleBizChange("website", e.target.value)}
              />
              <label className="block text-sm">Phone</label>
              <input
                className="border rounded px-2 py-1 w-full"
                value={business?.phone ?? ""}
                onChange={(e) => handleBizChange("phone", e.target.value)}
              />
              <label className="block text-sm">Email</label>
              <input
                className="border rounded px-2 py-1 w-full"
                value={business?.email ?? ""}
                onChange={(e) => handleBizChange("email", e.target.value)}
              />
              <button
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                onClick={handleSaveBusiness}
                disabled={savingBiz}
              >
                {savingBiz ? "Saving..." : "Save Profile"}
              </button>
            </div>

            {/* Questionnaire */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Questionnaire</h2>
                {questionnaire && (
                  <span className="text-sm text-gray-600">
                    Completeness: {questionnaire.completeness_score}%
                  </span>
                )}
              </div>
              <textarea
                className="border rounded px-2 py-1 w-full min-h-[240px] font-mono text-sm"
                value={qText}
                onChange={(e) => setQText(e.target.value)}
              />
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                onClick={handleSaveQuestionnaire}
                disabled={savingQ}
              >
                {savingQ ? "Saving..." : "Save Questionnaire"}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BusinessProfile;
