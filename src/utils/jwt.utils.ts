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
  const expires = process.env.JWT_EXPIRES_IN || "7d"
  // Cast because SignOptions['expiresIn'] expects a narrower StringValue/number union
  const options: SignOptions = { expiresIn: expires as SignOptions["expiresIn"] }
  return jwt.sign(payload, secret, options)
}

export const verifyToken = (token: string): TokenPayload => {
  const secret = process.env.JWT_SECRET as Secret
  return jwt.verify(token, secret) as TokenPayload
}
