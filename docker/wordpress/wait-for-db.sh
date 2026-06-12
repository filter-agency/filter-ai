#!/usr/bin/env bash
set -euo pipefail

db_host="${WORDPRESS_DB_HOST:-db:3306}"
db_user="${WORDPRESS_DB_USER:-wordpress}"
db_password="${WORDPRESS_DB_PASSWORD:-wordpress}"

host="${db_host%%:*}"
port="${db_host##*:}"

if [[ "${host}" == "${port}" ]]; then
	port="3306"
fi

echo "Waiting for database at ${host}:${port}..."

until mysqladmin ping --host="${host}" --port="${port}" --user="${db_user}" --password="${db_password}" --silent; do
	sleep 2
done

echo "Database is ready."
