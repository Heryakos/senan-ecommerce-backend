# API Documentation

Complete API reference for Senan E-Commerce Backend

## Base URL

- **Development:** `http://localhost:5000/api`
- **Production:** `https://your-domain.com/api`

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

Get token by calling `/api/auth/login` or `/api/auth/register`

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ]  // For validation errors
}
```

## Endpoints

### Authentication

#### POST /api/auth/register
Register a new user account

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+251911234567",
  "role": "CUSTOMER"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { ... },
    "token": "eyJhbGc..."
  }
}
```

#### POST /api/auth/login
Login to existing account

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### GET /api/auth/me
Get current user details (requires auth)

#### POST /api/auth/logout
Logout current user (requires auth)

---

### Products

#### GET /api/products
List all products with filtering and pagination

**Query Parameters:**
- `search` - Search in name/description
- `category` - Filter by category ID
- `status` - Filter by status (ACTIVE, DRAFT, OUT_OF_STOCK)
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `sortBy` - Sort field (default: createdAt)
- `sortOrder` - asc or desc (default: desc)

#### GET /api/products/:id
Get single product by ID

#### POST /api/products
Create new product (requires auth: ADMIN, SELLER)

**Body:**
```json
{
  "name": "Product Name",
  "description": "Product description",
  "price": 99.99,
  "comparePrice": 129.99,
  "stock": 100,
  "categoryId": "category-id",
  "tags": ["featured", "new"],
  "images": ["url1", "url2"],
  "status": "ACTIVE"
}
```

#### PATCH /api/products/:id
Update product (requires auth: ADMIN, SELLER)

#### DELETE /api/products/:id
Delete product (requires auth: ADMIN)

---

### Categories

#### GET /api/categories
List all categories

**Query Parameters:**
- `includeInactive` - Include inactive categories (default: false)

#### GET /api/categories/:id
Get single category with products

#### POST /api/categories
Create category (requires auth: ADMIN)

#### PATCH /api/categories/:id
Update category (requires auth: ADMIN)

#### DELETE /api/categories/:id
Delete category (requires auth: ADMIN)

---

### Orders

#### GET /api/orders
List all orders (requires auth)

Customers see only their orders. Admins/Managers see all.

**Query Parameters:**
- `search` - Search order number, customer name/email
- `orderStatus` - Filter by order status
- `paymentStatus` - Filter by payment status
- `paymentMethod` - Filter by payment method
- `userId` - Filter by user ID
- `page` - Page number
- `limit` - Items per page

#### GET /api/orders/:id
Get single order details (requires auth)

#### POST /api/orders
Create new order (requires auth: CUSTOMER)

**Body:**
```json
{
  "items": [
    {
      "productId": "prod-id",
      "quantity": 2
    }
  ],
  "shippingAddress": "123 Main St",
  "shippingCity": "Addis Ababa",
  "shippingCountry": "Ethiopia",
  "shippingPostal": "1000",
  "paymentMethod": "CHAPA",
  "customerNotes": "Please deliver after 5pm"
}
```

#### PATCH /api/orders/:id/status
Update order status (requires auth: ADMIN, MANAGER)

**Body:**
```json
{
  "orderStatus": "SHIPPED",
  "trackingNumber": "TRK123456",
  "shippingCarrier": "DHL Express",
  "internalNotes": "Shipped via express delivery"
}
```

#### POST /api/orders/:id/cancel
Cancel order (requires auth)

---

### Payments

#### POST /api/payments/process
Process payment for an order (requires auth)

**Body:**
```json
{
  "orderId": "order-id",
  "method": "CHAPA",
  "amount": 299.99
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "id": "payment-id",
    "transactionId": "CHAPA-1234567890",
    "status": "PAID"
  }
}
```

#### GET /api/payments/:id
Get payment details (requires auth)

#### POST /api/payments/:id/verify
Verify payment status (requires auth)

---

### Users

#### GET /api/users
List all users (requires auth: ADMIN, MANAGER)

**Query Parameters:**
- `search` - Search name/email
- `role` - Filter by role
- `status` - Filter by status
- `page` - Page number
- `limit` - Items per page

#### GET /api/users/:id
Get user details (requires auth)

#### PATCH /api/users/:id
Update user (requires auth)

#### DELETE /api/users/:id
Delete user (requires auth: ADMIN)

#### GET /api/users/:id/orders
Get user's orders (requires auth)

---

### Notifications

#### GET /api/notifications
List user's notifications (requires auth)

**Query Parameters:**
- `unreadOnly` - Show only unread (default: false)
- `page` - Page number
- `limit` - Items per page

#### GET /api/notifications/:id
Get notification details (requires auth)

#### PATCH /api/notifications/:id/read
Mark notification as read (requires auth)

#### PATCH /api/notifications/read-all
Mark all notifications as read (requires auth)

#### DELETE /api/notifications/:id
Delete notification (requires auth)

---

### Settings

#### GET /api/settings
Get all settings (requires auth: ADMIN, MANAGER)

**Query Parameters:**
- `category` - Filter by category

#### GET /api/settings/:key
Get specific setting by key (requires auth: ADMIN, MANAGER)

#### PATCH /api/settings
Update settings (requires auth: ADMIN)

**Body:**
```json
{
  "store_name": "My Store",
  "tax_rate": 0.15,
  "free_shipping_threshold": 500
}
```

---

### Dashboard

#### GET /api/dashboard/stats
Get dashboard KPI statistics (requires auth: ADMIN, MANAGER, SELLER)

**Response:**
```json
{
  "totalOrders": 1247,
  "totalRevenue": 45678.90,
  "activeUsers": 3456,
  "pendingOrders": 23,
  "ordersTrend": 12.5,
  "revenueTrend": 8.3,
  "usersTrend": 15.2
}
```

#### GET /api/dashboard/charts/orders
Get orders chart data

**Query Parameters:**
- `months` - Number of months (default: 12)

#### GET /api/dashboard/charts/revenue
Get revenue chart data

**Query Parameters:**
- `months` - Number of months (default: 12)

#### GET /api/dashboard/top-products
Get top selling products

**Query Parameters:**
- `limit` - Number of products (default: 10)

#### GET /api/dashboard/recent-orders
Get recent orders

**Query Parameters:**
- `limit` - Number of orders (default: 10)

---

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error

## Rate Limiting

- **Window:** 15 minutes
- **Max Requests:** 100 per IP
- **Response:** 429 Too Many Requests

## Pagination

All list endpoints support pagination:

```json
{
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
