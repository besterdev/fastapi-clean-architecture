export type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
};

export type Session = { id: number; user_id: number; updated_at: string };
export type Permission = Session & { permission: string };
export type DataPage<T> = {
  data: T[];
  page: number;
  page_size: number;
  total_page: number;
  total_data: number;
};

export type ApiError = {
  message: string;
  errors?: { loc: (string | number)[]; message: string }[];
};
