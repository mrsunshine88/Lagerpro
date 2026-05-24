export interface Variant {
  id: number;
  sku: string;
  stock: number;
  size: string;
  color: string;
  purchase_price: number;
  selling_price: number;
  original_price: number;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  description?: string;
  variants: Variant[];
  createdAt?: string;
}

export interface Booking {
  id: number;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  status: 'pending' | 'reserved' | 'confirmed' | 'cancelled';
  created_at: string;
  size: string;
  color: string;
  sku: string;
  selling_price: number;
  purchase_price: number;
  product_name: string;
  product_category: string;
  discount_code?: string;
  discount_percent?: number;
  original_selling_price?: number;
  message?: string;
  payment_status?: string;
  delivery_method?: string;
  shipping_address?: string;
  shipping_cost?: number;
}

export interface CartItem {
  product: Product;
  variant: Variant;
  quantity: number;
  selling_price?: number;
}

export interface UserProfile {
  id: number;
  email: string;
  role: 'admin' | 'user';
  allowed_projects: string;
}

export interface ProjectSummary {
  name: string;
  stock_count: number;
  stock_cost: number;
  potential_sales: number;
  total_investment: number;
  total_revenue: number;
  net_profit: number;
  be_percentage: number;
  cost_per_shoe: number;
}

export interface AnalyticsData {
  is_lump_sum: boolean;
  stock_metrics: {
    total_cost: number;
    potential_sales: number;
    potential_profit: number;
  };
  break_even: {
    total_investment: number;
    total_revenue: number;
    net_profit: number;
  };
  financials: Record<string, {
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }>;
  recent_sales: any[];
  project_summaries: ProjectSummary[];
}

export interface DiscountCode {
  id: number;
  code: string;
  project: string;
  discountPercent: number;
  freeShipping: boolean;
  validUntil?: string;
}
