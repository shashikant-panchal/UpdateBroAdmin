export type UserRole = 'customer' | 'admin';

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Dispatched'
  | 'Delivered'
  | 'Cancelled';

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface DbProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  shipping_address: string | null;
  role: UserRole;
  created_at: string;
}

export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DbBanner {
  id: string;
  title: string;
  subtitle: string | null;
  cta_text: string;
  cta_link: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DbProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  category_id: string | null;
  images: string[];
  highlights: string[];
  in_stock: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
  is_new_arrival: boolean;
  is_combo: boolean;
  created_at: string;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
}

export interface DbOrder {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  payment_method: string;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  status: OrderStatus;
  status_history: StatusHistoryEntry[];
  tracking_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbStoreSettings {
  id: number;
  announcement_text: string;
  whatsapp_number: string;
  shipping_charge: number;
  free_shipping_above: number;
  cod_enabled: boolean;
}

export type OrderWithItems = DbOrder & {
  order_items?: DbOrderItem[];
};
