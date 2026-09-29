from typing import Generic, List, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    """
    Standard pagination query parameters.
    """
    skip: int = Field(default=0, ge=0, description="Số lượng bản ghi bỏ qua")
    limit: int = Field(default=20, ge=1, le=100, description="Số lượng bản ghi tối đa trên một trang")


class PaginatedData(BaseModel, Generic[T]):
    """
    Paginated data payload.
    """
    items: List[T]
    total: int
    skip: int
    limit: int
