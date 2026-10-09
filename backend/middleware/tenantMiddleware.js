import { getCentralPrisma, getTenantPrisma } from "../config/prisma.js";
import { buildTenantConnectionString } from "../config/tenantDatabase.js";

export async function tenantMiddleware(req,res,next){
    if(req.method==="OPTIONS") return next();
    const identifier=String(req.headers["x-tenant-id"]||req.user?.tenantId||"").trim().toLowerCase();
    if(!identifier) return res.status(400).json({message:"x-tenant-id header is required"});
    try{
        const central=getCentralPrisma();
        const tenant=await central.tenant.findUnique({where:{identifier}});
        if(!tenant) return res.status(404).json({message:"Tenant not found"});
        if(req.user?.tenantId && req.user.tenantId!==tenant.identifier) return res.status(403).json({message:"Tenant mismatch"});
        req.tenant=tenant;
        req.tenantDb=getTenantPrisma(buildTenantConnectionString(tenant.databaseName));
        next();
    }catch(error){ console.error("Tenant middleware error:",error); return res.status(500).json({message:"Unable to connect to tenant database",error:error.message}); }
}
