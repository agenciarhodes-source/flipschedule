"""FlipSchedule backend regression tests."""
import os
import time
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Read from frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"
SLUG = "clinica-vitalita"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session", autouse=True)
def ensure_seed(s):
    # ensure seed exists (idempotent purge+reseed)
    r = s.post(f"{API}/seed", timeout=60)
    assert r.status_code == 200, r.text
    assert r.json()["tenant_slug"] == SLUG


# ---------- Health & tenants ----------

def test_health(s):
    r = s.get(f"{API}/health")
    assert r.status_code == 200
    body = r.json()
    assert body["checks"]["db"] == "ok"


def test_list_tenants_includes_seed(s):
    r = s.get(f"{API}/tenants")
    assert r.status_code == 200
    slugs = [t["slug"] for t in r.json()]
    assert SLUG in slugs


def test_get_tenant(s):
    r = s.get(f"{API}/tenants/{SLUG}")
    assert r.status_code == 200
    assert r.json()["slug"] == SLUG


def test_fake_tenant_404(s):
    r = s.get(f"{API}/tenants/fake-slug-does-not-exist")
    assert r.status_code == 404


def test_fake_tenant_scoped_404(s):
    r = s.get(f"{API}/tenants/fake-slug-does-not-exist/professionals")
    assert r.status_code == 404


# ---------- Dashboard ----------

def test_dashboard(s):
    r = s.get(f"{API}/tenants/{SLUG}/dashboard")
    assert r.status_code == 200
    d = r.json()
    for k in ("kpis", "revenue_series", "top_procedures", "funnel", "alerts"):
        assert k in d
    assert len(d["revenue_series"]) == 6
    assert "revenue_month_cents" in d["kpis"]
    assert "attendance_rate" in d["kpis"]


# ---------- Professionals ----------

def test_list_professionals(s):
    r = s.get(f"{API}/tenants/{SLUG}/professionals")
    assert r.status_code == 200
    assert len(r.json()) == 4


def test_crud_professional(s):
    r = s.post(f"{API}/tenants/{SLUG}/professionals",
               json={"full_name": "TEST_Dr. QA", "specialties": ["Teste"]})
    assert r.status_code == 200
    pid = r.json()["id"]
    r2 = s.patch(f"{API}/tenants/{SLUG}/professionals/{pid}",
                 json={"full_name": "TEST_Dr. QA Updated", "specialties": []})
    assert r2.status_code == 200
    assert r2.json()["full_name"] == "TEST_Dr. QA Updated"
    r3 = s.delete(f"{API}/tenants/{SLUG}/professionals/{pid}")
    assert r3.status_code == 200


# ---------- Resources ----------

def test_crud_resource(s):
    r = s.post(f"{API}/tenants/{SLUG}/resources", json={"name": "TEST_Chair", "type": "chair"})
    assert r.status_code == 200
    rid = r.json()["id"]
    r2 = s.delete(f"{API}/tenants/{SLUG}/resources/{rid}")
    assert r2.status_code == 200


# ---------- Procedures ----------

def test_list_procedures(s):
    r = s.get(f"{API}/tenants/{SLUG}/procedures")
    assert r.status_code == 200
    procs = r.json()
    assert len(procs) == 15
    # all have cents pricing
    for p in procs:
        assert isinstance(p.get("default_price_cents"), int)


def test_crud_procedure(s):
    r = s.post(f"{API}/tenants/{SLUG}/procedures",
               json={"name": "TEST_Proc", "duration_minutes": 30, "default_price_cents": 5000})
    assert r.status_code == 200
    pid = r.json()["id"]
    r2 = s.patch(f"{API}/tenants/{SLUG}/procedures/{pid}",
                 json={"name": "TEST_Proc2", "duration_minutes": 45, "default_price_cents": 6000})
    assert r2.status_code == 200
    assert r2.json()["name"] == "TEST_Proc2"
    r3 = s.delete(f"{API}/tenants/{SLUG}/procedures/{pid}")
    assert r3.status_code == 200


# ---------- Patients ----------

def test_list_patients(s):
    r = s.get(f"{API}/tenants/{SLUG}/patients")
    assert r.status_code == 200
    assert len(r.json()) == 15


def test_search_patients(s):
    r = s.get(f"{API}/tenants/{SLUG}/patients", params={"q": "Marina"})
    assert r.status_code == 200
    names = [p["full_name"] for p in r.json()]
    assert any("Marina" in n for n in names)


def test_patient_detail(s):
    lst = s.get(f"{API}/tenants/{SLUG}/patients").json()
    pid = lst[0]["id"]
    r = s.get(f"{API}/tenants/{SLUG}/patients/{pid}")
    assert r.status_code == 200
    body = r.json()
    assert "patient" in body and "appointments" in body and "treatment_plans" in body
    assert isinstance(body["appointments"], list)
    assert isinstance(body["treatment_plans"], list)


def test_create_patient_and_dedupe(s):
    payload = {"full_name": "TEST_Dedup", "phone": "+5586999900011", "lgpd_consent": True}
    r1 = s.post(f"{API}/tenants/{SLUG}/patients", json=payload)
    assert r1.status_code == 200
    id1 = r1.json()["id"]
    r2 = s.post(f"{API}/tenants/{SLUG}/patients", json=payload)
    assert r2.status_code == 200
    assert r2.json()["id"] == id1  # deduped by phone


# ---------- Leads ----------

def test_list_leads(s):
    r = s.get(f"{API}/tenants/{SLUG}/leads")
    assert r.status_code == 200
    leads = r.json()
    assert len(leads) >= 1
    assert "patient" in leads[0]
    stages = {l["stage"] for l in leads}
    assert len(stages) >= 2


def test_lead_stage_transitions(s):
    leads = s.get(f"{API}/tenants/{SLUG}/leads").json()
    lid = leads[0]["id"]
    for stage, ts_field in [("qualified", "qualified_at"), ("scheduled", "scheduled_at"),
                             ("won", "won_at"), ("lost", "lost_at")]:
        r = s.patch(f"{API}/tenants/{SLUG}/leads/{lid}", json={"stage": stage})
        assert r.status_code == 200
        body = r.json()
        assert body["stage"] == stage
        assert body.get(ts_field), f"{ts_field} not set for stage {stage}"


# ---------- Appointments ----------

def test_list_appointments(s):
    r = s.get(f"{API}/tenants/{SLUG}/appointments")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_appointments_range(s):
    start = datetime.now(timezone.utc).replace(day=1).isoformat()
    end = (datetime.now(timezone.utc) + timedelta(days=60)).isoformat()
    r = s.get(f"{API}/tenants/{SLUG}/appointments", params={"start": start, "end": end})
    assert r.status_code == 200


def test_appointment_create_conflict_update_delete(s):
    profs = s.get(f"{API}/tenants/{SLUG}/professionals").json()
    pats = s.get(f"{API}/tenants/{SLUG}/patients").json()
    prof_id = profs[0]["id"]
    pat_id = pats[0]["id"]
    # far-future slot
    start = (datetime.now(timezone.utc) + timedelta(days=45, hours=1)).replace(microsecond=0)
    end = start + timedelta(minutes=30)
    payload = {
        "patient_id": pat_id,
        "professional_id": prof_id,
        "start_at": start.isoformat(),
        "end_at": end.isoformat(),
    }
    r = s.post(f"{API}/tenants/{SLUG}/appointments", json=payload)
    assert r.status_code == 200, r.text
    aid = r.json()["id"]

    # overlapping same professional -> 409
    overlap = {**payload,
               "start_at": (start + timedelta(minutes=10)).isoformat(),
               "end_at": (end + timedelta(minutes=10)).isoformat()}
    r2 = s.post(f"{API}/tenants/{SLUG}/appointments", json=overlap)
    assert r2.status_code == 409

    # PATCH status
    r3 = s.patch(f"{API}/tenants/{SLUG}/appointments/{aid}", json={"status": "confirmed"})
    assert r3.status_code == 200
    assert r3.json()["status"] == "confirmed"

    # PATCH move to another time (no conflict)
    new_start = start + timedelta(hours=3)
    new_end = new_start + timedelta(minutes=30)
    r4 = s.patch(f"{API}/tenants/{SLUG}/appointments/{aid}",
                 json={"start_at": new_start.isoformat(), "end_at": new_end.isoformat()})
    assert r4.status_code == 200

    # DELETE
    r5 = s.delete(f"{API}/tenants/{SLUG}/appointments/{aid}")
    assert r5.status_code == 200


# ---------- Treatment plans ----------

def test_list_treatment_plans(s):
    r = s.get(f"{API}/tenants/{SLUG}/treatment_plans")
    assert r.status_code == 200
    plans = r.json()
    assert len(plans) == 8
    assert "patient" in plans[0]


def test_create_plan_totals_and_send(s):
    pats = s.get(f"{API}/tenants/{SLUG}/patients").json()
    payload = {
        "patient_id": pats[0]["id"],
        "title": "TEST_Plan",
        "items": [
            {"id": "i1", "description": "Item A", "quantity": 2, "unit_price_cents": 10000},
            {"id": "i2", "description": "Item B", "quantity": 1, "unit_price_cents": 5000},
        ],
        "discount_cents": 3000,
    }
    r = s.post(f"{API}/tenants/{SLUG}/treatment_plans", json=payload)
    assert r.status_code == 200, r.text
    plan = r.json()
    assert plan["total_cents"] == 25000
    assert plan["final_cents"] == 22000
    assert plan["status"] == "draft"
    assert plan.get("public_token") in (None, "")

    # PATCH -> sent, generate token
    r2 = s.patch(f"{API}/tenants/{SLUG}/treatment_plans/{plan['id']}", json={"status": "sent"})
    assert r2.status_code == 200
    updated = r2.json()
    assert updated["status"] == "sent"
    assert updated["public_token"]
    assert updated["expires_at"]

    # store for later steps
    return updated


def test_public_plan_view_and_accept(s):
    # create + send
    pats = s.get(f"{API}/tenants/{SLUG}/patients").json()
    create = s.post(f"{API}/tenants/{SLUG}/treatment_plans", json={
        "patient_id": pats[1]["id"],
        "title": "TEST_PublicPlan",
        "items": [{"id": "i1", "description": "X", "quantity": 1, "unit_price_cents": 20000}],
        "discount_cents": 0,
    }).json()
    sent = s.patch(f"{API}/tenants/{SLUG}/treatment_plans/{create['id']}", json={"status": "sent"}).json()
    token = sent["public_token"]

    # GET public -> transitions sent -> viewed
    r = s.get(f"{API}/plans/public/{token}")
    assert r.status_code == 200
    body = r.json()
    assert body["plan"]["status"] == "viewed"
    assert body["plan"]["viewed_at"]
    assert body["tenant"]["slug"] == SLUG
    assert body["patient"]["id"] == pats[1]["id"]

    # accept without LGPD => 400
    r_bad = s.post(f"{API}/plans/public/{token}/accept",
                   json={"full_name": "X", "cpf": "12345678900", "phone": "+55", "lgpd_agreed": False})
    assert r_bad.status_code == 400

    # accept OK
    r_ok = s.post(f"{API}/plans/public/{token}/accept",
                  json={"full_name": "X", "cpf": "12345678900", "phone": "+55", "lgpd_agreed": True})
    assert r_ok.status_code == 200
    r_get = s.get(f"{API}/plans/public/{token}").json()
    assert r_get["plan"]["status"] == "accepted"


def test_public_plan_reject(s):
    pats = s.get(f"{API}/tenants/{SLUG}/patients").json()
    create = s.post(f"{API}/tenants/{SLUG}/treatment_plans", json={
        "patient_id": pats[2]["id"],
        "title": "TEST_RejectPlan",
        "items": [{"id": "i1", "description": "X", "quantity": 1, "unit_price_cents": 20000}],
        "discount_cents": 0,
    }).json()
    sent = s.patch(f"{API}/tenants/{SLUG}/treatment_plans/{create['id']}", json={"status": "sent"}).json()
    token = sent["public_token"]
    r = s.post(f"{API}/plans/public/{token}/reject", params={"reason": "muito caro"})
    assert r.status_code == 200
    body = s.get(f"{API}/plans/public/{token}").json()
    assert body["plan"]["status"] == "rejected"


# ---------- Conversations ----------

def test_list_conversations_and_messages(s):
    r = s.get(f"{API}/tenants/{SLUG}/conversations")
    assert r.status_code == 200
    convs = r.json()
    assert len(convs) >= 1
    assert "patient" in convs[0]
    cid = convs[0]["id"]
    r2 = s.get(f"{API}/tenants/{SLUG}/conversations/{cid}/messages")
    assert r2.status_code == 200


def test_send_message_simulates_reply(s):
    convs = s.get(f"{API}/tenants/{SLUG}/conversations").json()
    cid = convs[0]["id"]
    before = s.get(f"{API}/tenants/{SLUG}/conversations/{cid}/messages").json()
    before_n = len(before)
    r = s.post(f"{API}/tenants/{SLUG}/conversations/{cid}/messages",
               json={"text_content": "TEST_ping"})
    assert r.status_code == 200
    time.sleep(1.5)
    after = s.get(f"{API}/tenants/{SLUG}/conversations/{cid}/messages").json()
    assert len(after) >= before_n + 2
    dirs = [m["direction"] for m in after[-2:]]
    assert "outbound" in dirs and "inbound" in dirs


# ---------- Seed idempotent ----------

def test_seed_idempotent(s):
    r = s.post(f"{API}/seed")
    assert r.status_code == 200
    # After reseed, patients should still be 15
    pats = s.get(f"{API}/tenants/{SLUG}/patients").json()
    assert len(pats) == 15
