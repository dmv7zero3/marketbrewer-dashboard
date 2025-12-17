import React, { useEffect, useState } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";
import { listKeywords, createKeyword, deleteKeyword, updateKeyword } from "../../api/keywords";
import type { Keyword } from "@marketbrewer/shared";

export const KeywordsManagement: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedBusiness) return;
      try {
        setLoading(true);
        setError(null);
        const { keywords } = await listKeywords(selectedBusiness);
        if (!mounted) return;
        setKeywords(keywords);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load keywords";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    setKeywords([]);
    load();
    return () => {
      mounted = false;
    };
  }, [selectedBusiness]);

  const handleAdd = async () => {
    if (!selectedBusiness || !newKeyword.trim()) return;
    try {
      const { keyword } = await createKeyword(selectedBusiness, { keyword: newKeyword.trim() });
      setKeywords((prev) => [keyword, ...prev]);
      setNewKeyword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add keyword");
    }
  };

  const handleDelete = async (id: string) => {
    if (!selectedBusiness) return;
    try {
      await deleteKeyword(selectedBusiness, id);
      setKeywords((prev) => prev.filter((k) => k.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete keyword");
    }
  };

  const handleUpdatePriority = async (id: string, priority: number) => {
    if (!selectedBusiness) return;
    try {
      const { keyword } = await updateKeyword(selectedBusiness, id, { priority });
      setKeywords((prev) => prev.map((k) => (k.id === id ? keyword : k)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update keyword");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">SEO Keywords</h1>
        {!selectedBusiness ? (
          <p className="text-gray-600">Select a business to manage keywords.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                className="border rounded px-2 py-1"
                placeholder="Add keyword"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
              />
              <button
                className="bg-blue-600 text-white px-3 py-1 rounded"
                onClick={handleAdd}
                disabled={loading}
              >
                Add
              </button>
            </div>
            {error && <p className="text-red-600">{error}</p>}
            {loading ? (
              <p className="text-gray-500">Loading keywords...</p>
            ) : (
              <ul className="space-y-2">
                {keywords.map((k) => (
                  <li key={k.id} className="flex items-center justify-between border rounded p-2 bg-white">
                    <div>
                      <p className="text-gray-800">{k.keyword}</p>
                      <p className="text-gray-600 text-sm">Slug: {k.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-20"
                        value={k.priority}
                        onChange={(e) => handleUpdatePriority(k.id, parseInt(e.target.value || "0", 10))}
                      />
                      <button
                        className="text-red-600"
                        onClick={() => handleDelete(k.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default KeywordsManagement;
