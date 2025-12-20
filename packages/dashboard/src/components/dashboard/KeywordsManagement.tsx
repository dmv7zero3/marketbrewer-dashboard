import React, { useEffect, useState, useMemo, useCallback } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";
import { useToast } from "../../contexts/ToastContext";
import {
  listKeywords,
  createKeyword,
  deleteKeyword,
  updateKeyword,
} from "../../api/keywords";
import { getQuestionnaire, updateQuestionnaire } from "../../api/businesses";
import { validateKeyword } from "../../lib/validation";
import { toSlug, normalizeQuestionnaireData } from "@marketbrewer/shared";
import type { Keyword, QuestionnaireDataStructure } from "@marketbrewer/shared";
import { EmptyState, EmptyStateIcons, StatsCards } from "../ui";
import { useConfirmDialog } from "../../hooks";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import {
  KeywordsSettings,
  isSpanishEnabled,
  DEFAULT_ENABLED_LANGUAGES,
} from "./KeywordsSettings";

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
  // Per-business language settings (loaded from questionnaire)
  const [enabledLanguages, setEnabledLanguages] = useState<string[]>(
    DEFAULT_ENABLED_LANGUAGES
  );
  const [questionnaireData, setQuestionnaireData] =
    useState<QuestionnaireDataStructure | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  // Derived state: is bilingual mode enabled for this business?
  const createBilingualDefault = isSpanishEnabled(enabledLanguages);
  const [newLanguage, setNewLanguage] = useState<"en" | "es">("en");
  const [bulkText, setBulkText] = useState("");
  const [bulkLanguage, setBulkLanguage] = useState<"en" | "es">("en");
  const [bulkBilingual, setBulkBilingual] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
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

  // Load questionnaire settings (enabledLanguages) when business changes
  useEffect(() => {
    let mounted = true;
    const loadSettings = async () => {
      if (!selectedBusiness) {
        setEnabledLanguages(DEFAULT_ENABLED_LANGUAGES);
        setQuestionnaireData(null);
        return;
      }
      try {
        setSettingsLoading(true);
        const { questionnaire } = await getQuestionnaire(selectedBusiness);
        if (!mounted) return;
        const normalized = normalizeQuestionnaireData(questionnaire.data);
        setQuestionnaireData(normalized);
        setEnabledLanguages(
          normalized.seoSettings?.enabledLanguages ?? DEFAULT_ENABLED_LANGUAGES
        );
      } catch (e) {
        console.error("Failed to load questionnaire settings:", e);
        // Use defaults on error
        setEnabledLanguages(DEFAULT_ENABLED_LANGUAGES);
      } finally {
        if (mounted) setSettingsLoading(false);
      }
    };
    loadSettings();
    return () => {
      mounted = false;
    };
  }, [selectedBusiness]);

  // Handler for saving language settings changes
  const handleEnabledLanguagesChange = useCallback(
    async (newLanguages: string[]) => {
      if (!selectedBusiness || !questionnaireData) return;

      try {
        setSettingsSaving(true);
        const updatedData: QuestionnaireDataStructure = {
          ...questionnaireData,
          seoSettings: {
            ...questionnaireData.seoSettings,
            enabledLanguages: newLanguages,
          },
        };
        await updateQuestionnaire(selectedBusiness, updatedData);
        setQuestionnaireData(updatedData);
        setEnabledLanguages(newLanguages);
        addToast("Language settings saved", "success");
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to save language settings";
        addToast(msg, "error", 5000);
      } finally {
        setSettingsSaving(false);
      }
    },
    [selectedBusiness, questionnaireData, addToast]
  );

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

  // Helper to parse CSV for bulk add
  const parseBulkCSVForAdd = (
    text: string
  ): { en: string; es: string }[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    const pairs: { en: string; es: string }[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Try tab first (Excel/Google Sheets default), then comma
      let parts: string[];
      if (trimmed.includes("\t")) {
        parts = trimmed.split("\t").map((p) => p.trim());
      } else {
        parts = trimmed.split(",").map((p) => p.trim());
      }

      if (parts.length >= 2 && parts[0] && parts[1]) {
        pairs.push({ en: parts[0], es: parts[1] });
      }
    });

    return pairs;
  };

  const handleBulkAdd = async (): Promise<void> => {
    if (!selectedBusiness) {
      addToast("Select a business before adding keywords.", "error", 4000);
      return;
    }

    // Use effective bilingual setting - both global setting AND local toggle must be true
    const effectiveBulkBilingual = createBilingualDefault && bulkBilingual;

    if (effectiveBulkBilingual) {
      // ========================================
      // BILINGUAL MODE - Parse CSV from single textarea
      // ========================================
      const csvPairs = parseBulkCSVForAdd(bulkText);

      // Validation: must have content
      if (csvPairs.length === 0) {
        addToast(
          "Enter keyword pairs in CSV format: english, spanish",
          "error",
          4000
        );
        return;
      }

      // Validation: max 100 pairs
      if (csvPairs.length > 100) {
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

        // Create pairs with slug info
        const pairs = csvPairs.map((p) => ({
          en: { keyword: p.en, slug: toSlug(p.en) },
          es: { keyword: p.es, slug: toSlug(p.es) },
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
            results.failed.push(pair);
          }
        }

        // Final results toast
        if (results.success.length > 0) {
          const totalKeywords = results.success.length * 2;
          addToast(
            `Added ${
              results.success.length
            } bilingual pair(s) (${totalKeywords} keywords)${
              results.failed.length > 0
                ? ` | ${results.failed.length} failed`
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

        // Keep only failed pairs in textarea for retry (as CSV format)
        if (results.failed.length > 0) {
          setBulkText(
            results.failed.map((p) => `${p.en.keyword}, ${p.es.keyword}`).join("\n")
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


  const renderManageTab = () => {
    // In bilingual mode, show all pairs; in single-language mode, show all keywords
    const filteredPairs = keywordPairs;

    const stats = createBilingualDefault
      ? [
          {
            label: "Keyword Pairs",
            value: keywordPairs.filter((p) => p.isPaired).length,
            color: "blue" as const,
          },
          {
            label: "Total Keywords",
            value: keywords.length,
            color: "gray" as const,
          },
        ]
      : [
          {
            label: "Total Keywords",
            value: keywords.filter((k) => k.language === "en").length,
            color: "blue" as const,
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
              createBilingualDefault
                ? "Add your first keyword pair to start generating SEO content"
                : "Add your first keyword to start generating SEO content"
            }
            action={{
              label: createBilingualDefault ? "Add Keyword Pair" : "Add Keyword",
              onClick: () => {
                // Focus on the appropriate input based on bilingual setting
                const selector = createBilingualDefault
                  ? 'input[placeholder*="English"]'
                  : 'input[placeholder="Add keyword"]';
                document.querySelector<HTMLInputElement>(selector)?.focus();
              },
            }}
          />
        ) : createBilingualDefault ? (
          // BILINGUAL MODE - Show paired keyword cards
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
        ) : (
          // SINGLE LANGUAGE MODE - Show simple keyword list
          <div className="space-y-2">
            {keywords
              .filter((k) => k.language === "en")
              .map((keyword) => {
                const isDeleting = deletingIds.has(keyword.id);
                return (
                  <div
                    key={keyword.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between hover:shadow-sm transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium truncate">
                        {keyword.keyword}
                      </p>
                      <p className="text-xs text-gray-500 font-mono truncate">
                        /{keyword.slug}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(keyword.id)}
                      disabled={isDeleting}
                      className="flex-shrink-0 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      aria-label={`Delete ${keyword.keyword}`}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                );
              })}
          </div>
        )}

        <ConfirmDialog {...dialogProps} />
      </div>
    );
  };

  // Parse CSV/TSV text into keyword pairs
  const parseBulkCSV = (
    text: string
  ): { pairs: { en: string; es: string }[]; errors: string[] } => {
    const lines = text.split("\n").filter((line) => line.trim());
    const pairs: { en: string; es: string }[] = [];
    const errors: string[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Try tab first (Excel/Google Sheets default), then comma
      let parts: string[];
      if (trimmed.includes("\t")) {
        parts = trimmed.split("\t").map((p) => p.trim());
      } else {
        parts = trimmed.split(",").map((p) => p.trim());
      }

      if (parts.length < 2 || !parts[0] || !parts[1]) {
        errors.push(`Line ${idx + 1}: Missing EN or ES keyword`);
        return;
      }

      pairs.push({ en: parts[0], es: parts[1] });
    });

    return { pairs, errors };
  };

  const renderBulkAddTab = (): JSX.Element => {
    // Use effective bilingual setting - both global setting AND local toggle must be true
    const effectiveBulkBilingual = createBilingualDefault && bulkBilingual;

    // Parse the CSV text for bilingual mode
    const { pairs: parsedPairs, errors: parseErrors } = effectiveBulkBilingual
      ? parseBulkCSV(bulkText)
      : { pairs: [], errors: [] };

    const hasContent = effectiveBulkBilingual
      ? parsedPairs.length > 0
      : bulkText.trim().length > 0;

    const hasParseErrors = parseErrors.length > 0;

    return (
      <div className="space-y-4">
        {/* Bilingual Mode Toggle - Only show when bilingual setting is enabled */}
        {createBilingualDefault && (
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
                ? "Paste 2-column CSV: English, Spanish"
                : "Single language keywords only"}
            </span>
          </div>
        )}

        {effectiveBulkBilingual ? (
          // ========================================
          // BILINGUAL MODE - Single textarea with CSV paste
          // ========================================
          <>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
              <p className="font-medium text-gray-700 mb-1">
                Paste a 2-column CSV (comma or tab separated)
              </p>
              <p>
                Format: <code className="bg-gray-200 px-1 rounded">english keyword, spanish keyword</code>
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Paste CSV data
                {parsedPairs.length > 0 && (
                  <span className="ml-2 text-xs text-green-600">
                    ({parsedPairs.length} pair{parsedPairs.length !== 1 ? "s" : ""} detected)
                  </span>
                )}
              </label>
              <textarea
                className="border rounded p-2 w-full font-mono text-sm h-64 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`criminal defense lawyer, abogado de defensa criminal
DUI lawyer, abogado de DUI
personal injury lawyer, abogado de lesiones personales
car accident lawyer, abogado de accidente de auto
drug charges lawyer, abogado de cargos de drogas`}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                disabled={bulkLoading}
              />
            </div>

            {/* Parse errors */}
            {hasParseErrors && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
                <p className="text-sm font-medium mb-1">Format errors:</p>
                <ul className="text-sm list-disc pl-5">
                  {parseErrors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {parseErrors.length > 5 && (
                    <li>...and {parseErrors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            {/* Success indicator */}
            {parsedPairs.length > 0 && !hasParseErrors && (
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
                  {parsedPairs.length} bilingual pair{parsedPairs.length !== 1 ? "s" : ""}{" "}
                  ready to add ({parsedPairs.length * 2} keywords total)
                </span>
              </div>
            )}

            {/* Preview of parsed pairs */}
            {parsedPairs.length > 0 && parsedPairs.length <= 10 && (
              <div className="text-sm">
                <p className="font-medium text-gray-700 mb-2">Preview:</p>
                <div className="bg-gray-50 border rounded p-2 space-y-1 max-h-40 overflow-y-auto">
                  {parsedPairs.map((pair, i) => (
                    <div key={i} className="flex gap-2 text-xs font-mono">
                      <span className="text-blue-600">{pair.en}</span>
                      <span className="text-gray-400">=</span>
                      <span className="text-green-600">{pair.es}</span>
                    </div>
                  ))}
                </div>
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
          disabled={bulkLoading || !hasContent || hasParseErrors}
        >
          {bulkLoading
            ? "Adding..."
            : effectiveBulkBilingual
            ? `Add ${parsedPairs.length} Bilingual Pair${parsedPairs.length !== 1 ? "s" : ""}`
            : "Add Keywords"}
        </button>

        {/* Help text */}
        <div className="text-sm text-gray-600 space-y-1 border-t pt-4">
          <p className="font-medium text-gray-700">Notes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Duplicate keywords are automatically skipped</li>
            <li>
              Maximum 100 {effectiveBulkBilingual ? "pairs" : "keywords"} per operation
            </li>
            {effectiveBulkBilingual && (
              <>
                <li>Accepts comma-separated or tab-separated values</li>
                <li>Copy from Excel/Google Sheets works directly</li>
              </>
            )}
            <li>Failed entries remain in the textarea for retry</li>
          </ul>
        </div>
      </div>
    );
  };

  const renderSettingsTab = (): JSX.Element => {
    if (settingsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading settings...</span>
        </div>
      );
    }
    return (
      <KeywordsSettings
        enabledLanguages={enabledLanguages}
        onEnabledLanguagesChange={handleEnabledLanguagesChange}
        isSaving={settingsSaving}
      />
    );
  };

  const renderInstructionsTab = (): JSX.Element => (
    <div className="space-y-8 max-w-4xl">
      {/* Section 1: Overview */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">
          Overview
        </h2>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            SEO keywords drive the generation of location-based landing pages for your business.
            When Spanish is enabled in Settings, keywords are managed as <strong>bilingual pairs</strong> (EN + ES)
            that share the same URL slug, ensuring consistent multilingual SEO coverage.
          </p>
        </div>

        {/* Visual example of paired keywords */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Example keyword pair:
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-white p-3 rounded border border-blue-200">
              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded mb-2">
                EN
              </span>
              <p className="font-mono text-gray-900">criminal defense lawyer</p>
              <p className="text-xs text-gray-500 mt-1">/criminal-defense-lawyer</p>
            </div>
            <div className="bg-white p-3 rounded border border-green-200">
              <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded mb-2">
                ES
              </span>
              <p className="font-mono text-gray-900">abogado de defensa criminal</p>
              <p className="text-xs text-gray-500 mt-1">/criminal-defense-lawyer</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Both keywords share the same slug and generate matching EN/ES landing pages.
          </p>
        </div>
      </section>

      {/* Section 2: Adding Keywords */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Adding Keywords
        </h2>

        {/* Manage Tab */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            Manage Tab (One at a Time)
          </h3>
          <p className="text-sm text-blue-800 mb-2">
            When Spanish is enabled, enter both EN and ES keywords together:
          </p>
          <ol className="list-decimal pl-5 text-sm text-blue-800 space-y-1">
            <li>Enter the English keyword in the first field</li>
            <li>Enter the Spanish translation in the second field</li>
            <li>Click "Add Bilingual Pair"</li>
          </ol>
        </div>

        {/* Bulk Add Tab */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">
            Bulk Add Tab (Multiple at Once)
          </h3>
          <p className="text-sm text-gray-700 mb-2">
            Paste a 2-column CSV with English and Spanish keywords:
          </p>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs overflow-x-auto mb-3">
            <p>criminal defense lawyer, abogado de defensa criminal</p>
            <p>DUI lawyer, abogado de DUI</p>
            <p>personal injury lawyer, abogado de lesiones personales</p>
          </div>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>One pair per line: <code className="bg-gray-200 px-1 rounded text-xs">english, spanish</code></li>
            <li>Comma or tab separated (copy from Excel/Sheets)</li>
            <li>Preview shows parsed pairs before adding</li>
            <li>Maximum 100 pairs per operation</li>
          </ul>
        </div>

        {/* Add Translation Later */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900 mb-2">
            Adding Missing Translations
          </h3>
          <p className="text-sm text-amber-800">
            If a keyword is unpaired (shown with amber "UNPAIRED" badge), click
            "+ Add Spanish" or "+ Add English" to complete the pair.
          </p>
        </div>
      </section>

      {/* Section 3: Keyword Format */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">
          Keyword Format
        </h2>
        <p className="text-sm text-gray-700">
          Write keywords as descriptive phrases matching how users search:
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <p className="font-medium text-green-800 mb-2 text-sm">
              Good Examples
            </p>
            <ul className="text-green-700 space-y-1 text-sm">
              <li>criminal defense attorney DC</li>
              <li>abogado de defensa criminal DC</li>
              <li>DUI lawyer Northern Virginia</li>
              <li>car accident lawyer near me</li>
            </ul>
          </div>
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="font-medium text-red-800 mb-2 text-sm">
              Avoid
            </p>
            <ul className="text-red-700 space-y-1 text-sm">
              <li>lawyer (too generic)</li>
              <li>abogado (too generic)</li>
              <li>DUI (no context)</li>
              <li>legal help (vague)</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Long-tail keywords with location modifiers perform better for local SEO.
        </p>
      </section>

      {/* Section 4: Best Practices */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">
          Best Practices
        </h2>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>
            <strong>Keep keywords paired.</strong> Unpaired keywords only generate
            content in one language, missing half your potential audience.
          </li>
          <li>
            <strong>Use natural translations.</strong> "Criminal defense attorney"
            becomes "abogado de defensa criminal" - translate meaning, not words.
          </li>
          <li>
            <strong>Include locations.</strong> Add city names, neighborhoods, or
            regions to target local search intent.
          </li>
          <li>
            <strong>Quality over quantity.</strong> 20-50 well-targeted keywords
            outperform 200 generic ones.
          </li>
        </ul>
      </section>

      {/* Section 5: Settings */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">
          Language Settings
        </h2>
        <div className="bg-gray-50 border rounded-lg p-4 text-sm text-gray-700">
          <p className="mb-2">
            Go to the <strong>Settings</strong> tab to enable or disable Spanish:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Spanish enabled:</strong> Keywords managed as EN/ES pairs, bilingual content generation</li>
            <li><strong>Spanish disabled:</strong> English-only keywords, single-language content</li>
          </ul>
          <p className="mt-2 text-xs text-gray-500">
            This setting is saved per-business in the questionnaire.
          </p>
        </div>
      </section>

      {/* Current data snapshot */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">
          Current Stats
        </h2>
        {selectedBusiness ? (
          loading ? (
            <p className="text-gray-600 text-sm">Loading...</p>
          ) : (
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {keywordPairs.filter((p) => p.isPaired).length}
                  </p>
                  <p className="text-xs text-gray-600">Paired</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">
                    {keywordPairs.filter((p) => !p.isPaired).length}
                  </p>
                  <p className="text-xs text-gray-600">Unpaired</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {keywords.filter((k) => k.language === "en").length}
                  </p>
                  <p className="text-xs text-gray-600">English</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {keywords.filter((k) => k.language === "es").length}
                  </p>
                  <p className="text-xs text-gray-600">Spanish</p>
                </div>
              </div>
            </div>
          )
        ) : (
          <p className="text-gray-600 text-sm">
            Select a business to view stats.
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
