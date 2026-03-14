import type { ElementType } from "react";
import {
  CheckCircle, AlertTriangle, Clock, Sparkles, PlayCircle,
  ShieldCheck, WrenchIcon, MinusCircle, LogOut,
} from "lucide-react";

export type RoomStatus =
  | "AVAILABLE"
  | "OCCUPIED"
  | "PENDING"
  | "CLEANING"
  | "CLEANING_IN_PROGRESS"
  | "INSPECTED"
  | "OUT_OF_ORDER"
  | "OUT_OF_SERVICE"
  | "DUE_OUT";

export interface RoomStatusConfig {
  label: string;
  icon: ElementType;
  dotClass: string;
  bgClass: string;
  textClass: string;
  badgeClass: string;
  rowBg: string;
  tdBg: string;
  chartColor: string;
  nonSellable: boolean;
}

export const ROOM_STATUS_CONFIG: Record<RoomStatus, RoomStatusConfig> = {
  AVAILABLE: {
    label: "Сул",
    icon: CheckCircle,
    dotClass: "bg-green-500",
    bgClass: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
    textClass: "text-green-700 dark:text-green-400",
    badgeClass: "",
    rowBg: "",
    tdBg: "bg-background",
    chartColor: "#22c55e",
    nonSellable: false,
  },
  OCCUPIED: {
    label: "Дүүрсэн",
    icon: AlertTriangle,
    dotClass: "bg-red-500",
    bgClass: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
    textClass: "text-red-700 dark:text-red-400",
    badgeClass: "",
    rowBg: "",
    tdBg: "bg-background",
    chartColor: "#ef4444",
    nonSellable: false,
  },
  PENDING: {
    label: "Хүлээгдэж буй",
    icon: Clock,
    dotClass: "bg-amber-400",
    bgClass: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
    textClass: "text-amber-700 dark:text-amber-400",
    badgeClass: "",
    rowBg: "",
    tdBg: "bg-background",
    chartColor: "#eab308",
    nonSellable: false,
  },
  CLEANING: {
    label: "Хүлээгдэж буй",
    icon: Sparkles,
    dotClass: "bg-slate-400",
    bgClass: "bg-slate-50 border-slate-200 dark:bg-slate-900/30 dark:border-slate-700",
    textClass: "text-slate-600 dark:text-slate-400",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
    rowBg: "bg-slate-50 dark:bg-slate-900/30",
    tdBg: "bg-slate-50 dark:bg-slate-900/30",
    chartColor: "#f97316",
    nonSellable: true,
  },
  CLEANING_IN_PROGRESS: {
    label: "Цэвэрлэж буй",
    icon: PlayCircle,
    dotClass: "bg-purple-500",
    bgClass: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800",
    textClass: "text-purple-700 dark:text-purple-400",
    badgeClass: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700",
    rowBg: "bg-purple-50 dark:bg-purple-900/20",
    tdBg: "bg-purple-50 dark:bg-purple-900/20",
    chartColor: "#a855f7",
    nonSellable: true,
  },
  INSPECTED: {
    label: "Шалгагдсан",
    icon: ShieldCheck,
    dotClass: "bg-teal-500",
    bgClass: "bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800",
    textClass: "text-teal-700 dark:text-teal-400",
    badgeClass: "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900 dark:text-teal-300 dark:border-teal-700",
    rowBg: "bg-teal-50 dark:bg-teal-900/20",
    tdBg: "bg-teal-50 dark:bg-teal-900/20",
    chartColor: "#14b8a6",
    nonSellable: true,
  },
  OUT_OF_ORDER: {
    label: "Засвартай (OOO)",
    icon: WrenchIcon,
    dotClass: "bg-red-700",
    bgClass: "bg-red-100 border-red-300 dark:bg-red-950/50 dark:border-red-700",
    textClass: "text-red-800 dark:text-red-300",
    badgeClass: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700",
    rowBg: "bg-red-50 dark:bg-red-900/20",
    tdBg: "bg-red-50 dark:bg-red-900/20",
    chartColor: "#dc2626",
    nonSellable: true,
  },
  OUT_OF_SERVICE: {
    label: "Хаалттай (OOS)",
    icon: MinusCircle,
    dotClass: "bg-zinc-400",
    bgClass: "bg-zinc-100 border-zinc-300 dark:bg-zinc-900/40 dark:border-zinc-700",
    textClass: "text-zinc-600 dark:text-zinc-400",
    badgeClass: "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600",
    rowBg: "bg-zinc-50 dark:bg-zinc-900/30",
    tdBg: "bg-zinc-50 dark:bg-zinc-900/30",
    chartColor: "#71717a",
    nonSellable: true,
  },
  DUE_OUT: {
    label: "Гарах өдөр",
    icon: LogOut,
    dotClass: "bg-orange-500",
    bgClass: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
    textClass: "text-orange-700 dark:text-orange-400",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-700",
    rowBg: "bg-orange-50 dark:bg-orange-900/20",
    tdBg: "bg-orange-50 dark:bg-orange-900/20",
    chartColor: "#f97316",
    nonSellable: false,
  },
};

export function getRoomStatusConfig(status: string): RoomStatusConfig {
  return ROOM_STATUS_CONFIG[status as RoomStatus] ?? ROOM_STATUS_CONFIG.AVAILABLE;
}
