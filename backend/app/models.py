import uuid

from sqlalchemy import Boolean, CheckConstraint, Column, Date, DateTime, Float, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint

from .db import Base, now


def pk():
    return Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))


def fk(table, **kwargs):
    return Column(String(36), ForeignKey(f"{table}.id"), **kwargs)


class Organization(Base):
    __tablename__ = "organizations"
    id = pk()
    name = Column(String(160), nullable=False)
    kind = Column(String(20), nullable=False)
    district = Column(String(60), nullable=False)
    domains = Column(JSON, nullable=False, default=list)
    expertise = Column(Text, nullable=False, default="")
    facilities = Column(Text, nullable=False, default="")
    __table_args__ = (CheckConstraint("kind IN ('university','industry')"),)


class User(Base):
    __tablename__ = "users"
    id = pk()
    email = Column(String(254), unique=True, nullable=False)
    name = Column(String(120), nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(String(20), nullable=False, default="citizen")
    organization_id = fk("organizations")
    created_at = Column(DateTime(timezone=True), default=now, nullable=False)
    __table_args__ = (CheckConstraint("role IN ('citizen','government','university','industry')"),)


class Session(Base):
    __tablename__ = "sessions"
    id = pk()
    token_hash = Column(String(64), nullable=False, unique=True)
    user_id = fk("users", nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)


class AuthAttempt(Base):
    __tablename__ = "auth_attempts"
    id = pk()
    key = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=now, nullable=False)


class Challenge(Base):
    __tablename__ = "challenges"
    id = pk()
    owner_id = fk("users", nullable=False)
    title = Column(String(180), nullable=False)
    description = Column(Text, nullable=False)
    submitter_type = Column(String(40), nullable=False)
    district = Column(String(60), nullable=False, index=True)
    locality = Column(String(200), nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    domain = Column(String(50), nullable=False, default="unclassified", index=True)
    priority = Column(String(20), nullable=False, default="normal")
    status = Column(String(30), nullable=False, default="submitted", index=True)
    public_title_en = Column(String(180), nullable=False, default="")
    public_title_hi = Column(String(180), nullable=False, default="")
    summary_en = Column(Text, nullable=False, default="")
    summary_hi = Column(Text, nullable=False, default="")
    published = Column(Boolean, nullable=False, default=False)
    university_id = fk("organizations")
    duplicate_of_id = fk("challenges")
    review_note = Column(Text, nullable=False, default="")
    ai_status = Column(String(20), nullable=False, default="pending")
    ai_suggestions = Column(JSON)
    revision = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), default=now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now, onupdate=now, nullable=False)


class Assignment(Base):
    __tablename__ = "assignments"
    id = pk()
    challenge_id = fk("challenges", nullable=False, index=True)
    university_id = fk("organizations", nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    note = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), default=now, nullable=False)


class Project(Base):
    __tablename__ = "projects"
    id = pk()
    challenge_id = fk("challenges", nullable=False, unique=True)
    university_id = fk("organizations", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now, nullable=False)


class TeamMember(Base):
    __tablename__ = "team_members"
    id = pk()
    project_id = fk("projects", nullable=False, index=True)
    name = Column(String(120), nullable=False)
    discipline = Column(String(120), nullable=False)
    kind = Column(String(20), nullable=False)
    __table_args__ = (CheckConstraint("kind IN ('student','faculty')"),)


class Proposal(Base):
    __tablename__ = "proposals"
    id = pk()
    project_id = fk("projects", nullable=False, unique=True)
    approach = Column(Text, nullable=False)
    budget = Column(Numeric(14, 2), nullable=False)
    duration_weeks = Column(Integer, nullable=False)
    status = Column(String(30), nullable=False, default="submitted")
    review_note = Column(Text, nullable=False, default="")
    __table_args__ = (CheckConstraint("budget >= 0"), CheckConstraint("duration_weeks > 0"))


class Milestone(Base):
    __tablename__ = "milestones"
    id = pk()
    project_id = fk("projects", nullable=False, index=True)
    title = Column(String(180), nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(String(30), nullable=False, default="pending")
    evidence = Column(Text, nullable=False, default="")
    review_note = Column(Text, nullable=False, default="")


class Partnership(Base):
    __tablename__ = "partnerships"
    id = pk()
    project_id = fk("projects", nullable=False, index=True)
    organization_id = fk("organizations", nullable=False)
    kind = Column(String(30), nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(Numeric(14, 2), nullable=False, default=0)
    status = Column(String(20), nullable=False, default="offered")
    __table_args__ = (UniqueConstraint("project_id", "organization_id", "kind"), CheckConstraint("amount >= 0"))


class Outcome(Base):
    __tablename__ = "outcomes"
    id = pk()
    project_id = fk("projects", nullable=False, unique=True)
    beneficiaries = Column(Integer, nullable=False)
    metric = Column(String(180), nullable=False)
    unit = Column(String(60), nullable=False)
    baseline = Column(Float, nullable=False)
    result = Column(Float, nullable=False)
    testing_evidence = Column(Text, nullable=False)
    patents = Column(Integer, nullable=False, default=0)
    startups = Column(Integer, nullable=False, default=0)
    innovation_details = Column(Text, nullable=False, default="")
    status = Column(String(30), nullable=False, default="submitted")
    review_note = Column(Text, nullable=False, default="")
    citizen_feedback = Column(Text, nullable=False, default="")
    ai_status = Column(String(20), nullable=False, default="pending")
    ai_suggestions = Column(JSON)
    __table_args__ = (CheckConstraint("beneficiaries >= 0 AND patents >= 0 AND startups >= 0"),)


class Comment(Base):
    __tablename__ = "comments"
    id = pk()
    challenge_id = fk("challenges", nullable=False, index=True)
    author_id = fk("users", nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now, nullable=False)


class Attachment(Base):
    __tablename__ = "attachments"
    id = pk()
    challenge_id = fk("challenges", nullable=False, index=True)
    uploader_id = fk("users", nullable=False)
    filename = Column(String(200), nullable=False)
    storage_name = Column(String(64), nullable=False, unique=True)
    content_type = Column(String(100), nullable=False)
    size = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now, nullable=False)


class Activity(Base):
    __tablename__ = "activities"
    id = pk()
    challenge_id = fk("challenges", nullable=False, index=True)
    actor_id = fk("users", nullable=False)
    action = Column(String(60), nullable=False)
    details = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=now, nullable=False)


class Notification(Base):
    __tablename__ = "notifications"
    id = pk()
    user_id = fk("users", nullable=False, index=True)
    challenge_id = fk("challenges", nullable=False)
    event = Column(String(60), nullable=False)
    read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=now, nullable=False)
