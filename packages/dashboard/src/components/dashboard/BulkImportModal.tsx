/**
 * Bulk Import Locations Modal
 *
 * Modal for importing multiple locations from CSV/JSON format
 */

import React, { useState } from "react";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: {
    text: string;
    autoCreateServiceAreas: boolean;
  }) => Promise<void>;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [importText, setImportText] = useState("");
  const [autoCreateServiceAreas, setAutoCreateServiceAreas] = useState(true);
  const [importing, setImporting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    try {
      await onImport({ text: importText, autoCreateServiceAreas });
      setImportText("");
      onClose();
    } catch (error) {
      console.error("Import error:", error);
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  const exampleCSV = `name,city,state,country,status,address,zip_code,phone
Downtown,Arlington,VA,US,active,123 Main St,22201,571-555-0100
North Branch,Bethesda,MD,US,active,456 Oak Ave,20814,301-555-0200
Coming Soon,Richmond,VA,US,upcoming,,,`;

  const exampleJSON = `[
  {
    "name": "Downtown",
    "city": "Arlington",
    "state": "VA",
    "country": "US",
    "status": "active",
    "address": "123 Main St",
    "zip_code": "22201",
    "phone": "571-555-0100"
  }
]`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-dark-800 border-b border-dark-700 px-6 py-4">
          <h2 className="text-xl font-semibold">Bulk Import Locations</h2>
          <p className="text-sm text-dark-400 mt-1">
            Import multiple locations using CSV or JSON format
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">
              Format Instructions
            </h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>
                <strong>CSV Format:</strong> One location per line,
                comma-separated
              </p>
              <p>
                <strong>JSON Format:</strong> Array of location objects
              </p>
              <p className="mt-2">
                <strong>Required fields:</strong> name, city, state, country,
                status
              </p>
              <p>
                <strong>Optional fields:</strong> display_name, address,
                zip_code, phone, email, google_maps_url, store_id, order_link,
                is_headquarters, priority, note
              </p>
            </div>
          </div>

          {/* Import Text Area */}
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-1">
              Paste CSV or JSON data
            </label>
            <textarea
              required
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={12}
              className="w-full border border-dark-600 rounded-lg px-3 py-2 font-mono text-sm"
              placeholder="Paste your CSV or JSON data here..."
            />
          </div>

          {/* Options */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoCreateServiceAreas}
                onChange={(e) => setAutoCreateServiceAreas(e.target.checked)}
                className="rounded border-dark-600 text-metro-orange focus:ring-metro-orange mr-2"
              />
              <span className="text-sm text-dark-200">
                Automatically create service areas for active locations
              </span>
            </label>
          </div>

          {/* Examples */}
          <details className="border border-dark-700 rounded-lg">
            <summary className="px-4 py-3 cursor-pointer font-medium text-sm hover:bg-dark-900">
              Show CSV Example
            </summary>
            <div className="px-4 py-3 bg-dark-900 border-t border-dark-700">
              <pre className="text-xs font-mono overflow-x-auto">
                {exampleCSV}
              </pre>
            </div>
          </details>

          <details className="border border-dark-700 rounded-lg">
            <summary className="px-4 py-3 cursor-pointer font-medium text-sm hover:bg-dark-900">
              Show JSON Example
            </summary>
            <div className="px-4 py-3 bg-dark-900 border-t border-dark-700">
              <pre className="text-xs font-mono overflow-x-auto">
                {exampleJSON}
              </pre>
            </div>
          </details>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-700">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 border border-dark-600 rounded-lg text-sm hover:bg-dark-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={importing || !importText.trim()}
              className="px-4 py-2 bg-metro-orange text-white rounded-lg text-sm hover:bg-metro-orange-600 disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import Locations"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
