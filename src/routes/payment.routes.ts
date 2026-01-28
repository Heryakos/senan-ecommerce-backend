/**
 * Payment Routes
 */

import { Router } from "express"
import {
  getPaymentMethods,
  processPayment,
  initiatePayment,
  paymentWebhook,
  getPaymentById,
  verifyPayment,
} from "../controllers/payment.controller"
import { authenticate } from "../middleware/auth.middleware"

const router = Router()

// Webhook: no auth (server-to-server from payment gateway)
router.post("/webhook/:provider", paymentWebhook)

// All other routes require authentication
router.use(authenticate)

router.get("/methods", getPaymentMethods)
router.post("/process", processPayment)
router.post("/initiate", initiatePayment)
router.get("/:id", getPaymentById)
router.post("/:id/verify", verifyPayment)

export default router
