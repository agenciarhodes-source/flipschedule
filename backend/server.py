from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone, timedelta
import uuid
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="FlipSchedule API")
api = APIRouter(prefix="/api")

# ---------- Helpers ----------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def new_id() -> str:
    return str(uuid.uuid4())

def new_token(n: int = 24) -> str:
    return secrets.token_urlsafe(n)

async def get_tenant_or_404(slug: str) -> Dict[str, Any]:
    t = await db.tenants.find_one({"slug": slug}, {"_id": 0})
    if not t:
        raise HTTPException(404, f"Tenant '{slug}' not found")
    return t

def strip_id(doc: Dict[str, Any]) -> Dict[str, Any]:
    doc.pop("_id", None)
    return doc

# ---------- Models ----------

class Tenant(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    slug: str
    vertical: str = "odonto"
    tier: str = "growth"
    timezone: str = "America/Sao_Paulo"
    status: str = "trial"
    settings: Dict[str, Any] = {}
    created_at: str = Field(default_factory=now_iso)

class Clinic(BaseModel):
    id: str = Field(default_factory=new_id)
    tenant_id: str
    name: str
    address: Optional[Dict[str, Any]] = None
    phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    timezone: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)

class Professional(BaseModel):
    id: str = Field(default_factory=new_id)
    tenant_id: str
    clinic_id: Optional[str] = None
    full_name: str
    cro: Optional[str] = None
    specialties: List[str] = []
    color: str = "#95E4A5"
    active: bool = True
    working_hours: List[Dict[str, Any]] = []  # [{weekday: 1, start: "08:00", end: "18:00"}]
    created_at: str = Field(default_factory=now_iso)

class ProfessionalCreate(BaseModel):
    full_name: str
    cro: Optional[str] = None
    specialties: List[str] = []
    color: str = "#95E4A5"
    active: bool = True
    working_hours: List[Dict[str, Any]] = []

class Resource(BaseModel):
    id: str = Field(default_factory=new_id)
    tenant_id: str
    name: str
    type: str = "chair"  # chair | room | equipment
    active: bool = True

class ResourceCreate(BaseModel):
    name: str
    type: str = "chair"
    active: bool = True

class Procedure(BaseModel):
    id: str = Field(default_factory=new_id)
    tenant_id: str
    code: Optional[str] = None
    name: str
    duration_minutes: int = 30
    default_price_cents: Optional[int] = None
    category: Optional[str] = None
    active: bool = True

class ProcedureCreate(BaseModel):
    code: Optional[str] = None
    name: str
    duration_minutes: int = 30
    default_price_cents: Optional[int] = None
    category: Optional[str] = None
    active: bool = True

class Patient(BaseModel):
    id: str = Field(default_factory=new_id)
    tenant_id: str
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    cpf: Optional[str] = None
    birthdate: Optional[str] = None
    is_patient: bool = False
    tags: List[str] = []
    notes: Optional[str] = None
    lgpd_consent_at: Optional[str] = None
    ltv_cents_realized: int = 0
    first_source: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)

class PatientCreate(BaseModel):
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    lgpd_consent: bool = True

class Lead(BaseModel):
    id: str = Field(default_factory=new_id)
    tenant_id: str
    patient_id: str
    stage: str = "new"  # new | qualifying | qualified | scheduled | won | lost
    intent: Optional[str] = None
    procedure_id: Optional[str] = None
    estimated_value_cents: Optional[int] = None
    first_channel: Optional[str] = None
    assigned_to: Optional[str] = None
    reason_lost: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    qualified_at: Optional[str] = None
    scheduled_at: Optional[str] = None
    won_at: Optional[str] = None
    lost_at: Optional[str] = None

class LeadCreate(BaseModel):
    patient_id: str
    stage: str = "new"
    intent: Optional[str] = None
    procedure_id: Optional[str] = None
    estimated_value_cents: Optional[int] = None
    first_channel: Optional[str] = None

class LeadUpdate(BaseModel):
    stage: Optional[str] = None
    intent: Optional[str] = None
    procedure_id: Optional[str] = None
    estimated_value_cents: Optional[int] = None
    reason_lost: Optional[str] = None
    assigned_to: Optional[str] = None

class Appointment(BaseModel):
    id: str = Field(default_factory=new_id)
    tenant_id: str
    patient_id: str
    professional_id: str
    resource_id: Optional[str] = None
    procedure_id: Optional[str] = None
    lead_id: Optional[str] = None
    start_at: str
    end_at: str
    status: str = "scheduled"  # scheduled | confirmed | arrived | attended | no_show | cancelled
    price_cents: Optional[int] = None
    notes: Optional[str] = None
    source: str = "internal"
    created_at: str = Field(default_factory=now_iso)

class AppointmentCreate(BaseModel):
    patient_id: str
    professional_id: str
    procedure_id: Optional[str] = None
    resource_id: Optional[str] = None
    start_at: str
    end_at: str
    notes: Optional[str] = None
    status: str = "scheduled"

class AppointmentUpdate(BaseModel):
    patient_id: Optional[str] = None
    professional_id: Optional[str] = None
    procedure_id: Optional[str] = None
    resource_id: Optional[str] = None
    start_at: Optional[str] = None
    end_at: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class TreatmentPlanItem(BaseModel):
    id: str = Field(default_factory=new_id)
    procedure_id: Optional[str] = None
    description: str
    tooth_number: Optional[str] = None
    quantity: int = 1
    unit_price_cents: int

class TreatmentPlan(BaseModel):
    id: str = Field(default_factory=new_id)
    tenant_id: str
    patient_id: str
    professional_id: Optional[str] = None
    lead_id: Optional[str] = None
    title: str
    items: List[TreatmentPlanItem] = []
    total_cents: int = 0
    discount_cents: int = 0
    final_cents: int = 0
    status: str = "draft"  # draft | sent | viewed | accepted | rejected | expired
    public_token: Optional[str] = None
    expires_at: Optional[str] = None
    sent_at: Optional[str] = None
    viewed_at: Optional[str] = None
    accepted_at: Optional[str] = None
    rejected_at: Optional[str] = None
    payment_options: Optional[Dict[str, Any]] = None
    created_at: str = Field(default_factory=now_iso)

class TreatmentPlanCreate(BaseModel):
    patient_id: str
    professional_id: Optional[str] = None
    title: str
    items: List[TreatmentPlanItem] = []
    discount_cents: int = 0
    payment_options: Optional[Dict[str, Any]] = None

class TreatmentPlanUpdate(BaseModel):
    title: Optional[str] = None
    items: Optional[List[TreatmentPlanItem]] = None
    discount_cents: Optional[int] = None
    status: Optional[str] = None
    payment_options: Optional[Dict[str, Any]] = None

class PlanAcceptPayload(BaseModel):
    full_name: str
    cpf: str
    phone: str
    lgpd_agreed: bool

class Conversation(BaseModel):
    id: str = Field(default_factory=new_id)
    tenant_id: str
    patient_id: Optional[str] = None
    lead_id: Optional[str] = None
    channel: str = "whatsapp"  # whatsapp | instagram | messenger | form
    status: str = "open"
    last_message_at: Optional[str] = None
    last_message_preview: Optional[str] = None
    unread_count: int = 0
    created_at: str = Field(default_factory=now_iso)

class Message(BaseModel):
    id: str = Field(default_factory=new_id)
    conversation_id: str
    tenant_id: str
    direction: str  # inbound | outbound
    sender_type: str = "user"  # patient | user | system | ai_agent
    content_type: str = "text"
    text_content: str
    status: str = "sent"
    created_at: str = Field(default_factory=now_iso)

class MessageCreate(BaseModel):
    text_content: str

# ---------- Utility computes ----------

def compute_plan_totals(items: List[Dict[str, Any]], discount_cents: int) -> Dict[str, int]:
    total = sum(int(i.get("quantity", 1)) * int(i.get("unit_price_cents", 0)) for i in items)
    final = max(0, total - int(discount_cents or 0))
    return {"total_cents": total, "final_cents": final}

async def has_conflict(tenant_id: str, professional_id: str, start_at: str, end_at: str, exclude_id: Optional[str] = None) -> bool:
    q = {
        "tenant_id": tenant_id,
        "professional_id": professional_id,
        "status": {"$nin": ["cancelled", "no_show"]},
        "start_at": {"$lt": end_at},
        "end_at": {"$gt": start_at},
    }
    if exclude_id:
        q["id"] = {"$ne": exclude_id}
    existing = await db.appointments.find_one(q, {"_id": 0})
    return existing is not None

# ---------- Root / health ----------

@api.get("/")
async def root():
    return {"service": "FlipSchedule API", "status": "ok"}

@api.get("/health")
async def health():
    checks = {"db": "unknown"}
    try:
        await db.command("ping")
        checks["db"] = "ok"
    except Exception:
        checks["db"] = "fail"
    ok = all(v == "ok" for v in checks.values())
    return {"ok": ok, "checks": checks, "ts": now_iso()}

# ---------- Tenants ----------

@api.get("/tenants")
async def list_tenants():
    items = await db.tenants.find({}, {"_id": 0}).to_list(100)
    return items

@api.get("/tenants/{slug}")
async def get_tenant(slug: str):
    return await get_tenant_or_404(slug)

# ---------- Professionals ----------

@api.get("/tenants/{slug}/professionals")
async def list_professionals(slug: str):
    t = await get_tenant_or_404(slug)
    items = await db.professionals.find({"tenant_id": t["id"]}, {"_id": 0}).to_list(500)
    return items

@api.post("/tenants/{slug}/professionals")
async def create_professional(slug: str, body: ProfessionalCreate):
    t = await get_tenant_or_404(slug)
    p = Professional(tenant_id=t["id"], **body.model_dump())
    await db.professionals.insert_one(p.model_dump())
    return p

@api.patch("/tenants/{slug}/professionals/{pid}")
async def update_professional(slug: str, pid: str, body: ProfessionalCreate):
    t = await get_tenant_or_404(slug)
    await db.professionals.update_one({"id": pid, "tenant_id": t["id"]}, {"$set": body.model_dump()})
    doc = await db.professionals.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc

@api.delete("/tenants/{slug}/professionals/{pid}")
async def delete_professional(slug: str, pid: str):
    t = await get_tenant_or_404(slug)
    await db.professionals.delete_one({"id": pid, "tenant_id": t["id"]})
    return {"ok": True}

# ---------- Resources ----------

@api.get("/tenants/{slug}/resources")
async def list_resources(slug: str):
    t = await get_tenant_or_404(slug)
    return await db.resources.find({"tenant_id": t["id"]}, {"_id": 0}).to_list(500)

@api.post("/tenants/{slug}/resources")
async def create_resource(slug: str, body: ResourceCreate):
    t = await get_tenant_or_404(slug)
    r = Resource(tenant_id=t["id"], **body.model_dump())
    await db.resources.insert_one(r.model_dump())
    return r

@api.delete("/tenants/{slug}/resources/{rid}")
async def delete_resource(slug: str, rid: str):
    t = await get_tenant_or_404(slug)
    await db.resources.delete_one({"id": rid, "tenant_id": t["id"]})
    return {"ok": True}

# ---------- Procedures ----------

@api.get("/tenants/{slug}/procedures")
async def list_procedures(slug: str):
    t = await get_tenant_or_404(slug)
    return await db.procedures.find({"tenant_id": t["id"]}, {"_id": 0}).to_list(500)

@api.post("/tenants/{slug}/procedures")
async def create_procedure(slug: str, body: ProcedureCreate):
    t = await get_tenant_or_404(slug)
    p = Procedure(tenant_id=t["id"], **body.model_dump())
    await db.procedures.insert_one(p.model_dump())
    return p

@api.patch("/tenants/{slug}/procedures/{pid}")
async def update_procedure(slug: str, pid: str, body: ProcedureCreate):
    t = await get_tenant_or_404(slug)
    await db.procedures.update_one({"id": pid, "tenant_id": t["id"]}, {"$set": body.model_dump()})
    return await db.procedures.find_one({"id": pid}, {"_id": 0})

@api.delete("/tenants/{slug}/procedures/{pid}")
async def delete_procedure(slug: str, pid: str):
    t = await get_tenant_or_404(slug)
    await db.procedures.delete_one({"id": pid, "tenant_id": t["id"]})
    return {"ok": True}

# ---------- Patients ----------

@api.get("/tenants/{slug}/patients")
async def list_patients(slug: str, q: Optional[str] = None):
    t = await get_tenant_or_404(slug)
    query: Dict[str, Any] = {"tenant_id": t["id"]}
    if q:
        query["$or"] = [
            {"full_name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q}},
        ]
    return await db.patients.find(query, {"_id": 0}).sort("full_name", 1).to_list(500)

@api.post("/tenants/{slug}/patients")
async def create_patient(slug: str, body: PatientCreate):
    t = await get_tenant_or_404(slug)
    # dedupe by phone
    if body.phone:
        existing = await db.patients.find_one({"tenant_id": t["id"], "phone": body.phone}, {"_id": 0})
        if existing:
            return existing
    p = Patient(
        tenant_id=t["id"],
        full_name=body.full_name,
        phone=body.phone,
        email=body.email,
        lgpd_consent_at=now_iso() if body.lgpd_consent else None,
    )
    await db.patients.insert_one(p.model_dump())
    return p

@api.get("/tenants/{slug}/patients/{pid}")
async def get_patient(slug: str, pid: str):
    t = await get_tenant_or_404(slug)
    p = await db.patients.find_one({"id": pid, "tenant_id": t["id"]}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Patient not found")
    appts = await db.appointments.find({"tenant_id": t["id"], "patient_id": pid}, {"_id": 0}).sort("start_at", -1).to_list(50)
    plans = await db.treatment_plans.find({"tenant_id": t["id"], "patient_id": pid}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"patient": p, "appointments": appts, "treatment_plans": plans}

# ---------- Leads ----------

@api.get("/tenants/{slug}/leads")
async def list_leads(slug: str):
    t = await get_tenant_or_404(slug)
    leads = await db.leads.find({"tenant_id": t["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    # attach patient minimal info
    pids = list({l["patient_id"] for l in leads})
    patients = await db.patients.find({"id": {"$in": pids}}, {"_id": 0}).to_list(1000)
    pmap = {p["id"]: p for p in patients}
    for l in leads:
        p = pmap.get(l["patient_id"])
        l["patient"] = {"id": p["id"], "full_name": p["full_name"], "phone": p.get("phone")} if p else None
    return leads

@api.post("/tenants/{slug}/leads")
async def create_lead(slug: str, body: LeadCreate):
    t = await get_tenant_or_404(slug)
    l = Lead(tenant_id=t["id"], **body.model_dump())
    await db.leads.insert_one(l.model_dump())
    return l

@api.patch("/tenants/{slug}/leads/{lid}")
async def update_lead(slug: str, lid: str, body: LeadUpdate):
    t = await get_tenant_or_404(slug)
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    # stage transitions timestamps
    if body.stage:
        stage_ts = {
            "qualified": "qualified_at",
            "scheduled": "scheduled_at",
            "won": "won_at",
            "lost": "lost_at",
        }.get(body.stage)
        if stage_ts:
            patch[stage_ts] = now_iso()
    await db.leads.update_one({"id": lid, "tenant_id": t["id"]}, {"$set": patch})
    return await db.leads.find_one({"id": lid}, {"_id": 0})

@api.delete("/tenants/{slug}/leads/{lid}")
async def delete_lead(slug: str, lid: str):
    t = await get_tenant_or_404(slug)
    await db.leads.delete_one({"id": lid, "tenant_id": t["id"]})
    return {"ok": True}

# ---------- Appointments ----------

@api.get("/tenants/{slug}/appointments")
async def list_appointments(slug: str, start: Optional[str] = None, end: Optional[str] = None):
    t = await get_tenant_or_404(slug)
    q: Dict[str, Any] = {"tenant_id": t["id"]}
    if start and end:
        q["start_at"] = {"$gte": start, "$lt": end}
    return await db.appointments.find(q, {"_id": 0}).sort("start_at", 1).to_list(2000)

@api.post("/tenants/{slug}/appointments")
async def create_appointment(slug: str, body: AppointmentCreate):
    t = await get_tenant_or_404(slug)
    if await has_conflict(t["id"], body.professional_id, body.start_at, body.end_at):
        raise HTTPException(409, "Conflito de horário para este profissional")
    a = Appointment(tenant_id=t["id"], **body.model_dump())
    await db.appointments.insert_one(a.model_dump())
    return a

@api.patch("/tenants/{slug}/appointments/{aid}")
async def update_appointment(slug: str, aid: str, body: AppointmentUpdate):
    t = await get_tenant_or_404(slug)
    current = await db.appointments.find_one({"id": aid, "tenant_id": t["id"]}, {"_id": 0})
    if not current:
        raise HTTPException(404, "Appointment not found")
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    new_pro = patch.get("professional_id", current["professional_id"])
    new_start = patch.get("start_at", current["start_at"])
    new_end = patch.get("end_at", current["end_at"])
    new_status = patch.get("status", current["status"])
    if new_status not in ("cancelled", "no_show"):
        if await has_conflict(t["id"], new_pro, new_start, new_end, exclude_id=aid):
            raise HTTPException(409, "Conflito de horário para este profissional")
    if body.status == "attended":
        patch["attended_at"] = now_iso()
    if body.status == "no_show":
        patch["no_show_at"] = now_iso()
    if body.status == "cancelled":
        patch["cancelled_at"] = now_iso()
    if body.status == "confirmed":
        patch["confirmed_at"] = now_iso()
    await db.appointments.update_one({"id": aid, "tenant_id": t["id"]}, {"$set": patch})
    return await db.appointments.find_one({"id": aid}, {"_id": 0})

@api.delete("/tenants/{slug}/appointments/{aid}")
async def delete_appointment(slug: str, aid: str):
    t = await get_tenant_or_404(slug)
    await db.appointments.delete_one({"id": aid, "tenant_id": t["id"]})
    return {"ok": True}

# ---------- Treatment Plans ----------

@api.get("/tenants/{slug}/treatment_plans")
async def list_plans(slug: str):
    t = await get_tenant_or_404(slug)
    plans = await db.treatment_plans.find({"tenant_id": t["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    pids = list({p["patient_id"] for p in plans})
    patients = await db.patients.find({"id": {"$in": pids}}, {"_id": 0}).to_list(1000)
    pmap = {p["id"]: p for p in patients}
    for pl in plans:
        p = pmap.get(pl["patient_id"])
        pl["patient"] = {"id": p["id"], "full_name": p["full_name"]} if p else None
    return plans

@api.post("/tenants/{slug}/treatment_plans")
async def create_plan(slug: str, body: TreatmentPlanCreate):
    t = await get_tenant_or_404(slug)
    items = [i.model_dump() for i in body.items]
    totals = compute_plan_totals(items, body.discount_cents)
    p = TreatmentPlan(
        tenant_id=t["id"],
        patient_id=body.patient_id,
        professional_id=body.professional_id,
        title=body.title,
        items=body.items,
        discount_cents=body.discount_cents,
        total_cents=totals["total_cents"],
        final_cents=totals["final_cents"],
        payment_options=body.payment_options,
    )
    doc = p.model_dump()
    # items back to dicts
    doc["items"] = items
    await db.treatment_plans.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.patch("/tenants/{slug}/treatment_plans/{pid}")
async def update_plan(slug: str, pid: str, body: TreatmentPlanUpdate):
    t = await get_tenant_or_404(slug)
    current = await db.treatment_plans.find_one({"id": pid, "tenant_id": t["id"]}, {"_id": 0})
    if not current:
        raise HTTPException(404, "Plan not found")
    patch: Dict[str, Any] = {}
    if body.title is not None:
        patch["title"] = body.title
    if body.discount_cents is not None:
        patch["discount_cents"] = body.discount_cents
    if body.items is not None:
        patch["items"] = [i.model_dump() for i in body.items]
    if body.payment_options is not None:
        patch["payment_options"] = body.payment_options
    if body.status is not None:
        patch["status"] = body.status
        if body.status == "sent":
            patch["sent_at"] = now_iso()
            if not current.get("public_token"):
                patch["public_token"] = new_token()
            if not current.get("expires_at"):
                patch["expires_at"] = (datetime.now(timezone.utc) + timedelta(days=15)).isoformat()
    # recompute totals if items/discount changed
    items = patch.get("items", current["items"])
    disc = patch.get("discount_cents", current["discount_cents"])
    totals = compute_plan_totals(items, disc)
    patch["total_cents"] = totals["total_cents"]
    patch["final_cents"] = totals["final_cents"]
    await db.treatment_plans.update_one({"id": pid, "tenant_id": t["id"]}, {"$set": patch})
    return await db.treatment_plans.find_one({"id": pid}, {"_id": 0})

# ---------- Public plan ----------

@api.get("/plans/public/{token}")
async def public_get_plan(token: str):
    plan = await db.treatment_plans.find_one({"public_token": token}, {"_id": 0})
    if not plan:
        raise HTTPException(404, "Plan not found")
    if plan["status"] in ("sent",):
        await db.treatment_plans.update_one({"id": plan["id"]}, {"$set": {"status": "viewed", "viewed_at": now_iso()}})
        plan["status"] = "viewed"
        plan["viewed_at"] = now_iso()
    tenant = await db.tenants.find_one({"id": plan["tenant_id"]}, {"_id": 0})
    patient = await db.patients.find_one({"id": plan["patient_id"]}, {"_id": 0})
    professional = None
    if plan.get("professional_id"):
        professional = await db.professionals.find_one({"id": plan["professional_id"]}, {"_id": 0})
    return {"plan": plan, "tenant": tenant, "patient": patient, "professional": professional}

@api.post("/plans/public/{token}/accept")
async def public_accept_plan(token: str, body: PlanAcceptPayload):
    if not body.lgpd_agreed:
        raise HTTPException(400, "É necessário aceitar os termos LGPD")
    plan = await db.treatment_plans.find_one({"public_token": token}, {"_id": 0})
    if not plan:
        raise HTTPException(404, "Plan not found")
    if plan["status"] in ("accepted", "rejected", "expired"):
        raise HTTPException(400, f"Plano já está com status {plan['status']}")
    await db.treatment_plans.update_one(
        {"id": plan["id"]},
        {"$set": {"status": "accepted", "accepted_at": now_iso()}},
    )
    # register consent
    await db.lgpd_consents.insert_one({
        "id": new_id(),
        "tenant_id": plan["tenant_id"],
        "patient_id": plan["patient_id"],
        "purpose": "treatment_plan",
        "granted": True,
        "version": "1.0",
        "granted_at": now_iso(),
        "evidence": {"full_name": body.full_name, "cpf_hash": body.cpf[-4:]},
    })
    return {"ok": True}

@api.post("/plans/public/{token}/reject")
async def public_reject_plan(token: str, reason: str = Query("")):
    plan = await db.treatment_plans.find_one({"public_token": token}, {"_id": 0})
    if not plan:
        raise HTTPException(404, "Plan not found")
    await db.treatment_plans.update_one(
        {"id": plan["id"]},
        {"$set": {"status": "rejected", "rejected_at": now_iso(), "rejected_reason": reason}},
    )
    return {"ok": True}

# ---------- Inbox: conversations / messages ----------

@api.get("/tenants/{slug}/conversations")
async def list_conversations(slug: str):
    t = await get_tenant_or_404(slug)
    convs = await db.conversations.find({"tenant_id": t["id"]}, {"_id": 0}).sort("last_message_at", -1).to_list(500)
    pids = list({c["patient_id"] for c in convs if c.get("patient_id")})
    patients = await db.patients.find({"id": {"$in": pids}}, {"_id": 0}).to_list(1000)
    pmap = {p["id"]: p for p in patients}
    for c in convs:
        p = pmap.get(c.get("patient_id"))
        c["patient"] = {"id": p["id"], "full_name": p["full_name"], "phone": p.get("phone")} if p else None
    return convs

@api.get("/tenants/{slug}/conversations/{cid}/messages")
async def list_messages(slug: str, cid: str):
    t = await get_tenant_or_404(slug)
    return await db.messages.find({"tenant_id": t["id"], "conversation_id": cid}, {"_id": 0}).sort("created_at", 1).to_list(500)

@api.post("/tenants/{slug}/conversations/{cid}/messages")
async def send_message(slug: str, cid: str, body: MessageCreate):
    t = await get_tenant_or_404(slug)
    m = Message(
        conversation_id=cid,
        tenant_id=t["id"],
        direction="outbound",
        sender_type="user",
        content_type="text",
        text_content=body.text_content,
    )
    await db.messages.insert_one(m.model_dump())
    await db.conversations.update_one(
        {"id": cid, "tenant_id": t["id"]},
        {"$set": {"last_message_at": m.created_at, "last_message_preview": body.text_content[:80], "unread_count": 0}},
    )
    # simulate patient reply after this call (client will poll or refetch)
    reply_texts = [
        "Perfeito, obrigado!",
        "Legal, vou pensar e volto.",
        "Podemos remarcar para próxima semana?",
        "Ok, entendi. Muito obrigada.",
        "Sim, confirmo minha presença.",
        "Qual o valor mínimo pra começar?",
    ]
    import random
    reply = Message(
        conversation_id=cid,
        tenant_id=t["id"],
        direction="inbound",
        sender_type="patient",
        content_type="text",
        text_content=random.choice(reply_texts),
    )
    # schedule the reply 1s in the future via creation timestamp
    reply.created_at = (datetime.now(timezone.utc) + timedelta(seconds=1)).isoformat()
    await db.messages.insert_one(reply.model_dump())
    await db.conversations.update_one(
        {"id": cid, "tenant_id": t["id"]},
        {"$set": {"last_message_at": reply.created_at, "last_message_preview": reply.text_content[:80]}, "$inc": {"unread_count": 1}},
    )
    return m

# ---------- Dashboard ----------

@api.get("/tenants/{slug}/dashboard")
async def dashboard(slug: str):
    t = await get_tenant_or_404(slug)
    tid = t["id"]

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_month_start = (month_start - timedelta(days=1)).replace(day=1)

    appts = await db.appointments.find({"tenant_id": tid}, {"_id": 0}).to_list(5000)
    plans = await db.treatment_plans.find({"tenant_id": tid}, {"_id": 0}).to_list(5000)
    leads = await db.leads.find({"tenant_id": tid}, {"_id": 0}).to_list(5000)
    convs = await db.conversations.find({"tenant_id": tid}, {"_id": 0}).to_list(5000)

    def in_month(iso, start, end):
        try:
            d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
            return start <= d < end
        except Exception:
            return False

    month_end = (month_start + timedelta(days=32)).replace(day=1)
    attended_this_month = [a for a in appts if a["status"] == "attended" and in_month(a["start_at"], month_start, month_end)]
    attended_prev_month = [a for a in appts if a["status"] == "attended" and in_month(a["start_at"], prev_month_start, month_start)]

    revenue_month = sum(a.get("price_cents") or 0 for a in attended_this_month)
    revenue_prev = sum(a.get("price_cents") or 0 for a in attended_prev_month)

    def rate(num, den):
        return round(100 * num / den, 1) if den else 0.0

    finished = [a for a in appts if a["status"] in ("attended", "no_show")]
    attendance_rate = rate(len([a for a in finished if a["status"] == "attended"]), len(finished))

    plans_decided = [p for p in plans if p["status"] in ("accepted", "rejected")]
    close_rate = rate(len([p for p in plans_decided if p["status"] == "accepted"]), len(plans_decided))

    accepted_plans = [p for p in plans if p["status"] == "accepted"]
    ticket_avg = round(sum(p.get("final_cents", 0) for p in accepted_plans) / len(accepted_plans)) if accepted_plans else 0

    # revenue last 6 months
    months = []
    for i in range(5, -1, -1):
        m_start = (month_start.replace(day=1) - timedelta(days=1)).replace(day=1) if i > 0 else month_start
    revenue_series = []
    cursor = month_start
    for _ in range(6):
        m_end = (cursor + timedelta(days=32)).replace(day=1)
        v = sum(a.get("price_cents") or 0 for a in appts if a["status"] == "attended" and in_month(a["start_at"], cursor, m_end))
        revenue_series.append({"month": cursor.strftime("%b").lower(), "value_cents": v})
        cursor = (cursor - timedelta(days=1)).replace(day=1)
    revenue_series.reverse()

    # funnel
    funnel = {
        "leads": len(leads),
        "qualified": len([l for l in leads if l["stage"] in ("qualified", "scheduled", "won")]),
        "scheduled": len([l for l in leads if l["stage"] in ("scheduled", "won")]),
        "attended": len([a for a in appts if a["status"] == "attended"]),
        "won": len([l for l in leads if l["stage"] == "won"]),
    }

    # top procedures by revenue
    procs = await db.procedures.find({"tenant_id": tid}, {"_id": 0}).to_list(500)
    pname = {p["id"]: p["name"] for p in procs}
    proc_revenue: Dict[str, int] = {}
    for a in attended_this_month:
        if a.get("procedure_id"):
            proc_revenue[a["procedure_id"]] = proc_revenue.get(a["procedure_id"], 0) + (a.get("price_cents") or 0)
    top_procedures = sorted(
        [{"name": pname.get(pid, "—"), "value_cents": v} for pid, v in proc_revenue.items()],
        key=lambda x: -x["value_cents"],
    )[:5]

    return {
        "kpis": {
            "revenue_month_cents": revenue_month,
            "revenue_prev_month_cents": revenue_prev,
            "revenue_delta_pct": rate(revenue_month - revenue_prev, revenue_prev),
            "attendance_rate": attendance_rate,
            "close_rate": close_rate,
            "ticket_avg_cents": ticket_avg,
            "response_time_seconds": 108,
            "cac_cents": 17400,
            "occupancy_rate": 76.4,
            "open_conversations": len([c for c in convs if c["status"] == "open"]),
        },
        "revenue_series": revenue_series,
        "top_procedures": top_procedures,
        "funnel": funnel,
        "alerts": [
            {"type": "warn", "message": "3 orçamentos expirando esta semana"},
            {"type": "info", "message": "Campanha 'Implantes' com CAC 22% abaixo da média"},
            {"type": "danger", "message": "No-show subiu 4pp na última semana"},
        ],
    }

# ---------- Seed ----------

DENTAL_PROCEDURES = [
    ("AVL", "Avaliação clínica", 30, 10000, "Geral"),
    ("LMP", "Limpeza / Profilaxia", 45, 15000, "Geral"),
    ("RES", "Restauração em resina", 60, 25000, "Restauradora"),
    ("EXT", "Extração simples", 45, 20000, "Cirurgia"),
    ("CAN", "Tratamento de canal", 90, 80000, "Endodontia"),
    ("COR", "Coroa de porcelana", 90, 180000, "Prótese"),
    ("IMP", "Implante dentário", 120, 350000, "Implantodontia"),
    ("CLR", "Clareamento a laser", 60, 80000, "Estética"),
    ("FAC", "Faceta em porcelana", 90, 240000, "Estética"),
    ("ORT", "Manutenção ortodôntica", 30, 25000, "Ortodontia"),
    ("BTX", "Aplicação de toxina botulínica", 45, 90000, "Harmonização"),
    ("APR", "Aparelho fixo (instalação)", 120, 320000, "Ortodontia"),
    ("PRO", "Prótese total", 90, 220000, "Prótese"),
    ("CIR", "Cirurgia periodontal", 90, 150000, "Periodontia"),
    ("PRV", "Aplicação de flúor", 20, 8000, "Preventiva"),
]

PROFESSIONALS_SEED = [
    ("Dra. Renata Sá", "CRO-PI 12345", ["Ortodontia"], "#95E4A5"),
    ("Dr. Igor Melo", "CRO-PI 67890", ["Implantodontia"], "#7AB8E4"),
    ("Dra. Camila Bastos", "CRO-PI 11223", ["Estética"], "#E4B47A"),
    ("Dr. Lucas Freitas", "CRO-PI 33445", ["Endodontia"], "#E67C6E"),
]

PATIENT_NAMES = [
    "Marina Albuquerque", "João Pedro Rocha", "Fernanda Torres", "Rafael Nunes",
    "Beatriz Vieira", "Carlos Eduardo Lima", "Amanda Prado", "Pedro Henrique Sousa",
    "Larissa Coelho", "Diego Ferreira", "Isabela Monteiro", "Vinícius Andrade",
    "Juliana Ribeiro", "André Barros", "Camila Oliveira",
]

CHANNELS = ["whatsapp", "instagram", "facebook_messenger", "form"]

@api.post("/seed")
async def seed():
    # Purge existing demo tenant
    demo = await db.tenants.find_one({"slug": "clinica-vitalita"})
    if demo:
        tid = demo["id"]
        for col in ["clinics", "professionals", "resources", "procedures",
                    "patients", "leads", "appointments", "treatment_plans",
                    "conversations", "messages", "lgpd_consents"]:
            await db[col].delete_many({"tenant_id": tid})
        await db.tenants.delete_one({"id": tid})

    t = Tenant(
        name="Clínica Vitalità",
        slug="clinica-vitalita",
        vertical="odonto",
        tier="growth",
        status="active",
        settings={
            "clinic_name": "Unidade Centro",
            "address": "Rua Áurea Freire, 1234 — Teresina · PI",
            "phone": "+558632211234",
            "whatsapp": "+5586987654321",
        },
    )
    await db.tenants.insert_one(t.model_dump())

    clinic = Clinic(
        tenant_id=t.id,
        name="Unidade Centro",
        address={"street": "Rua Áurea Freire, 1234", "city": "Teresina", "state": "PI"},
        phone="+558632211234",
        whatsapp_number="+5586987654321",
        timezone="America/Sao_Paulo",
    )
    await db.clinics.insert_one(clinic.model_dump())

    # professionals
    prof_ids = []
    for name, cro, specs, color in PROFESSIONALS_SEED:
        p = Professional(
            tenant_id=t.id,
            clinic_id=clinic.id,
            full_name=name,
            cro=cro,
            specialties=specs,
            color=color,
            working_hours=[{"weekday": w, "start": "08:00", "end": "18:00"} for w in range(1, 6)],
        )
        await db.professionals.insert_one(p.model_dump())
        prof_ids.append(p.id)

    # resources
    for i in range(1, 5):
        r = Resource(tenant_id=t.id, name=f"Cadeira {i}", type="chair")
        await db.resources.insert_one(r.model_dump())

    # procedures
    proc_ids = []
    for code, name, dur, price, cat in DENTAL_PROCEDURES:
        p = Procedure(
            tenant_id=t.id,
            code=code,
            name=name,
            duration_minutes=dur,
            default_price_cents=price,
            category=cat,
        )
        await db.procedures.insert_one(p.model_dump())
        proc_ids.append((p.id, dur, price, name))

    # patients + leads + conversations
    import random
    random.seed(42)
    patient_ids = []
    for i, name in enumerate(PATIENT_NAMES):
        phone = f"+5586987{str(1000 + i * 137)[-4:]}{str(100 + i)[-3:]}"
        pt = Patient(
            tenant_id=t.id,
            full_name=name,
            phone=phone,
            email=f"{name.split()[0].lower()}@exemplo.com",
            is_patient=random.random() > 0.4,
            lgpd_consent_at=now_iso(),
            first_source=random.choice(["Instagram Ads", "Google Ads", "Indicação", "Orgânico"]),
            ltv_cents_realized=random.randint(0, 800000),
            tags=random.sample(["VIP", "Ortodontia", "Retorno", "Novo", "Follow-up"], k=random.randint(0, 2)),
        )
        await db.patients.insert_one(pt.model_dump())
        patient_ids.append(pt.id)

        # lead for most
        stage = random.choices(
            ["new", "qualifying", "qualified", "scheduled", "won", "lost"],
            weights=[3, 4, 3, 3, 2, 2],
        )[0]
        pid_sel = random.choice(proc_ids)
        lead = Lead(
            tenant_id=t.id,
            patient_id=pt.id,
            stage=stage,
            procedure_id=pid_sel[0],
            estimated_value_cents=pid_sel[2],
            first_channel=random.choice(CHANNELS),
        )
        await db.leads.insert_one(lead.model_dump())

        # conversation for ~70%
        if random.random() > 0.3:
            conv = Conversation(
                tenant_id=t.id,
                patient_id=pt.id,
                lead_id=lead.id,
                channel=random.choice(["whatsapp", "instagram"]),
                status=random.choice(["open", "open", "pending", "closed"]),
                last_message_at=now_iso(),
                last_message_preview=random.choice([
                    "Oi, gostaria de agendar uma avaliação",
                    "Vocês atendem plano?",
                    "Estou com dor no dente",
                    "Recebi o orçamento, tenho uma dúvida",
                    "Confirmo minha presença amanhã",
                ]),
                unread_count=random.randint(0, 3),
            )
            await db.conversations.insert_one(conv.model_dump())
            # a few messages
            msgs_txt = [
                ("inbound", "patient", "Oi! Boa tarde, tudo bem?"),
                ("outbound", "user", "Olá! Tudo ótimo, como posso ajudar?"),
                ("inbound", "patient", "Gostaria de agendar uma avaliação"),
                ("outbound", "user", "Claro! Que dia é melhor pra você?"),
            ]
            base = datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 48))
            for k, (dir_, sender, text) in enumerate(msgs_txt):
                m = Message(
                    conversation_id=conv.id,
                    tenant_id=t.id,
                    direction=dir_,
                    sender_type=sender,
                    content_type="text",
                    text_content=text,
                )
                m.created_at = (base + timedelta(minutes=k * 5)).isoformat()
                await db.messages.insert_one(m.model_dump())

    # appointments across current week and next
    now = datetime.now(timezone.utc)
    week_monday = now - timedelta(days=(now.weekday()))
    week_monday = week_monday.replace(hour=8, minute=0, second=0, microsecond=0)
    statuses = ["scheduled", "confirmed", "attended", "attended", "attended", "no_show", "cancelled"]
    for i in range(24):
        day_offset = random.randint(0, 9)
        hour = random.choice([8, 9, 10, 11, 14, 15, 16, 17])
        start = week_monday + timedelta(days=day_offset, hours=hour - 8)
        proc = random.choice(proc_ids)
        end = start + timedelta(minutes=proc[1])
        pro_id = random.choice(prof_ids)
        # skip if conflict
        if await has_conflict(t.id, pro_id, start.isoformat(), end.isoformat()):
            continue
        a = Appointment(
            tenant_id=t.id,
            patient_id=random.choice(patient_ids),
            professional_id=pro_id,
            procedure_id=proc[0],
            start_at=start.isoformat(),
            end_at=end.isoformat(),
            status=random.choice(statuses) if start < now else random.choice(["scheduled", "confirmed"]),
            price_cents=proc[2],
        )
        await db.appointments.insert_one(a.model_dump())

    # treatment plans
    plan_statuses = ["draft", "sent", "viewed", "accepted", "rejected", "sent", "viewed", "accepted"]
    for i in range(8):
        pt_id = random.choice(patient_ids)
        n_items = random.randint(1, 4)
        items_raw = []
        for _ in range(n_items):
            pi = random.choice(proc_ids)
            items_raw.append({
                "id": new_id(),
                "procedure_id": pi[0],
                "description": pi[3],
                "tooth_number": random.choice([None, "11", "23", "36", "46"]),
                "quantity": random.randint(1, 2),
                "unit_price_cents": pi[2],
            })
        total = sum(i["quantity"] * i["unit_price_cents"] for i in items_raw)
        discount = random.choice([0, 5000, 10000, 20000])
        status = plan_statuses[i]
        plan = TreatmentPlan(
            tenant_id=t.id,
            patient_id=pt_id,
            professional_id=random.choice(prof_ids),
            title=random.choice(["Plano Ortodôntico", "Plano de Reabilitação", "Plano Estético", "Plano de Implante"]),
            discount_cents=discount,
            total_cents=total,
            final_cents=max(0, total - discount),
            status=status,
            public_token=new_token() if status != "draft" else None,
            expires_at=(datetime.now(timezone.utc) + timedelta(days=15)).isoformat() if status != "draft" else None,
            sent_at=(datetime.now(timezone.utc) - timedelta(days=random.randint(1, 20))).isoformat() if status != "draft" else None,
            viewed_at=(datetime.now(timezone.utc) - timedelta(days=random.randint(0, 10))).isoformat() if status in ("viewed", "accepted", "rejected") else None,
            accepted_at=now_iso() if status == "accepted" else None,
            rejected_at=now_iso() if status == "rejected" else None,
            payment_options={"cash": 0.10, "installments": [3, 6, 10]},
        )
        doc = plan.model_dump()
        doc["items"] = items_raw
        await db.treatment_plans.insert_one(doc)

    return {"ok": True, "tenant_slug": t.slug, "message": "Seed criado com sucesso"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    # auto-seed if empty
    count = await db.tenants.count_documents({})
    if count == 0:
        try:
            await seed()
            logger.info("Auto-seeded demo tenant")
        except Exception as e:
            logger.warning(f"Auto-seed failed: {e}")

@app.on_event("shutdown")
async def shutdown():
    client.close()
