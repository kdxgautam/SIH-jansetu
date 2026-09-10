"""Explicit, idempotent local demo data: python -m app.seed."""
import os
from datetime import timedelta

from sqlalchemy import select

from .auth import passwords
from .db import SessionLocal, now
from .models import Activity, Assignment, Challenge, Milestone, Organization, Outcome, Partnership, Project, Proposal, TeamMember, User


def seed(db):
    password = os.getenv("DEMO_PASSWORD", "DemoPass123!")
    if len(password) < 10:
        raise ValueError("DEMO_PASSWORD must have at least 10 characters")
    if db.scalar(select(User).where(User.email == "government@demo.local")):
        return False
    organizations = [
        Organization(name="Demo · Ranchi Institute of Technology", kind="university", district="Ranchi", domains=["water", "energy", "urban_development", "sanitation"], expertise="Environmental engineering, solar systems, water quality and community infrastructure.", facilities="Water testing laboratory, fabrication workshop and an incubation centre."),
        Organization(name="Demo · Birsa Rural Innovation Centre", kind="university", district="Khunti", domains=["agriculture", "rural_livelihoods", "environment"], expertise="Smallholder agriculture, irrigation, forest livelihoods and rural enterprise.", facilities="Field trial plots, soil testing laboratory, rural extension network."),
        Organization(name="Demo · Santhal Community University", kind="university", district="Dumka", domains=["healthcare", "education", "accessibility"], expertise="Public health, accessible design, inclusive education and community research.", facilities="Assistive technology lab, teacher development centre and community field teams."),
        Organization(name="Demo · GreenGrid Industries", kind="industry", district="Ranchi", domains=["water", "energy", "sanitation"], expertise="Solar pumping, water infrastructure, CSR funding and prototype manufacturing.", facilities="Prototype workshop, field engineers and a community CSR programme."),
        Organization(name="Demo · Adiva Social Ventures", kind="industry", district="East Singhbhum", domains=["accessibility", "healthcare", "education"], expertise="Assistive devices, community health delivery and inclusive technology.", facilities="Product mentoring, accessibility testing and pilot deployment support."),
    ]
    db.add_all(organizations)
    db.flush()
    users = [
        User(name="Ananya Kumari", email="citizen@demo.local", role="citizen"),
        User(name="State Innovation Cell", email="government@demo.local", role="government"),
        User(name="Dr. Meera Singh", email="university@demo.local", role="university", organization_id=organizations[0].id),
        User(name="Arjun Prasad", email="industry@demo.local", role="industry", organization_id=organizations[3].id),
        User(name="Dr. Nisha Munda", email="university2@demo.local", role="university", organization_id=organizations[1].id),
        User(name="Dr. Rohan Soren", email="university3@demo.local", role="university", organization_id=organizations[2].id),
        User(name="Aditi Das", email="industry2@demo.local", role="industry", organization_id=organizations[4].id),
    ]
    for user in users:
        user.password_hash = passwords.hash(password)
    db.add_all(users)
    db.flush()
    examples = [
        ("Reliable drinking water for village households", "गाँव के घरों के लिए सुरक्षित पेयजल", "water", "Ranchi", "in_progress", 0, "A community-led pilot is testing affordable water filtration and a shared maintenance model for households facing seasonal shortages.", "मौसमी जल संकट से जूझ रहे परिवारों के लिए कम लागत वाले जल शोधन और सामुदायिक रखरखाव का परीक्षण किया जा रहा है।"),
        ("Smarter irrigation for small farms", "छोटे खेतों के लिए बेहतर सिंचाई", "agriculture", "Khunti", "validated", 1, "Smallholder farmers need a low-cost way to monitor soil moisture and reduce water use during dry periods.", "छोटे किसानों को मिट्टी की नमी जाँचने और सूखे में पानी बचाने का सस्ता साधन चाहिए।"),
        ("Bringing essential health screening closer", "ज़रूरी स्वास्थ्य जाँच समुदाय के करीब", "healthcare", "Gumla", "assigned", 2, "Community health workers are exploring a portable screening kit to reduce travel for routine health checks.", "स्वास्थ्य कार्यकर्ता नियमित जाँच के लिए यात्रा कम करने हेतु पोर्टेबल जाँच किट पर काम कर रहे हैं।"),
        ("Learning resources beyond the classroom", "कक्षा से आगे सीखने के संसाधन", "education", "Dumka", "submitted", 2, "Students need offline learning resources in areas where reliable internet is unavailable.", "विश्वसनीय इंटरनेट के अभाव वाले क्षेत्रों में छात्रों को ऑफलाइन शिक्षण संसाधन चाहिए।"),
        ("Solar lighting for safer village evenings", "सुरक्षित शाम के लिए सौर रोशनी", "energy", "Simdega", "resolved", 0, "A completed demonstration installed community-maintained solar lighting and measured improved evening access to shared spaces.", "पूर्ण प्रदर्शन परियोजना में सामुदायिक रखरखाव वाली सौर रोशनी लगाई गई और शाम में सार्वजनिक स्थानों तक पहुँच में सुधार मापा गया।"),
        ("Turning neighbourhood waste into a resource", "मोहल्ले के कचरे को संसाधन बनाना", "sanitation", "Dhanbad", "validation", 0, "A neighbourhood composting pilot is being evaluated for household participation and reduced waste sent to landfill.", "घरेलू भागीदारी और लैंडफिल में जाने वाले कचरे में कमी के लिए सामुदायिक कम्पोस्टिंग का मूल्यांकन हो रहा है।"),
        ("Everyday spaces, accessible to everyone", "सभी के लिए सुलभ सार्वजनिक स्थान", "accessibility", "East Singhbhum", "in_progress", 2, "A student and community team is testing low-cost accessibility improvements at shared public facilities.", "छात्र और समुदाय मिलकर सार्वजनिक सुविधाओं में कम लागत वाले सुगम्यता सुधारों का परीक्षण कर रहे हैं।"),
        ("Better market access for forest livelihoods", "वन आजीविका के लिए बेहतर बाज़ार पहुँच", "rural_livelihoods", "Lohardaga", "needs_information", 1, "Community producer groups need better information on prices and shared transport to nearby markets.", "सामुदायिक उत्पादक समूहों को कीमतों और पास के बाज़ारों तक साझा परिवहन की बेहतर जानकारी चाहिए।"),
        ("Restoring a community pond together", "मिलकर सामुदायिक तालाब का पुनर्जीवन", "environment", "Hazaribagh", "validated", 1, "Residents seek an ecological restoration plan for a pond affected by silt and reduced seasonal water retention.", "गाद और कम जल संचयन से प्रभावित तालाब के लिए निवासी पर्यावरण अनुकूल पुनर्जीवन योजना चाहते हैं।"),
        ("A practical route to safer crossings", "सुरक्षित सड़क पार करने का व्यावहारिक उपाय", "urban_development", "Bokaro", "resolved", 0, "A completed street-design pilot tested safer pedestrian crossings with community observations before and after implementation.", "पूर्ण सड़क डिजाइन परीक्षण में क्रियान्वयन से पहले और बाद के सामुदायिक अवलोकनों के साथ सुरक्षित पैदल मार्ग जाँचे गए।"),
    ]
    for i, (title, hindi, domain, district, status, org_index, summary, summary_hi) in enumerate(examples):
        active = status in ("assigned", "in_progress", "validation", "resolved")
        c = Challenge(owner_id=users[0].id, title="[DEMO] " + title, description=summary + " This is fictional demonstration data, not an actual community report.", submitter_type="community", district=district, locality="Demo community location (private)", domain=domain, priority="high" if i == 0 else "normal", status=status,
                      public_title_en=title, public_title_hi=hindi, summary_en=summary, summary_hi=summary_hi,
                      published=status not in ("submitted", "needs_information"), university_id=organizations[org_index].id if active else None,
                      review_note="Demonstration review; no real-world validation is claimed.", ai_status="unavailable", created_at=now() - timedelta(days=55 - i * 5))
        db.add(c)
        db.flush()
        db.add(Activity(challenge_id=c.id, actor_id=users[0].id, action="challenge_submitted", created_at=c.created_at))
        if not active:
            continue
        db.add(Assignment(challenge_id=c.id, university_id=c.university_id, status="accepted"))
        p = Project(challenge_id=c.id, university_id=c.university_id)
        db.add(p)
        db.flush()
        db.add_all([TeamMember(project_id=p.id, name="Demo student researcher", discipline="Community engineering", kind="student"), TeamMember(project_id=p.id, name="Demo faculty mentor", discipline="Applied research", kind="faculty")])
        db.add(Proposal(project_id=p.id, approach="Co-design with the community, build a prototype, test on site and document the measured outcomes.", budget=250000, duration_weeks=12, status="submitted" if status == "assigned" else "approved", review_note="Demo project review."))
        if status != "assigned":
            complete = status in ("validation", "resolved")
            db.add_all([
                Milestone(project_id=p.id, title="Community consultation and baseline study", due_date=now().date() - timedelta(days=7), status="approved", evidence="Demo field study completed with household interviews and a documented baseline.", review_note="Demonstration evidence accepted."),
                Milestone(project_id=p.id, title="Prototype testing and community handover", due_date=now().date() + timedelta(days=21), status="approved" if complete else "pending", evidence="Demo prototype tested, observations recorded and handover completed." if complete else ""),
            ])
            partner = organizations[4] if domain == "accessibility" else organizations[3]
            db.add(Partnership(project_id=p.id, organization_id=partner.id, kind="funding", amount=80000 + i * 5000, description="Demonstration funding commitment for prototype materials and field testing; no money transferred.", status="accepted"))
        if status in ("validation", "resolved"):
            db.add(Outcome(project_id=p.id, beneficiaries=180 + i * 30, metric="Households reporting improved access", unit="households", baseline=25, result=100 + i * 10, testing_evidence="Fictional baseline and follow-up surveys used only to demonstrate the validation workflow.", patents=0, startups=0, status="approved" if status == "resolved" else "submitted", review_note="Demo validation only." if status == "resolved" else ""))
        db.add(Activity(challenge_id=c.id, actor_id=users[1].id, action="challenge_assigned", details={"demo": True}))
    db.flush()
    return True


if __name__ == "__main__":
    with SessionLocal.begin() as db:
        created = seed(db)
    print("Demo data created. See README.md for accounts." if created else "Demo data already exists; nothing changed.")
