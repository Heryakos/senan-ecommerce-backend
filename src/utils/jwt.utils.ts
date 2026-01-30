/**
 * JWT Utility Functions
 */

import jwt, { type Secret, type SignOptions } from "jsonwebtoken"

export interface TokenPayload {
  id: string
  email: string
  role: string
}

export const generateToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET as Secret
  const options: SignOptions = { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  return jwt.sign(payload, secret, options)
}

export const verifyToken = (token: string): TokenPayload => {
  const secret = process.env.JWT_SECRET as Secret
  return jwt.verify(token, secret) as TokenPayload
}
