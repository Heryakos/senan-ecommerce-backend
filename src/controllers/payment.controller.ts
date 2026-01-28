/**
 * Payment Controller
 * Abstract payment layer: strategy pattern, C2B initiate → webhook verify.
 * Mock provider as default for CHAPA, TELEBIRR, SANTIM_PAY.
 */

import type { Request, Response, NextFunction } from "express"
import { prisma } from "../config/database"
import { ApiError } from "../middleware/error.middleware"
import type { AuthRequest } from "../middleware/auth.middleware"
import { z } from "zod"
import { PaymentMethod, PaymentStatus, OrderStatus } from "../constants/roles"
import { getPaymentProvider } from "../payment"

const processPaymentSchema = z.object({
  orderId: z.string(),
  method: z.nativeEnum(PaymentMethod),
  amount: z.number().positive(),
})

const initiateSchema = z.object({
  orderId: z.string(),
  method: z.nativeEnum(PaymentMethod),
  amount: z.number().positive(),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
})

const DEFAULT_PAYMENT_METHODS = [
  { method: PaymentMethod.CHAPA, name: "Chapa", enabled: true },
  { method: PaymentMethod.TELEBIRR, name: "Telebirr", enabled: true },
  { method: PaymentMethod.SANTIM_PAY, name: "Santim Pay", enabled: true },
  { method: PaymentMethod.CASH_ON_DELIVERY, name: "Cash on Delivery", enabled: true },
  { method: PaymentMethod.BANK_TRANSFER, name: "Bank Transfer", enabled: true },
]

export const getPaymentMethods = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const row = await prisma.setting.findFirst({ where: { key: "payment_methods", category: "payment" } })
    let list = DEFAULT_PAYMENT_METHODS
    if (row?.value) {
      try {
        const parsed = JSON.parse(row.value) as typeof DEFAULT_PAYMENT_METHODS
        if (Array.isArray(parsed) && parsed.length) list = parsed
      } catch { /* use default */ }
    }
    res.json({ success: true, data: list })
  } catch (error) {
    next(error)
  }
}

export const processPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = processPaymentSchema.parse(req.body)

    const order = await prisma.order.findUnique({ where: { id: validated.orderId } })
    if (!order) throw new ApiError("Order not found", 404)
    if (order.userId !== req.user!.id) throw new ApiError("Forbidden", 403)
    if (order.paymentStatus === PaymentStatus.PAID) throw new ApiError("Order already paid", 400)

    let success: boolean
    let transactionId: string | null = null

    // COD / Bank: no provider; mark paid
    if (validated.method === PaymentMethod.CASH_ON_DELIVERY || validated.method === PaymentMethod.BANK_TRANSFER) {
      success = true
      transactionId = `COD-${Date.now()}`
    } else {
      const provider = getPaymentProvider(validated.method)
      if (!provider) throw new ApiError("Invalid payment method", 400)

      const init = await provider.initiate({
        orderId: validated.orderId,
        amount: validated.amount,
      })
      if (init.status === "FAILED") {
        success = false
      } else {
        transactionId = init.transactionId
        const verified = await provider.verify(init.transactionId)
        success = verified.success
      }
    }

    const payment = await prisma.payment.create({
      data: {
        orderId: validated.orderId,
        amount: validated.amount,
        method: validated.method,
        status: success ? PaymentStatus.PAID : PaymentStatus.FAILED,
        transactionId,
        gatewayResponse: JSON.stringify({ transactionId }),
        processedAt: success ? new Date() : null,
      },
    })

    if (success) {
      await prisma.order.update({
        where: { id: validated.orderId },
        data: { paymentStatus: PaymentStatus.PAID, orderStatus: OrderStatus.CONFIRMED, paidAt: new Date() },
      })
    }

    res.json({
      success,
      message: success ? "Payment processed successfully" : "Payment failed",
      data: payment,
    })
  } catch (error) {
    next(error)
  }
}

export const initiatePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = initiateSchema.parse(req.body)

    const order = await prisma.order.findUnique({ where: { id: validated.orderId } })
    if (!order) throw new ApiError("Order not found", 404)
    if (order.userId !== req.user!.id) throw new ApiError("Forbidden", 403)
    if (order.paymentStatus === PaymentStatus.PAID) throw new ApiError("Order already paid", 400)

    // COD / Bank: create Payment PAID and update order
    if (validated.method === PaymentMethod.CASH_ON_DELIVERY || validated.method === PaymentMethod.BANK_TRANSFER) {
      const payment = await prisma.payment.create({
        data: {
          orderId: validated.orderId,
          amount: validated.amount,
          method: validated.method,
          status: PaymentStatus.PAID,
          transactionId: `COD-${Date.now()}`,
          processedAt: new Date(),
        },
      })
      await prisma.order.update({
        where: { id: validated.orderId },
        data: { paymentStatus: PaymentStatus.PAID, orderStatus: OrderStatus.CONFIRMED, paidAt: new Date() },
      })
      return res.json({
        success: true,
        data: { paymentId: payment.id, status: "PAID" as const },
      })
    }

    const provider = getPaymentProvider(validated.method)
    if (!provider) throw new ApiError("Invalid payment method", 400)

    const init = await provider.initiate({
      orderId: validated.orderId,
      amount: validated.amount,
      returnUrl: validated.returnUrl,
      cancelUrl: validated.cancelUrl,
    })

    const payment = await prisma.payment.create({
      data: {
        orderId: validated.orderId,
        amount: validated.amount,
        method: validated.method,
        status: PaymentStatus.PENDING,
        transactionId: init.transactionId,
        gatewayResponse: JSON.stringify(init),
      },
    })

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        transactionId: init.transactionId,
        status: init.status,
        redirectUrl: init.redirectUrl,
      },
    })
  } catch (error) {
    next(error)
  }
}

const PROVIDER_MAP: Record<string, string> = {
  chapa: PaymentMethod.CHAPA,
  telebirr: PaymentMethod.TELEBIRR,
  santim_pay: PaymentMethod.SANTIM_PAY,
}

export const paymentWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provider = (req.params.provider as string)?.toLowerCase()
    const method = PROVIDER_MAP[provider]
    if (!method) return res.status(400).json({ success: false, message: "Unknown provider" })

    const txId = (req.body?.transactionId ?? req.body?.reference ?? req.body?.tx_ref) as string | undefined
    if (!txId) return res.status(400).json({ success: false, message: "Missing transactionId" })

    const payment = await prisma.payment.findFirst({ where: { transactionId: txId }, include: { order: true } })
    if (!payment || payment.status === PaymentStatus.PAID) {
      return res.json({ success: true, message: "Already processed" })
    }

    const prov = getPaymentProvider(method)
    if (!prov) return res.status(500).json({ success: false, message: "Provider not configured" })

    const verified = await prov.verify(txId, req.body)

    if (verified.success) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PAID, processedAt: new Date() },
      })
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: PaymentStatus.PAID, orderStatus: OrderStatus.CONFIRMED, paidAt: new Date() },
      })
    }

    res.json({ success: true, verified: verified.success })
  } catch (error) {
    next(error)
  }
}

export const getPaymentById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            total: true,
          },
        },
      },
    })

    if (!payment) {
      throw new ApiError("Payment not found", 404)
    }

    res.json({
      success: true,
      data: payment,
    })
  } catch (error) {
    next(error)
  }
}

export const verifyPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const payment = await prisma.payment.findUnique({
      where: { id },
    })

    if (!payment) {
      throw new ApiError("Payment not found", 404)
    }

    // Mock verification - in production, call payment gateway API
    const isVerified = payment.status === PaymentStatus.PAID && payment.transactionId

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        status: payment.status,
        verified: isVerified,
        transactionId: payment.transactionId,
      },
    })
  } catch (error) {
    next(error)
  }
}
