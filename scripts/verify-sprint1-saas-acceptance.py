#!/usr/bin/env python3
"""
KhelGrid TOSM Sprint 1 — Shared SaaS Foundation PostgreSQL 16 P0 Acceptance Suite
Executes .github/scripts/sprint1-shared-saas-assertions.sql inside an atomic
rolled-back transaction (BEGIN; ... ROLLBACK;) against the approved local Docker
PostgreSQL test database ('khelgrid_rls_test') so zero persistent state is modified.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTAINER = "sports-platform-postgres"
TARGET_DB = "khelgrid_rls_test"
ASSERTION_SQL_PATH = ROOT / ".github" / "scripts" / "sprint1-shared-saas-assertions.sql"
PHASE2_ASSERTION_SQL_PATH = ROOT / ".github" / "scripts" / "phase-2-saas-platform-core-assertions.sql"

PREREQUISITE_MIGRATIONS = [
    "20261025070100_initial_core_schema.sql",
    "20261028090000_directory_and_listing_moderation.sql",
    "20261031120000_create_athlete_profiles.sql",
    "20261101010000_trust_safety_verification_and_reporting.sql",
    "20261107120000_auth_and_user_profiles_hardening.sql",
    "20261107180000_pillar1_unified_relational_schema.sql",
    "20261108000000_phase3_rbac_and_privilege_hardening.sql",
    "20261110150000_phase_moderation_notifications.sql",
    "20261122000000_saas_platform_core_rbac_entitlements_metering.sql",
    "20261122100000_phase2_schema_consolidation_and_soft_deletion.sql",
    "20261126000000_expand_profiles_role_check.sql",
    "20261126120000_coach_workspace_phase1_foundation.sql",
    "20261126140000_academy_workspace_saas_foundation.sql",
    "20261127000000_phase2_academy_finance_ledger_hardening.sql",
    "20261127120000_coach_workspace_phase3_operations.sql",
    "20261128000000_shared_saas_foundation_p0_remediation.sql",
]


def strip_tx(sql: str) -> str:
    sql = re.sub(r"(?im)^\s*BEGIN\s*;\s*$", "", sql)
    sql = re.sub(r"(?im)^\s*COMMIT\s*;\s*$", "", sql)
    return sql


def main() -> int:
    ps = subprocess.run(
        ["docker", "ps", "--filter", f"name={CONTAINER}", "--format", "{{.Names}}"],
        text=True,
        capture_output=True,
    )
    if CONTAINER not in ps.stdout:
        print(f"Docker container '{CONTAINER}' not running.", file=sys.stderr)
        return 1

    if not ASSERTION_SQL_PATH.exists():
        print(f"Missing assertion SQL: {ASSERTION_SQL_PATH}", file=sys.stderr)
        return 1

    parts = [
        "BEGIN;",
        "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF; END $$;",
        "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN CREATE ROLE supabase_admin NOLOGIN; END IF; END $$;",
    ]
    for mig in PREREQUISITE_MIGRATIONS:
        mig_path = ROOT / "supabase" / "migrations" / mig
        if not mig_path.exists():
            print(f"Missing migration: {mig_path}", file=sys.stderr)
            return 1
        parts.append(f"-- === {mig} ===")
        parts.append(strip_tx(mig_path.read_text(encoding="utf-8")))

    if PHASE2_ASSERTION_SQL_PATH.exists():
        parts.append(PHASE2_ASSERTION_SQL_PATH.read_text(encoding="utf-8"))
    parts.append(ASSERTION_SQL_PATH.read_text(encoding="utf-8"))
    parts.append("ROLLBACK;")

    bundle = "\n".join(parts)
    res = subprocess.run(
        [
            "docker", "exec", "-i", CONTAINER,
            "psql", "-U", "postgres", "-d", TARGET_DB, "-v", "ON_ERROR_STOP=1",
        ],
        input=bundle,
        text=True,
        capture_output=True,
        encoding="utf-8",
    )
    if res.returncode != 0:
        print("SPRINT 1 POSTGRES ACCEPTANCE SUITE FAILED!", file=sys.stderr)
        print(res.stdout[-2000:], file=sys.stderr)
        print(res.stderr[-2500:], file=sys.stderr)
        return res.returncode

    summary = {
        "status": "passed",
        "container": CONTAINER,
        "database": TARGET_DB,
        "identities_tested": 9,
        "checks": [line.strip() for line in (res.stderr + "\n" + res.stdout).splitlines() if "PASSED" in line or "ROLLBACK" in line],
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
