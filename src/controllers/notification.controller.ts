/**
 * Notification Controller
 */

import type { Response, NextFunction } from "express"
import { prisma } from "../config/database"
import { ApiError } from "../middleware/error.middleware"
import type { AuthRequest } from "../middleware/auth.middleware"

export const getUserNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { unreadOnly = "false", page = "1", limit = "20" } = req.query

    const pageNum = Number.parseInt(page as string)
    const limitNum = Number.parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const where: any = { userId: req.user!.id }

    if (unreadOnly === "true") {
      where.isRead = false
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: req.user!.id, isRead: false },
      }),
    ])

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
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

export const getNotificationById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const notification = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notification) {
      throw new ApiError("Notification not found", 404)
    }

    // Check authorization
    if (notification.userId !== req.user!.id) {
      throw new ApiError("Forbidden", 403)
    }

    res.json({
      success: true,
      data: notification,
    })
  } catch (error) {
    next(error)
  }
}

export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const notification = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notification) {
      throw new ApiError("Notification not found", 404)
    }

    if (notification.userId !== req.user!.id) {
      throw new ApiError("Forbidden", 403)
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    res.json({
      success: true,
      message: "Notification marked as read",
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user!.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    res.json({
      success: true,
      message: "All notifications marked as read",
    })
  } catch (error) {
    next(error)
  }
}

export const deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const notification = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notification) {
      throw new ApiError("Notification not found", 404)
    }

    if (notification.userId !== req.user!.id) {
      throw new ApiError("Forbidden", 403)
    }

    await prisma.notification.delete({
      where: { id },
    })

    res.json({
      success: true,
      message: "Notification deleted",
    })
  } catch (error) {
    next(error)
  }
}
