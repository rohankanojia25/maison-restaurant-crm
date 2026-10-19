# MAISON — Restaurant CRM & Operations Platform

> A modern, multi-tenant restaurant CRM and operations platform designed for hospitality venues, with first-class support for Indian dining operations, role-based terminals, recipe-linked inventory, and automated guest retention.

---

## 🌟 Overview

**MAISON** bridges front-of-house hospitality with back-of-house kitchen and inventory workflows. Built with a clean 3-tier architecture, it provides dedicated, distraction-free interfaces for every restaurant staff role—from host stands and mobile waiter order pads to kitchen display systems (KDS) and owner financial auditing.

### Key Pillars
- **Role-Based Workspaces:** Dedicated terminals for Hosts, Waiters (touch order pad), Kitchen Chefs (KDS), and Cashiers/Managers.
- **India-First Compliance & Payments:** Native 5% GST (2.5% CGST + 2.5% SGST), FSSAI license tracking, GSTIN validation, dynamic UPI intent QR generation, and 58mm/80mm thermal receipt printing.
- **Living Inventory & Auto-86:** Dish recipes automatically deplete raw ingredients on order placement; dishes auto-disable across menus when critical stock hits zero.
- **Guest CRM & Automated Retention:** Tracks diner history, spend, birthdays, and anniversaries with 1-tap WhatsApp engagement and feedback collection.
- **AI Menu Ingestion:** Upload physical menu images or PDFs to auto-extract dishes, prices, categories, and dietary flags.

---

## 🚀 Terminal & Module Breakdown

### 1. 🛎️ Host Stand & Live Floor Management
- Interactive table grid filtered by dining zones (Main Hall, Courtyard, Bar, Private Dining).
- Real-time table states: `Available`, `Seated`, `Billing`, `Cleaning`.
- Reservation scheduling with conflict detection, shift filters (Lunch vs. Dinner), and walk-in quick seating.
- Diner milestone capture (Birthday, Anniversary, and special requests) at the point of booking.

### 2. 📱 Waiter Order Pad (Mobile & Tablet)
- Fast, touch-first catalog with large category chips and quick increment counters.
- Visual dietary tags: Green dot for Vegetarian, Red triangle for Non-Vegetarian.
- Item kitchen notes (e.g., "Less spicy", "No onion/garlic", "Serve starters first").
- 1-tap "Send KOT" dispatch that instantly pushes tickets to the kitchen display.

### 3. 🍳 Kitchen Display System (KDS)
- High-contrast, heat-resilient ticket queue organized by live elapsed timers (Green <10m, Amber 10-20m, Red >20m).
- Per-item interactive strikethrough as cooking progresses.
- "Mark Ready for Pickup" alert dispatched to floor staff upon dish completion.

### 4. 🧾 Billing, Settlement & Thermal Printing
- GST-compliant invoice calculation: 5% standard restaurant GST with optional voluntary service charge.
- Dynamic on-bill UPI QR code (`upi://pay?pa=...&am=...`) for instant table-side payment via GPay, PhonePe, or Paytm.
- Dual thermal printer layouts (58mm compact and 80mm standard POS) cleanly formatted for native `window.print()`.

### 5. 📦 Recipe Inventory & Cost Analysis (COGS)
- Raw ingredients inventory with unit metrics (kg, g, L, ml, pcs), unit cost in ₹, and low-stock reorder thresholds.
- Recipe Bill-of-Materials (BOM) mapping raw ingredients to menu catalog items.
- Live cost-of-goods-sold (COGS) tracking and daily/monthly consumption analytics.

### 6. 📊 Daily Z-Report & Audit Ledger
- Real-time financial reconciliation based on dynamically settled checks.
- Audit breakdown by tender: UPI Instant Pay, Cards (RuPay, Visa, Mastercard), and Cash in Register.
- 1-click historical receipt reprint directly from the settled shift ledger.

### 7. ✨ AI Menu Digitizer
- Dropzone for restaurant physical menu photos (PNG, JPG) or PDF files.
- Automated parsing of dish names, category groupings, prices in ₹, and Veg/Non-Veg indicators.
- Interactive staging review table allowing owners to edit, select, and bulk-import into the active catalog.

---

## 🛠️ Tech Stack

- **Framework:** [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **UI & Styling:** [Tailwind CSS](https://tailwindcss.com/) with custom luxury warm-ivory tokens
- **Components & Icons:** [shadcn/ui](https://ui.shadcn.com/), [Lucide React](https://lucide.dev/)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) with persistent local storage
- **Data & Queries:** [TanStack Query](https://tanstack.com/query) with repository pattern
- **Charts & Metrics:** [Recharts](https://recharts.org/)
- **Date Utilities:** [date-fns](https://date-fns.org/)

---

## 📁 Repository Structure

```text
├── src/
│   ├── components/         # Shared UI, thermal receipts, modals, QR generators
│   │   ├── DietaryMark.tsx
│   │   ├── ThermalReceipt.tsx
│   │   └── UpiQrCode.tsx
│   ├── pages/              # Main route terminals & views
│   │   ├── HostStandPage.tsx
│   │   ├── WaiterPadPage.tsx
│   │   ├── KitchenKDSPage.tsx
│   │   ├── GuestsCrmPage.tsx
│   │   ├── MenuCatalogPage.tsx
│   │   ├── InventoryPage.tsx
│   │   └── DailyReportsPage.tsx
│   ├── store/              # Centralized Zustand store & state reducers
│   │   └── useAppStore.ts
│   ├── utils/              # Currency formatting (₹ INR), tax math, and date helpers
│   │   ├── currency.ts
│   │   ├── date.ts
│   │   └── tax.ts
│   ├── types/              # Domain models (Tables, Orders, KOTs, Inventory, CRM)
│   │   └── index.ts
│   ├── data/               # Seed data and mock adapters
│   │   └── seedData.ts
│   ├── App.tsx             # Root layout and 3-tier navigation shell
│   └── main.tsx
├── public/                 # Static assets and icons
├── package.json
└── README.md
```

---

## ⚡ Getting Started

### Prerequisites
- Node.js (v18.0 or higher)
- npm, pnpm, or bun

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/maison-restaurant-crm.git
   cd maison-restaurant-crm
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start local development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:5173` to test floor operations.

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
# Application
VITE_APP_NAME="MAISON"
VITE_DEFAULT_CURRENCY="INR"
VITE_DEFAULT_TIMEZONE="Asia/Kolkata"

# Backend & Database (when connecting Supabase)
VITE_DATA_ADAPTER=mock # 'mock' | 'supabase'
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
