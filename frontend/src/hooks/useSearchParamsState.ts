import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export interface SearchFilters {
  q: string;
  specialty: string;
  language: string;
  city: string;
  remote: boolean;
  price_min: string;
  price_max: string;
  page: number;
}

export function useSearchParamsState(): [
  SearchFilters,
  (updates: Partial<SearchFilters>) => void,
] {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<SearchFilters>(() => {
    const get = (k: keyof SearchFilters) => searchParams.get(k) ?? "";
    return {
      q: get("q"),
      specialty: get("specialty"),
      language: get("language"),
      city: get("city"),
      remote: searchParams.get("remote") === "true",
      price_min: get("price_min"),
      price_max: get("price_max"),
      page: Math.max(1, parseInt(get("page") || "1", 10) || 1),
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (updates: Partial<SearchFilters>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        const merged = { ...filters, ...updates };

        for (const k of Object.keys(merged) as (keyof SearchFilters)[]) {
          const val = merged[k];
          const isEmpty =
            val === "" || val === false || (k === "page" && val === 1);
          if (isEmpty) {
            next.delete(k);
          } else {
            next.set(k, String(val));
          }
        }
        return next;
      });
    },
    [setSearchParams, filters]
  );

  return [filters, setFilters];
}
