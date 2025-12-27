import React, { memo } from "react";
import { DAYS_OF_WEEK, type DayOfWeek } from "@marketbrewer/shared";

export interface BusinessHoursInput {
  day_of_week: DayOfWeek;
  opens: string | null;
  closes: string | null;
  is_closed: boolean;
}

interface BusinessHoursFormProps {
  value: BusinessHoursInput[];
  disabled?: boolean;
  onChange: (next: BusinessHoursInput[]) => void;
}

const ensureSevenDays = (hours: BusinessHoursInput[]): BusinessHoursInput[] => {
  const map = new Map<DayOfWeek, BusinessHoursInput>();
  for (const h of hours) map.set(h.day_of_week, h);

  return DAYS_OF_WEEK.map(
    (d) =>
      map.get(d) ?? {
        day_of_week: d,
        opens: null,
        closes: null,
        is_closed: true,
      }
  );
};

export const BusinessHoursForm = memo<BusinessHoursFormProps>(
  ({ value, disabled = false, onChange }) => {
    const normalized = ensureSevenDays(value);

    const update = (day: DayOfWeek, patch: Partial<BusinessHoursInput>) => {
      const next = normalized.map((row) =>
        row.day_of_week === day ? { ...row, ...patch } : row
      );
      onChange(next);
    };

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-12 gap-2 text-xs text-dark-400">
          <div className="col-span-4">Day</div>
          <div className="col-span-3">Opens</div>
          <div className="col-span-3">Closes</div>
          <div className="col-span-2">Closed</div>
        </div>

        {normalized.map((row) => (
          <div key={row.day_of_week} className="grid grid-cols-12 gap-2">
            <div className="col-span-4 flex items-center text-sm text-dark-100">
              {row.day_of_week}
            </div>

            <div className="col-span-3">
              <input
                type="time"
                disabled={disabled || row.is_closed}
                className="w-full px-3 py-2 border border-dark-600 rounded-md bg-dark-800 focus:outline-none focus:ring-1 focus:ring-metro-orange disabled:bg-dark-800 disabled:text-dark-400"
                value={row.opens ?? ""}
                onChange={(e) =>
                  update(row.day_of_week, {
                    opens: e.target.value ? e.target.value : null,
                  })
                }
              />
            </div>

            <div className="col-span-3">
              <input
                type="time"
                disabled={disabled || row.is_closed}
                className="w-full px-3 py-2 border border-dark-600 rounded-md bg-dark-800 focus:outline-none focus:ring-1 focus:ring-metro-orange disabled:bg-dark-800 disabled:text-dark-400"
                value={row.closes ?? ""}
                onChange={(e) =>
                  update(row.day_of_week, {
                    closes: e.target.value ? e.target.value : null,
                  })
                }
              />
            </div>

            <div className="col-span-2 flex items-center">
              <input
                type="checkbox"
                disabled={disabled}
                checked={row.is_closed}
                onChange={(e) => {
                  const isClosed = e.target.checked;
                  update(row.day_of_week, {
                    is_closed: isClosed,
                    opens: isClosed ? null : row.opens,
                    closes: isClosed ? null : row.closes,
                  });
                }}
              />
            </div>
          </div>
        ))}

        <p className="text-xs text-dark-400">
          Optional. Used for local SEO content and schema markup.
        </p>
      </div>
    );
  }
);

BusinessHoursForm.displayName = "BusinessHoursForm";
