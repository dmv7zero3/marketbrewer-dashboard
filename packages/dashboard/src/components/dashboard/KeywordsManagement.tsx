import React, { useEffect, useState, useMemo } from "react";
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
import { EmptyState, EmptyStateIcons, StatsCards } from "../ui";
import { useConfirmDialog } from "../../hooks";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { KeywordsSettings, loadBilingualDefault } from "./KeywordsSettings";

type KeywordPair = {
  id: string; // Combined ID for the pair
  slug: string; // URL-ready slug (same for both)
  displayName: string; // Human-readable combined name
  en: Keyword | null;
  es: Keyword | null;
  isPaired: boolean;
};

type TabName = "manage" | "bulk-add" | "instructions" | "settings";

const TABS: { name: TabName; label: string }[] = [
  { name: "manage", label: "Manage" },
  { name: "bulk-add", label: "Bulk Add" },
  { name: "instructions", label: "Instructions" },
  { name: "settings", label: "Settings" },
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
  // Bilingual default from localStorage setting (controlled via Settings tab)
  const [createBilingualDefault, setCreateBilingualDefault] = useState(() =>
    loadBilingualDefault()
  );
  const [newLanguage, setNewLanguage] = useState<"en" | "es">("en");
  const [bulkText, setBulkText] = useState("");
  const [bulkTextEs, setBulkTextEs] = useState("");
  const [bulkLanguage, setBulkLanguage] = useState<"en" | "es">("en");
  const [bulkBilingual, setBulkBilingual] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [languageFilter, setLanguageFilter] = useState<"all" | "en" | "es">(
    "all"
  );
  const [addingTranslationFor, setAddingTranslationFor] = useState<
    string | null
  >(null);
  const { confirm, dialogProps } = useConfirmDialog();

  // Group keywords into pairs
  const keywordPairs = useMemo(() => {
    const pairs: KeywordPair[] = [];
    const processed = new Set<string>();

    keywords.forEach((kw) => {
      if (processed.has(kw.id)) return;

      const enKeyword = kw.language === "en" ? kw : null;
      const esKeyword = kw.language === "es" ? kw : null;

      // Find matching translation
      const translation = keywords.find(
        (k) =>
          k.id !== kw.id &&
          k.slug === kw.slug &&
          k.language !== kw.language &&
          !processed.has(k.id)
      );

      if (translation) {
        processed.add(kw.id);
        processed.add(translation.id);
        pairs.push({
          id: `pair-${kw.slug}`,
          slug: kw.slug,
          displayName: kw.language === "en" ? kw.keyword : translation.keyword,
          en: kw.language === "en" ? kw : translation,
          es: kw.language === "es" ? kw : translation,
          isPaired: true,
        });
      } else {
        processed.add(kw.id);
        pairs.push({
          id: `single-${kw.id}`,
          slug: kw.slug,
          displayName: kw.keyword,
          en: kw.language === "en" ? kw : null,
          es: kw.language === "es" ? kw : null,
          isPaired: false,
        });
      }
    });

    return pairs.sort((a, b) => {
      // Paired keywords first
      if (a.isPaired && !b.isPaired) return -1;
      if (!a.isPaired && b.isPaired) return 1;
      // Then alphabetically by display name
      return a.displayName.localeCompare(b.displayName);
    });
  }, [keywords]);

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

    if (createBilingualDefault) {
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

  const handleDeletePair = async (pair: KeywordPair) => {
    if (!selectedBusiness) return;

    const confirmed = await confirm({
      title: pair.isPaired ? "Delete keyword pair?" : "Delete keyword?",
      message: pair.isPaired
        ? `This will delete both the English and Spanish versions of "${pair.displayName}". This action cannot be undone.`
        : `Delete "${pair.displayName}"? This action cannot be undone.`,
      variant: "danger",
      confirmLabel: "Delete",
    });

    if (!confirmed) return;

    const idsToDelete = [pair.en?.id, pair.es?.id].filter(
      (id): id is string => !!id
    );

    try {
      for (const id of idsToDelete) {
        setDeletingIds((prev) => new Set([...prev, id]));
      }

      await Promise.all(
        idsToDelete.map((id) => deleteKeyword(selectedBusiness, id))
      );

      setKeywords((prev) => prev.filter((k) => !idsToDelete.includes(k.id)));

      addToast(
        pair.isPaired ? "Keyword pair deleted" : "Keyword deleted",
        "success"
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete keyword";
      addToast(msg, "error", 5000);
    } finally {
      idsToDelete.forEach((id) => {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
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

  const handleBulkAdd = async (): Promise<void> => {
    if (!selectedBusiness) {
      addToast("Select a business before adding keywords.", "error", 4000);
      return;
    }

    if (bulkBilingual) {
      // ========================================
      // BILINGUAL MODE
      // ========================================
      const linesEN = bulkText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const linesES = bulkTextEs
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      // Validation: both textareas must have content
      if (linesEN.length === 0 || linesES.length === 0) {
        addToast(
          "Enter keywords in both English and Spanish fields.",
          "error",
          4000
        );
        return;
      }

      // Validation: line counts must match
      if (linesEN.length !== linesES.length) {
        addToast(
          `Line count mismatch: ${linesEN.length} English, ${linesES.length} Spanish. Both must have equal lines.`,
          "error",
          5000
        );
        return;
      }

      // Validation: max 100 pairs
      if (linesEN.length > 100) {
        addToast("Maximum 100 keyword pairs per operation.", "error", 5000);
        return;
      }

      setBulkLoading(true);

      try {
        // Fetch existing keywords to check for duplicates
        let existingSlugsEN = new Set<string>();
        let existingSlugsES = new Set<string>();

        try {
          const { keywords: existing } = await listKeywords(selectedBusiness);
          existingSlugsEN = new Set(
            existing.filter((k) => k.language === "en").map((k) => k.slug)
          );
          existingSlugsES = new Set(
            existing.filter((k) => k.language === "es").map((k) => k.slug)
          );
        } catch (e) {
          const msg =
            e instanceof Error
              ? e.message
              : "Failed to fetch existing keywords";
          addToast(
            `Warning: Could not check for duplicates. ${msg}`,
            "warning",
            4000
          );
        }

        // Create pairs from matching lines
        const pairs = linesEN.map((en, i) => ({
          en: { keyword: en, slug: toSlug(en) },
          es: { keyword: linesES[i], slug: toSlug(linesES[i]) },
        }));

        // Filter out pairs where EITHER keyword already exists
        // (we don't create partial pairs)
        const newPairs = pairs.filter(
          (pair) =>
            !existingSlugsEN.has(pair.en.slug) &&
            !existingSlugsES.has(pair.es.slug)
        );

        const duplicateCount = pairs.length - newPairs.length;
        if (duplicateCount > 0) {
          addToast(
            `Skipping ${duplicateCount} pair(s) - already exist in database.`,
            "warning",
            3000
          );
        }

        if (newPairs.length === 0) {
          addToast("All keyword pairs already exist.", "info", 3000);
          setBulkText("");
          setBulkTextEs("");
          setBulkLoading(false);
          return;
        }

        // Track results for reporting
        const results = {
          success: [] as typeof newPairs,
          failed: [] as typeof newPairs,
        };

        // Create each pair (EN first, then ES)
        for (let i = 0; i < newPairs.length; i++) {
          const pair = newPairs[i];
          try {
            // Create English keyword
            await createKeyword(selectedBusiness, {
              keyword: pair.en.keyword,
              language: "en",
            });

            // Create Spanish keyword
            await createKeyword(selectedBusiness, {
              keyword: pair.es.keyword,
              language: "es",
            });

            results.success.push(pair);

            // Progress update every 5 pairs or on last pair
            if ((i + 1) % 5 === 0 || i === newPairs.length - 1) {
              addToast(
                `Creating pairs: ${i + 1} of ${newPairs.length}...`,
                "info",
                1000
              );
            }
          } catch (e) {
            // If either fails, mark the pair as failed
            // Note: This could leave orphaned EN keywords if ES creation fails
            // TODO: Consider rollback logic for production
            results.failed.push(pair);
          }
        }

        // Final results toast
        if (results.success.length > 0) {
          const totalKeywords = results.success.length * 2;
          addToast(
            `✅ Added ${
              results.success.length
            } bilingual pair(s) (${totalKeywords} keywords)${
              results.failed.length > 0
                ? ` | ❌ ${results.failed.length} failed`
                : ""
            }`,
            results.failed.length > 0 ? "warning" : "success",
            5000
          );

          // Refresh keywords list
          const { keywords: refreshed } = await listKeywords(selectedBusiness);
          setKeywords(refreshed);
        } else if (results.failed.length > 0) {
          addToast("All keyword pairs failed to add.", "error", 5000);
        }

        // Keep only failed pairs in textareas for retry
        if (results.failed.length > 0) {
          setBulkText(results.failed.map((p) => p.en.keyword).join("\n"));
          setBulkTextEs(results.failed.map((p) => p.es.keyword).join("\n"));
        } else {
          setBulkText("");
          setBulkTextEs("");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to add keywords";
        addToast(msg, "error", 5000);
      } finally {
        setBulkLoading(false);
      }
    } else {
      // ========================================
      // SINGLE LANGUAGE MODE (existing logic)
      // ========================================
      const lines = bulkText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        addToast("Enter at least one keyword.", "error", 4000);
        return;
      }

      if (lines.length > 100) {
        addToast("Maximum 100 keywords per operation.", "error", 5000);
        return;
      }

      setBulkLoading(true);

      try {
        // Fetch existing keywords to check for duplicates
        let existingSlugs = new Set<string>();

        try {
          const { keywords: existing } = await listKeywords(selectedBusiness);
          existingSlugs = new Set(
            existing
              .filter((k) => k.language === bulkLanguage)
              .map((k) => k.slug)
          );
        } catch (e) {
          const msg =
            e instanceof Error
              ? e.message
              : "Failed to fetch existing keywords";
          addToast(
            `Warning: Could not check for duplicates. ${msg}`,
            "warning",
            4000
          );
        }

        // Parse keywords (simple format: one keyword per line)
        const keywords = lines.filter(
          (line) => !existingSlugs.has(toSlug(line))
        );

        const duplicateCount = lines.length - keywords.length;
        if (duplicateCount > 0) {
          addToast(
            `Skipping ${duplicateCount} duplicate keyword(s).`,
            "warning",
            3000
          );
        }

        if (keywords.length === 0) {
          addToast("All keywords already exist.", "info", 3000);
          setBulkText("");
          setBulkLoading(false);
          return;
        }

        const results = {
          success: [] as string[],
          failed: [] as string[],
        };

        for (const kw of keywords) {
          try {
            await createKeyword(selectedBusiness, {
              keyword: kw,
              language: bulkLanguage,
            });
            results.success.push(kw);
          } catch (e) {
            results.failed.push(kw);
          }
        }

        if (results.success.length > 0) {
          addToast(
            `Added ${results.success.length} keyword(s)${
              results.failed.length > 0
                ? ` | ${results.failed.length} failed`
                : ""
            }`,
            results.failed.length > 0 ? "warning" : "success",
            4000
          );

          // Refresh keywords list
          const { keywords: refreshed } = await listKeywords(selectedBusiness);
          setKeywords(refreshed);
        } else if (results.failed.length > 0) {
          addToast("All keywords failed to add.", "error", 5000);
        }

        // Keep only failed keywords for retry
        if (results.failed.length > 0) {
          setBulkText(results.failed.join("\n"));
        } else {
          setBulkText("");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to add keywords";
        addToast(msg, "error", 5000);
      } finally {
        setBulkLoading(false);
      }
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

  const renderManageTab = () => {
    const filteredPairs = keywordPairs.filter((pair) => {
      if (languageFilter === "all") return true;
      if (languageFilter === "en") return pair.en !== null;
      if (languageFilter === "es") return pair.es !== null;
      return true;
    });

    const stats = [
      {
        label: "Total Pairs",
        value: keywordPairs.filter((p) => p.isPaired).length,
        color: "blue" as const,
      },
      {
        label: "English Only",
        value: keywordPairs.filter((p) => p.en && !p.es).length,
        color: "blue" as const,
      },
      {
        label: "Spanish Only",
        value: keywordPairs.filter((p) => p.es && !p.en).length,
        color: "green" as const,
      },
      {
        label: "Total Keywords",
        value: keywords.length,
        color: "gray" as const,
      },
    ];

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <StatsCards stats={stats} loading={loading} />

        {/* Add Keywords Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Add New Keywords
          </h3>

          {createBilingualDefault ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    English Keyword
                  </label>
                  <input
                    className={`border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      inputError && inputError.includes("English")
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="e.g., criminal defense attorney DC"
                    value={newKeyword}
                    onChange={(e) => {
                      setNewKeyword(e.target.value);
                      setInputError(null);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Spanish Keyword
                  </label>
                  <input
                    className={`border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      inputError && inputError.includes("Spanish")
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="e.g., abogado de defensa criminal DC"
                    value={newKeywordEs}
                    onChange={(e) => {
                      setNewKeywordEs(e.target.value);
                      setInputError(null);
                    }}
                  />
                </div>
              </div>
              <button
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                onClick={handleAdd}
                disabled={loading}
              >
                Add Bilingual Pair
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value as "en" | "es")}
                aria-label="Keyword language"
              >
                <option value="en">English (EN)</option>
                <option value="es">Spanish (ES)</option>
              </select>
              <input
                className={`border rounded-lg px-3 py-2 flex-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  inputError ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Add keyword"
                value={newKeyword}
                onChange={(e) => {
                  setNewKeyword(e.target.value);
                  setInputError(null);
                }}
              />
              <button
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                onClick={handleAdd}
                disabled={loading}
              >
                Add
              </button>
            </div>
          )}
          {inputError && (
            <p className="text-red-600 text-sm flex items-center gap-1">
              <span>⚠</span> {inputError}
            </p>
          )}
        </div>

        {/* Filter Section */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">View:</span>
          <button
            onClick={() => setLanguageFilter("all")}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              languageFilter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All Keywords
          </button>
          <button
            onClick={() => setLanguageFilter("en")}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              languageFilter === "en"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguageFilter("es")}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              languageFilter === "es"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Spanish
          </button>
        </div>

        {/* Keywords List */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading keywords...</span>
          </div>
        ) : filteredPairs.length === 0 ? (
          <EmptyState
            icon={EmptyStateIcons.keywords}
            title="No keywords yet"
            description={
              languageFilter === "all"
                ? "Add your first keyword pair to start generating SEO content"
                : `No ${
                    languageFilter === "en" ? "English" : "Spanish"
                  } keywords found`
            }
            action={{
              label: "Add Keywords",
              onClick: () => {
                // Focus on the appropriate input based on bilingual setting
                const selector = createBilingualDefault
                  ? 'input[placeholder*="English"]'
                  : 'input[placeholder="Add keyword"]';
                document.querySelector<HTMLInputElement>(selector)?.focus();
              },
            }}
          />
        ) : (
          <div className="space-y-3">
            {filteredPairs.map((pair) => {
              const hasEnTranslationMissing = pair.en && !pair.es;
              const hasEsTranslationMissing = pair.es && !pair.en;
              const isDeleting = !!(
                (pair.en && deletingIds.has(pair.en.id)) ||
                (pair.es && deletingIds.has(pair.es.id))
              );

              return (
                <div
                  key={pair.id}
                  className={`bg-white border-2 rounded-lg p-4 transition-all hover:shadow-md ${
                    pair.isPaired
                      ? "border-blue-200 bg-blue-50/30"
                      : "border-amber-200 bg-amber-50/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-3">
                        {pair.isPaired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                              />
                            </svg>
                            PAIRED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                            UNPAIRED
                          </span>
                        )}
                        <h4 className="text-lg font-semibold text-gray-900 truncate">
                          {pair.displayName}
                        </h4>
                      </div>

                      {/* Keywords Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        {/* English Keyword */}
                        <div
                          className={`p-3 rounded-lg border-2 ${
                            pair.en
                              ? "bg-white border-blue-200"
                              : "bg-gray-50 border-gray-200 border-dashed"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">
                              EN
                            </span>
                            {hasEnTranslationMissing && (
                              <button
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                onClick={() =>
                                  setAddingTranslationFor(pair.en!.id)
                                }
                              >
                                + Add Spanish
                              </button>
                            )}
                          </div>
                          {pair.en ? (
                            <>
                              <p className="text-gray-900 font-medium">
                                {pair.en.keyword}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 font-mono truncate">
                                /{pair.en.slug}
                              </p>
                            </>
                          ) : (
                            <p className="text-gray-400 italic text-sm">
                              No English version
                            </p>
                          )}
                        </div>

                        {/* Spanish Keyword */}
                        <div
                          className={`p-3 rounded-lg border-2 ${
                            pair.es
                              ? "bg-white border-green-200"
                              : "bg-gray-50 border-gray-200 border-dashed"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded">
                              ES
                            </span>
                            {hasEsTranslationMissing && (
                              <button
                                className="text-xs text-green-600 hover:text-green-800 font-medium"
                                onClick={() =>
                                  setAddingTranslationFor(pair.es!.id)
                                }
                              >
                                + Add English
                              </button>
                            )}
                          </div>
                          {pair.es ? (
                            <>
                              <p className="text-gray-900 font-medium">
                                {pair.es.keyword}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 font-mono truncate">
                                /{pair.es.slug}
                              </p>
                            </>
                          ) : (
                            <p className="text-gray-400 italic text-sm">
                              No Spanish version
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Inline Translation Form */}
                      {addingTranslationFor &&
                        (pair.en?.id === addingTranslationFor ||
                          pair.es?.id === addingTranslationFor) && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Add{" "}
                              {pair.en?.id === addingTranslationFor
                                ? "Spanish"
                                : "English"}{" "}
                              translation:
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                className="border border-gray-300 rounded-lg px-3 py-2 flex-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={`Enter ${
                                  pair.en?.id === addingTranslationFor
                                    ? "Spanish"
                                    : "English"
                                } keyword`}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Enter" &&
                                    e.currentTarget.value.trim()
                                  ) {
                                    const baseKeyword =
                                      pair.en?.id === addingTranslationFor
                                        ? pair.en
                                        : pair.es!;
                                    handleAddTranslation(
                                      baseKeyword,
                                      e.currentTarget.value
                                    );
                                  } else if (e.key === "Escape") {
                                    setAddingTranslationFor(null);
                                  }
                                }}
                              />
                              <button
                                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium"
                                onClick={() => setAddingTranslationFor(null)}
                              >
                                Cancel
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Press Enter to save, Escape to cancel
                            </p>
                          </div>
                        )}
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => handleDeletePair(pair)}
                      disabled={isDeleting}
                      className="flex-shrink-0 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                      aria-label={`Delete ${pair.displayName}`}
                    >
                      {isDeleting ? (
                        <span className="flex items-center gap-1">
                          <svg
                            className="animate-spin h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Deleting...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <ConfirmDialog {...dialogProps} />
      </div>
    );
  };

  const renderBulkAddTab = (): JSX.Element => {
    // Calculate line counts for validation display
    const enLineCount = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean).length;
    const esLineCount = bulkTextEs
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean).length;
    const linesMatch = enLineCount === esLineCount;
    const hasContent = bulkBilingual
      ? enLineCount > 0 && esLineCount > 0
      : bulkText.trim().length > 0;

    return (
      <div className="space-y-4">
        {/* Bilingual Mode Toggle */}
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bulkBilingual}
              onChange={(e) => setBulkBilingual(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              disabled={bulkLoading}
            />
            <span className="text-sm font-medium text-blue-800">
              Create bilingual pairs (EN + ES)
            </span>
          </label>
          <span className="text-xs text-blue-600">
            {bulkBilingual
              ? "Keywords will be created in matched pairs"
              : "Keywords created in single language only"}
          </span>
        </div>

        {bulkBilingual ? (
          // ========================================
          // BILINGUAL MODE UI
          // ========================================
          <>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
              <p className="font-medium text-gray-700 mb-1">
                Enter one keyword per line. Line 1 EN matches Line 1 ES.
              </p>
              <p>
                Example: If "criminal defense attorney" is on line 3 in English,
                "abogado de defensa criminal" should be on line 3 in Spanish.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* English Keywords Textarea */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  English Keywords
                  <span className="ml-2 text-xs text-gray-500">
                    ({enLineCount} line{enLineCount !== 1 ? "s" : ""})
                  </span>
                </label>
                <textarea
                  className="border rounded p-2 w-full font-mono text-sm h-64 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`criminal defense attorney
DUI lawyer
personal injury attorney
drug possession defense
traffic ticket lawyer`}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  disabled={bulkLoading}
                />
              </div>

              {/* Spanish Keywords Textarea */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Spanish Keywords
                  <span className="ml-2 text-xs text-gray-500">
                    ({esLineCount} line{esLineCount !== 1 ? "s" : ""})
                  </span>
                </label>
                <textarea
                  className="border rounded p-2 w-full font-mono text-sm h-64 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`abogado de defensa criminal
abogado de DUI
abogado de lesiones personales
defensa por posesión de drogas
abogado de multas de tráfico`}
                  value={bulkTextEs}
                  onChange={(e) => setBulkTextEs(e.target.value)}
                  disabled={bulkLoading}
                />
              </div>
            </div>

            {/* Line count validation message */}
            {enLineCount > 0 && esLineCount > 0 && !linesMatch && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium">
                  Line count mismatch: {enLineCount} English vs {esLineCount}{" "}
                  Spanish. Both columns must have the same number of lines.
                </span>
              </div>
            )}

            {/* Success indicator when lines match */}
            {enLineCount > 0 && esLineCount > 0 && linesMatch && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded text-green-700">
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium">
                  ✓ {enLineCount} bilingual pair{enLineCount !== 1 ? "s" : ""}{" "}
                  ready to add ({enLineCount * 2} keywords total)
                </span>
              </div>
            )}
          </>
        ) : (
          // ========================================
          // SINGLE LANGUAGE MODE UI
          // ========================================
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Language
              </label>
              <select
                className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={bulkLanguage}
                onChange={(e) => setBulkLanguage(e.target.value as "en" | "es")}
                disabled={bulkLoading}
              >
                <option value="en">English (EN)</option>
                <option value="es">Spanish (ES)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Paste keywords (one per line)
              </label>
              <textarea
                className="border rounded p-2 w-full font-mono text-sm h-64 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`criminal defense attorney
DUI lawyer
personal injury attorney
drug possession defense
traffic ticket lawyer`}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                disabled={bulkLoading}
              />
            </div>
          </>
        )}

        {/* Add Keywords Button */}
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={handleBulkAdd}
          disabled={
            bulkLoading || !hasContent || (bulkBilingual && !linesMatch)
          }
        >
          {bulkLoading
            ? "Adding..."
            : bulkBilingual
            ? `Add ${enLineCount} Bilingual Pair${enLineCount !== 1 ? "s" : ""}`
            : "Add Keywords"}
        </button>

        {/* Help text */}
        <div className="text-sm text-gray-600 space-y-1 border-t pt-4">
          <p className="font-medium text-gray-700">Notes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Duplicate keywords are automatically skipped</li>
            <li>
              Maximum 100 {bulkBilingual ? "pairs" : "keywords"} per operation
            </li>
            {bulkBilingual && (
              <li>
                If either keyword in a pair already exists, the entire pair is
                skipped
              </li>
            )}
            <li>Failed entries remain in the textarea for retry</li>
          </ul>
        </div>
      </div>
    );
  };

  const renderSettingsTab = (): JSX.Element => {
    return (
      <KeywordsSettings
        createBilingualDefault={createBilingualDefault}
        onCreateBilingualDefaultChange={setCreateBilingualDefault}
      />
    );
  };

  const renderInstructionsTab = (): JSX.Element => (
    <div className="space-y-8 max-w-4xl">
      {/* Section 1: Bilingual Keyword Management */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">🌐</span>
          Bilingual Keyword Management
        </h2>
        <div className="prose prose-sm text-gray-700">
          <p>
            This platform supports <strong>bilingual keyword pairs</strong> for
            English and Spanish content generation. Paired keywords ensure your
            SEO pages are generated consistently in both languages, targeting
            the same services for both English and Spanish-speaking audiences.
          </p>
          <p>
            When keywords are paired, the system can generate matching landing
            pages in both languages, ensuring consistent messaging across your
            multilingual SEO strategy.
          </p>
        </div>

        {/* Visual example of paired keywords */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Example of paired keywords:
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-white p-3 rounded border">
              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded mb-2">
                EN
              </span>
              <p className="font-mono">criminal defense attorney DC</p>
            </div>
            <div className="bg-white p-3 rounded border">
              <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded mb-2">
                ES
              </span>
              <p className="font-mono">abogado de defensa criminal DC</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <span>↔️</span> These keywords are paired and will generate matching
            EN/ES pages
          </p>
        </div>
      </section>

      {/* Section 2: Adding Keywords */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">➕</span>
          Adding Keywords
        </h2>

        {/* Option A: Bilingual Pairs */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            Option A: Bilingual Pairs (Recommended)
          </h3>
          <ol className="list-decimal pl-5 text-sm text-blue-800 space-y-1">
            <li>Check "Create bilingual pair (EN + ES)" in the Manage tab</li>
            <li>Enter the English keyword in the first field</li>
            <li>Enter the Spanish translation in the second field</li>
            <li>Click "Add Bilingual Pair"</li>
            <li>Both keywords are created and visually linked</li>
          </ol>
        </div>

        {/* Option B: Single Language */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">
            Option B: Single Language
          </h3>
          <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
            <li>Uncheck "Create bilingual pair" in the Manage tab</li>
            <li>Select language (EN or ES) from dropdown</li>
            <li>Enter keyword</li>
            <li>Click "Add"</li>
          </ol>
          <p className="text-xs text-gray-500 mt-2">
            Use this when you only need content in one language.
          </p>
        </div>

        {/* Option C: Add Translation Later */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900 mb-2">
            Option C: Add Translation Later
          </h3>
          <ol className="list-decimal pl-5 text-sm text-amber-800 space-y-1">
            <li>
              Find a keyword without a pair (no "↔️ paired" indicator in the
              list)
            </li>
            <li>Click the "+ Add ES" or "+ Add EN" button next to it</li>
            <li>Enter the translation in the inline input</li>
            <li>Press Enter to save</li>
          </ol>
          <p className="text-xs text-amber-700 mt-2">
            This lets you add translations to existing keywords at any time.
          </p>
        </div>
      </section>

      {/* Section 3: Bulk Add */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">📋</span>
          Bulk Add
        </h2>

        {/* Bilingual Mode */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">
            Bilingual Mode (Default)
          </h3>
          <p className="text-sm text-gray-700">
            Use two side-by-side textareas. Line numbers must match between
            columns.
          </p>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-gray-400 mb-2">English Keywords</p>
                <p>criminal defense attorney</p>
                <p>DUI lawyer</p>
                <p>personal injury attorney</p>
                <p>drug possession defense</p>
                <p>traffic ticket lawyer</p>
              </div>
              <div>
                <p className="text-gray-400 mb-2">Spanish Keywords</p>
                <p>abogado de defensa criminal</p>
                <p>abogado de DUI</p>
                <p>abogado de lesiones personales</p>
                <p>defensa por posesión de drogas</p>
                <p>abogado de multas de tráfico</p>
              </div>
            </div>
          </div>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>One keyword per line</li>
            <li>
              Line 1 EN pairs with Line 1 ES, Line 2 EN pairs with Line 2 ES,
              etc.
            </li>
            <li>Both columns must have the same number of lines</li>
            <li>Creates paired keywords automatically</li>
          </ul>
        </div>

        {/* Single Language Mode */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Single Language Mode</h3>
          <p className="text-sm text-gray-700">
            Uncheck the bilingual toggle to add keywords in one language only.
          </p>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm">
            <p>criminal defense attorney</p>
            <p>DUI lawyer</p>
            <p>personal injury attorney</p>
            <p>drug possession defense</p>
            <p>traffic ticket lawyer</p>
          </div>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>Select language from dropdown before adding</li>
            <li>One keyword per line</li>
            <li>Creates keywords in selected language only</li>
          </ul>
        </div>
      </section>

      {/* Section 4: Keyword Format */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">📝</span>
          Keyword Format Guidelines
        </h2>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            Write keywords as descriptive phrases that match how users search:
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <p className="font-medium text-green-800 mb-2">
                ✅ Good Examples
              </p>
              <ul className="text-green-700 space-y-1">
                <li>• criminal defense attorney DC</li>
                <li>• abogado criminalista en Washington</li>
                <li>• nashville hot chicken near me</li>
                <li>• DUI lawyer Northern Virginia</li>
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="font-medium text-red-800 mb-2">❌ Bad Examples</p>
              <ul className="text-red-700 space-y-1">
                <li>• lawyer</li>
                <li>• abogado</li>
                <li>• chicken</li>
                <li>• DUI</li>
              </ul>
            </div>
          </div>
          <p className="text-gray-600">
            Short, generic terms have too much competition. Use specific,
            long-tail keywords with location modifiers for better SEO results.
          </p>
        </div>
      </section>

      {/* Section 5: Best Practices */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">💡</span>
          Best Practices
        </h2>
        <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-2">
          <li>
            <strong>Always create bilingual pairs</strong> for complete market
            coverage. Don't leave keywords unpaired unless you're only targeting
            one language.
          </li>
          <li>
            <strong>Use natural language in both languages.</strong> Don't just
            translate word-for-word. "Criminal defense attorney" becomes
            "abogado de defensa criminal," not "abogado defensa criminal."
          </li>
          <li>
            <strong>Include location-specific terms</strong> like city names,
            neighborhoods, or regions to target local search intent.
          </li>
          <li>
            <strong>Review generated content</strong> to ensure accuracy and
            cultural appropriateness in both languages.
          </li>
          <li>
            <strong>Maintain 20–100 keywords</strong> per business depending on
            your content strategy. Quality over quantity.
          </li>
          <li>
            <strong>Delete underperforming keywords</strong> and add new ones
            based on search analytics.
          </li>
        </ol>
      </section>

      {/* Section 6: Technical Details */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">⚙️</span>
          Technical Details
        </h2>
        <div className="bg-gray-50 border rounded-lg p-4">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b">
                <td className="py-2 font-medium text-gray-700">
                  Slug Generation
                </td>
                <td className="py-2 text-gray-600">
                  Derived from keyword using <code>toSlug()</code>; used for
                  de-duplication
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-medium text-gray-700">Languages</td>
                <td className="py-2 text-gray-600">
                  "en" (English) or "es" (Spanish)
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-medium text-gray-700">
                  Duplicate Detection
                </td>
                <td className="py-2 text-gray-600">
                  By slug per language; same keyword can exist in both EN and ES
                </td>
              </tr>
              <tr>
                <td className="py-2 font-medium text-gray-700">Max Bulk Add</td>
                <td className="py-2 text-gray-600">
                  100 keywords (or 100 pairs in bilingual mode)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Current data snapshot */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">📊</span>
          Current Data Snapshot
        </h2>
        {selectedBusiness ? (
          loading ? (
            <p className="text-gray-600">Loading keywords…</p>
          ) : (
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {keywords.length}
                  </p>
                  <p className="text-sm text-gray-600">Total Keywords</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {keywords.filter((k) => k.language === "en").length}
                  </p>
                  <p className="text-sm text-gray-600">English</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {keywords.filter((k) => k.language === "es").length}
                  </p>
                  <p className="text-sm text-gray-600">Spanish</p>
                </div>
              </div>
            </div>
          )
        ) : (
          <p className="text-gray-600">
            Select a business to view keyword counts.
          </p>
        )}
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
              {activeTab === "settings" && renderSettingsTab()}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default KeywordsManagement;
