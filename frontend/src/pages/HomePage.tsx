import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { TherapistList } from "@/api/schemas";
import { paginatedSchema, therapistListSchema } from "@/api/schemas";
import { useDebounce } from "@/hooks/useDebounce";
import { useSearchParamsState } from "@/hooks/useSearchParamsState";
import { SPECIALTIES, LANGUAGES } from "@/directory/constants";

const therapistPaginatedSchema = paginatedSchema(therapistListSchema);

export function HomePage() {
  const [filters, setFilters] = useSearchParamsState();
  const debouncedQ = useDebounce(filters.q, 300);

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "therapists",
      debouncedQ,
      filters.specialty,
      filters.language,
      filters.city,
      filters.remote,
      filters.price_min,
      filters.price_max,
      filters.page,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      if (filters.specialty) params.set("specialty", filters.specialty);
      if (filters.language) params.set("language", filters.language);
      if (filters.city) params.set("city", filters.city);
      if (filters.remote) params.set("remote", "true");
      if (filters.price_min) params.set("price_min", filters.price_min);
      if (filters.price_max) params.set("price_max", filters.price_max);
      params.set("page", String(filters.page));
      const res = await api.get<unknown>(`/therapists/?${params}`);
      return therapistPaginatedSchema.parse(res);
    },
  });

  const pageSize = 20;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Find a Therapist</h1>
        <p className="page-subtitle">
          Search our directory of licensed therapists.{" "}
          <Link to="/login">Login</Link> for referrals and appointments.
        </p>
      </div>

      <div className="search-filters">
        <div className="search-filters-row">
          <div className="input-group search-query">
            <label htmlFor="q">Search</label>
            <input
              id="q"
              type="search"
              className="input"
              placeholder="Name or specialty…"
              value={filters.q}
              onChange={(e) => setFilters({ q: e.target.value, page: 1 })}
            />
          </div>
          <div className="input-group filter-select">
            <label htmlFor="specialty">Specialty</label>
            <select
              id="specialty"
              className="input"
              value={filters.specialty}
              onChange={(e) =>
                setFilters({ specialty: e.target.value, page: 1 })
              }
            >
              <option value="">All</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="input-group filter-select">
            <label htmlFor="language">Language</label>
            <select
              id="language"
              className="input"
              value={filters.language}
              onChange={(e) =>
                setFilters({ language: e.target.value, page: 1 })
              }
            >
              <option value="">All</option>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="input-group filter-input">
            <label htmlFor="city">City</label>
            <input
              id="city"
              type="text"
              className="input"
              placeholder="City"
              value={filters.city}
              onChange={(e) => setFilters({ city: e.target.value, page: 1 })}
            />
          </div>
          <div className="input-group filter-toggle">
            <label htmlFor="remote">Remote only</label>
            <input
              id="remote"
              type="checkbox"
              checked={filters.remote}
              onChange={(e) =>
                setFilters({ remote: e.target.checked, page: 1 })
              }
            />
          </div>
        </div>
        <div className="search-filters-row price-row">
          <div className="input-group price-input">
            <label htmlFor="price_min">Min price ($)</label>
            <input
              id="price_min"
              type="number"
              min={0}
              step={10}
              className="input"
              placeholder="Min"
              value={filters.price_min}
              onChange={(e) =>
                setFilters({ price_min: e.target.value, page: 1 })
              }
            />
          </div>
          <div className="input-group price-input">
            <label htmlFor="price_max">Max price ($)</label>
            <input
              id="price_max"
              type="number"
              min={0}
              step={10}
              className="input"
              placeholder="Max"
              value={filters.price_max}
              onChange={(e) =>
                setFilters({ price_max: e.target.value, page: 1 })
              }
            />
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              setFilters({
                q: "",
                specialty: "",
                language: "",
                city: "",
                remote: false,
                price_min: "",
                price_max: "",
                page: 1,
              })
            }
          >
            Clear filters
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="page-loading">
          <span>Loading therapists…</span>
        </div>
      )}

      {error && (
        <div className="empty-state error">
          Failed to load therapists. Please try again.
        </div>
      )}

      {data && !isLoading && (
        <div className="card">
          {data.results.length === 0 ? (
            <div className="empty-state">
              No therapists found. Try adjusting your search.
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Specialties</th>
                      <th>City</th>
                      <th>Remote</th>
                      <th>Price</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((t: TherapistList) => (
                      <tr key={t.id}>
                        <td>{t.display_name}</td>
                        <td>{t.specialties.join(", ")}</td>
                        <td>{t.city || "—"}</td>
                        <td>{t.remote_available ? "Yes" : "—"}</td>
                        <td>
                          {t.price_min || t.price_max
                            ? t.price_min && t.price_max
                              ? `$${t.price_min}–$${t.price_max}`
                              : t.price_min
                                ? `From $${t.price_min}`
                                : `Up to $${t.price_max}`
                            : "—"}
                        </td>
                        <td>
                          <Link to={`/therapists/${t.id}`}>View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.count > pageSize && (
                <div className="pagination">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={filters.page <= 1}
                    onClick={() => setFilters({ page: filters.page - 1 })}
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {filters.page} of {Math.ceil(data.count / pageSize)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={!data.next}
                    onClick={() => setFilters({ page: filters.page + 1 })}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
