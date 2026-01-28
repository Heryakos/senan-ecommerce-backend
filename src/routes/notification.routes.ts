/**
 * Notification Routes
 */

import { Router } from "express"
import {
  getUserNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notification.controller"
import { authenticate } from "../middleware/auth.middleware"

const router = Router()

// All routes require authentication
router.use(authenticate)

router.get("/", getUserNotifications)
router.get("/:id", getNotificationById)
router.patch("/:id/read", markAsRead)
router.patch("/read-all", markAllAsRead)
router.delete("/:id", deleteNotification)

export default router
