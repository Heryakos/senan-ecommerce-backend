/**
 * Dashboard Analytics Controller
 */

import type { Response, NextFunction } from "express"
import { prisma } from "../config/database"
import type { AuthRequest } from "../middleware/auth.middleware"
import { OrderStatus, PaymentStatus } from "../constants/roles"

export const getDashboardStats = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

    // Get current period stats
    const [totalOrders, totalRevenue, activeUsers, pendingOrders, paidOrders] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({
        where: { paymentStatus: PaymentStatus.PAID },
        _sum: { total: true },
      }),
      prisma.user.count({
        where: { status: "ACTIVE", role: "CUSTOMER" },
      }),
      prisma.order.count({
        where: { orderStatus: OrderStatus.PENDING },
      }),
      prisma.order.count({
        where: {
          paymentStatus: PaymentStatus.PAID,
          createdAt: { gte: lastMonth },
        },
      }),
    ])

    // Get previous period stats for trends
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate())

    const [prevOrders, prevRevenue, prevUsers] = await Promise.all([
      prisma.order.count({
        where: {
          createdAt: { gte: previousMonth, lt: lastMonth },
        },
      }),
      prisma.order.aggregate({
        where: {
          paymentStatus: PaymentStatus.PAID,
          createdAt: { gte: previousMonth, lt: lastMonth },
        },
        _sum: { total: true },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: previousMonth, lt: lastMonth },
          role: "CUSTOMER",
        },
      }),
    ])

    // Calculate trends
    const ordersTrend = prevOrders > 0 ? ((paidOrders - prevOrders) / prevOrders) * 100 : 0
    const revenueTrend =
      prevRevenue._sum.total && Number(prevRevenue._sum.total) > 0
        ? ((Number(totalRevenue._sum.total || 0) - Number(prevRevenue._sum.total)) / Number(prevRevenue._sum.total)) *
          100
        : 0
    const usersTrend = prevUsers > 0 ? ((activeUsers - prevUsers) / prevUsers) * 100 : 0

    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: Number(totalRevenue._sum.total || 0),
        activeUsers,
        pendingOrders,
        ordersTrend: Number(ordersTrend.toFixed(1)),
        revenueTrend: Number(revenueTrend.toFixed(1)),
        usersTrend: Number(usersTrend.toFixed(1)),
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getOrdersChartData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { months = "12" } = req.query
    const monthsNum = Number.parseInt(months as string)

    const data = []
    const now = new Date()

    for (let i = monthsNum - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

      const orders = await prisma.order.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      })

      data.push({
        date: startDate.toLocaleDateString("en-US", { month: "short" }),
        orders,
      })
    }

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
}

export const getRevenueChartData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { months = "12" } = req.query
    const monthsNum = Number.parseInt(months as string)

    const data = []
    const now = new Date()

    for (let i = monthsNum - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

      const result = await prisma.order.aggregate({
        where: {
          paymentStatus: PaymentStatus.PAID,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { total: true },
      })

      data.push({
        date: startDate.toLocaleDateString("en-US", { month: "short" }),
        revenue: Number(result._sum.total || 0),
      })
    }

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
}

export const getTopProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { limit = "10" } = req.query

    const products = await prisma.product.findMany({
      orderBy: { salesCount: "desc" },
      take: Number.parseInt(limit as string),
      select: {
        id: true,
        name: true,
        thumbnail: true,
        price: true,
        salesCount: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    })

    res.json({
      success: true,
      data: products,
    })
  } catch (error) {
    next(error)
  }
}

export const getRecentOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { limit = "10" } = req.query

    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: Number.parseInt(limit as string),
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        total: true,
        orderStatus: true,
        paymentStatus: true,
        createdAt: true,
      },
    })

    res.json({
      success: true,
      data: orders,
    })
  } catch (error) {
    next(error)
  }
}
