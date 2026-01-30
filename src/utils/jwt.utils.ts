/**
 * JWT Utility Functions
 */

import jwt from "jsonwebtoken"

export interface TokenPayload {
  id: string
  email: string
  role: string
}

export const generateToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET!
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d"
  return jwt.sign(payload, secret, { expiresIn })
}

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload
}
