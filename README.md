# 🌿 Prandhara ERP — Pharmacy & Healthcare Management System

A full-stack Pharmacy ERP system built with **Node.js + Express** (backend) and **React + Vite** (frontend). It handles POS billing, inventory management, dealer/supplier tracking, order management, pre-order confirmation, earnings analytics, and more — designed for medical stores and healthcare businesses.

---

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [API Overview](#-api-overview)
- [Admin Pages](#-admin-pages)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** (Express 5) | REST API server |
| **MongoDB** + **Mongoose 9** | Database & ODM |
| **JWT** (jsonwebtoken) | Authentication & refresh tokens |
| **Razorpay** | Payment gateway integration |
| **Nodemailer** | Email notifications (orders, password reset) |
| **Helmet, CORS, HPP** | Security middleware |
| **Express Rate Limit** | API rate limiting |
| **Winston + Morgan** | Logging |
| **Multer** | File uploads |
| **PDFKit** | PDF generation (receipts, invoices) |
| **ExcelJS / CSV Parse** | Import/export data |
| **Jest + Supertest** | Testing framework |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI library |
| **Vite 5** | Build tool & dev server |
| **Tailwind CSS 4** | Utility-first styling |
| **Redux Toolkit** (React-Redux 9) | State management |
| **React Router 7** | Client-side routing |
| **Recharts** | Charts & analytics |
| **Axios** (with caching & dedup) | HTTP client |
| **React Hot Toast** | Toast notifications |
| **React Icons** (Feather icons) | Icon library |

---

## ✨ Features

### 🏪 POS Billing
- Quick product search (by name, barcode, category)
- Cart with quantity controls, batch numbers, GST calculation
- Dealer/Supplier selection with inline creation
- Multi-customer support per bill
- Split payments (Cash, UPI, Card, Credit, Company Billing)
- Automatic transaction ID validation (duplicate check)
- Receipt preview with print functionality
- Pre-order flow: POS orders go to pre-order for confirmation

### 📦 Inventory Management
- Full CRUD for products with batch numbers, MRP, selling price, GST
- Stock tracking with low-stock alerts and expiry monitoring
- Category management with product counts
- Inventory logs for every stock change
- Import products via CSV/Excel

### 📋 Order Management
- Order listing with status filters (pending, confirmed, delivered, rejected)
- Pre-order queue with confirmation/rejection workflow
- Inline editing of customer details before confirmation
- Auto-stock restoration on rejection
- Barcode/invoice generation

### 👥 Customer & Dealer Management
- Customer database with unique IDs
- Dealer/Supplier profiles with purchase history & pending dues
- Customer ID lookup during checkout

### 📊 Dashboard & Analytics
- Revenue trends (daily, monthly, yearly)
- Order status breakdown (donut chart)
- Payment method distribution
- Top-selling products
- Category distribution with progress bars
- Weekly order patterns
- Dealer dues tracking
- Inventory alerts overview

### 💰 Earnings Module
- Revenue breakdown by day, month, year
- POS vs Online order comparison
- Payment method analytics
- Export earnings data

### 🔔 Alerts & Monitoring
- Real-time inventory alerts (low stock, expiring)
- Pre-order notifications
- System performance monitoring dashboard
- MongoDB query logging

### 👤 Authentication & Roles
- JWT-based authentication with refresh tokens
- Role-based access: `admin`, `superadmin`
- User profile management
- Password reset via email

### 🌐 Public-Facing Site
- Shop page with product catalog & search
- Shopping cart with localStorage persistence
- Checkout with prescription upload
- Blog with rich-text articles
- Contact form with feedback
- About page with company story

---

## 📁 Project Structure

```
prandhara-erp/
├── backend/                     # Express REST API
│   ├── src/
│   │   ├── config/              # DB connection, env config
│   │   ├── controllers/         # Route handlers
│   │   ├── middleware/          # Auth, validation, upload, sanitize
│   │   ├── models/             # Mongoose schemas
│   │   ├── routes/             # Express routers
│   │   ├── utils/              # Helpers, email, logger
│   │   └── server.js           # App entry point
│   ├── tests/                   # Jest + Supertest tests
│   ├── uploads/                 # File uploads
│   └── package.json
│
├── frontend/                    # React + Vite SPA
│   ├── src/
│   │   ├── api/                 # Axios API client modules
│   │   ├── components/          # Reusable React components
│   │   ├── context/             # ThemeContext (dark mode)
│   │   ├── pages/
│   │   │   ├── admin/           # Admin dashboard pages
│   │   │   └── ...              # Public pages
│   │   ├── store/               # Redux store & slices
│   │   ├── utils/               # Cart sync, monitoring
│   │   ├── App.jsx              # Root component with routes
│   │   ├── main.jsx             # Entry point
│   │   └── index.css            # Global styles + Tailwind
│   ├── dist/                    # Production build output
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── .env.example                 # Environment variable template
├── .gitignore
└── README.md                    # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ (v20+ recommended)
- **MongoDB** v6+ (local or Atlas)
- **npm** or **pnpm** or **yarn**
- A **Gmail App Password** (for sending emails)
- (Optional) **Razorpay** account for payment gateway

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/prandhara-erp.git
cd prandhara-erp

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install

# 4. Go back to project root
cd ..
```

### Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example backend/.env
```

Then edit `backend/.env` with your configuration:

| Variable | Description | Default |
|---|---|---|
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/newshop20123` |
| `JWT_SECRET` | Secret key for JWT signing | (change this!) |
| `JWT_EXPIRES_IN` | JWT token expiry | `7d` |
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | SMTP email address | — |
| `EMAIL_PASS` | SMTP app password | — |
| `CLIENT_URL` | Frontend URL for email links | `http://localhost:5173` |
| `RAZORPAY_KEY_ID` | Razorpay API key (optional) | — |
| `RAZORPAY_KEY_SECRET` | Razorpay secret (optional) | — |

> **Note for Gmail**: You'll need to generate an [App Password](https://myaccount.google.com/apppasswords) if 2FA is enabled.

### Running the App

Start both backend and frontend in separate terminals:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev      # with nodemon (auto-restart)
# or
npm start        # without nodemon
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev      # starts Vite dev server at http://localhost:5173
```

Then open **[http://localhost:5173](http://localhost:5173)** in your browser.

> The frontend dev server proxies `/api` requests to the backend at port 5000 (configured in `vite.config.js`).

---

## 📡 API Overview

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/*` | POST | ❌ | Login, register, forgot/reset password, refresh token |
| `/api/users/*` | GET/PUT | ✅ | User profile management |
| `/api/products/*` | CRUD | ✅ (write) | Product management with stock tracking |
| `/api/categories/*` | CRUD | ✅ (write) | Category management with product counts |
| `/api/orders/*` | CRUD | ✅ | Order lifecycle (POS, online, pre-orders) |
| `/api/dealers/*` | CRUD | ✅ | Dealer/supplier management |
| `/api/customers/*` | CRUD | ✅ | Customer management with ID lookup |
| `/api/blogs/*` | CRUD | ✅ (write) | Blog articles for the public site |
| `/api/feedback/*` | CRUD | ✅ (admin) | Customer feedback & contact form |
| `/api/alerts/*` | GET/PUT | ✅ | System alerts (low stock, pre-orders) |
| `/api/dashboard/*` | GET | ✅ | Aggregated stats & charts data |
| `/api/earnings/*` | GET | ✅ | Revenue breakdown analytics |
| `/api/cart/*` | CRUD | ❌ | Cart operations (synced with localStorage) |
| `/api/payments/*` | POST | ✅ | Razorpay payment integration |
| `/api/monitoring/*` | GET | ✅ | System performance metrics |
| `/api/store-settings/*` | GET/PUT | ✅ | Store configuration |

**Auth required for write operations** on most endpoints (requires `Bearer <token>` header).

---

## 🖥 Admin Pages

| Route | Page | Description |
|---|---|---|
| `/admin` | Dashboard | Analytics, charts, quick actions |
| `/admin/pos` | POS Billing | Point-of-sale billing interface |
| `/admin/pre-orders` | Pre-Orders | Confirm/reject pending POS orders |
| `/admin/products` | Products | Inventory management, CRUD, stock alerts |
| `/admin/orders` | Orders | Order listing, status management |
| `/admin/dealers` | Dealers | Supplier/dealer management with dues |
| `/admin/customers` | Customers | Customer database |
| `/admin/categories` | Categories | Product categories with icon picker |
| `/admin/blogs` | Blogs | Blog article editor |
| `/admin/feedback` | Feedback | Customer messages & inquiries |
| `/admin/alerts` | Alerts | System alerts & notifications |
| `/admin/earnings` | Earnings | Revenue analytics & reports |
| `/admin/monitoring` | Monitoring | System performance dashboard |

---

## 🧪 Testing

```bash
cd backend
npm test
```

Tests use **Jest** with **Supertest** for HTTP integration testing and **MongoDB Memory Server** for an isolated test database.

Test files:
- `backend/tests/transactionId.test.js` — Transaction ID uniqueness
- `backend/tests/phoneValidation.test.js` — Phone number validation

---

## 🌐 Deployment

### Backend (Production)

```bash
cd backend
NODE_ENV=production npm start
```

For production, consider:
- Using **PM2** or a process manager for auto-restart
- Setting up **NGINX** as a reverse proxy
- Using **MongoDB Atlas** for managed database
- Enabling **HTTPS** via Let's Encrypt / Cloudflare

### Frontend (Production Build)

```bash
cd frontend
npm run build    # outputs to frontend/dist/
```

The built files can be served via:
- **NGINX** or Apache as static files
- The Express backend (configured in `server.js` for production)
- **Vercel**, **Netlify**, or **Cloudflare Pages**

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🙏 Acknowledgments

- Built with [Express](https://expressjs.com/), [React](https://react.dev/), [MongoDB](https://www.mongodb.com/), and [Tailwind CSS](https://tailwindcss.com/)
- Icons by [React Icons (Feather)](https://react-icons.github.io/react-icons/)
- Charts by [Recharts](https://recharts.org/)
- Payments by [Razorpay](https://razorpay.com/)
