# Filter AI Repository Strategy

Filter AI now uses two repositories:

- `filter-agency/filter-ai` is the public free 1.x maintenance line.
- `filter-agency/filter-ai-pro` is the private paid 2.x development line.

The 1.x line ended feature development at `v1.8.0`. Future public releases should be limited to bug fixes, security fixes, compatibility fixes, and upgrade messaging that points users to Filter AI Pro.

## Public 1.x Line

- Keep `main` on the public repository for 1.x maintenance.
- Release public updates as `v1.8.1`, `v1.8.2`, and later 1.x point releases.
- Deploy public releases to WordPress.org only from this repository.
- Do not merge Pro-only features or paid update/licensing code into this repository.

## Private 2.x Line

- Develop paid 2.x releases in `filter-agency/filter-ai-pro`.
- Keep the distributed plugin slug as `filter-ai` so Pro can replace an existing free install.
- Build Pro releases from `v2.x` tags in the private repository.
- Do not deploy Pro releases to WordPress.org.

## Backports

Backport only security, critical bug, and compatibility fixes from Pro to 1.x. Cherry-pick focused commits where possible so the free line stays maintainable without taking new paid features.
