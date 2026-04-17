# RevoBank API

Backend API untuk aplikasi banking sederhana (milestone RevoU) menggunakan NestJS, Prisma, PostgreSQL (Supabase), JWT auth, Swagger, Jest, dan deploy di Railway.

## Tech Stack

- Framework: NestJS
- ORM: Prisma
- Database: PostgreSQL (Supabase)
- Authentication: JWT (`@nestjs/jwt`)
- API Docs: Swagger (`@nestjs/swagger`)
- Testing: Jest
- Deployment: Railway

## Production URL

- API Base URL: `https://revobank-backend-production.up.railway.app`
- Swagger UI: `https://revobank-backend-production.up.railway.app/api`

## Features

- Auth:
  - `POST /auth/register`
  - `POST /auth/login`
- User (protected):
  - `GET /user/profile`
  - `PATCH /user/profile`
- Accounts (protected):
  - `POST /accounts`
  - `GET /accounts`
  - `GET /accounts/:id`
  - `PATCH /accounts/:id`
  - `DELETE /accounts/:id`
- Transactions (protected):
  - `POST /transactions/deposit`
  - `POST /transactions/withdraw`
  - `POST /transactions/transfer`
  - `GET /transactions`
  - `GET /transactions/:id`

## Security Rules

- Password di-hash dengan `bcrypt`.
- Semua endpoint selain register/login dilindungi JWT Guard.
- User customer hanya bisa mengakses data miliknya sendiri.
- Role admin didukung untuk akses lintas data.

## Database Schema

Model utama:

- `User`
  - `id`, `name`, `email` (unique), `password`, `role`, `createdAt`, `updatedAt`
- `Account`
  - `id`, `accountNumber` (unique), `balance`, `type`, `userId`, `createdAt`, `updatedAt`
- `Transaction`
  - `id`, `amount`, `type`, `fromAccountId`, `toAccountId`, `description`, `createdAt`

## Environment Variables

Buat file `.env` berdasarkan `.env.example`.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?schema=public&sslmode=require"
JWT_SECRET="replace-with-strong-secret"
JWT_EXPIRES_IN="1h"
PORT=3000
```

## Local Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Generate Prisma Client

```bash
npx prisma generate
```

### 3) Apply migration ke database

```bash
npx prisma migrate deploy
```

Untuk development baru (create migration):

```bash
npx prisma migrate dev --name init
```

### 4) Run app

```bash
# development
npm run start:dev

# production-like local
npm run build
npm run start:prod
```

### 5) Buka Swagger

```text
http://localhost:3000/api
```

## Testing

```bash
# run all tests
npm test

# watch mode
npm run test:watch

# coverage
npm run test:cov
```

## Deployment (Railway)

Project ini sudah disiapkan untuk Railway:

- `postinstall` otomatis menjalankan `prisma generate`
- `start:railway` menjalankan `prisma migrate deploy && node dist/main`
- `railway.json` sudah mengatur start command

Langkah deploy:

```bash
railway login
railway init
railway add --service revobank-backend
railway variable set -s revobank-backend "DATABASE_URL=..." "JWT_SECRET=..." "JWT_EXPIRES_IN=1h"
railway up --service revobank-backend
railway domain -s revobank-backend
```

## Useful Commands

```bash
npm run lint
npm run build
npm test
npx prisma studio
```
