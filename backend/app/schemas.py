from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

DOMAINS = ["education", "agriculture", "healthcare", "water", "environment", "energy", "urban_development", "accessibility", "public_administration", "rural_livelihoods", "sanitation"]
DISTRICTS = ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahibganj", "Seraikela Kharsawan", "Simdega", "West Singhbhum"]
Domain = Literal["education", "agriculture", "healthcare", "water", "environment", "energy", "urban_development", "accessibility", "public_administration", "rural_livelihoods", "sanitation"]
Priority = Literal["low", "normal", "high", "critical"]
Language = Literal["en", "hi"]
SupportKind = Literal["mentorship", "funding", "prototyping", "pilot", "technology_transfer"]
ChatPage = Literal["home", "explore", "challenge", "auth", "workspace", "new_challenge", "offers", "analytics", "organization", "notifications", "other"]
CHAT_ANSWER_MAX = 1500  # An assistant reply is replayed as history, so a turn must hold a full answer.
ChatText = Annotated[str, Field(min_length=1, max_length=CHAT_ANSWER_MAX)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)


class Login(Input):
    email: str = Field(min_length=5, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value):
        return value.lower()


class Register(Login):
    name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=10, max_length=128)


class ChallengeInput(Input):
    title: str = Field(min_length=8, max_length=180)
    description: str = Field(min_length=30, max_length=10000)
    submitter_type: Literal["individual", "community", "panchayat", "urban_body", "government"]
    district: str
    locality: str = Field(min_length=2, max_length=200)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    @field_validator("district")
    @classmethod
    def known_district(cls, value):
        if value not in DISTRICTS:
            raise ValueError("unknown_district")
        return value

    @model_validator(mode="after")
    def coordinate_pair(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("coordinate_pair_required")
        return self


class ReviewInput(Input):
    decision: Literal["validate", "needs_information", "reject", "duplicate"]
    note: str = Field(min_length=3, max_length=2000)
    domain: Domain | None = None
    priority: Priority = "normal"
    public_title_en: str = Field(default="", max_length=180)
    public_title_hi: str = Field(default="", max_length=180)
    summary_en: str = Field(default="", max_length=3000)
    summary_hi: str = Field(default="", max_length=3000)
    duplicate_of_id: str | None = None

    @model_validator(mode="after")
    def required_fields(self):
        if self.decision == "validate":
            if not self.domain or min(len(self.public_title_en), len(self.public_title_hi)) < 8 or min(len(self.summary_en), len(self.summary_hi)) < 30:
                raise ValueError("public_summaries_required")
        if self.decision == "duplicate" and not self.duplicate_of_id:
            raise ValueError("duplicate_target_required")
        return self


class AssignmentInput(Input):
    university_id: str


class Decision(Input):
    decision: Literal["approve", "request_changes"]
    note: str = Field(min_length=3, max_length=2000)


class AcceptInput(Input):
    decision: Literal["accept", "decline"]
    note: str = Field(default="", max_length=2000)


class TeamInput(Input):
    name: str = Field(min_length=2, max_length=120)
    discipline: str = Field(min_length=2, max_length=120)
    kind: Literal["student", "faculty"]


class ProposalInput(Input):
    approach: str = Field(min_length=30, max_length=10000)
    budget: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    duration_weeks: int = Field(ge=1, le=520)


class MilestoneInput(Input):
    title: str = Field(min_length=3, max_length=180)
    due_date: date


class EvidenceInput(Input):
    evidence: str = Field(min_length=20, max_length=10000)


class PartnershipInput(Input):
    kind: SupportKind
    description: str = Field(min_length=20, max_length=4000)
    amount: Decimal = Field(default=Decimal(0), ge=0, max_digits=14, decimal_places=2)

    @model_validator(mode="after")
    def funding_amount(self):
        if self.kind == "funding" and self.amount <= 0:
            raise ValueError("funding_amount_required")
        if self.kind != "funding" and self.amount != 0:
            raise ValueError("only_funding_has_amount")
        return self


class OutcomeInput(Input):
    beneficiaries: int = Field(ge=0, le=100000000)
    metric: str = Field(min_length=3, max_length=180)
    unit: str = Field(min_length=1, max_length=60)
    baseline: float
    result: float
    testing_evidence: str = Field(min_length=30, max_length=10000)
    patents: int = Field(default=0, ge=0, le=10000)
    startups: int = Field(default=0, ge=0, le=10000)
    innovation_details: str = Field(default="", max_length=4000)

    @model_validator(mode="after")
    def innovation_source(self):
        if (self.patents or self.startups) and len(self.innovation_details) < 10:
            raise ValueError("innovation_source_required")
        return self


class CommentInput(Input):
    body: str = Field(min_length=1, max_length=4000)


class OrganizationInput(Input):
    expertise: str = Field(min_length=10, max_length=4000)
    facilities: str = Field(max_length=4000)
    domains: list[Domain] = Field(min_length=1, max_length=11)


class AISuggestionMatch(Input):
    id: str
    reason_en: str = Field(max_length=1000)
    reason_hi: str = Field(max_length=1000)


class AIResult(Input):
    domain: Domain
    priority: Priority
    reason_en: str = Field(min_length=1, max_length=2000)
    reason_hi: str = Field(min_length=1, max_length=2000)
    public_title_en: str = Field(min_length=8, max_length=180)
    public_title_hi: str = Field(min_length=8, max_length=180)
    summary_en: str = Field(min_length=30, max_length=3000)
    summary_hi: str = Field(min_length=30, max_length=3000)
    duplicates: list[AISuggestionMatch] = Field(max_length=5)
    universities: list[AISuggestionMatch] = Field(max_length=5)


class CitizenGuidanceInput(Input):
    title: str = Field(min_length=8, max_length=180)
    description: str = Field(min_length=30, max_length=10000)
    district: str
    language: Language

    @field_validator("district")
    @classmethod
    def known_district(cls, value):
        if value not in DISTRICTS:
            raise ValueError("unknown_district")
        return value


class CitizenGuidance(Input):
    language: Language
    suggested_title: str = Field(min_length=8, max_length=180)
    suggested_description: str = Field(min_length=30, max_length=10000)
    questions: list[str] = Field(max_length=5)


class AIMilestoneDraft(Input):
    title: str = Field(min_length=3, max_length=180)
    week: int = Field(ge=1, le=520)


class AIProjectPlan(Input):
    language: Language
    approach: str = Field(min_length=30, max_length=10000)
    duration_weeks: int = Field(ge=1, le=520)
    milestones: list[AIMilestoneDraft] = Field(min_length=1, max_length=5)


class AIOpportunityMatch(Input):
    challenge_id: str
    support_kind: SupportKind
    reason_en: str = Field(min_length=1, max_length=1000)
    reason_hi: str = Field(min_length=1, max_length=1000)


class AIOpportunityMatches(Input):
    matches: list[AIOpportunityMatch] = Field(max_length=10)


class AIOutcomeAssessment(Input):
    recommendation: Literal["approve", "request_changes"]
    reason_en: str = Field(min_length=1, max_length=2000)
    reason_hi: str = Field(min_length=1, max_length=2000)
    evidence_gaps: list[str] = Field(max_length=5)
    metric_observations: list[str] = Field(max_length=5)


class ChatTurn(Input):
    role: Literal["user", "assistant"]
    content: ChatText


class ChatInput(Input):
    message: str = Field(min_length=2, max_length=500)
    language: Language
    page: ChatPage
    history: list[ChatTurn] = Field(default_factory=list, max_length=6)


class AIChatReply(Input):
    language: Language
    answer: str = Field(min_length=1, max_length=CHAT_ANSWER_MAX)
    suggestions: list[Annotated[str, Field(min_length=2, max_length=180)]] = Field(default_factory=list, max_length=3)


class ChatReply(AIChatReply):
    source: Literal["ai", "curated"]


class PublicChallenge(BaseModel):
    id: str
    public_title_en: str
    public_title_hi: str
    summary_en: str
    summary_hi: str
    district: str
    domain: str
    status: str
    created_at: datetime
    project_id: str | None
    university_name: str | None
    beneficiaries: int
    patents: int
    startups: int


class PrivateChallenge(PublicChallenge):
    title: str
    description: str
    submitter_type: str
    locality: str
    latitude: float | None
    longitude: float | None
    owner_id: str
    university_id: str | None
    priority: str
    review_note: str
    duplicate_of_id: str | None
    ai_status: str
    ai_suggestions: dict | None
    revision: int
    updated_at: datetime


class UserOutput(BaseModel):
    id: str
    name: str
    email: str
    role: str
    organization_id: str | None
    model_config = ConfigDict(from_attributes=True)
