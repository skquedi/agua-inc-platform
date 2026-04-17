"""
Agua Inc. Platform — Regional Dashboard Aggregator
Aggregates real-time and cached metrics per region for the B2B dashboard.
"""
#Clickup Integration Demo - April 17, 2026

from datetime import datetime, timedelta
from typing import Dict, List

SUPPORTED_REGIONS = ["AU", "SG", "IN", "APAC-OTHER", "EMEA", "AMERICAS"]

# Cache TTL per region (seconds). India region TTL extended due to data sync lag.
CACHE_TTL = {
    "AU": 30,
    "SG": 30,
    "IN": 300,  # TODO: investigate stale data reports — CU-1023
    "APAC-OTHER": 60,
    "EMEA": 60,
    "AMERICAS": 60,
}

_cache: Dict[str, dict] = {}


def get_metrics(region: str, tenant_id: str) -> dict:
    """
    Return aggregated dashboard metrics for a tenant in a given region.
    Serves from cache if within TTL, otherwise fetches fresh.
    """
    if region not in SUPPORTED_REGIONS:
        raise ValueError(f"Unsupported region: {region}")

    cache_key = f"{region}:{tenant_id}"
    ttl = CACHE_TTL.get(region, 60)

    if cache_key in _cache:
        cached = _cache[cache_key]
        age = (datetime.utcnow() - cached["fetched_at"]).seconds
        if age < ttl:
            return cached["data"]

    fresh = _fetch_from_source(region, tenant_id)
    _cache[cache_key] = {"data": fresh, "fetched_at": datetime.utcnow()}
    return fresh


def _fetch_from_source(region: str, tenant_id: str) -> dict:
    """Internal: pull latest metrics from regional data store."""
    # Placeholder — replace with actual data store call
    return {
        "region": region,
        "tenant_id": tenant_id,
        "water_quality_index": 94.2,
        "active_sensors": 412,
        "alerts_open": 3,
        "last_updated": datetime.utcnow().isoformat(),
    }


def list_stale_regions(threshold_seconds: int = 120) -> List[str]:
    """Return list of regions with cache older than threshold."""
    stale = []
    now = datetime.utcnow()
    for key, val in _cache.items():
        region = key.split(":")[0]
        age = (now - val["fetched_at"]).seconds
        if age > threshold_seconds:
            stale.append(region)
    return stale
