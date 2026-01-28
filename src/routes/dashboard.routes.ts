/**
 * Dashboard Analytics Routes
 */

import { Router } from "express"
import {
  getDashboardStats,
  getOrdersChartData,
  getRevenueChartData,
  getTopProducts,
  getRecentOrders,
} from "../controllers/dashboard.controller"
import { authenticate, authorize } from "../middleware/auth.middleware"
import { Role } from "../constants/roles"

const router = Router()

// PUBLIC - for landing page stats
router.get("/stats", getDashboardStats)

// PROTECTED - admin only
router.use(authenticate)
router.use(authorize(Role.ADMIN, Role.MANAGER, Role.SELLER))

router.get("/charts/orders", getOrdersChartData)
router.get("/charts/revenue", getRevenueChartData)
router.get("/top-products", getTopProducts)
router.get("/recent-orders", getRecentOrders)

export default router