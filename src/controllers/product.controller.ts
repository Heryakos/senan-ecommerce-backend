/**
 * Product Management Controller
 */

import type { Response, NextFunction } from "express"
import { prisma } from "../config/database"
import { ApiError } from "../middleware/error.middleware"
import type { AuthRequest } from "../middleware/auth.middleware"
import { z } from "zod"
import { ProductStatus } from "../constants/roles"

const createProductSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  price: z.number().positive(),
  comparePrice: z.number().positive().optional(),
  costPrice: z.number().positive().optional(),
  stock: z.number().int().min(0),
  sku: z.string().optional(),
  categoryId: z.string(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "OUT_OF_STOCK", "DISCONTINUED"]).optional(),
})

const updateProductSchema = createProductSchema.partial()

export const getAllProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      category,
      status,
      minPrice,
      maxPrice,
      page = "1",
      limit = "20",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query

    const pageNum = Number.parseInt(page as string)
    const limitNum = Number.parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    if (search) {
      where.OR = [{ name: { contains: search as string } }, { description: { contains: search as string } }]
    }

    if (category) {
      where.categoryId = category
    }

    if (status) {
      where.status = status
    }

    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = Number.parseFloat(minPrice as string)
      if (maxPrice) where.price.lte = Number.parseFloat(maxPrice as string)
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: limitNum,
      }),
      prisma.product.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        products,
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

export const getProductById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    if (!product) {
      throw new ApiError("Product not found", 404)
    }

    // Increment view count
    await prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })

    res.json({
      success: true,
      data: product,
    })
  } catch (error) {
    next(error)
  }
}

export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createProductSchema.parse(req.body)

    const slug = validated.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")

    const product = await prisma.product.create({
      data: {
        name: validated.name,
        slug,
        description: validated.description,
        price: validated.price,
        comparePrice: validated.comparePrice,
        costPrice: validated.costPrice,
        stock: validated.stock,
        sku: validated.sku,
        barcode: validated.barcode,
        categoryId: validated.categoryId,
        tags: validated.tags ? JSON.stringify(validated.tags) : "[]",
        images: validated.images ? JSON.stringify(validated.images) : "[]",
        thumbnail: validated.thumbnail,
        status: validated.status || "DRAFT",
        publishedAt: validated.status === "ACTIVE" ? new Date() : null,
      },
      include: {
        category: true,
      },
    })

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    })
  } catch (error) {
    next(error)
  }
}

export const updateProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const validated = updateProductSchema.parse(req.body)

    const updateData: any = { ...validated }

    // Update slug if name changes
    if (validated.name) {
      updateData.slug = validated.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    }

    // Update published date if status changes to active
    if (validated.status === ProductStatus.ACTIVE) {
      const existing = await prisma.product.findUnique({ where: { id } })
      if (existing && !existing.publishedAt) {
        updateData.publishedAt = new Date()
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    })

    res.json({
      success: true,
      message: "Product updated successfully",
      data: product,
    })
  } catch (error) {
    next(error)
  }
}

export const deleteProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    await prisma.product.delete({
      where: { id },
    })

    res.json({
      success: true,
      message: "Product deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}
