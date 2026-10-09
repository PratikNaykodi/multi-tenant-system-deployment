import jwt from "jsonwebtoken";
export function authMiddleware(req,res,next){
    try{
        const header=req.headers.authorization;
        if(!header?.startsWith("Bearer ")) return res.status(401).json({message:"Authorization token is required"});
        req.user=jwt.verify(header.slice(7),process.env.JWT_SECRET);
        next();
    }catch(e){ return res.status(401).json({message:"Invalid or expired token"}); }
}
