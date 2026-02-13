"""
Postgres full-text search on display_name + bio + specialties.
Uses SearchVector in queryset (no stored column required).
specialties is JSONField - cast to text for search.
"""
from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.db import models
from django.db.models import TextField
from django.db.models.functions import Cast


def search_therapists(queryset, query: str):
    """
    Apply full-text search on display_name, bio, specialties.
    Requires PostgreSQL. On SQLite, falls back to icontains on display_name.
    """
    from django.db import connection

    if not query or not query.strip():
        return queryset

    if connection.vendor != "postgresql":
        # Fallback for SQLite (e.g. tests)
        q = query.strip()
        return queryset.filter(
            models.Q(display_name__icontains=q) | models.Q(bio__icontains=q)
        )

    # Cast JSONField specialties to text for SearchVector
    vector = (
        SearchVector("display_name", weight="A", config="english")
        + SearchVector("bio", weight="B", config="english")
        + SearchVector(Cast("specialties", TextField()), weight="B", config="english")
    )
    search_query = SearchQuery(query.strip(), config="english")

    return (
        queryset.annotate(
            search=vector,
            rank=SearchRank(vector, search_query),
        )
        .filter(search=search_query)
        .order_by("-rank")
    )
