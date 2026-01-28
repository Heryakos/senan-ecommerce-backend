# Senan E-Commerce Backend API

Production-grade backend system for the Senan E-Commerce platform built with Node.js, Express, Prisma, and SQL Server 2022.

## Features

- **Clean Architecture**: Separated layers (Controllers, Services, Repositories)
- **Role-Based Access Control**: Admin, Manager, Seller, Customer roles
- **RESTful API**: Complete CRUD operations for all resources
- **Security**: JWT authentication, bcrypt password hashing, helmet, rate limiting
- **Database**: Prisma ORM with SQL Server 2022 (easily switchable)
- **Mock Payment Integration**: Chapa, Telebirr, Santim Pay
- **Comprehensive Validation**: Zod schema validation
- **Error Handling**: Global error handler with detailed logging
- **Performance**: Indexed queries, connection pooling
- **Scalable**: Designed for 1M+ users and 100k+ concurrent requests

## Prerequisites

- Node.js 18+ 
- SQL Server 2022
- npm or yarn

## Quick Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your SQL Server credentials
   ```

3. **Setup database:**
   ```bash
   npm run setup
   # This will: generate Prisma client, push schema, and seed data
   ```

4. **Start development server:**
   ```bash
   npm run dev
   # Server runs on http://localhost:5000
   ```

## Database Configuration

### SQL Server Connection String Format:
```
sqlserver://localhost:1433;database=senan_ecommerce;user=sa;password=YourPassword;encrypt=true;trustServerCertificate=true
```

### Switch to PostgreSQL:
```prisma
// In prisma/schema.prisma, change:
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Update DATABASE_URL in .env:
DATABASE_URL="postgresql://user:password@localhost:5432/senan_ecommerce"
```

### Switch to MySQL:
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// Update DATABASE_URL:
DATABASE_URL="mysql://user:password@localhost:3306/senan_ecommerce"
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/verify` - Verify email (mock)

### Products
- `GET /api/products` - List all products (with filters)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin, Seller)
- `PATCH /api/products/:id` - Update product (Admin, Seller)
- `DELETE /api/products/:id` - Delete product (Admin)

### Orders
- `GET /api/orders` - List all orders
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create order (Customer)
- `PATCH /api/orders/:id/status` - Update order status (Admin, Manager)
- `GET /api/orders/:id/invoice` - Get order invoice

### Users/Customers
- `GET /api/users` - List all users (Admin, Manager)
- `GET /api/users/:id` - Get single user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin)
- `GET /api/users/:id/orders` - Get user's orders

### Categories
- `GET /api/categories` - List all categories
- `GET /api/categories/:id` - Get single category
- `POST /api/categories` - Create category (Admin)
- `PATCH /api/categories/:id` - Update category (Admin)
- `DELETE /api/categories/:id` - Delete category (Admin)

### Payments
- `POST /api/payments/chapa` - Process Chapa payment
- `POST /api/payments/telebirr` - Process Telebirr payment
- `POST /api/payments/santimpay` - Process Santim Pay payment
- `GET /api/payments/:id` - Get payment details
- `POST /api/payments/:id/verify` - Verify payment

### Notifications
- `GET /api/notifications` - List user notifications
- `GET /api/notifications/:id` - Get single notification
- `PATCH /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification

### Settings
- `GET /api/settings` - Get all settings (Admin)
- `PATCH /api/settings` - Update settings (Admin)

### Dashboard
- `GET /api/dashboard/stats` - Get KPI statistics
- `GET /api/dashboard/charts/orders` - Get orders chart data
- `GET /api/dashboard/charts/revenue` - Get revenue chart data

## Database Schema

### Tables:
- **users** - User accounts with roles and authentication
- **sessions** - JWT session tokens
- **categories** - Product categories (hierarchical)
- **products** - Product catalog with inventory
- **orders** - Order management
- **order_items** - Order line items
- **payments** - Payment transactions
- **notifications** - User notifications
- **settings** - System configuration
- **activity_logs** - Audit trail

### Roles:
- **ADMIN** - Full system access
- **MANAGER** - User and analytics management
- **SELLER** - Product and order management
- **CUSTOMER** - Browse and purchase

## Mock Data

Seed script includes:
- 50+ products across 10 categories
- 100+ orders with various statuses
- 50+ customers
- Realistic payment records
- Sample notifications

Run: `npm run db:seed`

## Scripts

```bash
npm run dev              # Start development server with hot reload
npm run build            # Compile TypeScript to JavaScript
npm run start            # Start production server
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio GUI
npm run prisma:seed      # Seed database with mock data
npm run prisma:reset     # Reset database (⚠️ deletes all data)
npm run db:push          # Push schema to database
npm run setup            # Complete setup (install + generate + push + seed)
```

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed script
├── src/
│   ├── config/            # Configuration files
│   ├── controllers/       # Request handlers
│   ├── services/          # Business logic
│   ├── repositories/      # Database queries
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   ├── validators/        # Input validation
│   ├── utils/             # Helper functions
│   └── server.ts          # Server entry point
├── .env.example           # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **CORS**: Configured for frontend domains
- **Helmet**: Security headers
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Zod schemas
- **SQL Injection Prevention**: Prisma parameterized queries

## Performance Optimizations

- **Database Indexes**: On high-query columns
- **Connection Pooling**: Prisma connection management
- **Compression**: gzip response compression
- **Pagination**: Large dataset handling
- **Caching Ready**: Structure supports Redis integration

## Cloud Deployment

### Deploy to Azure:
1. Create Azure SQL Database
2. Update connection string
3. Deploy to Azure App Service

### Deploy to AWS:
1. Create RDS SQL Server instance
2. Update connection string
3. Deploy to Elastic Beanstalk

### Deploy to Vercel (with external DB):
1. Add PostgreSQL from Neon/Supabase
2. Add environment variables
3. Deploy via Git integration

## Future Enhancements

- [ ] Real-time updates (Socket.io)
- [ ] Email notifications (SendGrid)
- [ ] File uploads (S3/Azure Blob)
- [ ] Caching layer (Redis)
- [ ] Search engine (Elasticsearch)
- [ ] GraphQL API
- [ ] API documentation (Swagger)
- [ ] Unit & integration tests
- [ ] Docker containerization
- [ ] CI/CD pipeline

## Support

For issues or questions, contact the Senan Platform team.

## License

MIT License - See LICENSE file for details
