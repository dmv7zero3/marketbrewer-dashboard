import React, { useEffect, useState } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";
import { useToast } from "../../contexts/ToastContext";
import {
  listKeywords,
  createKeyword,
  deleteKeyword,
  updateKeyword,
} from "../../api/keywords";
import { validateKeyword } from "../../lib/validation";
import { toSlug } from "@marketbrewer/shared";
import type { Keyword, SearchIntent } from "@marketbrewer/shared";

type TabName = "manage" | "bulk-add" | "instructions";

const TABS: { name: TabName; label: string }[] = [
  { name: "manage", label: "Manage" },
  { name: "bulk-add", label: "Bulk Add" },
  { name: "instructions", label: "Instructions" },
];

export const KeywordsManagement: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabName>("manage");
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

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

    const validationError = validateKeyword(newKeyword);
    if (validationError) {
      setInputError(validationError);
      addToast(validationError, "error", 5000);
      return;
    }

    // Check for duplicates
    const exists = keywords.some(
      (k) => k.keyword.toLowerCase() === newKeyword.trim().toLowerCase()
    );
    if (exists) {
      setInputError("This keyword already exists");
      addToast("This keyword already exists", "error", 5000);
      return;
    }

    try {
      setInputError(null);
      const { keyword } = await createKeyword(selectedBusiness, {
        keyword: newKeyword.trim(),
      });
      setKeywords((prev) => [keyword, ...prev]);
      setNewKeyword("");
      addToast("Keyword added successfully", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to add keyword";
      addToast(msg, "error", 5000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!selectedBusiness || deletingIds.has(id)) return;
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deleteKeyword(selectedBusiness, id);
      setKeywords((prev) => prev.filter((k) => k.id !== id));
      addToast("Keyword deleted successfully", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete keyword";
      addToast(msg, "error", 5000);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleUpdatePriority = async (id: string, priority: number) => {
    if (!selectedBusiness || updatingIds.has(id)) return;
    setUpdatingIds((prev) => new Set(prev).add(id));
    try {
      const { keyword } = await updateKeyword(selectedBusiness, id, {
        priority,
      });
      setKeywords((prev) => prev.map((k) => (k.id === id ? keyword : k)));
      addToast("Keyword priority updated", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update keyword";
      addToast(msg, "error", 5000);
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const parseBulkKeywords = (text: string) => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Expected: keyword[, intent][, priority]
        const parts = line
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        const [keyword, intentRaw, priorityRaw] = parts;
        const search_intent = intentRaw || undefined;
        const priority = priorityRaw
          ? !Number.isNaN(Number(priorityRaw))
            ? Number(priorityRaw)
            : undefined
          : undefined;
        return { keyword, search_intent, priority };
      })
      .filter((k) => k.keyword) as Array<{
      keyword: string;
      search_intent?: string;
      priority?: number;
    }>;
  };

  const handleBulkAdd = async () => {
    if (!selectedBusiness) {
      addToast("Select a business before adding keywords.", "error", 4000);
      return;
    }
    const parsed = parseBulkKeywords(bulkText);
    if (parsed.length > 100) {
      addToast("Maximum 100 keywords per operation", "error", 5000);
      return;
    }
    if (parsed.length === 0) {
      addToast(
        "No valid keyword lines found. Use 'keyword[, intent][, priority]' format.",
        "error",
        4000
      );
      return;
    }
    try {
      setBulkLoading(true);

      let existingSlugs: Set<string> = new Set();
      try {
        const { keywords: existing } = await listKeywords(selectedBusiness);
        existingSlugs = new Set(existing.map((k) => k.slug));
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to fetch existing keywords";
        addToast(
          `Warning: Could not check for duplicates. ${msg}`,
          "warning",
          4000
        );
      }

      const newKeywords = parsed.filter((kw) => {
        const slug = toSlug(kw.keyword);
        return !existingSlugs.has(slug);
      });

      const duplicates = parsed.length - newKeywords.length;
      if (duplicates > 0) {
        addToast(
          `Skipping ${duplicates} duplicate keyword(s)`,
          "warning",
          3000
        );
      }

      if (newKeywords.length === 0) {
        addToast("All keywords are already in your list.", "info", 3000);
        setBulkText("");
        return;
      }

      const results: {
        success: typeof parsed;
        failed: typeof parsed;
      } = {
        success: [],
        failed: [],
      };

      for (const kw of newKeywords) {
        try {
          await createKeyword(selectedBusiness, {
            keyword: kw.keyword,
            search_intent: kw.search_intent ?? null,
            priority: kw.priority,
          });
          results.success.push(kw);
        } catch (e) {
          results.failed.push(kw);
        }
      }

      if (results.success.length > 0) {
        addToast(
          `Added ${results.success.length} keyword(s).${
            results.failed.length > 0 ? ` ${results.failed.length} failed.` : ""
          }`,
          results.failed.length > 0 ? "warning" : "success",
          4000
        );
        // Reload keywords to refresh the list
        const { keywords: refreshed } = await listKeywords(selectedBusiness);
        setKeywords(refreshed);
      } else if (results.failed.length > 0) {
        addToast("All keywords failed to add.", "error", 5000);
      }

      // Keep only failed lines for retry
      if (results.failed.length > 0) {
        setBulkText(
          results.failed
            .map((k) =>
              [k.keyword, k.search_intent, k.priority]
                .filter(Boolean)
                .join(", ")
            )
            .join("\n")
        );
      } else {
        setBulkText("");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to add keywords";
      addToast(msg, "error", 5000);
    } finally {
      setBulkLoading(false);
    }
  };

  const renderManageTab = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          className={`border rounded px-2 py-1 flex-1 ${
            inputError ? "border-red-500" : ""
          }`}
          placeholder="Add keyword"
          value={newKeyword}
          onChange={(e) => {
            setNewKeyword(e.target.value);
            setInputError(null);
          }}
        />
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={handleAdd}
          disabled={loading}
        >
          Add
        </button>
      </div>
      {inputError && <p className="text-red-600 text-sm">{inputError}</p>}
      {error && <p className="text-red-600">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Loading keywords...</p>
      ) : (
        <ul className="space-y-2">
          {keywords.map((k) => (
            <li
              key={k.id}
              className="flex items-center justify-between border rounded p-2 bg-white"
            >
              <div>
                <p className="text-gray-800">{k.keyword}</p>
                <p className="text-gray-600 text-sm">Slug: {k.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="border rounded px-2 py-1 w-20"
                  value={k.priority}
                  onChange={(e) =>
                    handleUpdatePriority(
                      k.id,
                      parseInt(e.target.value || "0", 10)
                    )
                  }
                />
                <button
                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                  onClick={() => handleDelete(k.id)}
                  disabled={deletingIds.has(k.id)}
                >
                  {deletingIds.has(k.id) ? "Deleting..." : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderBulkAddTab = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Paste keywords (one per line)
        </label>
        <p className="text-sm text-gray-600">
          Format: keyword[, intent][, priority]
        </p>
        <textarea
          className="border rounded p-2 w-full font-mono text-sm"
          rows={12}
          placeholder="best fried chicken&#10;nashville hot chicken, informational, 100&#10;chicken sandwich near me, commercial"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          disabled={bulkLoading}
        />
      </div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        onClick={handleBulkAdd}
        disabled={bulkLoading || !bulkText.trim()}
      >
        {bulkLoading ? "Adding..." : "Add Keywords"}
      </button>
      <div className="text-sm text-gray-600 space-y-1">
        <p>• Invalid or duplicate lines are skipped</p>
        <p>• Duplicates detected by slug</p>
        <p>• Maximum 100 keywords per operation</p>
      </div>
    </div>
  );

  const renderInstructionsTab = () => (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What data exists</h2>
        <ul className="pl-6 text-gray-800 list-disc">
          <li>
            <span className="font-medium">Keyword</span> — required, plain
            string (e.g., "best fried chicken")
          </li>
          <li>
            <span className="font-medium">Search Intent</span> — optional,
            string (e.g., "informational", "commercial", "transactional")
          </li>
          <li>
            <span className="font-medium">Priority</span> — integer; higher
            values surface first in content generation
          </li>
          <li>
            <span className="font-medium">Slug</span> — derived from keyword
            using `toKeywordSlug()`; used for de-duplication
          </li>
          <li>
            <span className="font-medium">Timestamps</span> — `created_at`
            stored by the API
          </li>
        </ul>
        <p className="text-sm text-gray-600">
          Type source: `Keyword` in shared types.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recommended data</h2>
        <ul className="pl-6 text-gray-800 list-disc">
          <li>
            Maintain 20–100 keywords per business depending on content strategy.
          </li>
          <li>
            Use specific, long-tail keywords for better targeting (e.g.,
            "nashville hot chicken near me" vs "chicken")
          </li>
          <li>
            Use `priority` to influence content generation order (e.g., 100 for
            money keywords, 10 for informational)
          </li>
          <li>
            Include search intent when known to help with content optimization
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Bulk paste format</h2>
        <p className="text-gray-700">Use one of the following line formats:</p>
        <div className="p-3 text-sm border rounded bg-gray-50">
          <p>keyword</p>
          <p>keyword, intent</p>
          <p>keyword, intent, priority</p>
        </div>
        <ul className="pl-6 text-gray-800 list-disc">
          <li>
            Invalid or duplicate lines are skipped with an info/warning toast.
          </li>
          <li>Duplicates are detected by slug (normalized keyword).</li>
          <li>Max per operation: 100 lines.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Validation rules</h2>
        <ul className="pl-6 text-gray-800 list-disc">
          <li>Keyword must be non-empty and pass basic validation.</li>
          <li>Search intent is optional and stored as-is.</li>
          <li>
            Priority must be a number if provided; non-numeric values are
            ignored.
          </li>
          <li>
            Duplicate slugs are rejected to prevent multiple entries for the
            same keyword.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Current data snapshot</h2>
        {selectedBusiness ? (
          loading ? (
            <p className="text-gray-600">Loading keywords…</p>
          ) : (
            <div className="text-gray-800">
              <p>
                <span className="font-medium">Business ID:</span>{" "}
                {selectedBusiness}
              </p>
              <p>
                <span className="font-medium">Keywords:</span> {keywords.length}
              </p>
            </div>
          )
        ) : (
          <p className="text-gray-600">
            Select a business to view counts and details.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Usage notes</h2>
        <ul className="pl-6 text-gray-800 list-disc">
          <li>
            Keywords drive keyword-location pair generation for SEO pages.
          </li>
          <li>
            Priorities help schedule generation jobs and order content in UIs.
          </li>
          <li>
            Use the Bulk Add tab for quick imports; manage fine-tuning in the
            Manage tab.
          </li>
        </ul>
      </section>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">SEO Keywords</h1>
        {!selectedBusiness ? (
          <p className="text-gray-600">Select a business to manage keywords.</p>
        ) : (
          <>
            <div className="border-b border-gray-200">
              <nav className="flex gap-4" aria-label="Tabs">
                {TABS.map((tab) => (
                  <button
                    key={tab.name}
                    onClick={() => setActiveTab(tab.name)}
                    className={`px-3 py-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.name
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="pt-2">
              {activeTab === "manage" && renderManageTab()}
              {activeTab === "bulk-add" && renderBulkAddTab()}
              {activeTab === "instructions" && renderInstructionsTab()}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default KeywordsManagement;
