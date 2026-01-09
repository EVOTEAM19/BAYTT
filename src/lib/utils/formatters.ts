// ============================================
// BAYTT - Formatters
// ============================================

/**
 * Formatea un precio con moneda
 */
export function formatPrice(price: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Formatea una fecha en formato largo
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(dateObj);
}

/**
 * Formatea una fecha con hora
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);
}

/**
 * Formatea una fecha como "hace X tiempo"
 */
export function timeAgo(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (seconds < 60) {
    return "hace unos segundos";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `hace ${days} ${days === 1 ? "día" : "días"}`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `hace ${months} ${months === 1 ? "mes" : "meses"}`;
  }

  const years = Math.floor(months / 12);
  return `hace ${years} ${years === 1 ? "año" : "años"}`;
}

/**
 * Formatea duración en minutos a formato legible
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}min`;
}

/**
 * Formatea duración en segundos a formato MM:SS
 */
export function formatDurationSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Formatea un número con separadores de miles
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("es-ES").format(num);
}

/**
 * Formatea un número en formato compacto (1.2K, 1.5M, etc.)
 */
export function formatCompactNumber(num: number): string {
  if (num < 1000) {
    return num.toString();
  }

  if (num < 1000000) {
    return `${(num / 1000).toFixed(1)}K`;
  }

  if (num < 1000000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }

  return `${(num / 1000000000).toFixed(1)}B`;
}

/**
 * Formatea el tamaño de un archivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Convierte un texto a slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Elimina acentos
    .replace(/[^\w\s-]/g, "") // Elimina caracteres especiales
    .replace(/[\s_-]+/g, "-") // Reemplaza espacios y guiones bajos con guiones
    .replace(/^-+|-+$/g, ""); // Elimina guiones al inicio y final
}

/**
 * Trunca un texto a una longitud máxima
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) {
    return text;
  }
  return `${text.slice(0, length)}...`;
}

/**
 * Obtiene las iniciales de un nombre
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
