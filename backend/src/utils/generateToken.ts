import jwt from "jsonwebtoken";

interface User {
  _id: string;
  role: string;
  companyId: string;
}

function generateToken(user: User): string {
  return jwt.sign(
    { id: user._id, role: user.role, companyId: user.companyId },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
  );
}

export default generateToken;
