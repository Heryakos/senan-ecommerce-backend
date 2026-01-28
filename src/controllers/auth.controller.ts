/**
 * Authentication Controller
 * Handles user registration, login, and token management
 */

import type { Request, Response, NextFunction } from "express"
import { prisma } from "../config/database"
import { hashPassword, comparePassword } from "../utils/bcrypt.utils"
import { generateToken } from "../utils/jwt.utils"
import { registerSchema, loginSchema } from "../validators/auth.validator"
import { ApiError } from "../middleware/error.middleware"
import type { AuthRequest } from "../middleware/auth.middleware"
import { Role, UserStatus } from "../constants/roles"

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = registerSchema.parse(req.body) as {
      name: string
      email: string
      password: string
      phone?: string
      role?: string
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (existingUser) {
      throw new ApiError("Email already registered", 409)
    }

    // Hash password
    const passwordHash = await hashPassword(validated.password)

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        passwordHash,
        phone: validated.phone,
        role: validated.role || Role.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    })

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { user, token },
    })
  } catch (error) {
    next(error)
  }
}

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = loginSchema.parse(req.body) as { email: string; password: string }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (!user) {
      throw new ApiError("Invalid credentials", 401)
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new ApiError("Account is inactive or suspended", 403)
    }

    // Verify password
    const isValidPassword = await comparePassword(validated.password, user.passwordHash)
    if (!isValidPassword) {
      throw new ApiError("Invalid credentials", 401)
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
        token,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.substring(7)

    if (token) {
      await prisma.session.deleteMany({
        where: { token },
      })
    }

    res.json({
      success: true,
      message: "Logout successful",
    })
  } catch (error) {
    next(error)
  }
}

export const getCurrentUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatar: true,
        address: true,
        city: true,
        country: true,
        totalOrders: true,
        totalSpent: true,
        createdAt: true,
        lastLoginAt: true,
      },
    })

    if (!user) {
      throw new ApiError("User not found", 404)
    }

    res.json({
      success: true,
      data: user,
    })
  } catch (error) {
    next(error)
  }
}

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body

    await prisma.user.update({
      where: { email },
      data: { status: UserStatus.ACTIVE },
    })

    res.json({
      success: true,
      message: "Email verified successfully",
    })
  } catch (error) {
    next(error)
  }
}