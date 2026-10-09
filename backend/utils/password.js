import bcrypt from "bcryptjs";
export const hashPassword=(value)=>bcrypt.hash(value,10);
export const comparePassword=(value,hash)=>bcrypt.compare(value,hash);
