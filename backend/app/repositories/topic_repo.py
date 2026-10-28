from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.config import HackathonConfig
from app.models.topic import Subtopic, Topic


class TopicRepository:
    """
    Data access layer for Topic, Subtopic and HackathonConfig models.
    """

    @staticmethod
    async def get_all(
        db: AsyncSession,
        only_active: bool = True,
    ) -> List[Topic]:
        stmt = (
            select(Topic)
            .options(selectinload(Topic.subtopics).selectinload(Subtopic.mentor))
            .order_by(Topic.created_at.asc())
        )
        if only_active:
            stmt = stmt.where(Topic.is_active.is_(True))
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        topic_id: str,
        for_update: bool = False,
    ) -> Optional[Topic]:
        stmt = (
            select(Topic)
            .where(Topic.id == topic_id)
            .options(selectinload(Topic.subtopics).selectinload(Subtopic.mentor))
        )
        if for_update:
            stmt = stmt.with_for_update()
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_subtopic_by_id(
        db: AsyncSession,
        subtopic_id: str,
        for_update: bool = False,
    ) -> Optional[Subtopic]:
        stmt = select(Subtopic).options(selectinload(Subtopic.mentor)).where(Subtopic.id == subtopic_id)
        if for_update:
            stmt = stmt.with_for_update()
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_config(db: AsyncSession) -> Optional[HackathonConfig]:
        stmt = select(HackathonConfig).order_by(HackathonConfig.created_at.asc()).limit(1)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_topic(
        db: AsyncSession,
        title: str,
        description: Optional[str] = None,
        max_teams: int = 10,
        is_active: bool = True,
    ) -> Topic:
        topic = Topic(
            title=title.strip(),
            description=description,
            max_teams=max_teams,
            current_teams=0,
            is_active=is_active,
        )
        db.add(topic)
        await db.flush()
        return topic

    @staticmethod
    async def create_subtopic(
        db: AsyncSession,
        topic_id: str,
        title: str,
        description: Optional[str] = None,
        max_teams: int = 5,
        is_active: bool = True,
        mentor_id: Optional[str] = None,
    ) -> Subtopic:
        subtopic = Subtopic(
            topic_id=topic_id,
            mentor_id=mentor_id,
            title=title.strip(),
            description=description,
            max_teams=max_teams,
            current_teams=0,
            is_active=is_active,
        )
        db.add(subtopic)
        await db.flush()
        return subtopic


topic_repo = TopicRepository()
