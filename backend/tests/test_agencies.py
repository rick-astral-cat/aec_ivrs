"""Tests for the /api/agencies routes and the agency service."""

import models
from services import agency_service

IVR_TREE = [
    {
        "id": "root",
        "type": "menu",
        "children": [
            {"id": "n1", "type": "menu", "digit": "1", "label": "Ventas", "children": [
                {"id": "n2", "type": "ring_group", "extensions": ["101", "102"], "rings": 4},
            ]},
            {"id": "t1", "type": "timeout", "children": [
                {"id": "v1", "type": "voicemail", "email": "buzon@example.com"},
            ]},
        ],
    }
]


def agency_payload(**overrides):
    data = {
        "name": "Agencia Centro",
        "abbreviation": "ACEN",
        "region": "GDL",
        "phone_ranges": "3300000000-3300000099",
        "has_schedule": True,
        "business_hours": '{"L":[["08:00","14:00"]]}',
        "after_hours_mailbox": "buzon@example.com",
        "ivr": None,
    }
    data.update(overrides)
    return data


def add_agency(db, **overrides) -> models.Agency:
    agency = models.Agency(**agency_payload(**overrides))
    db.add(agency)
    db.commit()
    return agency


# --- List endpoint (summaries) ---


def test_list_returns_summaries_without_ivr_tree(client, db, viewer_headers):
    add_agency(db, ivr=IVR_TREE)

    response = client.get("/api/agencies", headers=viewer_headers)

    assert response.status_code == 200
    [row] = response.json()
    assert "ivr" not in row
    assert row["has_ivr"] is True
    assert set(row) == {
        "id", "name", "abbreviation", "region", "phone_ranges", "has_schedule",
        "business_hours", "after_hours_mailbox", "has_ivr",
    }
    assert row["business_hours"] == '{"L":[["08:00","14:00"]]}'


def test_has_ivr_is_false_for_missing_or_empty_trees(client, db, viewer_headers):
    add_agency(db, name="Sin IVR", abbreviation="A1", ivr=None)
    add_agency(db, name="Lista vacia", abbreviation="A2", ivr=[])
    add_agency(db, name="Con IVR", abbreviation="A3", ivr=IVR_TREE)

    rows = client.get("/api/agencies", headers=viewer_headers).json()

    assert {r["name"]: r["has_ivr"] for r in rows} == {
        "Sin IVR": False, "Lista vacia": False, "Con IVR": True,
    }


def test_has_ivr_is_false_for_sql_null(db):
    agency = add_agency(db, ivr=None)
    # Force a real SQL NULL (the ORM stores Python None as JSON "null").
    db.execute(models.Agency.__table__.update().values(ivr=None).where(models.Agency.id == agency.id))
    db.commit()

    [row] = agency_service.list_agency_summaries(db)

    assert row["has_ivr"] is False


def test_list_is_ordered_by_name_case_insensitive(client, db, viewer_headers):
    for name, abbr in [("beta", "B"), ("Alfa", "A"), ("Gamma", "G")]:
        add_agency(db, name=name, abbreviation=abbr)

    rows = client.get("/api/agencies", headers=viewer_headers).json()

    assert [r["name"] for r in rows] == ["Alfa", "beta", "Gamma"]


def test_list_empty(client, viewer_headers):
    response = client.get("/api/agencies", headers=viewer_headers)

    assert response.status_code == 200
    assert response.json() == []


def test_list_requires_authentication(client):
    assert client.get("/api/agencies").status_code == 401


# --- Detail and write endpoints (full agency) ---


def test_detail_still_returns_ivr_tree(client, db, viewer_headers):
    agency = add_agency(db, ivr=IVR_TREE)

    response = client.get(f"/api/agencies/{agency.id}", headers=viewer_headers)

    assert response.status_code == 200
    assert response.json()["ivr"] == IVR_TREE


def test_detail_does_not_revalidate_stored_ivr(client, db, viewer_headers):
    # Data stored before validation existed must still be readable: the IVR
    # tree is only validated when it is written.
    agency = add_agency(db, ivr=[{"type": "unknown"}])

    response = client.get(f"/api/agencies/{agency.id}", headers=viewer_headers)

    assert response.status_code == 200
    assert response.json()["ivr"] == [{"type": "unknown"}]


def test_create_validates_ivr_tree(client, admin_headers):
    response = client.post(
        "/api/agencies", json=agency_payload(ivr=[{"type": "unknown"}]), headers=admin_headers,
    )

    assert response.status_code == 422


def test_create_and_update_keep_ivr_tree(client, admin_headers):
    created = client.post("/api/agencies", json=agency_payload(ivr=IVR_TREE), headers=admin_headers)
    assert created.status_code == 201
    agency = created.json()
    assert agency["ivr"] == IVR_TREE

    updated = client.put(
        f"/api/agencies/{agency['id']}",
        json=agency_payload(name="Renombrada", ivr=IVR_TREE),
        headers=admin_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Renombrada"
    assert updated.json()["ivr"] == IVR_TREE


def test_copy_flow_keeps_ivr(client, admin_headers):
    """The agencies page copies an agency by reading its detail (the list has
    no IVR) and posting it with a new name and abbreviation."""
    original = client.post(
        "/api/agencies", json=agency_payload(ivr=IVR_TREE), headers=admin_headers,
    ).json()

    detail = client.get(f"/api/agencies/{original['id']}", headers=admin_headers).json()
    detail.pop("id")
    copy = client.post(
        "/api/agencies",
        json={**detail, "name": f"{detail['name']} - Copia", "abbreviation": f"{detail['abbreviation']}_C"},
        headers=admin_headers,
    )

    assert copy.status_code == 201
    assert copy.json()["ivr"] == IVR_TREE
    summaries = client.get("/api/agencies", headers=admin_headers).json()
    assert [s["has_ivr"] for s in summaries] == [True, True]


def test_viewer_cannot_create(client, viewer_headers):
    response = client.post("/api/agencies", json=agency_payload(), headers=viewer_headers)

    assert response.status_code == 403
