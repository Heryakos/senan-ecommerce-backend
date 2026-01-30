/**
 * Authentication & Authorization Middleware
 */

import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { ApiError } from "./error.middleware"

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
  }
}

export const authenticate = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError("No token provided", 401)
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role as string,
    }

    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError("Invalid token", 401))
    } else {
      next(error)
    }
  }
}

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError("Unauthorized", 401))
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError("Forbidden: Insufficient permissions", 403))
    }

    next()
  }
}
