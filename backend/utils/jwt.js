import jwt from "jsonwebtoken";
export const createToken=(payload)=>jwt.sign(payload,process.env.JWT_SECRET,{expiresIn:"1h"});
