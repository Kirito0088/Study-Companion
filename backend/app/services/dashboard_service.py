"""Service layer for dashboard data."""

from app.data.mock_data import DASHBOARD_DATA
from app.schemas.schemas import DashboardResponse


def get_dashboard() -> dict:
    return DASHBOARD_DATA
