from fastapi.encoders import jsonable_encoder
from sqlalchemy import select

from .auth import fail
from .models import Activity, Challenge, Notification, Organization, Outcome, Partnership, Project, User
from .schemas import PrivateChallenge, PublicChallenge


def row_data(row):
    return jsonable_encoder({column.name: getattr(row, column.name) for column in row.__table__.columns})


def challenge_record(db, challenge_id, lock=False):
    query = select(Challenge).where(Challenge.id == challenge_id)
    if lock:
        query = query.with_for_update()
    challenge = db.scalar(query)
    if challenge is None:
        fail("not_found", 404)
    return challenge


def participates(db, challenge, user):
    if user.role == "government" or challenge.owner_id == user.id:
        return True
    if user.role == "university" and user.organization_id == challenge.university_id:
        return True
    if user.role == "industry":
        return bool(db.scalar(select(Partnership.id).join(Project, Partnership.project_id == Project.id).where(
            Project.challenge_id == challenge.id, Partnership.organization_id == user.organization_id, Partnership.status == "accepted"
        )))
    return False


def visible_challenges(user):
    query = select(Challenge)
    if user.role == "citizen":
        return query.where(Challenge.owner_id == user.id)
    if user.role == "university":
        return query.where(Challenge.university_id == user.organization_id)
    if user.role == "industry":
        allowed = select(Project.challenge_id).join(Partnership, Partnership.project_id == Project.id).where(Partnership.organization_id == user.organization_id, Partnership.status == "accepted")
        return query.where(Challenge.id.in_(allowed))
    return query


def private_challenge(db, challenge_id, user, lock=False):
    challenge = challenge_record(db, challenge_id, lock)
    if not participates(db, challenge, user):
        fail("not_found", 404)
    return challenge


def project_record(db, project_id, user, coordinator=False, lock=False):
    project = db.get(Project, project_id)
    if project is None:
        fail("not_found", 404)
    challenge = private_challenge(db, project.challenge_id, user, lock)
    if coordinator and (user.role != "university" or user.organization_id != project.university_id):
        fail("forbidden", 403)
    return project, challenge


def require_state(challenge, *states):
    if challenge.status not in states:
        fail("invalid_transition", 409)


def record_event(db, challenge, actor, event, details=None):
    db.add(Activity(challenge_id=challenge.id, actor_id=actor.id, action=event, details=details or {}))
    recipients = {challenge.owner_id}
    recipients.update(db.scalars(select(User.id).where(User.role == "government")))
    if challenge.university_id:
        recipients.update(db.scalars(select(User.id).where(User.organization_id == challenge.university_id)))
    partners = select(Partnership.organization_id).join(Project, Partnership.project_id == Project.id).where(Project.challenge_id == challenge.id, Partnership.status == "accepted")
    recipients.update(db.scalars(select(User.id).where(User.organization_id.in_(partners))))
    for recipient in recipients - {actor.id}:
        db.add(Notification(user_id=recipient, challenge_id=challenge.id, event=event))


def present_challenge(db, challenge, private=False, user=None):
    project = db.scalar(select(Project).where(Project.challenge_id == challenge.id))
    org = db.get(Organization, challenge.university_id) if challenge.university_id else None
    outcome = db.scalar(select(Outcome).where(Outcome.project_id == project.id, Outcome.status == "approved")) if project else None
    data = {field: getattr(challenge, field) for field in (
        "id", "public_title_en", "public_title_hi", "summary_en", "summary_hi", "district", "domain", "status", "created_at"
    )}
    data.update(project_id=project.id if project else None, university_name=org.name if org else None,
                beneficiaries=outcome.beneficiaries if outcome else 0, patents=outcome.patents if outcome else 0, startups=outcome.startups if outcome else 0)
    if not private:
        return PublicChallenge(**data)
    data.update({field: getattr(challenge, field) for field in PrivateChallenge.model_fields if hasattr(challenge, field)})
    # AI candidates can reference other private submissions; only reviewers may inspect them.
    if user is None or user.role != "government":
        data["ai_suggestions"] = None
    return PrivateChallenge(**data)
