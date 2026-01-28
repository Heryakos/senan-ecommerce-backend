// src/constants/roles.ts
export const Role = {
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    SELLER: "SELLER",
    CUSTOMER: "CUSTOMER",
  } as const;
  
  export const UserStatus = {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
    SUSPENDED: "SUSPENDED",
    PENDING_VERIFICATION: "PENDING_VERIFICATION",
  } as const;
  
  export const ProductStatus = {
    DRAFT: "DRAFT",
    ACTIVE: "ACTIVE",
    OUT_OF_STOCK: "OUT_OF_STOCK",
    DISCONTINUED: "DISCONTINUED",
  } as const;
  
  export const OrderStatus = {
    PENDING: "PENDING",
    CONFIRMED: "CONFIRMED",
    PROCESSING: "PROCESSING",
    SHIPPED: "SHIPPED",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED",
  } as const;
  
  export const PaymentStatus = {
    PENDING: "PENDING",
    PAID: "PAID",
    FAILED: "FAILED",
    REFUNDED: "REFUNDED",
    PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  } as const;
  
  export const FulfillmentStatus = {
    UNFULFILLED: "UNFULFILLED",
    PARTIALLY_FULFILLED: "PARTIALLY_FULFILLED",
    FULFILLED: "FULFILLED",
  } as const;
  
  export const PaymentMethod = {
    CHAPA: "CHAPA",
    TELEBIRR: "TELEBIRR",
    SANTIM_PAY: "SANTIM_PAY",
    CASH_ON_DELIVERY: "CASH_ON_DELIVERY",
    BANK_TRANSFER: "BANK_TRANSFER",
  } as const;
  
  export const NotificationType = {
    ORDER_CREATED: "ORDER_CREATED",
    ORDER_UPDATED: "ORDER_UPDATED",
    ORDER_SHIPPED: "ORDER_SHIPPED",
    ORDER_DELIVERED: "ORDER_DELIVERED",
    PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
    PAYMENT_FAILED: "PAYMENT_FAILED",
    PRODUCT_LOW_STOCK: "PRODUCT_LOW_STOCK",
    PRODUCT_OUT_OF_STOCK: "PRODUCT_OUT_OF_STOCK",
    USER_REGISTERED: "USER_REGISTERED",
    SYSTEM_ALERT: "SYSTEM_ALERT",
  } as const;