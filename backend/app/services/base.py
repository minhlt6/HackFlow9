from typing import Any, Dict, Generic, List, Optional, Tuple, TypeVar, Union
from pydantic import BaseModel

from app.core.database import Base
from app.core.exceptions import NotFoundException
from app.repositories.base import BaseRepository

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Base Service layer handling domain logic, validation, and coordinating Repository calls.
    Decoupled from HTTP controllers/routers.
    """

    def __init__(self, repository: BaseRepository[ModelType, CreateSchemaType, UpdateSchemaType]):
        self.repository = repository

    async def get_or_404(self, id: Any, error_message: Optional[str] = None) -> ModelType:
        """
        Fetch entity by ID or raise standardized NotFoundException.
        """
        item = await self.repository.get(id)
        if not item:
            msg = error_message or f"Bản ghi với ID '{id}' không tồn tại."
            raise NotFoundException(message=msg)
        return item

    async def get_optional(self, id: Any) -> Optional[ModelType]:
        """
        Fetch entity by ID without raising an exception if not found.
        """
        return await self.repository.get(id)

    async def get_multi(
        self, *, skip: int = 0, limit: int = 100
    ) -> Tuple[List[ModelType], int]:
        """
        Fetch items with total count for paginated responses.
        """
        items = await self.repository.get_multi(skip=skip, limit=limit)
        total = await self.repository.count()
        return items, total

    async def create(self, obj_in: Union[CreateSchemaType, Dict[str, Any]]) -> ModelType:
        """
        Validate and create new entity.
        """
        return await self.repository.create(obj_in)

    async def update(
        self, id: Any, obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """
        Validate and update an existing entity by ID.
        """
        db_obj = await self.get_or_404(id)
        return await self.repository.update(db_obj, obj_in)

    async def delete(self, id: Any) -> ModelType:
        """
        Delete an existing entity by ID.
        """
        db_obj = await self.get_or_404(id)
        await self.repository.delete(id)
        return db_obj
