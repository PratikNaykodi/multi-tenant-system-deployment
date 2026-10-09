import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient as CentralPrismaClient } from "../generated/central/client.ts";
import { PrismaClient as TenantPrismaClient } from "../generated/tenant/client.ts";

const centralClients = new Map();
const tenantClients = new Map();

export function getCentralPrisma() {
    const url = process.env.CENTRAL_DATABASE_URL || process.env.DATABASE_URL;
    if (!centralClients.has(url)) {
        const adapter = new PrismaPg({ connectionString: url });
        centralClients.set(url, new CentralPrismaClient({ adapter }));
    }
    return centralClients.get(url);
}

export function getTenantPrisma(connectionString) {
    if (!tenantClients.has(connectionString)) {
        const adapter = new PrismaPg({ connectionString });
        tenantClients.set(connectionString, new TenantPrismaClient({ adapter }));
    }
    return tenantClients.get(connectionString);
}
