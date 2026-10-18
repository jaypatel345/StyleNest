# StyleNest: Full-Stack Fashion E-Commerce

**Live:** https://style-nest-frontend-rho.vercel.app/ · **Repo:** https://github.com/jaypatel345/StyleNest

## Problem
A small fashion store needs an online shop for customers and a separate back office to manage products and orders.

## What I built
A monorepo with three parts that deploy separately: a React storefront, a React admin dashboard and an Express + MongoDB API.
Customers can browse, add to cart and check out with Cash on Delivery or Stripe, and admins can manage the catalog and order statuses.

## Features
- Product catalog with pagination, search, category and sub-category filters, price sorting, and detail pages with size selection.
- Cart that syncs between local state and the signed-in user's account.
- Checkout with Cash on Delivery or Stripe Checkout, with server-side payment verification that clears the cart.
- Customer order history showing status, payment method and items.
- JWT customer auth with bcrypt-hashed passwords and Redis-backed login rate limiting by IP.
- Admin dashboard: add products with up to 4 Cloudinary image uploads, delete products, and view and update order status.

*Not claimed:* Razorpay endpoints exist on the backend, but the Razorpay option in the storefront is turned off. Products can't be edited yet, and there are no automated tests or CI.

## Stack
- **Frontend:** React 18, Vite 5, React Router, Tailwind CSS, Axios (storefront and admin)
- **Backend:** Node.js, Express 4, JWT, bcrypt, Multer, Stripe
- **Data:** MongoDB with Mongoose (indexed products and orders), Redis via ioredis (product and order list caching with invalidation, login rate limiter), Cloudinary for images
- **Delivery:** Vercel, with a separate config for each of the API, storefront and admin app

## Result
The storefront and admin dashboard are live on Vercel as separate deployments (storefront and https://style-nest-admin-nine.vercel.app both returned HTTP 200 on 2026-10-04).
