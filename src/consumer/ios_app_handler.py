"""
Agua Inc. Platform — iOS App Event Handler
Handles consumer-facing events from the Agua iOS application.
"""

#integration test - clickup 2026-04-17 

import logging
from typing import Optional

logger = logging.getLogger(__name__)

SUPPORTED_IOS_VERSIONS = ["16.0", "16.4", "17.0", "17.2"]

# Known compatibility issue on 17.4 — under investigation
FLAGGED_VERSIONS = ["17.4"]


def handle_launch_event(user_id: str, ios_version: str, region: str) -> dict:
    """
    Process app launch event from consumer device.
    Returns session token or error payload.
    """
    if ios_version in FLAGGED_VERSIONS:
        logger.warning(
            f"Launch event from flagged iOS version {ios_version} "
            f"— user {user_id}, region {region}"
        )
        return {
            "status": "error",
            "code": "COMPAT_ISSUE",
            "message": "Compatibility issue detected. Please update the app.",
            "ios_version": ios_version,
        }

    if ios_version not in SUPPORTED_IOS_VERSIONS:
        logger.error(f"Unsupported iOS version: {ios_version}")
        return {"status": "error", "code": "UNSUPPORTED_VERSION"}

    return {
        "status": "ok",
        "user_id": user_id,
        "region": region,
        "session": _generate_session_token(user_id),
    }


def handle_alert_threshold_event(user_id: str, metric: str, value: float) -> None:
    """Trigger push notification when a water quality metric exceeds threshold."""
    logger.info(f"Alert threshold hit — user {user_id}, metric {metric}, value {value}")
    # TODO: integrate with push notification service (CU-789)


def _generate_session_token(user_id: str) -> Optional[str]:
    """Internal: generate a short-lived session token."""
    import hashlib, time
    raw = f"{user_id}:{time.time()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]
