# E-Commerce Web Application

A student-friendly full-stack online store built with:

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Database: MongoDB / MongoDB Atlas
- Authentication: JWT + bcrypt
- Role-based access: Admin / User
- Product catalog, cart, checkout and order tracking
- Admin product and order management

## 1. Requirements

Install Node.js (LTS) and have a MongoDB Atlas database.

## 2. Setup in VS Code

Open this project folder in VS Code and run:

```bash
npm install
```

Create a file named `.env` in the project root.

Copy the contents of `.env.example` into `.env` and replace:

```env
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secret
```

Example:

```env
PORT=5000
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/ecommerce_db?retryWrites=true&w=majority
JWT_SECRET=my_super_secret_key_2026
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@123
```

## 3. Create the admin account

Run:

```bash
npm run seed:admin
```

You can change ADMIN_EMAIL and ADMIN_PASSWORD in `.env` before running it.

## 4. Start the project

```bash
npm start
```

Open:

http://localhost:5000

For development:

```bash
npm run dev
```

## 5. User flow

1. Register a new account.
2. Login.
3. Browse products.
4. Add products to cart.
5. Open Cart.
6. Checkout with a demo payment method.
7. View orders and tracking status.

## 6. Admin flow

Login with the admin account created by `npm run seed:admin`.

Admin can:

- Add products
- Edit products
- Delete products
- View all orders
- Change order status

## 7. MongoDB Atlas

The application automatically creates these collections when used:

- users
- products
- orders

No manual collection creation is required.

## 8. Render deployment

Use these settings:

Build command:
```bash
npm install
```

Start command:
```bash
npm start
```

Add these environment variables in Render:

- MONGO_URI
- JWT_SECRET
- ADMIN_NAME
- ADMIN_EMAIL
- ADMIN_PASSWORD
- PORT (optional; Render can provide its own PORT)

Do NOT upload your `.env` file to GitHub.

## Demo payment

This project uses a simulated payment step for academic/demo purposes. It does not process real money or store card details.
