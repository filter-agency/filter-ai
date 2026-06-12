#!/usr/bin/env bash
set -euo pipefail

wp_path="${WP_PATH:-/var/www/html}"
wp_url="${WP_URL:-http://localhost:8080}"
wp_title="${WP_TITLE:-Filter AI Docker}"
wp_admin_user="${WP_ADMIN_USER:-admin}"
wp_admin_password="${WP_ADMIN_PASSWORD:-password}"
wp_admin_email="${WP_ADMIN_EMAIL:-admin@example.test}"
wp_version_label="${WP_VERSION_LABEL:-unknown}"
filter_abilities_zip_url="${FILTER_ABILITIES_ZIP_URL:-https://github.com/filter-agency/filter-abilities/releases/download/v1.8.1/filter-abilities-1.8.1.zip}"
filter_ai_zip_url="${FILTER_AI_ZIP_URL:-https://github.com/filter-agency/filter-ai/releases/latest/download/filter-ai.zip}"
woocommerce_version="${WOOCOMMERCE_VERSION:-}"
yoast_seo_version="${YOAST_SEO_VERSION:-}"

install_filter_abilities() {
	local tmp_dir
	local plugin_dir

	tmp_dir="$(mktemp -d)"
	trap 'rm -rf "${tmp_dir}"' RETURN

	curl -fsSL "${filter_abilities_zip_url}" -o "${tmp_dir}/filter-abilities.zip"
	unzip -q "${tmp_dir}/filter-abilities.zip" -d "${tmp_dir}"

	plugin_dir="$(find "${tmp_dir}" -mindepth 1 -maxdepth 1 -type d | head -n 1)"

	if [[ -z "${plugin_dir}" || ! -f "${plugin_dir}/filter-abilities.php" ]]; then
		echo "Filter Abilities package did not contain filter-abilities.php" >&2
		return 1
	fi

	rm -rf "${wp_path}/wp-content/plugins/filter-abilities"
	mv "${plugin_dir}" "${wp_path}/wp-content/plugins/filter-abilities"
}

cd "${wp_path}"

wait-for-db

echo "Waiting for WordPress files..."
until [[ -f wp-load.php && -f wp-config.php ]]; do
	sleep 2
done

if ! wp core is-installed --allow-root >/dev/null 2>&1; then
	wp core install \
		--url="${wp_url}" \
		--title="${wp_title}" \
		--admin_user="${wp_admin_user}" \
		--admin_password="${wp_admin_password}" \
		--admin_email="${wp_admin_email}" \
		--skip-email \
		--allow-root
fi

if [[ "${INSTALL_AI_SERVICES:-0}" == "1" ]] \
	&& wp plugin is-installed ai-services --skip-plugins=woocommerce --allow-root \
	&& wp plugin is-active ai-services --skip-plugins=woocommerce --allow-root; then
	wp plugin deactivate ai-services --skip-plugins=woocommerce --allow-root
fi

wp option update blogdescription "Seeded ${wp_title} environment for Filter AI testing" --allow-root
wp option update permalink_structure "/%postname%/" --allow-root

woocommerce_package="woocommerce"
yoast_seo_package="wordpress-seo"

if [[ -n "${woocommerce_version}" ]]; then
	woocommerce_package="woocommerce --version=${woocommerce_version}"
fi

if [[ -n "${yoast_seo_version}" ]]; then
	yoast_seo_package="wordpress-seo --version=${yoast_seo_version}"
fi

wp plugin install ${woocommerce_package} --activate --force --allow-root
wp plugin install ${yoast_seo_package} --activate --force --allow-root

if [[ "${INSTALL_AI_SERVICES:-0}" == "1" ]]; then
	wp plugin install ai-services --force --allow-root
fi

install_filter_abilities

if ! wp plugin activate filter-abilities --allow-root; then
	echo "Filter Abilities installed but not activated on WordPress ${wp_version_label}. It requires WordPress 6.9+."
fi

wp plugin install "${filter_ai_zip_url}" --force --allow-root
wp plugin activate filter-ai --allow-root

base64 --decode > /tmp/filter-ai-seed.png <<'PNG'
iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAj0lEQVR4nO3XQQrAIAwEQd3/0r1bD4UuIoh0kgd2RvkDpIhoPTkzQh0AAAAAAAAAQGn0qgWV9uG5w6R7xQnzXQqQzFkB6h3TgHjGvAcg4F+Y9wAEfC/tgCkgmgIq3yJWD7fKGYeXHZw3kLc4sNnA3ea/7h3UhE1uqLw1eh3UCqkG6gVUg3UCqkG6gVUg3UCqkG6gVUg3UBrwAMqBQfchC/yZAAAAAElFTkSuQmCC
PNG

export FILTER_AI_SEED_IMAGE=/tmp/filter-ai-seed.png
export FILTER_AI_SEED_WP_VERSION="${wp_version_label}"

wp eval-file /docker/seed/seed-content.php --allow-root
wp cache flush --allow-root

if [[ "${INSTALL_AI_SERVICES:-0}" == "1" ]]; then
	wp plugin activate ai-services --skip-plugins=woocommerce --allow-root
fi

echo "Seed complete for ${wp_title} at ${wp_url}"
echo "Admin login: ${wp_admin_user} / ${wp_admin_password}"
