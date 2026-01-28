/**
 * Order Routes
 */

import { Router } from "express"
import {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
} from "../controllers/order.controller"
import { authenticate, authorize } from "../middleware/auth.middleware"
import { Role } from "../constants/roles"

const router = Router()

// All routes require authentication
router.use(authenticate)

router.get("/", getAllOrders)
router.get("/:id", getOrderById)
router.post("/", createOrder)
router.patch("/:id/status", authorize(Role.ADMIN, Role.MANAGER), updateOrderStatus)
router.post("/:id/cancel", cancelOrder)

export default router
