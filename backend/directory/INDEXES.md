# Directory Indexes

## Filter indexes (B-tree)

| Index | Table | Fields | Purpose |
|-------|-------|--------|---------|
| `directory_th_city_idx` | TherapistProfile | city | Filter by city (e.g. `?city=San Francisco`) |
| `directory_th_remote_idx` | TherapistProfile | remote_available | Filter remote-only (`?remote=true`) |
| `directory_th_price_idx` | TherapistProfile | price_min, price_max | Filter by price range (`?price_min=50&price_max=150`) |
| `directory_av_th_idx` | AvailabilitySlot | therapist | Lookup slots by therapist |
| `directory_av_weekday_idx` | AvailabilitySlot | weekday | Filter by weekday |
| `directory_loc_lat_lng_idx` | Location | lat, lng | Future geo search (PostGIS) |

## GIN indexes (JSONField containment)

| Index | Table | Fields | Purpose |
|-------|-------|--------|---------|
| `directory_th_specialties_gin` | TherapistProfile | specialties | `?specialty=Anxiety` |
| `directory_th_languages_gin` | TherapistProfile | languages | `?language=English` |

## Full-text search

Search uses `SearchVector` on `display_name`, `bio`, and `specialties` (JSON cast to text) in the query. No stored tsvector column. For high-volume search, consider adding a `SearchVectorField` + GIN index migration.
