# Data Models — Step-by-Step Guide

Every model in the system, from database table to frontend interface.

---

## 1. Core

### hotels
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `name` | TEXT NOT NULL | Property name |
| `slug` | TEXT UNIQUE | URL-friendly name |
| `email` | TEXT | Contact email |
| `phone` | TEXT | Contact phone |
| `address` | TEXT | Physical address |
| `logo_url` | TEXT | Logo image URL |
| `currency` | TEXT | Default: `USD` |
| `tax_rate` | REAL | Default: `0` |
| `timezone` | TEXT | Default: `UTC` |
| `check_in_time` | TEXT | Default: `14:00` |
| `check_out_time` | TEXT | Default: `11:00` |
| `status` | TEXT | `active` / `inactive` / `maintenance` |
| `created_at` | TEXT | Auto timestamp |
| `updated_at` | TEXT | Auto timestamp |

**Frontend:** `HotelSetup.tsx` (create/edit), `Enterprise.tsx` (multi-property)

### users
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `username` | TEXT | Unique per hotel |
| `email` | TEXT | |
| `password_hash` | TEXT | bcrypt hash |
| `name` | TEXT | Display name |
| `role` | TEXT | `admin` / `owner` / `manager` / `receptionist` / `housekeeping` / `accountant` |
| `role_id` | TEXT FK → custom_roles | Optional custom role override |
| `email_verified` | INTEGER | `0` or `1` |
| `invitation_token` | TEXT | For invite flow |
| `invitation_accepted` | INTEGER | Default `1` |

**Frontend:** `Users.tsx`, `Login.tsx`, `Register.tsx`, `Profile.tsx`

---

## 2. Rooms

### room_types
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `name` | TEXT | e.g. "Deluxe" |
| `description` | TEXT | |
| `base_price` | REAL | Default nightly rate |
| `capacity` | INTEGER | Max guests |
| `created_at` | TEXT | |

**Frontend:** `RoomTypes.tsx`

### rooms
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `room_number` | TEXT | Unique per hotel |
| `room_type_id` | TEXT FK → room_types | |
| `floor` | INTEGER | |
| `status` | TEXT | `available` / `reserved` / `occupied` / `cleaning` / `maintenance` / `out_of_service` |
| `photo` | TEXT | URL |
| `amenities` | TEXT | Comma-separated |
| `notes` | TEXT | |
| `price` | REAL | Override room-type price |
| `capacity` | INTEGER | Override room-type capacity |
| `created_at` / `updated_at` | TEXT | |

**Frontend:** `Rooms.tsx`

---

## 3. Guests & Bookings

### guests
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `first_name` | TEXT | |
| `last_name` | TEXT | |
| `email` | TEXT | |
| `phone` | TEXT | |
| `whatsapp` | TEXT | |
| `id_card_number` | TEXT | Government ID |
| `address` | TEXT | |
| `created_at` / `updated_at` | TEXT | |

**Frontend:** `Guests.tsx`

### bookings
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `guest_id` | TEXT FK → guests | |
| `room_id` | TEXT FK → rooms | |
| `check_in_date` | TEXT | `YYYY-MM-DD` |
| `check_out_date` | TEXT | `YYYY-MM-DD` |
| `status` | TEXT | `pending` / `confirmed` / `checked_in` / `checked_out` / `cancelled` / `no_show` |
| `source` | TEXT | `walk_in` / `online` / `phone` / `corporate` / `group` |
| `total_amount` | REAL | |
| `actual_check_in` | TEXT | Timestamp |
| `actual_check_out` | TEXT | Timestamp |
| `created_at` / `updated_at` | TEXT | |

**Frontend:** `Bookings.tsx`, `BookingDetail.tsx`, `Dashboard.tsx`

---

## 4. Services & Invoicing

### services
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `name` | TEXT | e.g. "Spa Session" |
| `description` | TEXT | |
| `price` | REAL | |
| `category` | TEXT | e.g. `food`, `laundry`, `spa` |
| `created_at` | TEXT | |

**Frontend:** `Services.tsx`

### booking_services
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `booking_id` | TEXT FK → bookings | |
| `service_id` | TEXT FK → services | |
| `quantity` | INTEGER | |
| `price` | REAL | Price at time of order |
| `created_at` | TEXT | |

**Frontend:** `BookingDetail.tsx` (service list per booking)

### invoices
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `booking_id` | TEXT FK → bookings | |
| `amount` | REAL | Total billed |
| `paid_amount` | REAL | Default `0` |
| `discount` | REAL | Default `0` |
| `tax_amount` | REAL | Default `0` |
| `deposit` | REAL | Default `0` |
| `notes` | TEXT | |
| `status` | TEXT | `pending` / `paid` / `partial` / `cancelled` / `refunded` |
| `issued_date` | TEXT | |
| `due_date` | TEXT | |
| `created_at` | TEXT | |

**Frontend:** `Invoices.tsx`, `BookingDetail.tsx`

### payments
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `invoice_id` | TEXT FK → invoices | |
| `amount` | REAL | |
| `method` | TEXT | `cash` / `card` / `mobile_money` / `bank_transfer` |
| `reference` | TEXT | Transaction reference |
| `notes` | TEXT | |
| `created_at` | TEXT | |

**Frontend:** `Invoices.tsx` (payment form)

### deposits
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `booking_id` | TEXT FK → bookings | |
| `amount` | REAL | |
| `method` | TEXT | `cash` / `card` / `mobile_money` / `bank_transfer` |
| `created_at` | TEXT | |

**Frontend:** `BookingDetail.tsx`

---

## 5. Expenses

### expenses
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `category` | TEXT | `utilities` / `supplies` / `maintenance` / `salary` / `marketing` / `food` / `transport` / `other` |
| `description` | TEXT | |
| `amount` | REAL | |
| `date` | TEXT | |
| `notes` | TEXT | |
| `created_at` | TEXT | |

**Frontend:** `Expenses.tsx`, `Reports.tsx`

---

## 6. Staff & HR

### departments
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `name` | TEXT | e.g. "Housekeeping" |
| `description` | TEXT | |
| `created_at` | TEXT | |

**Frontend:** `Staff.tsx`

### employees
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `department_id` | TEXT FK → departments | |
| `first_name` | TEXT | |
| `last_name` | TEXT | |
| `email` | TEXT | |
| `phone` | TEXT | |
| `position` | TEXT | e.g. "Head Housekeeper" |
| `hourly_rate` | REAL | |
| `status` | TEXT | `active` / `inactive` |
| `created_at` / `updated_at` | TEXT | |

**Frontend:** `Staff.tsx`

### shifts
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `employee_id` | TEXT FK → employees | |
| `date` | TEXT | |
| `start_time` | TEXT | HH:MM |
| `end_time` | TEXT | HH:MM |
| `notes` | TEXT | |
| `created_at` | TEXT | |

**Frontend:** `Staff.tsx`

### attendance
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `employee_id` | TEXT FK → employees | |
| `date` | TEXT | |
| `check_in` | TEXT | HH:MM |
| `check_out` | TEXT | HH:MM |
| `status` | TEXT | `present` / `absent` / `late` / `half_day` |
| `notes` | TEXT | |
| `created_at` | TEXT | |

**Frontend:** `Staff.tsx`

---

## 7. Payroll

### payroll_periods
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `start_date` | TEXT | |
| `end_date` | TEXT | |
| `status` | TEXT | `open` / `processing` / `closed` |
| `processed_at` | TEXT | |
| `created_at` | TEXT | |

**Frontend:** `Payroll.tsx`

### payroll_deductions
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `name` | TEXT | e.g. "SSNIT" |
| `type` | TEXT | `percentage` / `fixed` |
| `value` | REAL | |
| `is_mandatory` | INTEGER | `0` or `1` |
| `created_at` | TEXT | |

**Frontend:** `Payroll.tsx`

### payroll_entries
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `period_id` | TEXT FK → payroll_periods | |
| `employee_id` | TEXT FK → employees | |
| `base_pay` | REAL | |
| `overtime_pay` | REAL | |
| `bonuses` | REAL | |
| `deductions_total` | REAL | |
| `net_pay` | REAL | |
| `status` | TEXT | `pending` / `approved` / `paid` |
| `paid_at` | TEXT | |
| `notes` | TEXT | |
| `created_at` | TEXT | |

**Frontend:** `Payroll.tsx`

### payslips
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `entry_id` | TEXT FK → payroll_entries | |
| `hotel_id` | TEXT FK → hotels | |
| `employee_id` | TEXT FK → employees | |
| `period_id` | TEXT FK → payroll_periods | |
| `gross_pay` | REAL | |
| `deductions_breakdown` | TEXT | JSON array |
| `net_pay` | REAL | |
| `generated_at` | TEXT | |

**Frontend:** `Payroll.tsx`

---

## 8. Operations

### housekeeping_tasks
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `room_id` | TEXT FK → rooms | |
| `assigned_to` | TEXT FK → employees | |
| `priority` | TEXT | `low` / `medium` / `high` |
| `status` | TEXT | `pending` / `in_progress` / `completed` / `inspected` |
| `scheduled_date` | TEXT | |
| `notes` | TEXT | |
| `created_at` / `updated_at` | TEXT | |

**Frontend:** `Housekeeping.tsx`

### housekeeping_inspections
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `task_id` | TEXT FK → housekeeping_tasks | |
| `inspected_by` | TEXT FK → employees | |
| `cleanliness` | INTEGER | 1–5 |
| `supplies_restocked` | INTEGER | `0` or `1` |
| `damage_found` | TEXT | |
| `notes` | TEXT | |
| `created_at` | TEXT | |

**Frontend:** `Housekeeping.tsx` (inspection modal)

### maintenance_requests
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `room_id` | TEXT FK → rooms | |
| `reported_by` | TEXT FK → employees | |
| `title` | TEXT | |
| `description` | TEXT | |
| `priority` | TEXT | `low` / `medium` / `high` / `urgent` |
| `status` | TEXT | `reported` / `in_progress` / `resolved` / `closed` |
| `assigned_to` | TEXT FK → employees | |
| `notes` | TEXT | |
| `created_at` / `updated_at` | TEXT | |

**Frontend:** `Maintenance.tsx`

### room_service_requests
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `booking_id` | TEXT FK → bookings | |
| `room_id` | TEXT FK → rooms | |
| `guest_name` | TEXT | |
| `request_type` | TEXT | `food` / `laundry` / `towels` / `wake_up` / `other` |
| `description` | TEXT | |
| `status` | TEXT | `pending` / `in_progress` / `delivered` / `completed` / `cancelled` |
| `assigned_to` | TEXT FK → employees | |
| `notes` | TEXT | |
| `created_at` / `updated_at` | TEXT | |

**Frontend:** `RoomService.tsx`

---

## 9. Inventory

### inventory_items
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `name` | TEXT | |
| `category` | TEXT | `toiletries` / `linens` / `minibar` / `cleaning` / `maintenance` / `office` / `other` |
| `quantity` | REAL | Current stock |
| `unit` | TEXT | e.g. `piece`, `roll`, `bottle` |
| `min_stock` | REAL | Reorder threshold |
| `cost_price` | REAL | Per-unit cost |
| `notes` | TEXT | |
| `created_at` / `updated_at` | TEXT | |

**Frontend:** `Inventory.tsx`

### inventory_transactions
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `item_id` | TEXT FK → inventory_items | |
| `type` | TEXT | `in` / `out` / `adjustment` |
| `quantity` | REAL | |
| `reference` | TEXT | PO number, etc. |
| `notes` | TEXT | |
| `created_at` | TEXT | |

**Frontend:** `Inventory.tsx`

---

## 10. Subscriptions & Billing

### subscription_plans
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `name` | TEXT | e.g. "Professional" |
| `slug` | TEXT UNIQUE | URL-friendly |
| `description` | TEXT | |
| `price_monthly` | REAL | |
| `price_yearly` | REAL | |
| `max_rooms` | INTEGER | |
| `max_users` | INTEGER | |
| `features` | TEXT | JSON array |
| `highlighted` | INTEGER | `0` or `1` |
| `sort_order` | INTEGER | |
| `created_at` | TEXT | |

**Frontend:** `Subscriptions.tsx` (plans grid)

### hotel_subscriptions
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT UNIQUE FK → hotels | One sub per hotel |
| `plan_id` | TEXT FK → subscription_plans | |
| `billing_interval` | TEXT | `monthly` / `yearly` |
| `status` | TEXT | `active` / `trial` / `cancelled` / `expired` / `past_due` |
| `trial_ends_at` | TEXT | |
| `current_period_starts_at` | TEXT | |
| `current_period_ends_at` | TEXT | |
| `cancelled_at` | TEXT | |
| `paystack_subscription_code` | TEXT | |
| `created_at` / `updated_at` | TEXT | |

**Frontend:** `Subscriptions.tsx`, `HotelSetup.tsx`

### subscription_payments
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `plan_id` | TEXT FK → subscription_plans | |
| `amount` | REAL | |
| `currency` | TEXT | Default `GHS` |
| `billing_interval` | TEXT | |
| `paystack_reference` | TEXT | |
| `paystack_access_code` | TEXT | |
| `status` | TEXT | `pending` / `success` / `failed` |
| `paid_at` | TEXT | |
| `created_at` | TEXT | |

**Frontend:** `Subscriptions.tsx`

---

## 11. Enterprise Modules

### corporate_accounts
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `company_name` | TEXT | |
| `contact_name` | TEXT | |
| `contact_email` | TEXT | |
| `contact_phone` | TEXT | |
| `credit_limit` | REAL | |
| `payment_terms` | TEXT | `net15` / `net30` / `net45` / `net60` / `prepaid` |
| `discount_rate` | REAL | Percentage discount |
| `notes` | TEXT | |
| `status` | TEXT | `active` / `inactive` / `suspended` |
| `created_at` / `updated_at` | TEXT | |

**Frontend:** `Corporate.tsx`

### corporate_rates
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `account_id` | TEXT FK → corporate_accounts | |
| `room_type_id` | TEXT FK → room_types | |
| `negotiated_price` | REAL | |
| `valid_from` | TEXT | |
| `valid_until` | TEXT | |

**Frontend:** `Corporate.tsx` (rates tab)

### franchise_groups
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `name` | TEXT | |
| `parent_hotel_id` | TEXT FK → hotels | |
| `settings` | TEXT | JSON blob |
| `created_at` | TEXT | |

**Frontend:** `Franchise.tsx`

### franchise_members
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `group_id` | TEXT FK → franchise_groups | |
| `hotel_id` | TEXT UNIQUE FK → hotels | |
| `role` | TEXT | `owner` / `member` / `affiliate` |
| `joined_at` | TEXT | |

**Frontend:** `Franchise.tsx`

### custom_roles
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `name` | TEXT | e.g. "Night Auditor" |
| `permissions` | TEXT | JSON array of permission strings |
| `created_at` | TEXT | |

**Frontend:** `Roles.tsx`

### api_keys
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `name` | TEXT | |
| `key` | TEXT UNIQUE | `he_` prefix + hex |
| `secret` | TEXT | Full secret (shown once) |
| `permissions` | TEXT | JSON array |
| `ip_whitelist` | TEXT | JSON array of CIDR |
| `rate_limit` | INTEGER | Requests/second |
| `enabled` | INTEGER | `0` or `1` |
| `last_used_at` | TEXT | |
| `created_at` | TEXT | |

**Frontend:** `ApiKeys.tsx`

### white_label_settings
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT UNIQUE FK → hotels | |
| `custom_domain` | TEXT | |
| `favicon_url` | TEXT | |
| `primary_color` | TEXT | Hex, default `#3b82f6` |
| `logo_url` | TEXT | |
| `email_from_name` | TEXT | |
| `email_logo_url` | TEXT | |
| `custom_css` | TEXT | |
| `footer_text` | TEXT | |
| `created_at` / `updated_at` | TEXT | |

**Frontend:** `WhiteLabel.tsx`, `BrandContext.tsx`

### integrations
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `type` | TEXT | `channel_manager` / `payment_gateway` / `pos` / `accounting` / `door_lock` / `key_card` |
| `provider` | TEXT | e.g. `bookingdotcom` |
| `name` | TEXT | Display name |
| `api_key` | TEXT | |
| `api_secret` | TEXT | |
| `endpoint_url` | TEXT | |
| `credentials` | TEXT | JSON blob |
| `enabled` | INTEGER | `0` or `1` |
| `last_sync_at` | TEXT | |
| `created_at` | TEXT | |

**Frontend:** `Integrations.tsx`

### channel_connections
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `channel` | TEXT | OTA name, e.g. `airbnb` |
| `name` | TEXT | Display name |
| `api_key` | TEXT | |
| `endpoint_url` | TEXT | |
| `enabled` | INTEGER | `0` or `1` |
| `last_sync_at` | TEXT | |
| `created_at` | TEXT | |

**Frontend:** `Channels.tsx`

---

## 12. Notifications

### notifications
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `user_id` | TEXT FK → users | Null = broadcast |
| `type` | TEXT | e.g. `info`, `warning`, `success` |
| `title` | TEXT | |
| `message` | TEXT | |
| `link` | TEXT | Deep-link URL |
| `read` | INTEGER | `0` or `1` |
| `created_at` | TEXT | |

**Frontend:** `Notifications.tsx`, `NotificationContext.tsx`

---

## 13. Taxes & Currency

### hotel_taxes
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `name` | TEXT | e.g. "VAT" |
| `rate` | REAL | |
| `type` | TEXT | `percentage` / `fixed` |
| `is_mandatory` | INTEGER | `0` or `1` |
| `created_at` | TEXT | |

**Frontend:** `HotelSetup.tsx`

### currencies
| Field | Type | Notes |
|---|---|---|
| `code` | TEXT PK | e.g. `GHS` |
| `name` | TEXT | e.g. "Ghana Cedi" |
| `symbol` | TEXT | e.g. `GHs` |

**Frontend:** `HotelSetup.tsx` (currency selector)

### exchange_rates
| Field | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `from_currency` | TEXT FK → currencies | |
| `to_currency` | TEXT FK → currencies | |
| `rate` | REAL | |
| `updated_at` | TEXT | |

**Frontend:** Not directly exposed, used by currency conversion logic

---

## 14. Auth & Security

### refresh_tokens
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `user_id` | TEXT FK → users | |
| `token` | TEXT UNIQUE | JWT refresh token |
| `expires_at` | TEXT | |
| `created_at` | TEXT | |

### password_resets
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `user_id` | TEXT FK → users | |
| `token` | TEXT UNIQUE | |
| `expires_at` | TEXT | |
| `used` | INTEGER | `0` or `1` |
| `created_at` | TEXT | |

### login_attempts
| Field | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `username` | TEXT | |
| `ip` | TEXT | |
| `success` | INTEGER | `0` or `1` |
| `created_at` | TEXT | |

### email_verifications
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `user_id` | TEXT FK → users | |
| `email` | TEXT | |
| `token` | TEXT UNIQUE | |
| `expires_at` | TEXT | |
| `created_at` | TEXT | |

### hotel_invitations
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `hotel_id` | TEXT FK → hotels | |
| `email` | TEXT | |
| `token` | TEXT UNIQUE | |
| `role` | TEXT | Default `receptionist` |
| `accepted` | INTEGER | `0` or `1` |
| `expires_at` | TEXT | |
| `created_at` | TEXT | |

### hotel_members
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `user_id` | TEXT FK → users | |
| `hotel_id` | TEXT FK → hotels | |
| `role` | TEXT | Default `receptionist` |
| `joined_at` | TEXT | |
| UNIQUE | (user_id, hotel_id) | One membership per pair |

---

## Entity Relationship Summary

```
hotels ───────────── room_types
   │                     │
   ├── rooms ────────────┘
   │        │
   ├── guests ─── bookings ─── booking_services ─── services
   │                  │
   │             invoices ─── payments
   │               │
   │             deposits
   │
   ├── users ─── refresh_tokens, password_resets, email_verifications, login_attempts
   │
   ├── departments ─── employees ─── shifts, attendance
   │                                  │
   │                             payroll_entries ─── payslips
   │
   ├── inventory_items ─── inventory_transactions
   │
   ├── services (standalone)
   ├── expenses
   ├── notifications
   ├── hotel_taxes
   │
   ├── housekeeping_tasks ─── housekeeping_inspections
   ├── maintenance_requests
   ├── room_service_requests
   │
   ├── subscription_plans ─── hotel_subscriptions ─── subscription_payments
   │
   ├── integrations
   ├── channel_connections
   ├── corporate_accounts ─── corporate_rates
   ├── franchise_groups ─── franchise_members
   ├── custom_roles
   ├── api_keys
   ├── white_label_settings
   └── hotel_members
```
