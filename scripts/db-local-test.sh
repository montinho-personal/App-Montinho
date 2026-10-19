#!/usr/bin/env bash
# Prova automatizada: migrações + migração do logbook legado + RLS.
# Requer PostgreSQL local (PGHOST/PGPORT/PGUSER definidos). Exemplo:
#   PGHOST=localhost PGPORT=54329 PGUSER=postgres scripts/db-local-test.sh
set -euo pipefail
DB="${1:-montinho_test}"
HERE="$(cd "$(dirname "$0")" && pwd)"
MIG="$HERE/../supabase/migrations"
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB;" -c "create database $DB;"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$HERE/sql/supabase-stub.sql"
# 1) schema legado (até 0007) + dados legados
for f in "$MIG"/000[1-7]_*.sql; do psql -v ON_ERROR_STOP=1 -q --single-transaction -d "$DB" -f "$f" 2>&1 | grep -v NOTICE || true; done
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$HERE/sql/seed-legado.sql"
# 2) migrations novas (0008+) em transação única cada
for f in "$MIG"/00[0-9][89]_*.sql "$MIG"/00[1-9][0-9]_*.sql; do
  [ -e "$f" ] || continue
  echo "== $(basename "$f")"
  psql -v ON_ERROR_STOP=1 -q --single-transaction -d "$DB" -f "$f" 2>&1 | grep -v NOTICE || true
done
# 3) testes
psql -v ON_ERROR_STOP=1 -d "$DB" -f "$HERE/sql/test-rls.sql"
