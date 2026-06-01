# StyleNest Full Stack E-Commerce Platform

![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5.4.1-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.19.2-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_8.5.3-47A248?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-ioredis_5.10.1-DC382D?logo=redis&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.10-06B6D4?logo=tailwindcss&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-Integrated-635BFF?logo=stripe&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Image_Uploads-3448C5?logo=cloudinary&logoColor=white)

StyleNest is a full-stack fashion e-commerce application with three deployable parts: a customer storefront, an admin dashboard, and an Express API. The platform supports product browsing, category filtering, cart management, customer authentication, checkout with Cash on Delivery or Stripe, admin product management, image uploads, and order status workflows.

## Problem Statement

Small fashion retailers need a practical online storefront that separates customer shopping from back-office operations. StyleNest solves this by combining a responsive shopping experience with an authenticated admin panel for catalog and order management, backed by a MongoDB API with Redis caching for high-read endpoints.

## Key Features

### Customer Storefront

- Responsive React storefront built with Vite and Tailwind CSS.
- Product catalog with pagination, search, category filters, sub-category filters, and price sorting.
- Product detail pages with image gallery, size selection, related products, and cart actions.
- JWT-based customer registration and login.
- Persistent cart synchronization between local React state and the authenticated user record.
- Checkout flow with delivery information, Cash on Delivery, and Stripe Checkout.
- Stripe payment verification route that clears the cart after successful payment.
- Customer order history page with status, payment method, item details, and order tracking refresh.

### Admin Dashboard

- Separate React/Vite admin app running independently from the storefront.
- Admin login using credentials stored in backend environment variables.
- Product creation with multiple image uploads, category/sub-category selection, sizes, pricing, and bestseller flag.
- Product listing with delete action.
- Order management view with customer address, items, amount, payment status, and status update controls.

### Backend API

- Express REST API using modular routes, controllers, middleware, and Mongoose models.
- MongoDB persistence for users, products, carts, and orders.
- Cloudinary integration for uploaded product images.
- Redis-backed caching for paginated product lists and order list queries.
- Redis-backed login rate limiting by client IP.
- JWT middleware for customer routes and admin-protected operations.
- Stripe integration for hosted checkout sessions.
- Razorpay backend endpoints are present, while the storefront Razorpay UI is currently commented out.

## Architecture Overview

```text
Customer Browser
      |
      v
frontend/ React + Vite storefront
      |
      | REST API calls
      v
backend/ Express API
      |        |         |
      |        |         +--> Cloudinary product image storage
      |        +------------> Redis cache + rate limiting
      +---------------------> MongoDB via Mongoose

Admin Browser
      |
      v
admin/ React + Vite dashboard
      |
      +-----> Same Express API with admin JWT protection
```

The repository is organized as a monorepo with independent package manifests for the backend, storefront, and admin panel. Each app can be installed, developed, built, and deployed separately.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Storefront | React 18, Vite 5, React Router DOM, Axios, React Toastify, Tailwind CSS |
| Admin Panel | React 18, Vite 5, React Router DOM, Axios, React Toastify, Tailwind CSS |
| Backend | Node.js, Express 4, ES Modules, CORS, dotenv |
| Database | MongoDB, Mongoose |
| Cache & Rate Limiting | Redis, ioredis, Lua-based fixed-window limiter |
| Authentication | JWT, bcrypt password hashing, admin credential token |
| Payments | Stripe Checkout, Razorpay SDK backend integration |
| Media Storage | Cloudinary, Multer |
| Deployment Config | Vercel configuration for backend, frontend, and admin apps |

## Folder Structure

```text
.
├── admin/                  # Admin dashboard React app
│   ├── src/
│   │   ├── components/     # Admin navbar, sidebar, login
│   │   ├── pages/          # Add product, product list, orders
│   │   └── assets/         # Admin images/icons
│   ├── package.json
│   └── vercel.json
├── backend/                # Express API
│   ├── config/             # MongoDB, Cloudinary, Redis config
│   ├── controllers/        # Cart, order, product, user logic
│   ├── middleware/         # Auth, admin auth, multer, rate limiter
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API route modules
│   ├── package.json
│   ├── server.js
│   └── vercel.json
├── docs/
│   └── cache-strategy-stylenest.md
├── frontend/               # Customer storefront React app
│   ├── src/
│   │   ├── components/     # Storefront UI components
│   │   ├── context/        # ShopContext cart/auth state
│   │   ├── pages/          # Shop, auth, checkout, orders pages
│   │   ├── utils/          # Product fetch helpers
│   │   └── assets/         # Storefront images/icons
│   ├── package.json
│   └── vercel.json
└── .gitignore
```

## Installation

### Prerequisites

- Node.js 18 or newer
- npm
- MongoDB connection string
- Redis connection URL
- Cloudinary account
- Stripe secret key
- Razorpay keys only if enabling the Razorpay backend flow

### Install Dependencies

Run each install from the repository root:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../admin && npm install
```

## Environment Variables

Create environment files for each app. Do not commit real secrets. The repository currently contains local `.env` files; rotate any exposed credentials before using the project in a shared or production environment.

### Backend: `backend/.env`

| Variable | Required | Used For |
| --- | --- | --- |
| `PORT` | No | API port; defaults to `4000` |
| `JWT_SECRET` | Yes | Signing customer and admin JWTs |
| `ADMIN_EMAIL` | Yes | Admin dashboard login credential |
| `ADMIN_PASSWORD` | Yes | Admin dashboard login credential |
| `MONGODB_URI` | Yes | MongoDB connection base URI; backend appends `/e-commerce` |
| `CLOUDINARY_NAME` | Yes | Cloudinary cloud name for product uploads |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_SECRET_KEY` | Yes | Cloudinary API secret |
| `STRIPE_SECRET_KEY` | Yes for Stripe | Stripe Checkout session creation |
| `RAZORPAY_KEY_ID` | Yes for Razorpay API | Razorpay order creation |
| `RAZORPAY_KEY_SECRET` | Yes for Razorpay API | Razorpay order creation and verification |
| `REDIS_URL` | Yes | Redis cache and login rate limiter |
| `PRODUCTS_CACHE_TTL_SECONDS` | No | Product list cache TTL; defaults to `600` |
| `ORDERS_CACHE_TTL_SECONDS` | No | Order list cache TTL; defaults to `120` |
| `CACHE_DEBUG` | No | Enables cache debug logging when set to `true` |
| `AUTH_DEBUG` | No | Enables admin auth debug logging when set to `true` |

### Storefront: `frontend/.env`

| Variable | Required | Used For |
| --- | --- | --- |
| `VITE_BACKEND_URL` | Yes | API base URL used by Axios calls |
| `VITE_RAZORPAY_KEY_ID` | Only if Razorpay UI is enabled | Razorpay browser checkout key |

### Admin: `admin/.env`

| Variable | Required | Used For |
| --- | --- | --- |
| `VITE_BACKEND_URL` | Yes | API base URL used by admin Axios calls |

## Local Development

Start the API:

```bash
cd backend
npm run server
```

Start the storefront:

```bash
cd frontend
npm run dev
```

Start the admin panel:

```bash
cd admin
npm run dev
```

Default local ports:

| App | URL |
| --- | --- |
| Backend API | `http://localhost:4000` |
| Storefront | `http://localhost:5173` |
| Admin Panel | `http://localhost:5174` |

## Build Instructions

Build the storefront:

```bash
cd frontend
npm run build
```

Build the admin panel:

```bash
cd admin
npm run build
```

The backend runs directly with Node.js:

```bash
cd backend
npm start
```

## Deployment

The repository includes Vercel configuration for all three apps.

### Backend

- `backend/vercel.json` routes all requests to `server.js` using `@vercel/node`.
- Configure backend environment variables in the Vercel project settings.
- Deploy from the `backend/` directory or configure the Vercel project root to `backend`.

### Storefront

- `frontend/vercel.json` rewrites all routes to `/` for React Router browser routing.
- Set `VITE_BACKEND_URL` to the deployed backend API URL.
- Deploy from the `frontend/` directory or configure the Vercel project root to `frontend`.

### Admin Panel

- `admin/vercel.json` rewrites all routes to `/` for React Router browser routing.
- Set `VITE_BACKEND_URL` to the deployed backend API URL.
- Deploy from the `admin/` directory or configure the Vercel project root to `admin`.

No Dockerfile or CI/CD workflow is currently present in the repository.

## API Overview

Base URL in local development: `http://localhost:4000`

### Health

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/` | API health response |

### User & Admin Auth

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/user/register` | Public | Register a customer with name, email, and password |
| POST | `/api/user/login` | Public, rate limited | Login customer and return JWT |
| POST | `/api/user/admin` | Public | Login admin and return admin JWT |

Customer JWTs are sent using a `token` header. Admin JWTs are accepted as `Authorization: Bearer <token>` and also support the legacy `token` header.

### Products

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/product/list?page=1&limit=10` | Public | List paginated products with Redis caching |
| POST | `/api/product/single` | Public | Fetch a single product by `productId` |
| POST | `/api/product/add` | Admin | Add product with up to four uploaded images |
| POST | `/api/product/remove` | Admin | Delete product by `id` |

### Cart

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/cart/get` | Customer | Get authenticated user's cart |
| POST | `/api/cart/add` | Customer | Add one item and size to cart |
| POST | `/api/cart/update` | Customer | Update item quantity by product and size |

### Orders

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/order/place` | Customer | Place Cash on Delivery order |
| POST | `/api/order/stripe` | Customer | Create Stripe Checkout session |
| POST | `/api/order/razorpay` | Customer | Create Razorpay order from backend |
| POST | `/api/order/verifyStripe` | Customer | Verify Stripe redirect result |
| POST | `/api/order/verifyRazorpay` | Customer | Verify Razorpay order payment status |
| POST | `/api/order/userorders` | Customer | Return authenticated customer's orders with Redis caching |
| POST | `/api/order/list` | Admin | Return all orders with Redis caching |
| POST | `/api/order/status` | Admin | Update order status |

## Database Information

The backend connects to MongoDB with Mongoose and appends `/e-commerce` to `MONGODB_URI`.

### Collections

- `users`: stores name, unique email, bcrypt-hashed password, and cart data.
- `products`: stores product catalog data, category, sub-category, images, sizes, price, and bestseller flag.
- `orders`: stores user reference, order items, amount, address, status, and payment metadata.

### Indexes

- Products include indexes for name, price, category, sub-category, bestseller, combined category/sub-category, and text search over name/description.
- Orders include indexes for user, status, payment status, and user plus creation date.
- Users enforce unique email addresses.

## Performance Optimizations

- Redis caches paginated product list responses using keys like `stylenest:products:page:<page>:limit:<limit>`.
- Product list cache is invalidated after product creation or deletion.
- Redis caches admin order lists and user order history with configurable TTL.
- Order caches are invalidated when orders are placed, verified, deleted after failed Stripe payment, or updated by admin.
- MongoDB indexes support common product and order query patterns.
- Product catalog requests use pagination through `page` and `limit` query parameters.

## Security Features

- Customer passwords are hashed with bcrypt before storage.
- Customer and admin flows use JWT-based authorization.
- Admin-only product and order routes are protected by `adminAuth` middleware.
- Customer cart and order routes are protected by `authUser` middleware.
- Login attempts are rate limited by IP address with Redis.
- Uploaded product images are handled through Multer and stored in Cloudinary instead of the application server.
- Sensitive runtime configuration is loaded through environment variables.

## Screenshots

Add project screenshots to showcase the implemented interfaces:

- Storefront home page
- Product collection and filters
- Product detail page
- Cart and checkout flow
- Customer orders page
- Admin product upload page
- Admin order management page

## Future Improvements

- Add root-level workspace scripts to install, run, lint, and build all apps from one command.
- Add automated tests for controllers, middleware, and checkout flows.
- Add CI workflow for linting and build verification.
- Add Docker or compose configuration for local MongoDB and Redis development.
- Complete the Razorpay storefront flow or remove unused Razorpay UI assets.
- Align order controller fields with the current nested payment schema.
- Add `.env.example` files for each app.
- Add product update support and Cloudinary public ID cleanup on deletion.

## License

The backend package declares the ISC license. No root `LICENSE` file is currently included.

## Author

Jay Patel
