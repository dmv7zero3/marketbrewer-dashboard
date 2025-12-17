import React, { useEffect, useState } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";
import { listServiceAreas } from "../../api/service-areas";
import type { ServiceArea } from "@marketbrewer/shared";

export const ServiceAreasInstructions: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedBusiness) {
        setAreas([]);
        return;
      }
      try {
        setLoading(true);
        const { service_areas } = await listServiceAreas(selectedBusiness);
        if (!mounted) return;
        setAreas(service_areas);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [selectedBusiness]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Service Areas — Instructions</h1>
          <p className="text-gray-600">
            How service area data is structured, validated, and used.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">What data exists</h2>
          <ul className="pl-6 text-gray-800 list-disc">
            <li>
              <span className="font-medium">City</span> — required, plain string
              (e.g., "Arlington")
            </li>
            <li>
              <span className="font-medium">State</span> — required, 2-letter
              uppercase code (e.g., "VA")
            </li>
            <li>
              <span className="font-medium">County</span> — optional, string or
              null
            </li>
            <li>
              <span className="font-medium">Priority</span> — integer; higher
              values surface first in content generation
            </li>
            <li>
              <span className="font-medium">Slug</span> — derived from `city` +
              `state` using `toCityStateSlug()`; used for de-duplication
            </li>
            <li>
              <span className="font-medium">Timestamps</span> — `created_at`
              stored by the API
            </li>
          </ul>
          <p className="text-sm text-gray-600">
            Type source: `ServiceArea` in shared types.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Recommended data</h2>
          <ul className="pl-6 text-gray-800 list-disc">
            <li>
              Maintain 20–100 service areas per business depending on coverage
              goals.
            </li>
            <li>
              Normalize `state` to uppercase; avoid mixed-case city duplicates
              (e.g., "Arlington" vs "ARLINGTON").
            </li>
            <li>
              Use `priority` to influence scheduling and content generation
              order (e.g., 100 for core hubs, 10 for peripheral areas).
            </li>
            <li>Keep `county` only where relevant for local keywords.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Bulk paste format</h2>
          <p className="text-gray-700">
            Use one of the following line formats:
          </p>
          <div className="p-3 text-sm border rounded bg-gray-50">
            <p>City, State</p>
            <p>City, State, County</p>
            <p>City, State, County, Priority</p>
          </div>
          <ul className="pl-6 text-gray-800 list-disc">
            <li>
              Invalid or duplicate lines are skipped with an info/warning toast.
            </li>
            <li>Duplicates are detected by slug (`city-state`).</li>
            <li>Max per operation: 100 lines (configurable).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Validation rules</h2>
          <ul className="pl-6 text-gray-800 list-disc">
            <li>`city` must be non-empty and pass basic validation.</li>
            <li>`state` must be a valid 2-letter code.</li>
            <li>
              `priority` must be a number if provided; non-numeric values are
              ignored.
            </li>
            <li>
              Duplicate slugs are rejected to prevent multiple entries for the
              same locale.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Current data snapshot</h2>
          {selectedBusiness ? (
            loading ? (
              <p className="text-gray-600">Loading service areas…</p>
            ) : (
              <div className="text-gray-800">
                <p>
                  <span className="font-medium">Business ID:</span>{" "}
                  {selectedBusiness}
                </p>
                <p>
                  <span className="font-medium">Service areas:</span>{" "}
                  {areas.length}
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
              Service areas drive location pages and keyword-location pair
              generation.
            </li>
            <li>
              Priorities help schedule generation jobs and order content in UIs.
            </li>
            <li>
              Use the Bulk Add helper in Business Profile for quick imports;
              manage fine-tuning here.
            </li>
          </ul>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default ServiceAreasInstructions;
