/**
 * Inventory Routes
 */

import { Router } from "express"
import { getInventory, getLowStock, updateStock, getMovementHistory } from "../controllers/inventory.controller"
import { authenticate, authorize } from "../middleware/auth.middleware"
import { Role } from "../constants/roles"

const router = Router()

router.use(authenticate)
router.use(authorize(Role.ADMIN, Role.MANAGER, Role.SELLER))

router.get("/", getInventory)
router.get("/low-stock", getLowStock)
router.patch("/:productId/stock", updateStock)
router.get("/:productId/history", getMovementHistory)

export default router
