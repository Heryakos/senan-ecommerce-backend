/**
 * Category Management Controller
 */

import type { Response, NextFunction } from "express"
import { prisma } from "../config/database"
import { ApiError } from "../middleware/error.middleware"
import type { AuthRequest } from "../middleware/auth.middleware"
import { z } from "zod"

const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  image: z.string().url().optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const getAllCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { includeInactive = "false" } = req.query

    const where = includeInactive === "true" ? {} : { isActive: true }

    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    })

    res.json({
      success: true,
      data: categories,
    })
  } catch (error) {
    next(error)
  }
}

export const getCategoryById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        products: {
          take: 10,
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            thumbnail: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    })

    if (!category) {
      throw new ApiError("Category not found", 404)
    }

    res.json({
      success: true,
      data: category,
    })
  } catch (error) {
    next(error)
  }
}

export const createCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = categorySchema.parse(req.body)

    const slug = validated.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")

    const category = await prisma.category.create({
      data: {
        ...validated,
        slug,
      },
    })

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    })
  } catch (error) {
    next(error)
  }
}

export const updateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const validated = categorySchema.partial().parse(req.body)

    const updateData: any = { ...validated }

    if (validated.name) {
      updateData.slug = validated.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    })

    res.json({
      success: true,
      message: "Category updated successfully",
      data: category,
    })
  } catch (error) {
    next(error)
  }
}

export const deleteCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    // Check if category has products
    const productCount = await prisma.product.count({
      where: { categoryId: id },
    })

    if (productCount > 0) {
      throw new ApiError("Cannot delete category with existing products", 400)
    }

    await prisma.category.delete({
      where: { id },
    })

    res.json({
      success: true,
      message: "Category deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}
