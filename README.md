# 🚀 Schedora AI

AI-Powered Scheduling & Team Collaboration SaaS Platform

Schedora AI is a modern full-stack scheduling platform inspired by Calendly-style workflows, built for seamless meeting scheduling, team collaboration, calendar integrations, booking automation, and availability management.

---

## ✨ Features

### 🔐 Authentication
- Google OAuth Login
- Secure user authentication
- Persistent sessions
- Protected routes

### 📅 Smart Scheduling System
- Create custom event types
- Dynamic booking creation
- Upcoming / Past / Cancelled bookings
- Join meeting directly from booking card
- Booking detail management

### ⚡ Calendar Integrations
Supports multiple simultaneous integrations:

- Google Calendar
- Google Meet
- Zoom
- Outlook
- Apple Calendar
- Multiple account connections

Features:
- Connect / Edit / Disconnect integrations
- Multi-provider support
- Calendar synchronization
- Double-booking prevention
- Meeting availability validation

### 🧠 Availability Management
- Working hours customization
- Buffer time settings
- Daily booking limits
- Timezone support
- Persistent availability settings

### 👥 Team Collaboration
- Invite team members by email
- Role-based permissions
- Owner / Admin / Member roles
- Pending / Accepted invitation workflow
- Team management dashboard

### 💳 Billing & Payments
- Subscription plans
- Upgrade / Downgrade plans
- Test payment workflow
- Billing management
- Persistent subscription system

### 📱 Fully Responsive UI
Optimized for:

- Mobile
- Tablet
- Laptop
- Desktop

---

## 🛠 Tech Stack

### Frontend
- React
- TypeScript
- TailwindCSS

### Backend
- Supabase
- PostgreSQL Database
- Supabase Auth
- Supabase Storage
- Supabase Realtime

### Integrations
- Google OAuth
- Google Calendar
- Zoom
- Google Meet
- Outlook
- Apple Calendar

---

## ⚙️ Installation

Clone repository:

```bash
git clone https://github.com/ShardulWalvekar/schedora-ai.git
```

Go into project:

```bash
cd schedora-ai
```

Install dependencies:

```bash
npm install
```

Create environment file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

Run project:

```bash
npm run dev
```

---

## Database Setup

Configure Supabase project.

Required services:

- Authentication
- Database
- Storage
- Realtime

Apply SQL schema migration files.

---

## 📂 Core Modules

- Authentication
- Dashboard
- Event Types
- Bookings
- Calendar Connections
- Availability
- Team Management
- Billing
- Settings

---

## Workflow Overview

### Booking Workflow

Create Booking → Check Availability → Prevent Double Booking → Sync Calendar → Generate Meeting Link → Join Meeting

### Team Workflow

Invite Member → Pending Invite → Accept Invite → Team Member Added → Role Management

### Integration Workflow

Connect Provider → Sync Data → Validate Conflicts → Update Booking Availability

---

## Future Improvements

- AI scheduling recommendations
- Smart timezone optimization
- Analytics dashboard
- Email notifications
- Webhook automation
- Slack integration
- CRM integrations

---

## Author

**Shardul Walvekar**

Computer Engineering Student |  AI Product Management | Business Analytics | Full-Stack Builder

GitHub:
https://github.com/ShardulWalvekar

