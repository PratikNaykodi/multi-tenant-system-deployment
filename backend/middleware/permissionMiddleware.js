export function requirePermission(permission){
    return (req,res,next)=>{
        if(!req.user) return res.status(401).json({message:"Unauthorized"});
        if(!Array.isArray(req.user.permissions) || !req.user.permissions.includes(permission)){
            return res.status(403).json({message:`Permission denied: ${permission}`});
        }
        next();
    };
}
