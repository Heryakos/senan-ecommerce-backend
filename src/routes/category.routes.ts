/**
 * Category Routes
 */

import { Router } from "express"
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller"
import { authenticate, authorize } from "../middleware/auth.middleware"
import { Role } from "../constants/roles"

const router = Router()

// PUBLIC
router.get("/", getAllCategories)
router.get("/:id", getCategoryById)

// PROTECTED
router.post("/", authenticate, authorize(Role.ADMIN), createCategory)
router.patch("/:id", authenticate, authorize(Role.ADMIN), updateCategory)
router.delete("/:id", authenticate, authorize(Role.ADMIN), deleteCategory)

export default router