export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING: "Хүлээгдэж буй",
  CONFIRMED: "Баталгаажсан",
  CHECKED_IN: "Байрлаж буй",
  CHECKED_OUT: "Гарсан",
  CANCELLED: "Цуцлагдсан",
  NO_SHOW: "Ирээгүй",
  EXTENDED: "Байрлаж буй",
};

export const BOOKING_STATUS_BADGE_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  CHECKED_IN: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CHECKED_OUT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  NO_SHOW: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  EXTENDED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export const BOOKING_STATUS_BAR_COLORS: Record<string, string> = {
  PENDING: "bg-amber-400/80",
  CONFIRMED: "bg-blue-400/80",
  CHECKED_IN: "bg-emerald-500/80",
  EXTENDED: "bg-purple-500/80",
  NO_SHOW: "bg-orange-500/80",
};
