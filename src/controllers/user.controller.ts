/**
 * User Management Controller
 * Handles CRUD operations for users/customers
 */

import type { Response, NextFunction } from "express"
import { prisma } from "../config/database"
import { ApiError } from "../middleware/error.middleware"
import type { AuthRequest } from "../middleware/auth.middleware"
import { z } from "zod"

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  avatar: z.string().url().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_VERIFICATION"]).optional(),
})

export const getAllUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search, role, status, page = "1", limit = "20" } = req.query

    const pageNum = Number.parseInt(page as string)
    const limitNum = Number.parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    if (search) {
      where.OR = [{ name: { contains: search as string } }, { email: { contains: search as string } }]
    }

    if (role) {
      where.role = role
    }

    if (status) {
      where.status = status
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          totalOrders: true,
          totalSpent: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id },
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
        postalCode: true,
        totalOrders: true,
        totalSpent: true,
        createdAt: true,
        updatedAt: true,
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

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const validated = updateUserSchema.parse(req.body)

    const user = await prisma.user.update({
      where: { id },
      data: validated,
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
        postalCode: true,
        updatedAt: true,
      },
    })

    res.json({
      success: true,
      message: "User updated successfully",
      data: user,
    })
  } catch (error) {
    next(error)
  }
}

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    // Prevent self-deletion
    if (id === req.user!.id) {
      throw new ApiError("Cannot delete your own account", 400)
    }

    await prisma.user.delete({
      where: { id },
    })

    res.json({
      success: true,
      message: "User deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

export const getUserOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { page = "1", limit = "20" } = req.query

    const pageNum = Number.parseInt(page as string)
    const limitNum = Number.parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: id },
        include: {
          items: {
            select: {
              productName: true,
              quantity: true,
              price: true,
              subtotal: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.order.count({ where: { userId: id } }),
    ])

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    next(error)
  }
}
