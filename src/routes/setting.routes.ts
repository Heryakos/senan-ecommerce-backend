/**
 * Settings Routes
 */

import { Router } from "express"
import { getAllSettings, getSettingByKey, updateSettings, getUISettings } from "../controllers/setting.controller"
import { authenticate, authorize } from "../middleware/auth.middleware"
import { Role } from "../constants/roles"

const router = Router()

// Public: UI config (theme, layout) – no auth
router.get("/ui", getUISettings)

// All other routes require authentication
router.use(authenticate)

router.get("/", authorize(Role.ADMIN, Role.MANAGER), getAllSettings)
router.get("/:key", authorize(Role.ADMIN, Role.MANAGER), getSettingByKey)
router.patch("/", authorize(Role.ADMIN), updateSettings)

export default router
