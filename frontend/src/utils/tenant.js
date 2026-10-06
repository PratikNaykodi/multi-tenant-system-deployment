export const getTenantIdentifier = () => {
    const hostname = window.location.hostname;
    console.log("Current hostname:", hostname);

    const parts = hostname.split(".");

    const tenantIdentifier = parts[0];

    console.log("Tenant identifier:", tenantIdentifier);

    return tenantIdentifier;
};