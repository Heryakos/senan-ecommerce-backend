/**
 * Authentication Routes
 */

import { Router } from "express"
import { register, login, logout, getCurrentUser, verifyEmail } from "../controllers/auth.controller"
import { authenticate } from "../middleware/auth.middleware"

const router = Router()

router.post("/register", register)
router.post("/login", login)
router.post("/logout", authenticate, logout)
router.get("/me", authenticate, getCurrentUser)
router.post("/verify", verifyEmail)

export default router
