/**
 * Global Error Handling Middleware
 */

import type { Request, Response, NextFunction } from "express"
import { Prisma } from "@prisma/client"
import { ZodError } from "zod"

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const errorHandler = (err: AppError | Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err)

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    })
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Duplicate entry",
        field: err.meta?.target,
      })
    }

    if (err.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      })
    }
  }

  // Custom app errors
  const statusCode = (err as AppError).statusCode || 500
  const message = err.message || "Internal server error"

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}

export class ApiError extends Error implements AppError {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    Error.captureStackTrace(this, this.constructor)
  }
}
