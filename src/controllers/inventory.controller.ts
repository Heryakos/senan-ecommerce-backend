/**
 * Inventory Management Controller
 * Drives product availability; logs movements for audit.
 */

import type { Response, NextFunction } from "express"
import { prisma } from "../config/database"
import { ApiError } from "../middleware/error.middleware"
import type { AuthRequest } from "../middleware/auth.middleware"
import { z } from "zod"
import { Role, ProductStatus } from "../constants/roles"

const LOW_STOCK_THRESHOLD = 10

const updateStockSchema = z.object({
  quantity: z.number().int().min(0),
  operation: z.enum(["increase", "decrease", "set"]),
  reason: z.string().optional(),
  type: z.enum(["ADJUSTMENT", "RESTOCK", "RETURN"]).optional(),
})

export const getInventory = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const { category, lowStockOnly, page = "1", limit = "20", search } = req.query
    const pageNum = Number.parseInt(page as string)
    const limitNum = Number.parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const where: any = { trackInventory: true }
    if (category) where.categoryId = category
    if (lowStockOnly === "true") where.stock = { lte: LOW_STOCK_THRESHOLD }
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { sku: { contains: search as string } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { stock: "asc" },
        skip,
        take: limitNum,
      }),
      prisma.product.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        products,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      },
    })
  } catch (error) {
    _next(error)
  }
}

export const getLowStock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      where: { trackInventory: true, stock: { lte: LOW_STOCK_THRESHOLD } },
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: { stock: "asc" },
    })
    res.json({ success: true, data: products })
  } catch (error) {
    next(error)
  }
}

export const updateStock = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const { productId } = req.params
    const validated = updateStockSchema.parse(req.body)

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) throw new ApiError("Product not found", 404)
    if (!product.trackInventory) throw new ApiError("Product does not track inventory", 400)

    let newStock: number
    let delta: number

    if (validated.operation === "set") {
      delta = validated.quantity - product.stock
      newStock = validated.quantity
    } else if (validated.operation === "increase") {
      delta = validated.quantity
      newStock = product.stock + validated.quantity
    } else {
      delta = -validated.quantity
      newStock = Math.max(0, product.stock - validated.quantity)
    }

    const movementType = (validated as any).type || "ADJUSTMENT"

    await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          productId,
          quantityDelta: delta,
          type: movementType,
          reason: validated.reason || null,
          userId: req.user!.id,
        },
      }),
      prisma.product.update({
        where: { id: productId },
        data: {
          stock: newStock,
          status: newStock <= 0 ? ProductStatus.OUT_OF_STOCK : product.status,
        },
      }),
    ])

    const updated = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: { select: { id: true, name: true, slug: true } } },
    })
    res.json({ success: true, message: "Stock updated", data: updated })
  } catch (error) {
    _next(error)
  }
}

export const getMovementHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params
    const { page = "1", limit = "20" } = req.query
    const pageNum = Number.parseInt(page as string)
    const limitNum = Number.parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const [items, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where: { productId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.inventoryMovement.count({ where: { productId } }),
    ])

    res.json({
      success: true,
      data: { items, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } },
    })
  } catch (error) {
    next(error)
  }
}
