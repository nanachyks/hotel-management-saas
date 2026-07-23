export interface RoomType {
  id: string;
  hotel_id: string;
  name: string;
  description: string;
  base_price: number;
  capacity: number;
  created_at: string;
}

export interface Room {
  id: string;
  hotel_id: string;
  room_number: string;
  room_type_id: string;
  floor: number;
  status: 'available' | 'reserved' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_service';
  photo: string | null;
  amenities: string;
  notes: string;
  price: number | null;
  capacity: number | null;
  created_at: string;
  updated_at: string;
}

export interface Guest {
  id: string;
  hotel_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  id_card_number: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  hotel_id: string;
  guest_id: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  source: 'walk_in' | 'online' | 'phone' | 'corporate' | 'group';
  total_amount: number;
  actual_check_in: string | null;
  actual_check_out: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  hotel_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  created_at: string;
}

export interface BookingService {
  id: string;
  booking_id: string;
  service_id: string;
  quantity: number;
  price: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  hotel_id: string;
  booking_id: string;
  amount: number;
  paid_amount: number;
  discount: number;
  tax_amount: number;
  deposit: number;
  notes: string;
  status: 'pending' | 'paid' | 'partial' | 'cancelled' | 'refunded';
  issued_date: string;
  due_date: string;
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  method: 'cash' | 'card' | 'mobile_money' | 'bank_transfer';
  reference: string;
  notes: string;
  created_at: string;
}

export interface Deposit {
  id: string;
  booking_id: string;
  amount: number;
  method: 'cash' | 'card' | 'mobile_money' | 'bank_transfer';
  created_at: string;
}

export interface Expense {
  id: string;
  hotel_id: string;
  category: 'utilities' | 'supplies' | 'maintenance' | 'salary' | 'marketing' | 'food' | 'transport' | 'other';
  description: string;
  amount: number;
  date: string;
  notes: string;
  created_at: string;
}

export interface Department {
  id: string;
  hotel_id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Employee {
  id: string;
  hotel_id: string;
  department_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  hourly_rate: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  hotel_id: string;
  employee_id: string;
  date: string;
  start_time: string;
  end_time: string;
  notes: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  hotel_id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'present' | 'absent' | 'late' | 'half_day';
  notes: string;
  created_at: string;
}

export interface HousekeepingTask {
  id: string;
  hotel_id: string;
  room_id: string;
  assigned_to: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'inspected';
  scheduled_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRequest {
  id: string;
  hotel_id: string;
  room_id: string | null;
  reported_by: string | null;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'reported' | 'in_progress' | 'resolved' | 'closed';
  assigned_to: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface RoomServiceRequest {
  id: string;
  hotel_id: string;
  booking_id: string | null;
  room_id: string;
  guest_name: string;
  request_type: 'food' | 'laundry' | 'towels' | 'wake_up' | 'other';
  description: string;
  status: 'pending' | 'in_progress' | 'delivered' | 'completed' | 'cancelled';
  assigned_to: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  hotel_id: string;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'owner' | 'manager' | 'receptionist' | 'housekeeping' | 'accountant';
  email_verified: number;
  created_at: string;
}

export interface Hotel {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  logo_url: string | null;
  currency: string;
  tax_rate: number;
  timezone: string;
  check_in_time: string;
  check_out_time: string;
  created_at: string;
  updated_at: string;
}
