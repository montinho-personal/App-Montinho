#!/usr/bin/env bash
# Recria um banco local de testes (PostgreSQL) com stub do Supabase e aplica
# todas as migrations em ordem, cada uma em transação única (como o SQL Editor).
# Uso: PGHOST=localhost PGPORT=54329 PGUSER=postgres scripts/db-local-reset.sh [nome_db]
set -euo pipefail
DB="${1:-montinho_test}"
HERE="$(cd "$(dirname "$0")" && pwd)"
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB;" -c "create database $DB;"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$HERE/sql/supabase-stub.sql"
for f in "$HERE"/../supabase/migrations/*.sql; do
  echo "== $(basename "$f")"
  psql -v ON_ERROR_STOP=1 -q --single-transaction -d "$DB" -f "$f"
done
echo "OK: migrations aplicadas em $DB"
