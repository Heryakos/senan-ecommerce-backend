/**
 * Order Management Controller
 */

import type { Response, NextFunction } from "express"
import { prisma } from "../config/database"
import { ApiError } from "../middleware/error.middleware"
import type { AuthRequest } from "../middleware/auth.middleware"
import { z } from "zod"
import { OrderStatus, PaymentStatus, FulfillmentStatus, Role } from "../constants/roles"
import type { Product, OrderItem as PrismaOrderItem } from "@prisma/client"
import {
  validateOrderStatusTransition,
  validatePaymentStatusTransition,
  getOrderStatusFromPayment,
} from "../utils/orderStateMachine"

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
})

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  shippingAddress: z.string().min(5),
  shippingCity: z.string().min(2),
  shippingCountry: z.string().min(2),
  shippingPostal: z.string().optional(),
  paymentMethod: z.enum(["CHAPA", "TELEBIRR", "SANTIM_PAY", "CASH_ON_DELIVERY", "BANK_TRANSFER"]),
  customerNotes: z.string().optional(),
})

const updateOrderStatusSchema = z.object({
  orderStatus: z.enum(["PENDING","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","CANCELLED","REFUNDED"]).optional(),
  paymentStatus: z.enum(["PENDING","PAID","FAILED","REFUNDED","PARTIALLY_REFUNDED"]).optional(),
  fulfillmentStatus: z.enum(["UNFULFILLED","PARTIALLY_FULFILLED","FULFILLED"]).optional(),
  trackingNumber: z.string().optional(),
  shippingCarrier: z.string().optional(),
  internalNotes: z.string().optional(),
})

export const getAllOrders = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const {
      search,
      orderStatus,
      paymentStatus,
      paymentMethod,
      userId,
      page = "1",
      limit = "20",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query

    const pageNum = Number.parseInt(page as string)
    const limitNum = Number.parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    // If customer, only show their orders
    if (req.user!.role === Role.CUSTOMER) {
      where.userId = req.user!.id
    } else if (userId) {
      where.userId = userId
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search as string } },
        { customerName: { contains: search as string } },
        { customerEmail: { contains: search as string } },
      ]
    }

    if (orderStatus) {
      where.orderStatus = orderStatus
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            select: {
              id: true,
              productName: true,
              productImage: true,
              quantity: true,
              price: true,
              subtotal: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: limitNum,
      }),
      prisma.order.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    _next(error)
  }
}

export const getOrderById = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                thumbnail: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            transactionId: true,
            createdAt: true,
          },
        },
      },
    })

    if (!order) {
      throw new ApiError("Order not found", 404)
    }

    // Check authorization - customers can only see their own orders
    if (req.user!.role === Role.CUSTOMER && order.userId !== req.user!.id) {
      throw new ApiError("Forbidden", 403)
    }

    res.json({
      success: true,
      data: order,
    })
  } catch (error) {
    _next(error)
  }
}

export const createOrder = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const validated = createOrderSchema.parse(req.body)
    const userId = req.user!.id

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new ApiError("User not found", 404)
    }

    // Fetch products and calculate totals
    const productIds = validated.items.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })

    if (products.length !== productIds.length) {
      throw new ApiError("Some products not found", 404)
    }

    // Check stock availability BEFORE transaction
    for (const item of validated.items) {
      const product = products.find((p: Product) => p.id === item.productId)!
      if (product.trackInventory && product.stock < item.quantity) {
        throw new ApiError(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`, 400)
      }
    }

    // Calculate totals
    let subtotal = 0
    const orderItems = validated.items.map((item) => {
      const product = products.find((p: Product) => p.id === item.productId)!
      const itemSubtotal = Number(product.price) * item.quantity
      subtotal += itemSubtotal

      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productImage: product.thumbnail,
        price: product.price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      }
    })

    const tax = subtotal * 0.15 // 15% tax
    const shippingCost = subtotal > 500 ? 0 : 25 // Free shipping over 500
    const discount = 0
    const total = subtotal + tax + shippingCost - discount

    // Generate order number
    const orderCount = await prisma.order.count()
    const orderNumber = `ORD-${(orderCount + 1).toString().padStart(6, "0")}`

    // ATOMIC TRANSACTION: Create order + reserve/deduct stock + log movements
    const order = await prisma.$transaction(async (tx) => {
      // Re-check stock within transaction (prevent race conditions)
      for (const item of validated.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product) throw new ApiError(`Product ${item.productId} not found`, 404)
        if (product.trackInventory && product.stock < item.quantity) {
          throw new ApiError(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`, 400)
        }
      }

      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          customerName: user.name,
          customerEmail: user.email,
          customerPhone: user.phone || "",
          shippingAddress: validated.shippingAddress,
          shippingCity: validated.shippingCity,
          shippingCountry: validated.shippingCountry,
          shippingPostal: validated.shippingPostal,
          billingAddress: validated.shippingAddress,
          billingCity: validated.shippingCity,
          billingCountry: validated.shippingCountry,
          billingPostal: validated.shippingPostal,
          subtotal,
          tax,
          shippingCost,
          discount,
          total,
          orderStatus: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
          paymentMethod: validated.paymentMethod,
          customerNotes: validated.customerNotes,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
        },
      })

      // Deduct stock and create movements atomically
      for (const item of validated.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (product?.trackInventory) {
          // Prevent negative stock
          const newStock = product.stock - item.quantity
          if (newStock < 0) {
            throw new ApiError(`Stock would go negative for ${product.name}`, 400)
          }

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity },
              salesCount: { increment: item.quantity },
              status: newStock === 0 ? "OUT_OF_STOCK" : product.status,
            },
          })

          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              quantityDelta: -item.quantity,
              type: "SALE",
              reason: `Order ${newOrder.orderNumber}`,
              referenceId: newOrder.id,
              userId,
            },
          })
        }
      }

      // Update user stats
      await tx.user.update({
        where: { id: userId },
        data: {
          totalOrders: { increment: 1 },
          totalSpent: { increment: total },
        },
      })

      return newOrder
    })

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    })
  } catch (error) {
    _next(error)
  }
}

export const updateOrderStatus = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params
    const validated = updateOrderStatusSchema.parse(req.body)

    // Get current order state
    const currentOrder = await prisma.order.findUnique({ where: { id } })
    if (!currentOrder) {
      throw new ApiError("Order not found", 404)
    }

    // Validate transitions
    if (validated.orderStatus && validated.orderStatus !== currentOrder.orderStatus) {
      validateOrderStatusTransition(currentOrder.orderStatus, validated.orderStatus)
    }
    if (validated.paymentStatus && validated.paymentStatus !== currentOrder.paymentStatus) {
      validatePaymentStatusTransition(currentOrder.paymentStatus, validated.paymentStatus)
    }

    const updateData: any = { ...validated }

    // Sync order status from payment status if payment changed
    if (validated.paymentStatus && !validated.orderStatus) {
      updateData.orderStatus = getOrderStatusFromPayment(validated.paymentStatus)
    }

    // Set timestamps based on status changes
    if (validated.orderStatus === OrderStatus.SHIPPED && !updateData.shippedAt) {
      updateData.shippedAt = new Date()
    }

    if (validated.orderStatus === OrderStatus.DELIVERED && !updateData.deliveredAt) {
      updateData.deliveredAt = new Date()
    }

    if (validated.orderStatus === OrderStatus.CANCELLED && !updateData.cancelledAt) {
      updateData.cancelledAt = new Date()
    }

    if (validated.paymentStatus === PaymentStatus.PAID && !updateData.paidAt) {
      updateData.paidAt = new Date()
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
      },
    })

    res.json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    })
  } catch (error) {
    _next(error)
  }
}

export const cancelOrder = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!order) {
      throw new ApiError("Order not found", 404)
    }

    // Check authorization
    if (req.user!.role === Role.CUSTOMER && order.userId !== req.user!.id) {
      throw new ApiError("Forbidden", 403)
    }

    // Can only cancel pending or confirmed orders
    if (!["PENDING", "CONFIRMED"].includes(order.orderStatus)) {
      throw new ApiError("Cannot cancel order in current status", 400)
    }

    // Restore product stock and log RETURN movement
    await Promise.all(
      order.items.map((item: PrismaOrderItem) =>
        prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            salesCount: { decrement: item.quantity },
          },
        }),
      ),
    )
    await Promise.all(
      order.items.map((item: PrismaOrderItem) =>
        prisma.inventoryMovement.create({
          data: {
            productId: item.productId,
            quantityDelta: item.quantity,
            type: "RETURN",
            reason: "Order cancelled",
            referenceId: order.id,
            userId: req.user!.id,
          },
        }),
      ),
    )

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        orderStatus: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    })

    res.json({
      success: true,
      message: "Order cancelled successfully",
      data: updatedOrder,
    })
  } catch (error) {
    _next(error)
  }
}