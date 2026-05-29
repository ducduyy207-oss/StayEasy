## 🔴 CRITICAL AI BEHAVIOR & CODING STANDARDS
- **Communication Flow**: Answer concisely and go straight to the point. Do NOT write long explanations for obvious things. Analyze the core problem deeply before responding.
- **Strict Focus**: Do not let irrelevant past context pollute the current session. Focus strictly on the core problem. Do not add unrequested features. Only modify exactly what is requested.
- **Code Quality**: Write clean, self-explanatory code (Semantic Naming). Strictly follow the Single Responsibility Principle (SRP) - functions should do one thing well.
- **Performance**: Always choose the most optimal time and space complexity algorithms (O(1), O(log n), O(n)). Optimize memory usage (e.g., prevent memory leaks in JS) and handle edge cases thoroughly.
- **Error Handling**: Integrate robust exception handling (try/catch blocks, error callbacks) without degrading system performance.

---

## Project Overview

StayEasy is a hotel/homestay/resort booking platform built with vanilla HTML, CSS (Bootstrap 5), JavaScript (ES6+), and jQuery.
It uses MockAPI.io for backend data persistence. The project has two main interfaces:
- **Public site** (`index.html`): Customer-facing booking platform
- **Admin panel** (`admin.html`): Management dashboard for rooms, bookings, promotions, and reviews

## Architecture

### Data Layer (`js/api.js`)
Centralized API client with methods for CRUD operations on two MockAPI resources:
- `rooms`: Room inventory (id, name, price, type, guests, image, description, location)
- `bookings`: Booking records (id, roomId, roomName, customerName, customerPhone, checkIn, checkOut, totalPrice, status)

**Key detail**: `createBooking()` uses jQuery AJAX while other methods use native fetch. This inconsistency should be normalized if refactoring.

### Public Site (`index.html`, `js/main.js`)
- **Search & Filter**: Keyword search, room type filter (Standard/Deluxe/Homestay/Resort), city filter
- **Pagination**: 4 rooms per page, separate pagination for each room type
- **Room Display**: Cards show price, rating (simulated), reviews count, location badge
- **Navigation**: Links to detail page pass room ID and optional check-in/check-out dates via query params

### Detail Page (`detail.html`, `js/detail.js`)
- **Room Info**: Displays full details, description, guest count, pricing
- **Booking Form**: Collects customer name, phone, check-in/check-out dates
- **Price Calculation**: Auto-calculates total based on nights × price, applies promo discounts
- **Reviews**: Displays 3 reviews by default with "Load More" button; mixes real reviews (from localStorage) with 3 default fake reviews
- **Promo Codes**: Validates against codes stored in localStorage (default: STAYEASY15, SUMMER2026)

**Date handling**: Uses Flatpickr library for date pickers; dates stored as strings in format YYYY-MM-DD.

### Admin Panel (`admin.html`, `js/admin.js`)
- **Auth Guard**: Checks localStorage for `userRole === 'superadmin'` and `adminEmail === 'admin@gmail.com'` at page load; redirects to index.html if not authenticated
- **Dashboard**: Shows total rooms, pending bookings, revenue (confirmed bookings only)
- **Room Management**: CRUD operations with modal form; 8 items per page; search with accent-insensitive filtering
- **Booking Management**: View all bookings, approve/reject (status: Pending/Confirmed/Cancelled), delete
- **Revenue Tab**: Shows confirmed bookings and total revenue
- **Promotions**: Add/delete promo codes with optional room-specific targeting; stored in localStorage
- **Customer Analytics**: Aggregates unique customers by phone, shows booking count and total spent; membership tiers (Mới/Bạc/VIP Vàng)
- **Review Moderation**: Toggle review visibility (published/hidden); stored in localStorage

**Pagination**: 8 items per page across all tables; separate page state for rooms, bookings, customers.

## Key Implementation Details

### Data Persistence
- **MockAPI**: Rooms and bookings (live API)
- **localStorage**: Promotions (`stayeasy_promos`), reviews (`stayeasy_reviews`), admin session (isLoggedIn, userRole, userName, adminEmail)

### Utilities
- `formatVND()`: Formats numbers as Vietnamese currency (VND)
- `removeAccents()`: Normalizes Vietnamese text for case-insensitive search (removes diacritics)

### UI Patterns
- Bootstrap 5 modals for room editing (admin)
- Bootstrap tabs for admin navigation
- Bootstrap pagination components
- Flatpickr for date selection
- jQuery for DOM manipulation and AJAX

### Validation
- Client-side only; no server-side validation
- Date validation: check-out must be after check-in
- Promo code validation: checks code existence and optional room name match

## Common Development Tasks

### Running the App
1. Open `index.html` in a browser (or use Live Server in VS Code)
2. Admin panel: Navigate to `admin.html` (requires login via index.html first, or manually set localStorage)
3. MockAPI endpoint: Update `API_URL` in `js/api.js` if using a different MockAPI project

### Testing Admin Features
Set localStorage manually in browser console:
```javascript
localStorage.setItem('isLoggedIn', 'true');
localStorage.setItem('userRole', 'superadmin');
localStorage.setItem('adminEmail', 'admin@gmail.com');
localStorage.setItem('userName', 'Admin Name');