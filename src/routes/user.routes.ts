/**
 * User Management Routes
 */

import { Router } from "express"
import { getAllUsers, getUserById, updateUser, deleteUser, getUserOrders } from "../controllers/user.controller"
import { authenticate, authorize } from "../middleware/auth.middleware"
import { Role } from "../constants/roles"

const router = Router()

// All routes require authentication
router.use(authenticate)

router.get("/", authorize(Role.ADMIN, Role.MANAGER), getAllUsers)
router.get("/:id", getUserById)
router.patch("/:id", updateUser)
router.delete("/:id", authorize(Role.ADMIN), deleteUser)
router.get("/:id/orders", getUserOrders)

export default router
