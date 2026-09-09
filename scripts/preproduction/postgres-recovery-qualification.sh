#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE_MAINTENANCE="${PGDATABASE_MAINTENANCE:-postgres}"
QUALIFICATION_DB="${EAI_PHASE4_DB:-eai_phase4_qualification}"
APP_ROLE="${EAI_PHASE4_APP_ROLE:-eai_phase4_app}"
ARTIFACT_DIR="${EAI_PHASE4_ARTIFACT_DIR:-${RUNNER_TEMP:-/tmp}/everythingai-phase4}"

require_safe_pg_identifier() {
  local value="$1"
  local label="$2"
  if [[ ! "${value}" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    echo "FAIL: unsafe ${label} PostgreSQL identifier" >&2
    exit 1
  fi
}

require_safe_pg_identifier "${QUALIFICATION_DB}" "qualification database"
require_safe_pg_identifier "${APP_ROLE}" "application role"

DUMP_FILE="${ARTIFACT_DIR}/${QUALIFICATION_DB}.dump"
CORRUPT_DUMP_FILE="${ARTIFACT_DIR}/${QUALIFICATION_DB}.corrupt.dump"

TENANT_A="11111111-1111-4111-8111-111111111111"
TENANT_B="22222222-2222-4222-8222-222222222222"
WORKSPACE_A="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
WORKSPACE_B="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
DOC_A="dddddddd-dddd-4ddd-8ddd-dddddddddddd"
DOC_B="eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"

mkdir -p "${ARTIFACT_DIR}"

psql_maintenance() {
  psql -X -v ON_ERROR_STOP=1 -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE_MAINTENANCE}" "$@"
}

psql_qualification() {
  psql -X -v ON_ERROR_STOP=1 -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${QUALIFICATION_DB}" "$@"
}

cleanup() {
  psql_maintenance -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${QUALIFICATION_DB}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
  psql_maintenance -c "DROP DATABASE IF EXISTS ${QUALIFICATION_DB};" >/dev/null 2>&1 || true
  psql_maintenance -c "DROP ROLE IF EXISTS ${APP_ROLE};" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup

psql_maintenance -c "CREATE ROLE ${APP_ROLE} NOLOGIN;"
psql_maintenance -c "CREATE DATABASE ${QUALIFICATION_DB};"

for migration in \
  "${REPO_ROOT}/services/api/src/db/production/001_identity_workspace_schema.sql" \
  "${REPO_ROOT}/services/api/src/db/production/002_enterprise_rls_foundation.sql" \
  "${REPO_ROOT}/services/api/src/db/production/003_object_metadata.sql"
do
  echo "Applying $(basename "${migration}") to blank disposable database"
  psql_qualification -f "${migration}" >/dev/null
done

# Synthetic fixtures are inserted by the disposable database owner. RLS is then
# tested under a non-superuser role to prove the production isolation policies.
psql_qualification <<SQL >/dev/null
INSERT INTO tenants (id, slug, name, plan) VALUES
  ('${TENANT_A}', 'phase4-a', 'Phase 4 Tenant A', 'enterprise'),
  ('${TENANT_B}', 'phase4-b', 'Phase 4 Tenant B', 'enterprise');
INSERT INTO workspaces (id, tenant_id, slug, name) VALUES
  ('${WORKSPACE_A}', '${TENANT_A}', 'workspace-a', 'Workspace A'),
  ('${WORKSPACE_B}', '${TENANT_B}', 'workspace-b', 'Workspace B');
INSERT INTO workspace_documents (id, workspace_id, external_id, title, document_type, storage_uri) VALUES
  ('${DOC_A}', '${WORKSPACE_A}', 'doc-a', 'Synthetic A', 'text', 's3://phase4/a'),
  ('${DOC_B}', '${WORKSPACE_B}', 'doc-b', 'Synthetic B', 'text', 's3://phase4/b');
GRANT USAGE ON SCHEMA public, eai_runtime TO ${APP_ROLE};
GRANT SELECT ON workspaces, workspace_documents TO ${APP_ROLE};
SQL

missing_scope_count="$(psql_qualification -Atqc "SET ROLE ${APP_ROLE}; SELECT count(*) FROM workspace_documents;")"
[[ "${missing_scope_count}" == "0" ]] || { echo "FAIL: missing scope exposed ${missing_scope_count} documents" >&2; exit 1; }

correct_scope_count="$(psql_qualification -Atqc "SET ROLE ${APP_ROLE}; SET eai.tenant_id='${TENANT_A}'; SET eai.workspace_id='${WORKSPACE_A}'; SELECT count(*) FROM workspace_documents;")"
[[ "${correct_scope_count}" == "1" ]] || { echo "FAIL: correct scope expected 1 document, got ${correct_scope_count}" >&2; exit 1; }

cross_scope_count="$(psql_qualification -Atqc "SET ROLE ${APP_ROLE}; SET eai.tenant_id='${TENANT_B}'; SET eai.workspace_id='${WORKSPACE_A}'; SELECT count(*) FROM workspace_documents;")"
[[ "${cross_scope_count}" == "0" ]] || { echo "FAIL: cross-tenant/workspace scope exposed ${cross_scope_count} documents" >&2; exit 1; }

pg_dump -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${QUALIFICATION_DB}" --format=custom --file="${DUMP_FILE}"
DUMP_SHA256="$(sha256sum "${DUMP_FILE}" | awk '{print $1}')"
[[ "${#DUMP_SHA256}" -eq 64 ]] || { echo "FAIL: backup checksum was not generated" >&2; exit 1; }

cp "${DUMP_FILE}" "${CORRUPT_DUMP_FILE}"
truncate -s 64 "${CORRUPT_DUMP_FILE}"
if pg_restore --list "${CORRUPT_DUMP_FILE}" >/dev/null 2>&1; then
  echo "FAIL: deliberately corrupted backup was accepted" >&2
  exit 1
fi

echo "Destructively wiping disposable database before restore"
psql_maintenance -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${QUALIFICATION_DB}' AND pid <> pg_backend_pid();" >/dev/null
psql_maintenance -c "DROP DATABASE ${QUALIFICATION_DB};"
psql_maintenance -c "CREATE DATABASE ${QUALIFICATION_DB};"
pg_restore -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${QUALIFICATION_DB}" --no-owner "${DUMP_FILE}"

restored_total="$(psql_qualification -Atqc "SELECT count(*) FROM workspace_documents;")"
[[ "${restored_total}" == "2" ]] || { echo "FAIL: restored database expected 2 documents, got ${restored_total}" >&2; exit 1; }

restored_scope_count="$(psql_qualification -Atqc "SET ROLE ${APP_ROLE}; SET eai.tenant_id='${TENANT_A}'; SET eai.workspace_id='${WORKSPACE_A}'; SELECT count(*) FROM workspace_documents;")"
[[ "${restored_scope_count}" == "1" ]] || { echo "FAIL: restored correct scope expected 1 document, got ${restored_scope_count}" >&2; exit 1; }

restored_cross_scope_count="$(psql_qualification -Atqc "SET ROLE ${APP_ROLE}; SET eai.tenant_id='${TENANT_B}'; SET eai.workspace_id='${WORKSPACE_A}'; SELECT count(*) FROM workspace_documents;")"
[[ "${restored_cross_scope_count}" == "0" ]] || { echo "FAIL: restored cross-scope isolation failed" >&2; exit 1; }

RESTORED_DUMP_FILE="${ARTIFACT_DIR}/${QUALIFICATION_DB}.restored.dump"
pg_dump -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${QUALIFICATION_DB}" --format=custom --file="${RESTORED_DUMP_FILE}"

printf 'PHASE4_POSTGRES_RECOVERY_PASS db=%s backup_sha256=%s restored_documents=%s\n' \
  "${QUALIFICATION_DB}" "${DUMP_SHA256}" "${restored_total}"
