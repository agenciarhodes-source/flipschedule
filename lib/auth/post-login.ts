export function buildTenantDashboardPath(tenantSlug: string) {
  return `/${encodeURIComponent(tenantSlug)}/dashboard`;
}
