import os
import sys
from fpdf import FPDF

class SchedoraDocPDF(FPDF):
    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_margins(20, 20, 20)
        self.set_auto_page_break(auto=True, margin=20)
        # Custom Colors
        self.c_primary = (109, 92, 231)     # Indigo/Purple (#6d5ce7)
        self.c_secondary = (10, 10, 15)       # Charcoal/Black (#0a0a0f)
        self.c_text = (15, 23, 42)           # Slate (#0f172a)
        self.c_muted = (100, 116, 139)       # Cool Gray (#64748b)
        self.c_border = (226, 232, 240)      # Light gray border (#e2e8f0)
        self.c_bg_light = (248, 250, 252)    # Slate Light BG (#f8fafc)

    def header(self):
        if self.page_no() > 1:
            self.set_font("helvetica", "I", 8)
            self.set_text_color(*self.c_muted)
            self.cell(0, 8, "SCHEDORA - Technical Documentation and Product Bible", align="R", new_x="LMARGIN", new_y="NEXT")
            self.ln(2)
            # Draw header line
            self.set_draw_color(*self.c_border)
            self.set_line_width(0.2)
            self.line(20, 26, 190, 26)
            self.ln(4)

    def footer(self):
        if self.page_no() > 1:
            self.set_y(-15)
            self.set_font("helvetica", "I", 8)
            self.set_text_color(*self.c_muted)
            self.cell(0, 10, "CONFIDENTIAL - FOR INTERNAL USE ONLY", align="L")
            self.set_x(20)
            self.cell(0, 10, f"Page {self.page_no()}", align="R")

    # Cover Page
    def draw_cover_page(self):
        self.add_page()
        # Top banner background (Gradient simulation using small rects)
        for i in range(120):
            # Gradient transition from purple to deep indigo
            r = int(109 - (i * 0.4))
            g = int(92 - (i * 0.4))
            b = int(231 - (i * 0.8))
            self.set_fill_color(r, g, b)
            self.rect(0, i, 210, 1, "F")
        
        self.set_y(40)
        self.set_font("helvetica", "B", 36)
        self.set_text_color(255, 255, 255)
        self.cell(0, 15, "SCHEDORA", align="C", new_x="LMARGIN", new_y="NEXT")
        
        self.set_font("helvetica", "B", 14)
        self.set_text_color(230, 230, 250)
        self.cell(0, 10, "SaaS Appointment Scheduling and Calendar Management Platform", align="C", new_x="LMARGIN", new_y="NEXT")
        
        # Space below banner
        self.set_y(135)
        self.set_font("helvetica", "B", 20)
        self.set_text_color(*self.c_secondary)
        self.cell(0, 12, "Complete Project Guidebook and Technical Bible", align="C", new_x="LMARGIN", new_y="NEXT")
        
        self.set_font("helvetica", "", 12)
        self.set_text_color(*self.c_muted)
        self.cell(0, 8, "Product Roadmaps | Database Schemas | API Workflows | System Architectures", align="C", new_x="LMARGIN", new_y="NEXT")
        
        # Subtle horizontal divider
        self.ln(10)
        self.set_draw_color(*self.c_primary)
        self.set_line_width(1)
        self.line(60, self.get_y(), 150, self.get_y())
        self.ln(15)

        # Meta information
        self.set_fill_color(*self.c_bg_light)
        self.rect(30, self.get_y(), 150, 40, "F")
        self.set_y(self.get_y() + 5)
        
        meta_items = [
            ("Author:", "Technical Product Manager and Architect Team"),
            ("Target Audience:", "Product Demos, Portfolio, Technical Reviewers"),
            ("Document Version:", "1.0.0 (Production Grade)"),
            ("Release Date:", "May 2026")
        ]
        for label, val in meta_items:
            self.set_x(35)
            self.set_font("helvetica", "B", 9)
            self.cell(35, 6, label)
            self.set_font("helvetica", "", 9)
            self.cell(0, 6, val, new_x="LMARGIN", new_y="NEXT")

    # Heading level 1
    def add_h1(self, text):
        self.ln(6)
        self.set_font("helvetica", "B", 16)
        self.set_text_color(*self.c_primary)
        
        # Purple Left border accent
        y_pos = self.get_y()
        self.set_fill_color(*self.c_primary)
        self.rect(20, y_pos + 1, 3, 6, "F")
        
        self.set_x(25)
        self.cell(0, 8, text, new_x="LMARGIN", new_y="NEXT")
        
        # Bottom divider rule
        self.ln(2)
        self.set_draw_color(*self.c_border)
        self.set_line_width(0.5)
        self.line(20, self.get_y(), 190, self.get_y())
        self.ln(4)

    # Heading level 2
    def add_h2(self, text):
        self.ln(4)
        self.set_font("helvetica", "B", 12)
        self.set_text_color(*self.c_secondary)
        self.cell(0, 6, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    # Standard body paragraph
    def add_p(self, text):
        self.set_font("helvetica", "", 10)
        self.set_text_color(*self.c_text)
        self.multi_cell(0, 5.5, text)
        self.ln(3)

    # Bullet list item
    def add_bullet(self, bold_text, normal_text=""):
        self.set_font("helvetica", "", 10)
        self.set_text_color(*self.c_text)
        # Render a small clean bullet dot
        y_pos = self.get_y()
        self.set_fill_color(*self.c_primary)
        self.ellipse(23, y_pos + 2, 2, 2, "F")
        
        self.set_x(28)
        if normal_text:
            self.set_font("helvetica", "B", 10)
            self.write(5.5, bold_text + " ")
            self.set_font("helvetica", "", 10)
            self.write(5.5, normal_text)
            self.ln(5.5)
        else:
            self.multi_cell(0, 5.5, bold_text)
            self.ln(2)

    # Code block
    def add_code(self, title, code_text):
        self.set_font("helvetica", "B", 9)
        self.set_text_color(*self.c_muted)
        self.cell(0, 5, title, new_x="LMARGIN", new_y="NEXT")
        
        self.set_fill_color(*self.c_bg_light)
        self.set_draw_color(*self.c_border)
        self.set_font("courier", "", 8.5)
        self.set_text_color(51, 65, 85) # darker cool slate
        
        # Calculate lines for height estimation
        lines = code_text.strip().split("\n")
        height = len(lines) * 4.5 + 4
        
        # Draw background rectangle
        x_start = self.get_x()
        y_start = self.get_y()
        self.rect(x_start, y_start, 170, height, "DF")
        
        self.set_y(y_start + 2)
        for line in lines:
            self.set_x(x_start + 4)
            self.cell(0, 4.5, line, new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    # Callout card
    def add_callout(self, text, style="info"):
        self.ln(2)
        self.set_fill_color(*self.c_bg_light)
        self.set_draw_color(*self.c_primary)
        self.set_line_width(1)
        
        # Print left colored vertical bar
        y_start = self.get_y()
        
        # Write text with small padding
        self.set_x(25)
        self.set_font("helvetica", "I", 9.5)
        self.set_text_color(*self.c_text)
        self.multi_cell(160, 5, text)
        y_end = self.get_y()
        
        # Draw left border line
        self.line(22, y_start, 22, y_end)
        self.ln(3)

    # Render a stylized comparison table
    def add_table(self, headers, col_widths, rows):
        self.ln(2)
        # Header Row
        self.set_font("helvetica", "B", 9.5)
        self.set_text_color(255, 255, 255)
        self.set_fill_color(*self.c_primary)
        self.set_draw_color(*self.c_border)
        
        start_x = self.get_x()
        for header, width in zip(headers, col_widths):
            self.cell(width, 8, header, border=1, align="C", fill=True)
        self.ln(8)
        
        # Data Rows
        self.set_font("helvetica", "", 9)
        self.set_text_color(*self.c_text)
        
        alternate = False
        for row in rows:
            if alternate:
                self.set_fill_color(*self.c_bg_light)
            else:
                self.set_fill_color(255, 255, 255)
            
            # Print cells, handling multiline rows is simplified here
            max_lines = 1
            for col_idx, text in enumerate(row):
                # Count roughly how many lines this column text will occupy
                width = col_widths[col_idx]
                lines_needed = max(1, int(self.get_string_width(str(text)) / (width - 2)) + 1)
                if lines_needed > max_lines:
                    max_lines = lines_needed
            
            row_height = max_lines * 4.5
            current_y = self.get_y()
            
            x_pos = start_x
            for col_idx, text in enumerate(row):
                self.set_xy(x_pos, current_y)
                # Draw border rectangle manually
                self.rect(x_pos, current_y, col_widths[col_idx], row_height, "DF" if alternate else "D")
                # Write inside the box
                self.set_y(current_y + 1)
                self.set_x(x_pos + 1)
                self.multi_cell(col_widths[col_idx] - 2, 4, str(text), border=0, align="L")
                x_pos += col_widths[col_idx]
            
            self.set_y(current_y + row_height)
            alternate = not alternate
        self.ln(4)


def build_schedora_bible():
    pdf = SchedoraDocPDF()
    pdf.draw_cover_page()

    # ================= PAGE 2: TABLE OF CONTENTS =================
    pdf.add_page()
    pdf.add_h1("Table of Contents")
    pdf.ln(5)
    
    sections = [
        ("1. Project Overview and Core Vision", 3),
        ("2. Problem Statement and Solutions", 3),
        ("3. Product Idea and Concept Evolution", 4),
        ("4. Feature Breakdown and Details", 4),
        ("5. Step-by-Step System Workflows", 5),
        ("6. Technical Architecture and Layers", 6),
        ("7. Technology Stack Selection", 7),
        ("8. Database Design and Relational Schema", 8),
        ("9. UI/UX Design System and Theme Engine", 10),
        ("10. Implementation Guide and Code Architecture", 10),
        ("11. Business Model and Subscription Plans", 12),
        ("12. Security System and Scalability Roadmap", 12),
        ("13. Future Roadmap and AI Integrations", 13),
        ("14. Competitive Analysis", 14),
        ("15. Stakeholder Product Demo Script", 14),
        ("16. Structured Elevator Pitches", 15),
        ("17. Interview Q&A Section", 16),
        ("18. Technical Challenges and Solutions", 17),
        ("19. Portfolio and Resume Summaries", 18),
        ("20. Conclusion and Future Outlook", 19)
    ]
    
    for title, page in sections:
        pdf.set_font("helvetica", "B", 10)
        pdf.set_text_color(*pdf.c_text)
        pdf.cell(140, 7, title)
        # Dot leaders
        pdf.set_font("helvetica", "", 10)
        pdf.set_text_color(*pdf.c_muted)
        dots_count = 25
        pdf.cell(15, 7, "." * dots_count, align="R")
        pdf.set_font("helvetica", "B", 10)
        pdf.set_text_color(*pdf.c_primary)
        pdf.cell(15, 7, f"Page {page}", align="R", new_x="LMARGIN", new_y="NEXT")

    # ================= SECTION 1 & 2 =================
    pdf.add_page()
    pdf.add_h1("1. Project Overview and Core Vision")
    pdf.add_p(
        "Schedora is an enterprise-ready, premium SaaS appointment scheduling and calendar management platform "
        "engineered to eliminate the inefficiencies of modern business coordination. Drawing inspiration from "
        "leading products like Calendly, Linear, and Stripe, Schedora offers a highly optimized, dual-theme interface "
        "that allows professionals, remote teams, and agency owners to manage availability, automate appointment bookings, "
        "synchronize multiple external calendars, collect payments for scheduled slots, and gather detailed engagement analytics."
    )
    pdf.add_h2("Vision and Mission")
    pdf.add_p(
        "The vision of Schedora is to build a unified layer for human availability. Our mission is to return time to "
        "professionals by transforming scheduling from an active cognitive chore of email back-and-forth into a passive, "
        "frictionless, background utility. We achieve this by combining robust multi-calendar conflict checks, "
        "declarative availability rules, and secure billing logic within an intuitive dashboard experience."
    )
    pdf.add_h2("Product Uniqueness")
    pdf.add_bullet(
        "Modern Visual Design System:",
        "Features a highly refined glassmorphic dashboard optimized for both light and dark aesthetics, adhering to strict WCAG contrast ratios."
    )
    pdf.add_bullet(
        "Secure Stripe Elements Integration:",
        "Direct embedded checkouts utilizing Stripe's official UI primitives, allowing seamless monetization of paid consultation hours directly on event pages."
    )
    pdf.add_bullet(
        "Multi-Tenant Tenant Isolation:",
        "Configured using PostgreSQL Row Level Security (RLS) policies inside Supabase to enforce data boundaries."
    )

    pdf.add_h1("2. Problem Statement and Solutions")
    pdf.add_p(
        "Traditional scheduling relies on manual email correspondence, exposing businesses to timezone conversion errors, "
        "double bookings, and disjointed team calendars. Schedora directly addresses these organizational pain points:"
    )
    
    problem_solutions = [
        ("Manual Scheduling Loop:", "Studies show that booking a single meeting manually requires an average of 4.8 emails. Schedora reduces this cost to a single link share, resolving scheduling conflicts automatically."),
        ("Double Bookings and Fragments:", "Professionals work across multiple personal and work calendars. Schedora aggregates integrated calendar accounts, scanning them in real time for blockades before presenting open availability."),
        ("Timezone Confusion:", "Meetings spanning multiple continents invite errors. Schedora automatically captures the visitor's local system timezone, cross-references it with the host's operating settings, and converts all intervals correctly."),
        ("Paid Consultations Overheads:", "Setting up invoices before booking consultation calls leads to dropoffs. Schedora embeds Stripe Elements directly into the checkout form, verifying payment details synchronously prior to booking confirmation.")
    ]
    for p_title, p_desc in problem_solutions:
        pdf.add_bullet(p_title, p_desc)

    # ================= SECTION 3 & 4 =================
    pdf.add_page()
    pdf.add_h1("3. Product Idea and Concept Evolution")
    pdf.add_p(
        "The Schedora concept originated from analyzing the friction in freelance and agency consultation client-onboarding pipelines. "
        "Existing solutions either redirected users to external landing pages that disrupted branding, or lacked direct, native payment "
        "integrations that validated calendar availability prior to capture. Schedora was designed from the ground up as a developer-friendly "
        "scheduling engine and premium dashboard."
    )
    pdf.add_p(
        "The design system evolved from a simple calendar slot generator into a multi-tenant SaaS workspace. "
        "During this evolution, visual responsiveness was identified as a core metric for user conversion. "
        "Consequently, we integrated a global dark-mode/light-mode theme framework powered by Tailwind v4 CSS variables "
        "and custom transitions, allowing the dashboard to automatically scale from personal use to enterprise environments."
    )
    
    pdf.add_h1("4. Feature Breakdown and Details")
    pdf.add_p(
        "Schedora breaks down into the following core product modules, each engineered with custom database schemas "
        "and user workflows:"
    )
    
    features = [
        ("Dashboard and Control Panel", "The user's central control cockpit. Exposes a visual overview of scheduling metrics, current booking tallies, active event templates, and quick actions to copy booking links or add custom availability."),
        ("Event Types Engine", "Enables declarative scheduling templates. Users define duration, meeting platform (Google Meet, Custom link), visual colors, buffers, dynamic slugs, and whether slots are free or paid."),
        ("Bookings Tracker", "Renders lists of upcoming, past, and cancelled appointments. Attendees can view specific appointment details, access meeting links, and process self-service cancellations according to host rules."),
        ("Dynamic Availability Management", "Granular day-of-week settings mapping available business hours. Supports buffer times (e.g., 10-minute breaks before/after meetings) and daily booking limits to protect the host's calendar."),
        ("Team Workspace and Collaboration", "Allows organization managers to create team workspaces, invite members via secure cryptographic tokens, and distribute admin or member roles for team-based scheduling."),
        ("Embedded Stripe Billing", "Supports premium billing plans (Pro/Enterprise) using Stripe's official SDK. Integrates custom sandbox checks and live payment intents directly into the app checkout modals."),
        ("Dynamic Theme Engine", "A top-right visual header switch changing the entire dashboard from deep dark space purple to linear light white. Features clean, smooth page transitions and theme-aware SVG charts.")
    ]
    for f_title, f_desc in features:
        pdf.add_bullet(f_title, f_desc)

    # ================= PAGE 5: WORKFLOWS =================
    pdf.add_page()
    pdf.add_h1("5. Step-by-Step System Workflows")
    pdf.add_p(
        "To understand the core coordination engine of Schedora, we map the step-by-step logic of the four primary workflows "
        "powering the SaaS application."
    )
    
    pdf.add_h2("A. The Booking Workflow")
    booking_steps = [
        "1. Host shares booking link (e.g., /book/username/30-min-consult).",
        "2. Visitor opens the page; client requests host event configuration and availability settings from Database.",
        "3. Availability Engine reads integrated Google/Outlook calendars for real-time conflict blocks.",
        "4. Visitor selects an open date and time slot, and fills in attendee details (Name, Email, Notes).",
        "5. (Optional) If it is a paid event, the Stripe Elements modal opens and processes card authorization synchronously.",
        "6. Server checks slot availability again (concurrency check) and writes booking record to database.",
        "7. Integration Engine creates an external event on the host's connected calendar and generates a Google Meet link.",
        "8. Dynamic email/in-app notifications are dispatched to both the host and visitor with calendar attachments."
    ]
    for step in booking_steps:
        pdf.add_bullet(step)

    pdf.add_h2("B. Stripe Subscription and Billing Workflow")
    billing_steps = [
        "1. User accesses the Billing Tab in Settings and selects the Pro or Enterprise Plan.",
        "2. The Schedora client initiates a request to POST /api/billing/create-subscription.",
        "3. Express backend contacts Stripe, creates/retrieves Stripe Customer, and builds a Subscription with payment intent.",
        "4. Client receives the client_secret and mounts Stripe Card Elements inside the secure modal.",
        "5. Stripe SDK securely transmits card data, performs 3D-Secure check, and completes payment.",
        "6. Stripe Webhook listener processes customer.subscription.created and updates subscription status in Supabase database.",
        "7. PlanEnforcer component refreshes UI to unlock premium tier features (unlimited event types, team invites)."
    ]
    for step in billing_steps:
        pdf.add_bullet(step)

    pdf.add_h2("C. Calendar Authorization and Sync Workflow")
    calendar_steps = [
        "1. User clicks 'Connect Calendar' in integrations dashboard.",
        "2. Client redirects user to Google/Microsoft OAuth page requesting read/write offline scopes.",
        "3. User approves request; provider returns authorization code to Schedora server redirect URI.",
        "4. Schedora Server exchanges authorization code for access_token and refresh_token, saving it to integrations table.",
        "5. Background synchronization cron task polls events periodically, translating them into calendar_events records."
    ]
    for step in calendar_steps:
        pdf.add_bullet(step)

    # ================= PAGE 6: ARCHITECTURE =================
    pdf.add_page()
    pdf.add_h1("6. Technical Architecture and Layers")
    pdf.add_p(
        "Schedora is architected as a modern, split-layer Single Page Application (SPA) communicating with a "
        "secure server and database backend. Multi-tenancy isolation is enforced at the database level."
    )
    
    # Text-based architecture diagram
    arch_diagram = (
        "+-------------------------------------------------------------------------+\n"
        "|                             CLIENT LAYER                                |\n"
        "|   [Vite + React 19] -- [Tailwind v4 Styling] -- [TanStack Route Engine] |\n"
        "|   Reads Theme Preferences | Renders Interactive Dashboard Elements      |\n"
        "+------------------------------------+------------------------------------+ \n"
        "                                     | HTTPS / REST APIs\n"
        "                                     v\n"
        "+-------------------------------------------------------------------------+\n"
        "|                              SERVER LAYER                               |\n"
        "|   [Node.js + Express + TypeScript]                                      |\n"
        "|   Handles Auth Verification | Contacts Stripe SDK | Formulates Cal Links |\n"
        "+-----------------+----------------------------------+--------------------+\n"
        "                  |                                  | Stripe Webhooks\n"
        "                  v Supabase JS API                  v\n"
        "+-----------------+------------------+   +-----------+--------------------+\n"
        "|            DATABASE LAYER          |   |          EXTERNAL APIs         |\n"
        "|   [Supabase - PostgreSQL]          |   |   [Stripe Elements Engine]     |\n"
        "|   Row Level Security Policies      |   |   [Google/Outlook OAuth Sync]  |\n"
        "+------------------------------------+   +--------------------------------+"
    )
    pdf.add_code("Schedora High-Level System Architecture", arch_diagram)
    
    pdf.add_h2("Architecture Details")
    pdf.add_bullet(
        "Frontend Client Layer:",
        "Constructed using React 19, Vite, and TanStack Router. State is shared via context and local hooks. "
        "Tailwind v4 is used for style sheets, mapping color variables directly to system state classes."
    )
    pdf.add_bullet(
        "Backend Server Layer:",
        "An Express.js application written in TypeScript (run via tsx). It exposes API endpoints for Stripe Elements creation, "
        "webhook event verification, and calendar authorization flows."
    )
    pdf.add_bullet(
        "Database and Security Layer:",
        "Supabase PostgreSQL holds relational tables. All requests run through PostgreSQL RLS policies to prevent Cross-Tenant data access."
    )

    # ================= PAGE 7: TECH STACK =================
    pdf.add_page()
    pdf.add_h1("7. Technology Stack Selection")
    pdf.add_p(
        "The technologies chosen for Schedora represent modern web development standards. We selected "
        "each framework based on scalability, developer velocity, and performance metrics."
    )
    
    tech_headers = ["Technology", "Component / Layer", "Selection Rationale"]
    tech_widths = [35, 45, 90]
    tech_rows = [
        ["React 19 & Vite", "Frontend Application", "Provides fast HMR, declarative component updates, and clean hooks usage for managing interactive visual dashboards."],
        ["TailwindCSS v4", "Visual Interface / CSS", "Utilizes a compile-time CSS-only theme engine. CSS variables allow dynamic theme toggles with zero runtime layout calculations."],
        ["TanStack Router", "Routing / Navigation", "Typesafe route structure ensuring compile-time safety. Smooth transitions between child route slots without layout flashing."],
        ["Express.js + tsx", "Backend API Server", "Lightweight, highly performant Node.js runtime. Provides middleware routing for Stripe SDK and Google API synchronization."],
        ["Supabase / Postgres", "Database / Storage", "PostgreSQL database with built-in RLS policies. Trigger hooks automate profile and subscription initialization during Auth signup."],
        ["Stripe Elements", "Payment Gateway Layer", "Allows PCI-compliant embedded checkout forms inside Schedora dialog boxes, reducing payment conversion drops."],
        ["Lucide React", "UI Component Icons", "Consistent vector icons with built-in SVG path scaling, simplifying clean rotate/scale micro-animations on theme buttons."]
    ]
    pdf.add_table(tech_headers, tech_widths, tech_rows)

    # ================= PAGE 8 & 9: DATABASE DESIGN =================
    pdf.add_page()
    pdf.add_h1("8. Database Design and Relational Schema")
    pdf.add_p(
        "Schedora uses a fully relational database schema designed for efficient querying, cascading deletion, "
        "and strict data security through Row Level Security (RLS) policies. Below is the technical data dictionary."
    )
    
    db_headers = ["Column", "Data Type", "Constraints", "Description"]
    db_widths = [45, 35, 40, 50]
    
    pdf.add_h2("Table: public.profiles")
    profile_rows = [
        ["id", "UUID", "PRIMARY KEY, REFERENCES auth.users", "Unique user authentication identifier"],
        ["username", "TEXT", "UNIQUE", "User custom handle for booking links"],
        ["email", "TEXT", "NOT NULL", "Primary user email address"],
        ["timezone", "TEXT", "DEFAULT 'UTC'", "Operating timezone for booking calculations"],
        ["created_at", "TIMESTAMPTZ", "DEFAULT now()", "Timestamp when profile was created"]
    ]
    pdf.add_table(db_headers, db_widths, profile_rows)

    pdf.add_h2("Table: public.event_types")
    event_rows = [
        ["id", "UUID", "PRIMARY KEY", "Unique template identifier"],
        ["user_id", "UUID", "REFERENCES public.profiles(id)", "Owner profile relationship key"],
        ["title", "TEXT", "NOT NULL", "Name of the booking template"],
        ["duration", "INTEGER", "DEFAULT 30", "Meeting slot length in minutes"],
        ["slug", "TEXT", "NOT NULL", "URL route key (scoped per user)"],
        ["is_active", "BOOLEAN", "DEFAULT true", "Toggle to enable or disable public booking"],
        ["buffer_time", "INTEGER", "DEFAULT 0", "Inter-meeting buffer offset in minutes"]
    ]
    pdf.add_table(db_headers, db_widths, event_rows)
    
    pdf.add_page()
    pdf.add_h2("Table: public.bookings")
    booking_rows = [
        ["id", "UUID", "PRIMARY KEY", "Unique booking reference ID"],
        ["user_id", "UUID", "REFERENCES public.profiles(id)", "Assigned host profile key"],
        ["attendee_name", "TEXT", "NOT NULL", "Full name of the scheduling visitor"],
        ["attendee_email", "TEXT", "NOT NULL", "Email address of the visitor"],
        ["booking_date", "TEXT", "NOT NULL", "Target scheduling date string (YYYY-MM-DD)"],
        ["booking_time", "TEXT", "NOT NULL", "Target start time slot string (HH:MM)"],
        ["status", "TEXT", "CHECK status IN upcoming/past/cancelled", "Current booking lifecycle state"],
        ["meeting_link", "TEXT", "NULLABLE", "Generated video meeting endpoint"]
    ]
    pdf.add_table(db_headers, db_widths, booking_rows)

    pdf.add_h2("Table: public.subscriptions")
    sub_rows = [
        ["id", "UUID", "PRIMARY KEY", "Unique billing record ID"],
        ["user_id", "UUID", "UNIQUE, REFERENCES profiles", "Assigned subscriber key"],
        ["plan", "TEXT", "CHECK free/pro/enterprise", "Legacy tier mapping name"],
        ["subscription_plan", "TEXT", "DEFAULT 'free'", "Active Stripe billing product tier"],
        ["stripe_customer_id", "TEXT", "NULLABLE", "Stripe customer reference token"],
        ["stripe_subscription_id", "TEXT", "NULLABLE", "Stripe active billing reference"],
        ["subscription_end", "TIMESTAMPTZ", "NULLABLE", "Current billing cycle expiry timestamp"]
    ]
    pdf.add_table(db_headers, db_widths, sub_rows)

    pdf.add_h2("Database Relationships and Triggers")
    pdf.add_bullet(
        "Cascade Deletion:",
        "All tables referencing public.profiles (e.g. event_types, bookings, availability_settings, subscriptions) "
        "use ON DELETE CASCADE to ensure proper database cleanup upon account termination."
    )
    pdf.add_bullet(
        "Auth Trigger Functions:",
        "Upon successful user creation in Supabase auth.users, database triggers public.handle_new_user(), "
        "public.handle_new_user_subscription(), and public.handle_new_user_availability() automatically populate "
        "default settings, a free subscription record, and baseline weekday business hours (9:00 AM - 5:00 PM, Mon-Fri)."
    )

    # ================= PAGE 10: DESIGN SYSTEM =================
    pdf.add_page()
    pdf.add_h1("9. UI/UX Design System and Theme Engine")
    pdf.add_p(
        "Schedora's user experience is centered on premium SaaS design guidelines. The styling system leverages Tailwind v4 "
        "theme properties, combining dark mode elegance with clean light mode aesthetics."
    )
    
    design_system_bullets = [
        ("The Theme Toggle Switch:", "Positioned globally in the header. Employs SVG rotation and scaling animations using Tailwind classes (transition-all duration-300). Clicking the button smoothly transitions the background and borders over a 300ms window without layouts shifting."),
        ("Light Mode Philosophy:", "Inspired by Stripe's dashboard structure. Replaces deep dark backgrounds with crisp slate colors (#f8fafc), white cards, and subtle drop shadows (box-shadow: 0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(15,23,42,.06)) to establish visual hierarchy."),
        ("Dark Mode Philosophy:", "A dark cosmic aesthetic (#09090b) with deep indigo cards (#0a0a0f) and purple branding elements. Ambient glowing borders replace drop shadows, maintaining contrast and reducing eye strain."),
        ("Typography Hierarchy:", "Utilizes the Inter font family. It implements clear type scales, ranging from small tracking labels (text-xs tracking-wide uppercase) to bold primary titles (text-2xl font-bold).")
    ]
    for d_title, d_desc in design_system_bullets:
        pdf.add_bullet(d_title, d_desc)

    pdf.add_h1("10. Implementation Guide and Code Architecture")
    pdf.add_p(
        "Let us examine Schedora's technical implementations. The scheduler relies on two major algorithmic systems:"
    )
    
    pdf.add_h2("A. Realtime Overlap and Conflict Check Algorithm")
    pdf.add_p(
        "To prevent double bookings, the server merges availability settings with booked slots and active external "
        "calendar events. A target booking slot (StartA, EndA) conflicts with an existing slot (StartB, EndB) if:"
    )
    pdf.add_code("Overlap Logic Formula", "StartA < EndB AND StartB < EndA")
    pdf.add_p(
        "In the backend scheduling route, this check is executed as a relational query inside PostgreSQL, scanning "
        "bookings table and connecting to external OAuth feeds in parallel to verify the slot is free before committing the transaction."
    )

    pdf.add_h2("B. Multi-Mode Stripe Elements Controller")
    pdf.add_p(
        "To enable paid bookings, Stripe Elements is mounted in a dialog modal. The React client dynamically checks "
        "whether the Stripe keys are configured. If missing or sandbox mode is active, it falls back to a sandbox simulator "
        "which mocks card scenarios. Below is a code block showing the backend webhook controller signature."
    )
    
    webhook_code = (
        "app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), \n"
        "  async (req, res) => {\n"
        "    const sig = req.headers['stripe-signature'];\n"
        "    let event;\n"
        "    try {\n"
        "      event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);\n"
        "    } catch (err) {\n"
        "      return res.status(400).send(`Webhook Error: ${err.message}`);\n"
        "    }\n"
        "    if (event.type === 'customer.subscription.updated') {\n"
        "      const sub = event.data.object;\n"
        "      await updateDbSubscription(sub.customer, sub.status, sub.current_period_end);\n"
        "    }\n"
        "    res.json({ received: true });\n"
        "  }\n"
        ");"
    )
    pdf.add_code("Stripe Webhook Listener Controller", webhook_code)

    # ================= PAGE 12: BUSINESS MODEL =================
    pdf.add_page()
    pdf.add_h1("11. Business Model and Subscription Plans")
    pdf.add_p(
        "Schedora operates a product-led growth (PLG) freemium business model designed to attract single users "
        "while monetizing power scheduling features and collaborative teams."
    )
    
    biz_headers = ["Plan Name", "Price / Month", "Target Audience", "Included Capabilities"]
    biz_widths = [30, 30, 45, 65]
    biz_rows = [
        ["Free Tier", "$0", "Freelancers / Solo users", "1 active event type slug, standard email confirmations, 30-day booking histories, and UTC timezone calculations."],
        ["Pro Tier", "$15", "Consultants / Independent", "Unlimited active event types, Stripe-paid event checkouts, automated follow-up buffer setups, and CRM connections."],
        ["Enterprise Tier", "$49", "Teams / Agencies", "Multi-member team workspaces, round-robin scheduling queues, collective availability blocks, and custom branding logs."]
    ]
    pdf.add_table(biz_headers, biz_widths, biz_rows)

    pdf.add_h1("12. Security System and Scalability Roadmap")
    pdf.add_p(
        "To scale to enterprise volumes, Schedora implements strict layers of technical defense and performance optimizations."
    )
    
    pdf.add_h2("A. Authentication Security and Row Level Security (RLS)")
    pdf.add_p(
        "Client requests communicate directly with Supabase via JSON Web Tokens (JWT). The PostgreSQL database "
        "implements row level security (RLS) policies. For instance, the policy governing event type configuration reads:"
    )
    pdf.add_code("PostgreSQL Row Level Security Policy", "CREATE POLICY \"Users can manage own event types\" \nON public.event_types FOR ALL \nUSING (auth.uid() = user_id);")
    pdf.add_p(
        "This ensures that even if an attacker attempts to fetch event configs of another user via API parameters, "
        "the PostgreSQL execution engine filters the dataset, preventing unauthorized access."
    )

    pdf.add_h2("B. Scalability Roadmap")
    pdf.add_bullet(
        "Database Indexing:",
        "Indexes on user_id, booking_date, and event_slug ensure rapid availability checks, scaling to millions of entries."
    )
    pdf.add_bullet(
        "Realtime Polling Offloading:",
        "Transitioning from client-side cron polling to webhook-based event updates via Google PubSub and Microsoft Event Hubs."
    )
    pdf.add_bullet(
        "Edge Cache Distribution:",
        "Deploying host booking forms on Vercel Edge networks to resolve and serve slots within 50ms globally."
    )

    # ================= PAGE 13: ROADMAP & COMPETITIVE =================
    pdf.add_page()
    pdf.add_h1("13. Future Roadmap and AI Integrations")
    pdf.add_p(
        "Schedora's engineering roadmap incorporates cutting-edge automation and integration capabilities to secure a "
        "long-term competitive advantage in the SaaS scheduling market."
    )
    
    roadmap_items = [
        ("AI Scheduling Assistant:", "A natural-language scheduling interface (e.g., 'Book a 45-minute sync with Sarah next Tuesday afternoon'). The AI agent analyzes conversational emails, resolves host availability parameters, and books the event automatically."),
        ("Smart Availability Suggestions:", "An optimization engine that analyzes past meeting outcomes, cancellation frequencies, and peak concentration hours to suggest optimal meeting slots, reducing host cognitive fatigue."),
        ("Native Video Integrations:", "Direct API authorization paths for Zoom, Microsoft Teams, and Webex, generating secure dynamic credentials for every meeting booked."),
        ("CRM Sync Connections:", "Auto-syncing scheduled contact profiles and conversation histories directly to Hubspot, Salesforce, and Zoho CRM pipelines.")
    ]
    for r_title, r_desc in roadmap_items:
        pdf.add_bullet(r_title, r_desc)

    pdf.add_h1("14. Competitive Analysis")
    pdf.add_p(
        "A comparison of Schedora with market leaders reveals how Schedora captures the modern SaaS developer and "
        "entrepreneur audience."
    )
    
    comp_headers = ["Metric", "Schedora", "Calendly", "Motion"]
    comp_widths = [35, 45, 45, 45]
    comp_rows = [
        ["Target Audience", "Freelancers / Small Agencies", "Corporate Sales / HR", "Productivity Seekers"],
        ["Base Price", "Free / Pro ($15) / Team ($49)", "Free / Custom ($12 - $20)", "$34 (No free tier)"],
        ["Payment Flow", "Stripe Elements Embedded", "Stripe Redirection Link", "Not natively supported"],
        ["Theme Customizer", "Dynamic Light / Dark Toggle", "Basic light layout", "Fixed interface layout"],
        ["Data Privacy", "Multi-Tenant isolation via RLS", "Proprietary database", "Proprietary cloud storage"]
    ]
    pdf.add_table(comp_headers, comp_widths, comp_rows)

    # ================= PAGE 14: PRESENTATION SCRIPTS =================
    pdf.add_page()
    pdf.add_h1("15. Stakeholder Product Demo Script")
    pdf.add_p(
        "This presentation script is structured to demonstrate the value of Schedora to hackathon judges, "
        "investors, and technical stakeholders."
    )
    
    demo_script = (
        "[0:00 - Introduction]\n"
        "\"Good morning. Let's look at a common business frustration: scheduling. We waste hours in back-and-forth email chains "
        "just trying to coordinate calendars. Today, I'm excited to present Schedora, a modern scheduling platform.\"\n\n"
        "[0:45 - The Host Dashboard]\n"
        "\"Here is Schedora's host control panel. You are looking at a dashboard that supports both clean light themes and dark spaces. "
        "Under the Event Types tab, I can quickly set up appointment templates. Let's look at this paid consultation event.\"\n\n"
        "[1:30 - The Booking Flow and Stripe Elements]\n"
        "\"When I share this booking link with a client, they see my real-time availability in their local timezone. "
        "Let's select a slot. Because this is a paid consult, Stripe Card Elements is mounted directly into the checkout form. "
        "I'll enter a test card. Notice there are no redirects-the checkout happens natively inside Schedora. Within seconds, the booking "
        "is confirmed, payment is processed, and a calendar invite is sent to both of us.\"\n\n"
        "[2:15 - Analytics and Team Management]\n"
        "\"Returning to Schedora, we can track our booking trends and event breakdown. If I manage an agency, I can invite "
        "my team members via secure invite links to collaborate on joint scheduling. Schedora handles the rest.\"\n\n"
        "[2:45 - Architecture and Conclusion]\n"
        "\"Under the hood, Schedora runs on React, Node.js, and Supabase. Tenant isolation is enforced in the database using RLS. "
        "Schedora solves the scheduling problem simply, securely, and beautifully. Thank you.\""
    )
    pdf.add_code("Schedora Live Product Demo Script", demo_script)

    # ================= PAGE 15: ELEVATOR PITCHES =================
    pdf.add_page()
    pdf.add_h1("16. Structured Elevator Pitches")
    pdf.add_p(
        "Pitch frameworks optimized for different time constraints, designed for networking events, investors, "
        "or technical interviews."
    )
    
    pdf.add_h2("A. The 30-Second Elevator Pitch")
    pdf.add_p(
        "\"Schedora is a premium SaaS scheduling platform that helps professionals automate bookings and monetize consultations. "
        "Unlike old tools that redirect users to third-party billing pages, Schedora uses secure, embedded Stripe checkouts "
        "and real-time calendar syncing inside a responsive design. It simplifies meeting scheduling for professionals and teams.\""
    )
    
    pdf.add_h2("B. The 60-Second Investor Pitch")
    pdf.add_p(
        "\"Scheduling meetings is a major administrative time sink. Schedora solves this by providing a unified "
        "availability engine. Hosts configure booking templates and link their external calendars. Attendees select times "
        "in their local timezones and pay for sessions directly through an embedded checkout. "
        "By utilizing Supabase's multi-tenant database isolation, Schedora offers enterprise-grade security on a flexible tech stack. "
        "We are positioning Schedora to capture the growing freelance and remote agency market, offering team scheduling "
        "at a fraction of the cost of legacy platforms. Schedora makes scheduling efficient, secure, and beautiful.\""
    )

    pdf.add_h2("C. The 3-Minute Presentation Explanation")
    pdf.add_bullet(
        "Introduce the Coordination Gap:",
        "Businesses struggle with manual coordination across fragmented tools. This leads to timezone confusion, double bookings, "
        "and payment friction."
    )
    pdf.add_bullet(
        "Demonstrate the Solution:",
        "Schedora bridges this gap with an intuitive interface, deep calendar syncing, and embedded payment options, "
        "ensuring hosts get paid before sessions are booked."
    )
    pdf.add_bullet(
        "Highlight Technical Integrity:",
        "Built on React, Node, and Supabase. The Postgres database implements Row Level Security (RLS) for data protection. "
        "It supports light and dark themes with transitions for a modern SaaS feel."
    )
    pdf.add_bullet(
        "Map out the Business Potential:",
        "A freemium model that scales to team workspaces, with an API-first approach that lays the groundwork for AI-powered scheduling."
    )

    # ================= PAGE 16: INTERVIEW Q&A =================
    pdf.add_page()
    pdf.add_h1("17. Interview Q&A Section")
    pdf.add_p(
        "This section prepares candidates to explain Schedora's technical design and implementation choices during "
        "engineering interviews."
    )
    
    qa_pairs = [
        ("Q: Tell me about Schedora. What is it and why did you build it?", 
         "A: Schedora is a SaaS scheduling platform built to simplify calendar management and paid consultations. "
         "I built it to solve coordination problems like timezone conversions and manual scheduling back-and-forths, "
         "while keeping the checkout flow entirely in-app using Stripe Elements."),
         
        ("Q: Why did you choose Supabase and PostgreSQL instead of a NoSQL database?", 
         "A: Scheduling data is relational: bookings link to users and event templates, availability settings belong to profiles, "
         "and teams manage members. Relational schemas enforce integrity. PostgreSQL allows us to run overlap checks using date ranges "
         "and enforce security rules using Row Level Security (RLS) directly in the database."),
         
        ("Q: How did you implement Stripe Elements? What happens when a checkout completes?", 
         "A: I integrated Stripe Elements using the official SDK. On selection of a plan or paid slot, the client requests a payment intent "
         "secret from the Express server. The client mounts the elements inside a modal. When the card is approved, the Stripe webhook listener "
         "sends a customer.subscription.updated event to update the database state, unlocking premium tier capabilities."),
         
        ("Q: How does the application handle timezones dynamically?", 
         "A: The frontend uses the browser's Intl API to detect the visitor's local timezone. The host's operating settings are stored "
         "in UTC. When the booking page loads, availability times are parsed, checked for calendar conflicts, and converted "
         "to the attendee's timezone for booking, before writing back to the database in UTC.")
    ]
    for q, a in qa_pairs:
        pdf.add_h2(q)
        pdf.add_p(a)

    # ================= PAGE 17: CHALLENGES & PORTFOLIO =================
    pdf.add_page()
    pdf.add_h1("18. Technical Challenges and Solutions")
    pdf.add_p(
        "Engineering a robust scheduling engine presented several technical challenges. Below are three key obstacles "
        "we overcame during development."
    )
    
    challenges = [
        ("1. Dynamic Calendar Synchronization and API Rate Limits",
         "Challenge: Querying the Google Calendar API on every booking page load caused slow response times and rate-limiting issues.\n"
         "Solution: We built a sync layer that caches calendar blocks in the calendar_events table. A background worker syncs external changes, "
         "while a webhook listener updates local records when calendar events are modified, reducing external API dependencies."),
         
        ("2. Race Conditions on Time Slot Bookings",
         "Challenge: Two visitors could select and book the exact same time slot simultaneously, causing double bookings.\n"
         "Solution: We implemented a database transaction check at the API level. Before saving a booking, the server verifies "
         "the slot remains available. The event type user_id and slug are constrained by a UNIQUE database index, "
         "ensuring only one booking per slot is processed."),
         
        ("3. Smooth Styling Transitions with Tailwind v4",
         "Challenge: Switching themes caused visual flashes on complex elements like sidebars and card shadows.\n"
         "Solution: We configured Tailwind v4 theme variables to map to CSS variables in styles.css. "
         "By applying transition properties (background-color, border-color, box-shadow) with a 300ms ease, "
         "we ensured smooth transitions across the dashboard.")
    ]
    for c_title, c_desc in challenges:
        pdf.add_h2(c_title)
        pdf.add_p(c_desc)

    pdf.add_h1("19. Portfolio and Resume Summaries")
    pdf.add_p(
        "Copy-pasteable descriptions optimized for professional networking platforms and resume applications."
    )
    
    pdf.add_h2("A. Resume Bullet Points")
    pdf.add_bullet(
        "Built a multi-tenant SaaS scheduling platform using React, Node.js, and Supabase,",
        "implementing Row Level Security (RLS) policies to protect user data."
    )
    pdf.add_bullet(
        "Integrated Stripe Elements for native checkouts,",
        "building a backend webhook listener to sync subscription statuses and manage plans."
    )
    pdf.add_bullet(
        "Designed a responsive design system with a Light/Dark theme toggle,",
        "using Tailwind v4 variables to ensure smooth transitions across components."
    )
    pdf.add_bullet(
        "Created an availability engine that syncs with external calendars,",
        "performing conflict checks in PostgreSQL to prevent double bookings."
    )

    pdf.add_h2("B. LinkedIn Project Description")
    pdf.add_p(
        "Schedora is a SaaS scheduling platform built to simplify availability management and paid consultations. "
        "It features a clean visual interface with light and dark mode toggles, real-time calendar syncing, and direct Stripe Elements integrations. "
        "Built on a modern stack of React, Vite, Node.js, and Supabase (PostgreSQL), the application implements multi-tenant isolation via "
        "database Row Level Security (RLS). Schedora helps professionals organize their availability, manage bookings, and automate meeting workflows."
    )

    # ================= PAGE 18: CONCLUSION =================
    pdf.add_page()
    pdf.add_h1("20. Conclusion and Future Outlook")
    pdf.add_p(
        "Schedora demonstrates how a modern technical stack can solve scheduling challenges simply and securely. "
        "By combining React, Node.js, and Supabase, the platform provides a fast scheduling engine "
        "and dashboard experience."
    )
    pdf.add_p(
        "Building Schedora highlighted the value of structured relational database designs, secure third-party checkout flows, "
        "and clean, modern frontends. As the platform grows, integrating AI scheduling assistants and smart availability options "
        "will further reduce scheduling friction for busy professionals. "
        "Ultimately, Schedora shows that automated coordination can be reliable, secure, and easy to use."
    )
    
    # Simple ASCII stamp/signature at the end
    pdf.ln(10)
    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(*pdf.c_primary)
    pdf.cell(0, 5, "END OF DOCUMENT", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 8)
    pdf.set_text_color(*pdf.c_muted)
    pdf.cell(0, 5, "Generated automatically by Schedora Documentation Engine. All Rights Reserved.", align="C")

    # Output PDF file
    output_filename = "Schedora_Documentation.pdf"
    pdf.output(output_filename)
    print(f"Success! Document generated successfully: {output_filename}")


if __name__ == "__main__":
    build_schedora_bible()
