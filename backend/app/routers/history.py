"""
AgriVision AI — History Router
=================================
GET /history — User prediction history.
"""

from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter(prefix="/history", tags=["History"])


@router.get("")
async def get_history(
    user_id: Optional[int] = Query(None),
    limit: int = Query(20, le=100),
):
    """Get prediction history."""
    from app.routers.predict import _predictions_store

    results = _predictions_store.copy()
    results.reverse()  # Most recent first

    if limit:
        results = results[:limit]

    return {"history": results, "total": len(_predictions_store)}
