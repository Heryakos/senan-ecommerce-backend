# Backend Setup Guide

Complete step-by-step guide to set up the Senan E-Commerce Backend locally and deploy to cloud.

## Prerequisites

- **Node.js**: Version 18 or higher
- **SQL Server 2022**: Local or remote instance
- **npm or yarn**: Package manager
- **Git**: Version control

## Local Development Setup

### 1. Install SQL Server 2022

#### Windows:
1. Download SQL Server 2022 Developer Edition from [Microsoft](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
2. Run installer and choose "Basic" installation
3. Note the connection string provided after installation
4. Install SQL Server Management Studio (SSMS) for database management

#### macOS/Linux (using Docker):
```bash
docker pull mcr.microsoft.com/mssql/server:2022-latest

docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourPassword123!" \
   -p 1433:1433 --name sql-server-2022 \
   -d mcr.microsoft.com/mssql/server:2022-latest
```

### 2. Clone and Install

```bash
# Navigate to project
cd backend

# Install dependencies
npm install

# This installs all packages including Prisma, Express, JWT, bcrypt, etc.
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

**Required Environment Variables:**

```env
# Database - Update with your SQL Server credentials
DATABASE_URL="sqlserver://localhost:1433;database=senan_ecommerce;user=sa;password=YourPassword123;encrypt=true;trustServerCertificate=true"

# Server
PORT=5000
NODE_ENV=development

# JWT - Change this to a secure random string in production
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS - Frontend URLs
FRONTEND_URL=http://localhost:3000
PRODUCTION_URL=https://e-commerce-senan.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to database (creates all tables)
npm run db:push

# Seed database with mock data
npm run db:seed
```

**What gets created:**
- 10 categories (hierarchical structure)
- 50+ products across all categories
- 50 users (Admin, Manager, Seller, Customers)
- 100+ orders with realistic data
- Payment records
- Notifications
- System settings

### 5. Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:5000`

**Test the API:**
```bash
# Health check
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@senan.com","password":"password123"}'
```

## Database Management

### View Database with Prisma Studio

```bash
npm run prisma:studio
```

Opens browser interface at `http://localhost:5555` to view and edit database records.

### Reset Database

```bash
# ⚠️ WARNING: This deletes ALL data
npm run prisma:reset
```

### Create Migration

```bash
npm run prisma:migrate
# Enter migration name when prompted
```

### Switch Database Provider

#### To PostgreSQL:

1. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Update `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/senan_ecommerce"
```

3. Regenerate and migrate:
```bash
npm run prisma:generate
npm run prisma:migrate
```

#### To MySQL:

1. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

2. Update `.env`:
```env
DATABASE_URL="mysql://user:password@localhost:3306/senan_ecommerce"
```

3. Regenerate and migrate:
```bash
npm run prisma:generate
npm run prisma:migrate
```

## Testing the API

### Test Credentials

Use these credentials to test different roles:

```
Admin:    admin@senan.com    / password123
Manager:  manager@senan.com  / password123
Seller:   seller@senan.com   / password123
Customer: customer1@example.com / password123
```

### API Testing Examples

```bash
# 1. Login and get token
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@senan.com","password":"password123"}' | jq -r '.data.token')

# 2. Get all products
curl http://localhost:5000/api/products \
  -H "Authorization: Bearer $TOKEN"

# 3. Create a product
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "This is a test product",
    "price": 99.99,
    "stock": 100,
    "categoryId": "cat-id-here",
    "status": "ACTIVE"
  }'

# 4. Get dashboard stats
curl http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"

# 5. Create an order
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"productId": "prod-id-here", "quantity": 2}
    ],
    "shippingAddress": "123 Main St",
    "shippingCity": "Addis Ababa",
    "shippingCountry": "Ethiopia",
    "paymentMethod": "CHAPA"
  }'
```

## Production Deployment

### Deploy to Azure

#### 1. Create Azure SQL Database

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login

# Create resource group
az group create --name senan-ecommerce --location eastus

# Create SQL Server
az sql server create \
  --name senan-sql-server \
  --resource-group senan-ecommerce \
  --location eastus \
  --admin-user sqladmin \
  --admin-password YourSecurePassword123!

# Create database
az sql db create \
  --resource-group senan-ecommerce \
  --server senan-sql-server \
  --name senan_ecommerce \
  --service-objective S0

# Get connection string
az sql db show-connection-string \
  --client ado.net \
  --server senan-sql-server \
  --name senan_ecommerce
```

#### 2. Deploy to Azure App Service

```bash
# Create App Service plan
az appservice plan create \
  --name senan-backend-plan \
  --resource-group senan-ecommerce \
  --sku B1 \
  --is-linux

# Create web app
az webapp create \
  --resource-group senan-ecommerce \
  --plan senan-backend-plan \
  --name senan-backend \
  --runtime "NODE|18-lts"

# Configure environment variables
az webapp config appsettings set \
  --resource-group senan-ecommerce \
  --name senan-backend \
  --settings \
    DATABASE_URL="your-connection-string" \
    JWT_SECRET="your-jwt-secret" \
    NODE_ENV="production"

# Deploy code
npm run build
az webapp deployment source config-zip \
  --resource-group senan-ecommerce \
  --name senan-backend \
  --src ./dist.zip
```

### Deploy to AWS

#### 1. Create RDS SQL Server

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier senan-db \
  --db-instance-class db.t3.small \
  --engine sqlserver-ex \
  --master-username admin \
  --master-user-password YourPassword123! \
  --allocated-storage 20
```

#### 2. Deploy to Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p node.js-18 senan-backend

# Create environment
eb create senan-backend-env

# Set environment variables
eb setenv \
  DATABASE_URL="your-connection-string" \
  JWT_SECRET="your-jwt-secret" \
  NODE_ENV="production"

# Deploy
npm run build
eb deploy
```

### Deploy to Vercel (with External DB)

Since Vercel is serverless, use an external database like Neon (PostgreSQL):

1. **Create Neon Database:**
   - Go to [neon.tech](https://neon.tech)
   - Create free PostgreSQL database
   - Copy connection string

2. **Update Prisma:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. **Deploy:**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

## Performance Optimization

### Database Indexes

Already included in Prisma schema:
- User email, role, status
- Product slug, status, price, category
- Order number, status, user
- Full-text search on product name/description

### Connection Pooling

Prisma automatically handles connection pooling. For production:

```prisma
datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["connectionPool"]
}
```

### Caching (Redis)

Add Redis for caching:

```bash
npm install redis
```

```typescript
// cache.ts
import { createClient } from 'redis'

const redis = createClient({
  url: process.env.REDIS_URL
})

export const cache = {
  get: async (key: string) => {
    const value = await redis.get(key)
    return value ? JSON.parse(value) : null
  },
  set: async (key: string, value: any, ttl = 3600) => {
    await redis.set(key, JSON.stringify(value), { EX: ttl })
  }
}
```

## Monitoring & Logging

### Add Winston Logger

```bash
npm install winston
```

```typescript
// logger.ts
import winston from 'winston'

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})
```

## Troubleshooting

### Connection Issues

```bash
# Test SQL Server connection
sqlcmd -S localhost -U sa -P YourPassword123!

# Test from Node.js
node -e "require('@prisma/client').PrismaClient().$$connect().then(() => console.log('Connected!')).catch(console.error)"
```

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=5001
```

### Prisma Generation Errors

```bash
# Clear Prisma cache
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma

# Reinstall
npm install
npm run prisma:generate
```

## Support

For issues or questions, contact the development team.
