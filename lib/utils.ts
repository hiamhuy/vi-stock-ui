import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: any): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function removeAccents(str: string): string {
  if (!str) return str;
  return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D');
}

export function getImageUrl(path: string | undefined): string {
  if (!path) return '/placeholder-investment.jpg'; // Need to make sure this exists or use a better fallback
  if (path.startsWith('http')) return path;
  
  // Ensure the path starts with a slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Get base URL from environment or fallback, removing trailing /api if present
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const baseUrl = apiUrl.replace(/\/api$/, '').replace(/\/$/, '');
  
  return `${baseUrl}${normalizedPath}`;
}
