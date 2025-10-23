// Shared response types (sesuai dokumentasi)
export interface ApiResponse<T = any> {
  success: boolean;  // ← Berubah dari 'status'
  message: string;
  data?: T;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
  orderByName?: 'asc' | 'desc';
  orderByTitle?: 'asc' | 'desc';
  orderByPublishDate?: 'asc' | 'desc';
  orderById?: 'asc' | 'desc';
  orderByAmount?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  prev_page: number | null;  // ← Berubah format
  next_page: number | null;  // ← Berubah format
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: PaginationMeta;
}

// Auth types (pakai email, bukan username)
export interface RegisterRequest {
  username?: string;  // Optional
  email: string;      // Required
  password: string;
}

export interface LoginRequest {
  email: string;      // Bukan username
  password: string;
}

export interface UserResponse {
  id: string;
  username?: string;
  email: string;
  created_at: Date;
}

// Transaction types
export interface TransactionItem {
  book_id: string;
  quantity: number;
}

export interface CreateTransactionRequest {
  user_id: string;
  items: TransactionItem[];
}