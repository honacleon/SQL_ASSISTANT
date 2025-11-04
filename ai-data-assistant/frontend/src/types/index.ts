// Re-export shared types
export * from '@ai-data-assistant/shared';

// Frontend-specific types
export interface AppState {
  selectedTable: string | null;
  tables: import('@ai-data-assistant/shared').TableInfo[];
  isLoading: boolean;
  error: string | null;
}

export interface ChatState {
  messages: import('@ai-data-assistant/shared').ChatMessage[];
  isTyping: boolean;
  sessionId: string;
  suggestions: string[];
}

export interface TableViewState {
  data: Record<string, any>[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  sortBy: string | null;
  sortOrder: 'asc' | 'desc';
  filters: Record<string, any>;
  searchQuery: string;
  selectedRows: Set<string>;
  columnVisibility: Record<string, boolean>;
}

export interface ModalState {
  isOpen: boolean;
  type: 'export' | 'filter' | 'chart' | 'settings' | null;
  data?: any;
}

export interface ExportModalData {
  selectedColumns: string[];
  format: 'csv' | 'excel' | 'json';
  includeHeaders: boolean;
  filename: string;
}

export interface FilterModalData {
  column: string;
  operator: import('@ai-data-assistant/shared').FilterOption['operator'];
  value: any;
}

export interface ChartModalData {
  type: import('@ai-data-assistant/shared').ChartConfig['type'];
  xAxis: string;
  yAxis: string;
  title: string;
}

// UI Component Props
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Table component types
export interface Column {
  key: string;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: any) => React.ReactNode;
  width?: number;
}

export interface TableProps {
  data: Record<string, any>[];
  columns: Column[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    onChange: (page: number, pageSize: number) => void;
  };
  rowSelection?: {
    selectedRows: Set<string>;
    onChange: (selectedRows: Set<string>) => void;
    getRowId: (record: any) => string;
  };
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
  className?: string;
}

// Chart types
export interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

export interface LineChartData {
  name: string;
  [key: string]: any;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

// Event types
export interface TableEvent {
  type: 'sort' | 'filter' | 'pagination' | 'selection' | 'search';
  data: any;
}

export interface ChatEvent {
  type: 'message_sent' | 'response_received' | 'typing_start' | 'typing_stop';
  data: any;
}