export function buildTenantConnectionString(databaseName) {
    const user = encodeURIComponent(process.env.PG_USER);
    const password = encodeURIComponent(process.env.PG_PASSWORD);
    return `postgresql://${user}:${password}@${process.env.PG_HOST}:${process.env.PG_PORT || 5432}/${databaseName}`;
}
