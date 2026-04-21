"""
Announcement endpoints for the High School Management System API
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ..database import announcements_collection, teachers_collection

router = APIRouter(
    prefix="/announcements",
    tags=["announcements"]
)


class AnnouncementCreate(BaseModel):
    """Payload for creating an announcement."""

    message: str = Field(min_length=1, max_length=500)
    expires_at: str
    starts_at: Optional[str] = None


class AnnouncementUpdate(BaseModel):
    """Payload for updating an announcement."""

    message: str = Field(min_length=1, max_length=500)
    expires_at: str
    starts_at: Optional[str] = None


def _parse_iso_datetime(raw_value: Optional[str], field_name: str) -> Optional[datetime]:
    """Parse an ISO datetime string into a timezone-aware UTC datetime."""
    if raw_value is None:
        return None

    value = raw_value.strip()
    if not value:
        return None

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name}. Use ISO 8601 format."
        ) from exc

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    return parsed.astimezone(timezone.utc)


def _require_teacher(teacher_username: Optional[str]) -> Dict[str, Any]:
    """Require a valid signed-in teacher username for management actions."""
    if not teacher_username:
        raise HTTPException(status_code=401, detail="Authentication required")

    teacher = teachers_collection.find_one({"_id": teacher_username})
    if not teacher:
        raise HTTPException(status_code=401, detail="Invalid teacher credentials")

    return teacher


def _serialize_announcement(announcement: Dict[str, Any]) -> Dict[str, Any]:
    """Serialize a MongoDB announcement document for API responses."""
    return {
        "id": str(announcement["_id"]),
        "message": announcement.get("message", ""),
        "starts_at": announcement.get("starts_at").isoformat() if announcement.get("starts_at") else None,
        "expires_at": announcement.get("expires_at").isoformat() if announcement.get("expires_at") else None,
        "created_by": announcement.get("created_by", ""),
        "created_at": announcement.get("created_at").isoformat() if announcement.get("created_at") else None,
        "updated_at": announcement.get("updated_at").isoformat() if announcement.get("updated_at") else None,
    }


@router.get("/active", response_model=List[Dict[str, Any]])
def get_active_announcements() -> List[Dict[str, Any]]:
    """Get all currently active announcements for public display."""
    now = datetime.now(timezone.utc)
    query = {
        "expires_at": {"$gte": now},
        "$or": [
            {"starts_at": None},
            {"starts_at": {"$lte": now}}
        ]
    }

    announcements = announcements_collection.find(query).sort("expires_at", 1)
    return [_serialize_announcement(item) for item in announcements]


@router.get("", response_model=List[Dict[str, Any]])
@router.get("/", response_model=List[Dict[str, Any]])
def get_all_announcements(teacher_username: Optional[str] = Query(None)) -> List[Dict[str, Any]]:
    """Get all announcements for management. Requires authentication."""
    _require_teacher(teacher_username)

    announcements = announcements_collection.find({}).sort("updated_at", -1)
    return [_serialize_announcement(item) for item in announcements]


@router.post("", response_model=Dict[str, Any])
@router.post("/", response_model=Dict[str, Any])
def create_announcement(
    payload: AnnouncementCreate,
    teacher_username: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Create a new announcement. Requires authentication."""
    teacher = _require_teacher(teacher_username)

    starts_at = _parse_iso_datetime(payload.starts_at, "starts_at")
    expires_at = _parse_iso_datetime(payload.expires_at, "expires_at")

    if expires_at is None:
        raise HTTPException(status_code=400, detail="Expiration date is required")

    if starts_at and expires_at <= starts_at:
        raise HTTPException(
            status_code=400,
            detail="Expiration date must be after start date"
        )

    now = datetime.now(timezone.utc)
    announcement_doc = {
        "message": payload.message.strip(),
        "starts_at": starts_at,
        "expires_at": expires_at,
        "created_by": teacher.get("username", ""),
        "created_at": now,
        "updated_at": now,
    }

    inserted = announcements_collection.insert_one(announcement_doc)
    created = announcements_collection.find_one({"_id": inserted.inserted_id})
    return _serialize_announcement(created)


@router.put("/{announcement_id}", response_model=Dict[str, Any])
def update_announcement(
    announcement_id: str,
    payload: AnnouncementUpdate,
    teacher_username: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Update an announcement. Requires authentication."""
    _require_teacher(teacher_username)

    starts_at = _parse_iso_datetime(payload.starts_at, "starts_at")
    expires_at = _parse_iso_datetime(payload.expires_at, "expires_at")

    if expires_at is None:
        raise HTTPException(status_code=400, detail="Expiration date is required")

    if starts_at and expires_at <= starts_at:
        raise HTTPException(
            status_code=400,
            detail="Expiration date must be after start date"
        )

    if not ObjectId.is_valid(announcement_id):
        raise HTTPException(status_code=400, detail="Invalid announcement id")

    result = announcements_collection.update_one(
        {"_id": ObjectId(announcement_id)},
        {
            "$set": {
                "message": payload.message.strip(),
                "starts_at": starts_at,
                "expires_at": expires_at,
                "updated_at": datetime.now(timezone.utc),
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")

    updated = announcements_collection.find_one({"_id": ObjectId(announcement_id)})
    return _serialize_announcement(updated)


@router.delete("/{announcement_id}", response_model=Dict[str, str])
def delete_announcement(
    announcement_id: str,
    teacher_username: Optional[str] = Query(None)
) -> Dict[str, str]:
    """Delete an announcement. Requires authentication."""
    _require_teacher(teacher_username)

    if not ObjectId.is_valid(announcement_id):
        raise HTTPException(status_code=400, detail="Invalid announcement id")

    result = announcements_collection.delete_one({"_id": ObjectId(announcement_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")

    return {"message": "Announcement deleted"}
