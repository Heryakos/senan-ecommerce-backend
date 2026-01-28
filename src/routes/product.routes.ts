/**
 * Product Routes
 */

import { Router } from "express"
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller"
import { authenticate, authorize } from "../middleware/auth.middleware"
import { Role } from "../constants/roles"

const router = Router()

// PUBLIC ROUTES - No authentication needed
router.get("/", getAllProducts)           // ← Public: anyone can view products
router.get("/:id", getProductById)        // ← Public: view single product

// PROTECTED ROUTES - Require login + role
router.post("/", authenticate, authorize(Role.ADMIN, Role.SELLER), createProduct)
router.patch("/:id", authenticate, authorize(Role.ADMIN, Role.SELLER), updateProduct)
router.delete("/:id", authenticate, authorize(Role.ADMIN), deleteProduct)

export default router