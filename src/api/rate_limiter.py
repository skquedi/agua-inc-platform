"""
Agua Inc. Platform — API Rate Limiter
Enforces per-tenant request limits for B2B API consumers.
"""

#Clickup integration test - 2026-04-17 
#Clickup integration test 2 - 2026-04-17 

import time
from collections import defaultdict

# Per-tenant rate limit config (requests per minute)
RATE_LIMITS = {
    "default": 100,
    "enterprise": 500,
    "trial": 20,
}

_request_counts = defaultdict(list)


def is_allowed(tenant_id: str, tier: str = "default") -> bool:
    """
    Check if a tenant has exceeded their rate limit.
    Returns True if the request is allowed, False if throttled.
    """
    limit = RATE_LIMITS.get(tier, RATE_LIMITS["default"])
    now = time.time()
    window = 60  # 1-minute rolling window

    # Prune old requests outside the window
    _request_counts[tenant_id] = [
        t for t in _request_counts[tenant_id] if now - t < window
    ]

    if len(_request_counts[tenant_id]) >= limit:
        return False  # Rate limit exceeded

    _request_counts[tenant_id].append(now)
    return True


def get_remaining(tenant_id: str, tier: str = "default") -> int:
    """Return remaining requests in current window for a tenant."""
    limit = RATE_LIMITS.get(tier, RATE_LIMITS["default"])
    now = time.time()
    recent = [t for t in _request_counts[tenant_id] if now - t < 60]
    return max(0, limit - len(recent))


# TODO: Migrate to Redis-backed store for multi-region consistency (CU-456)
# Known issue: per-tenant isolation not applying correctly in Singapore region
