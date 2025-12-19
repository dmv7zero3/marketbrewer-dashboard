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
import type { Keyword } from "@marketbrewer/shared";

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
  const [newKeywordEs, setNewKeywordEs] = useState("");
  const [createBilingual, setCreateBilingual] = useState(true);
  const [newLanguage, setNewLanguage] = useState<"en" | "es">("en");
  const [bulkText, setBulkText] = useState("");
  const [bulkLanguage, setBulkLanguage] = useState<"en" | "es">("en");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [languageFilter, setLanguageFilter] = useState<"all" | "en" | "es">(
    "all"
  );
  const [addingTranslationFor, setAddingTranslationFor] = useState<
    string | null
  >(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedBusiness) return;
      try {
        setLoading(true);
        setError(null);
        const { keywords } = await listKeywords(selectedBusiness);

        // Debug logging
        console.log("🔍 Fetched keywords from API:", keywords.length);
        console.log(
          "  EN keywords:",
          keywords.filter((k) => k.language === "en").length
        );
        console.log(
          "  ES keywords:",
          keywords.filter((k) => k.language === "es").length
        );
        console.log(
          "  First 3 keywords:",
          keywords.slice(0, 3).map((k) => ({
            keyword: k.keyword,
            language: k.language,
          }))
        );

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
    if (!selectedBusiness) return;

    if (createBilingual) {
      // Creating bilingual pair
      if (!newKeyword.trim() || !newKeywordEs.trim()) {
        const error = "Both English and Spanish keywords are required";
        setInputError(error);
        addToast(error, "error", 5000);
        return;
      }

      const validationErrorEn = validateKeyword(newKeyword);
      const validationErrorEs = validateKeyword(newKeywordEs);

      if (validationErrorEn) {
        setInputError(`English: ${validationErrorEn}`);
        addToast(`English: ${validationErrorEn}`, "error", 5000);
        return;
      }

      if (validationErrorEs) {
        setInputError(`Spanish: ${validationErrorEs}`);
        addToast(`Spanish: ${validationErrorEs}`, "error", 5000);
        return;
      }

      // Check for duplicates
      const existsEn = keywords.some(
        (k) =>
          k.keyword.toLowerCase() === newKeyword.trim().toLowerCase() &&
          k.language === "en"
      );
      const existsEs = keywords.some(
        (k) =>
          k.keyword.toLowerCase() === newKeywordEs.trim().toLowerCase() &&
          k.language === "es"
      );

      if (existsEn) {
        setInputError("English keyword already exists");
        addToast("English keyword already exists", "error", 5000);
        return;
      }

      if (existsEs) {
        setInputError("Spanish keyword already exists");
        addToast("Spanish keyword already exists", "error", 5000);
        return;
      }

      try {
        setInputError(null);

        // Create both keywords
        const { keyword: keywordEn } = await createKeyword(selectedBusiness, {
          keyword: newKeyword.trim(),
          language: "en",
        });

        const { keyword: keywordEs } = await createKeyword(selectedBusiness, {
          keyword: newKeywordEs.trim(),
          language: "es",
        });

        setKeywords((prev) => [keywordEn, keywordEs, ...prev]);
        setNewKeyword("");
        setNewKeywordEs("");
        addToast("Bilingual keyword pair added successfully", "success");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to add keywords";
        addToast(msg, "error", 5000);
      }
    } else {
      // Creating single language keyword
      if (!newKeyword.trim()) return;

      const validationError = validateKeyword(newKeyword);
      if (validationError) {
        setInputError(validationError);
        addToast(validationError, "error", 5000);
        return;
      }

      // Check for duplicates
      const exists = keywords.some(
        (k) =>
          k.keyword.toLowerCase() === newKeyword.trim().toLowerCase() &&
          k.language === newLanguage
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
          language: newLanguage,
        });
        setKeywords((prev) => [keyword, ...prev]);
        setNewKeyword("");
        addToast("Keyword added successfully", "success");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to add keyword";
        addToast(msg, "error", 5000);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!selectedBusiness) return;
    try {
      setDeletingIds((prev) => new Set([...prev, id]));
      await deleteKeyword(selectedBusiness, id);
      setKeywords((prev) => prev.filter((k) => k.id !== id));
      addToast("Keyword deleted", "success");
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

  const handleAddTranslation = async (
    baseKeyword: Keyword,
    translationText: string
  ) => {
    if (!selectedBusiness || !translationText.trim()) return;

    const targetLanguage = baseKeyword.language === "en" ? "es" : "en";

    const validationError = validateKeyword(translationText);
    if (validationError) {
      addToast(validationError, "error", 5000);
      return;
    }

    // Check for duplicates
    const exists = keywords.some(
      (k) =>
        k.keyword.toLowerCase() === translationText.trim().toLowerCase() &&
        k.language === targetLanguage
    );
    if (exists) {
      addToast("This keyword already exists", "error", 5000);
      return;
    }

    try {
      const { keyword } = await createKeyword(selectedBusiness, {
        keyword: translationText.trim(),
        language: targetLanguage,
      });
      setKeywords((prev) => [keyword, ...prev]);
      setAddingTranslationFor(null);
      addToast(
        `${targetLanguage === "es" ? "Spanish" : "English"} translation added`,
        "success"
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to add translation";
      addToast(msg, "error", 5000);
    }
  };

  // Helper to find if a keyword has a translation pair
  const findTranslation = (keyword: Keyword): Keyword | undefined => {
    const targetLanguage = keyword.language === "en" ? "es" : "en";
    // Look for same base keyword in other language (simplified matching by keyword text root)
    return keywords.find(
      (k) =>
        k.language === targetLanguage &&
        k.keyword.toLowerCase().replace(/[áéíóúñ]/g, (m) => {
          const map: Record<string, string> = {
            á: "a",
            é: "e",
            í: "i",
            ó: "o",
            ú: "u",
            ñ: "n",
          };
          return map[m] || m;
        }) === keyword.keyword.toLowerCase()
    );
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

  const parseBulkKeywords = (text: string) => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Expected: keyword[, intent]
        const parts = line
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        const [keyword, intentRaw] = parts;
        const search_intent = intentRaw || undefined;
        return { keyword, search_intent };
      })
      .filter((k) => k.keyword) as Array<{
      keyword: string;
      search_intent?: string;
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
        "No valid keyword lines found. Use 'keyword[, intent]' format.",
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
            language: bulkLanguage,
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
            .map((k) => [k.keyword, k.search_intent].filter(Boolean).join(", "))
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

  const renderManageTab = () => {
    // Debug logging
    console.log("🔍 Keywords Management Debug:");
    console.log("  Total keywords:", keywords.length);
    console.log("  Language filter:", languageFilter);
    console.log(
      "  EN count:",
      keywords.filter((k) => k.language === "en").length
    );
    console.log(
      "  ES count:",
      keywords.filter((k) => k.language === "es").length
    );
    console.log(
      "  Undefined language:",
      keywords.filter((k) => !k.language).length
    );

    const filteredKeywords = keywords.filter((k) => {
      if (languageFilter === "all") return true;
      return k.language === languageFilter;
    });

    console.log("  Filtered count:", filteredKeywords.length);

    const enCount = keywords.filter((k) => k.language === "en").length;
    const esCount = keywords.filter((k) => k.language === "es").length;

    return (
      <div className="space-y-3">
        {/* Bilingual Toggle */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border">
          <input
            type="checkbox"
            id="bilingual-toggle"
            checked={createBilingual}
            onChange={(e) => setCreateBilingual(e.target.checked)}
            className="w-4 h-4"
          />
          <label
            htmlFor="bilingual-toggle"
            className="text-sm font-medium text-gray-700 cursor-pointer"
          >
            Create bilingual pair (EN + ES)
          </label>
        </div>

        {/* Add Keyword Form */}
        {createBilingual ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  English
                </label>
                <input
                  className={`border rounded px-2 py-1 w-full ${
                    inputError && inputError.includes("English")
                      ? "border-red-500"
                      : ""
                  }`}
                  placeholder="e.g., criminal defense attorney"
                  value={newKeyword}
                  onChange={(e) => {
                    setNewKeyword(e.target.value);
                    setInputError(null);
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Spanish
                </label>
                <input
                  className={`border rounded px-2 py-1 w-full ${
                    inputError && inputError.includes("Spanish")
                      ? "border-red-500"
                      : ""
                  }`}
                  placeholder="e.g., abogado de defensa criminal"
                  value={newKeywordEs}
                  onChange={(e) => {
                    setNewKeywordEs(e.target.value);
                    setInputError(null);
                  }}
                />
              </div>
            </div>
            <button
              className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:opacity-50 w-full"
              onClick={handleAdd}
              disabled={loading}
            >
              Add Bilingual Pair
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <select
              className="border rounded px-2 py-1"
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value as "en" | "es")}
              aria-label="Keyword language"
            >
              <option value="en">EN</option>
              <option value="es">ES</option>
            </select>
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
        )}
        {inputError && <p className="text-red-600 text-sm">{inputError}</p>}

        {/* Language Filter */}
        <div className="flex items-center gap-2 py-2">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <button
            onClick={() => setLanguageFilter("all")}
            className={`px-3 py-1 text-sm rounded ${
              languageFilter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            All ({keywords.length})
          </button>
          <button
            onClick={() => setLanguageFilter("en")}
            className={`px-3 py-1 text-sm rounded ${
              languageFilter === "en"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            English ({enCount})
          </button>
          <button
            onClick={() => setLanguageFilter("es")}
            className={`px-3 py-1 text-sm rounded ${
              languageFilter === "es"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Spanish ({esCount})
          </button>
        </div>

        {error && <p className="text-red-600">{error}</p>}
        {loading ? (
          <p className="text-gray-500">Loading keywords...</p>
        ) : filteredKeywords.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No{" "}
            {languageFilter === "all"
              ? ""
              : languageFilter === "en"
              ? "English"
              : "Spanish"}{" "}
            keywords found.
          </p>
        ) : (
          <ul className="space-y-2">
            {filteredKeywords.map((k) => {
              const translation = findTranslation(k);
              const isAddingTranslation = addingTranslationFor === k.id;

              return (
                <li
                  key={k.id}
                  className={`border rounded p-2 bg-white ${
                    translation ? "border-l-4 border-l-blue-400" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-800">
                        <span
                          className={`inline-block text-xs font-bold px-2 py-0.5 rounded mr-2 ${
                            k.language === "es"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {k.language?.toUpperCase() === "ES" ? "ES" : "EN"}
                        </span>
                        {k.keyword}
                        {translation && (
                          <span className="ml-2 text-xs text-gray-500">
                            ↔️ paired
                          </span>
                        )}
                      </p>
                      <p className="text-gray-600 text-sm">Slug: {k.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!translation && !isAddingTranslation && (
                        <button
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          onClick={() => setAddingTranslationFor(k.id)}
                        >
                          + Add {k.language === "en" ? "ES" : "EN"}
                        </button>
                      )}
                      <button
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        onClick={() => handleDelete(k.id)}
                        disabled={deletingIds.has(k.id)}
                      >
                        {deletingIds.has(k.id) ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>

                  {/* Inline translation add form */}
                  {isAddingTranslation && (
                    <div className="mt-2 flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <input
                        className="border rounded px-2 py-1 flex-1 text-sm"
                        placeholder={`Add ${
                          k.language === "en" ? "Spanish" : "English"
                        } translation`}
                        autoFocus
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            e.currentTarget.value.trim()
                          ) {
                            handleAddTranslation(k, e.currentTarget.value);
                          } else if (e.key === "Escape") {
                            setAddingTranslationFor(null);
                          }
                        }}
                      />
                      <button
                        className="text-sm text-gray-600 hover:text-gray-800"
                        onClick={() => setAddingTranslationFor(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  const renderBulkAddTab = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Language</label>
        <select
          className="border rounded px-2 py-1"
          value={bulkLanguage}
          onChange={(e) => setBulkLanguage(e.target.value as "en" | "es")}
        >
          <option value="en">English (EN)</option>
          <option value="es">Spanish (ES)</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Paste keywords (one per line)
        </label>
        <p className="text-sm text-gray-600">Format: keyword[, intent]</p>
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
            <span className="font-medium">Language</span> — required; "en" or
            "es" (used to generate English/Spanish pages)
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
            Language determines whether generated content is English or Spanish.
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
