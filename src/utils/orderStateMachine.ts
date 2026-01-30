/**
 * Order State Machine
 * Enforces valid status transitions
 */

import { OrderStatus, PaymentStatus } from "../constants/roles"
import { ApiError } from "../middleware/error.middleware"

// Valid transitions: from -> [to]
const VALID_TRANSITIONS: Record<string, string[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [], // Terminal
  [OrderStatus.REFUNDED]: [], // Terminal
}

export function validateOrderStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): void {
  const allowed = VALID_TRANSITIONS[currentStatus] || []
  if (!allowed.includes(newStatus)) {
    throw new ApiError(
      `Invalid transition from ${currentStatus} to ${newStatus}`,
      400
    )
  }
}

export function validatePaymentStatusTransition(
  currentStatus: PaymentStatus,
  newStatus: PaymentStatus
): void {
  // Payment can go: PENDING -> PAID/FAILED, PAID -> REFUNDED/PARTIALLY_REFUNDED
  const valid: Record<string, string[]> = {
    [PaymentStatus.PENDING]: [PaymentStatus.PAID, PaymentStatus.FAILED],
    [PaymentStatus.PAID]: [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED],
    [PaymentStatus.FAILED]: [PaymentStatus.PENDING], // Retry
    [PaymentStatus.REFUNDED]: [],
    [PaymentStatus.PARTIALLY_REFUNDED]: [PaymentStatus.REFUNDED],
  }
  const allowed = valid[currentStatus] || []
  if (!allowed.includes(newStatus)) {
    throw new ApiError(
      `Invalid payment transition from ${currentStatus} to ${newStatus}`,
      400
    )
  }
}

/**
 * Sync order status based on payment status
 */
export function getOrderStatusFromPayment(paymentStatus: PaymentStatus): OrderStatus {
  switch (paymentStatus) {
    case PaymentStatus.PAID:
      return OrderStatus.CONFIRMED
    case PaymentStatus.FAILED:
      return OrderStatus.PENDING
    case PaymentStatus.REFUNDED:
      return OrderStatus.REFUNDED
    default:
      return OrderStatus.PENDING
  }
}
