import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import {
  BedDouble, User, Phone, Calendar, CreditCard, Crown,
  CheckCircle, Clock, LogOut, ArrowRight, FileText,
  Banknote, CheckCheck, WrenchIcon, MinusCircle,
  ShieldCheck, PlayCircle, CalendarCheck, X,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ROOM_STATUS_CONFIG, getRoomStatusConfig } from "@/lib/room-status";
import type { RoomCategory, Booking, Guest, Floor } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface RoomGridItem {
  id: string;
  roomNumber: string;
  floor: string;
  categoryId: string;
  status: "AVAILABLE" | "OCCUPIED" | "DUE_OUT" | "PENDING" | "CLEANING" | "CLEANING_IN_PROGRESS" | "INSPECTED" | "OUT_OF_ORDER" | "OUT_OF_SERVICE";
  category: RoomCategory | null;
  activeBooking: Booking | null;
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    isVip: boolean;
    hasMedicalHistory: boolean;
  } | null;
}

const statusConfig = ROOM_STATUS_CONFIG;

const quickBookingSchema = z.object({
  guestId: z.string().min(1, "Зочин сонгоно уу"),
  checkIn: z.string().min(1, "Орох огноо оруулна уу"),
  checkOut: z.string().min(1, "Гарах огноо оруулна уу"),
  guestCount: z.number().min(1, "Хүний тоо оруулна уу"),
  totalAmount: z.string().min(1, "Нийт дүн оруулна уу"),
});

type QuickBookingValues = z.infer<typeof quickBookingSchema>;

const newGuestSchema = z.object({
  lastName: z.string().min(1, "Овог оруулна уу"),
  firstName: z.string().min(1, "Нэр оруулна уу"),
  idNumber: z.string().min(1, "Регистрийн дугаар оруулна уу"),
  phone: z.string().min(1, "Утасны дугаар оруулна уу"),
});

type NewGuestValues = z.infer<typeof newGuestSchema>;

const confirmedConfig = {
  label: "Баталгаажсан",
  bgClass: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
  dotClass: "bg-blue-500",
  textClass: "text-blue-700 dark:text-blue-400",
  icon: CheckCircle,
};

const noShowConfig = {
  label: "Ирээгүй",
  bgClass: "bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-700",
  dotClass: "bg-orange-500",
  textClass: "text-orange-700 dark:text-orange-400",
  icon: Clock,
};

function RoomCard({ room, onQuickBook, onPayment, onCheckout }: { room: RoomGridItem; onQuickBook: (room: RoomGridItem) => void; onPayment: (room: RoomGridItem) => void; onCheckout: (room: RoomGridItem) => void }) {
  const { toast } = useToast();
  const isConfirmedPending = room.status === "PENDING" && room.activeBooking?.status === "CONFIRMED";
  const isNoShow = room.activeBooking?.status === "NO_SHOW";
  const config = isNoShow ? noShowConfig : isConfirmedPending ? confirmedConfig : (statusConfig[room.status] ?? statusConfig.AVAILABLE);

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const isDueOut = room.status === "DUE_OUT" ||
    (room.status === "OCCUPIED" && room.activeBooking &&
    new Date(new Date(room.activeBooking.checkOut).setHours(0, 0, 0, 0)).getTime() === todayMidnight.getTime());
  const StatusIcon = config.icon;

  const checkinMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/bookings/${room.activeBooking!.id}/status`, { status: "CHECKED_IN" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({ title: "Амжилттай", description: `${room.roomNumber} өрөөнд check-in хийгдлээ` });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/bookings/${room.activeBooking!.id}/status`, { status: "CANCELLED" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({ title: "Цуцлагдлаа", description: `${room.roomNumber} өрөөний захиалга цуцлагдлаа` });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const statusChangeMutation = useMutation({
    mutationFn: (newStatus: string) => apiRequest("PATCH", `/api/rooms/${room.id}`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({ title: "Амжилттай", description: "Өрөөний төлөв өөрчлөгдлөө" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const balance = room.activeBooking
    ? Number(room.activeBooking.totalAmount) - Number(room.activeBooking.depositPaid)
    : 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`relative flex flex-col items-start gap-2 rounded-md border p-3 text-left transition-all cursor-pointer w-full ${config.bgClass}`}
          data-testid={`card-room-${room.roomNumber}`}
        >
          <div className="flex items-center justify-between w-full gap-1">
            <span className="text-lg font-bold tracking-tight" data-testid={`text-room-num-${room.roomNumber}`}>
              {room.roomNumber}
            </span>
            <div className={`h-2.5 w-2.5 rounded-full ${config.dotClass}`} />
          </div>
          <div className="flex items-center gap-1 w-full">
            <StatusIcon className={`h-3.5 w-3.5 ${config.textClass}`} />
            <span className={`text-xs font-medium ${config.textClass}`}>{config.label}</span>
          </div>
          <div className="flex items-center justify-between w-full gap-1">
            {room.category && (
              <span className="text-[10px] text-muted-foreground">{room.category.name}</span>
            )}
            {room.category && room.category.capacity > 1 && (
              <span
                className={`text-[10px] font-medium flex items-center gap-0.5 ${room.activeBooking ? "text-foreground" : "text-muted-foreground"}`}
                data-testid={`text-capacity-${room.roomNumber}`}
              >
                <BedDouble className="h-2.5 w-2.5" />
                {room.activeBooking ? `${room.activeBooking.guestCount}/` : "0/"}{room.category.capacity}
              </span>
            )}
          </div>
          {room.guest && (
            <div className="flex items-center gap-1 mt-0.5">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs truncate max-w-[100px]">
                {room.guest.lastName.charAt(0)}. {room.guest.firstName}
              </span>
              {room.guest.isVip && <Crown className="h-3 w-3 text-amber-500" />}
            </div>
          )}
          {room.activeBooking && (
            <div className="flex items-center gap-1 mt-0.5" data-testid={`text-dates-${room.roomNumber}`}>
              <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-[10px] text-muted-foreground">
                {new Date(room.activeBooking.checkIn).toLocaleDateString("mn-MN", { month: "2-digit", day: "2-digit" })}
                {" – "}
                {new Date(room.activeBooking.checkOut).toLocaleDateString("mn-MN", { month: "2-digit", day: "2-digit" })}
              </span>
            </div>
          )}
          {isDueOut && (
            <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1">
              <CalendarCheck className="h-3 w-3" />
              Гарах дөхсөн
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Өрөө {room.roomNumber}</span>
            </div>
            <Badge variant="outline" className={config.textClass}>
              {config.label}
            </Badge>
          </div>

          {room.category && (
            <div className="text-xs text-muted-foreground">
              {room.category.name} - {Number(room.category.basePrice).toLocaleString()}₮/хоног - {room.category.capacity} хүн
            </div>
          )}

          <Separator />

          {(room.status === "OCCUPIED" || room.status === "DUE_OUT") && room.guest && room.activeBooking && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium" data-testid={`text-popover-guest-${room.roomNumber}`}>
                    {room.guest.lastName} {room.guest.firstName}
                  </span>
                  {room.guest.isVip && (
                    <Badge variant="secondary" className="text-[10px] py-0">VIP</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{room.guest.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {new Date(room.activeBooking.checkIn).toLocaleDateString("mn-MN")} - {new Date(room.activeBooking.checkOut).toLocaleDateString("mn-MN")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    ЭМТ: {room.guest.hasMedicalHistory ? "Бүртгэлтэй" : "Бүртгэлгүй"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className={`text-xs font-medium ${balance > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    Үлдэгдэл: {balance.toLocaleString()}₮
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => onPayment(room)}
                  data-testid={`button-payment-${room.roomNumber}`}
                >
                  <Banknote className="h-3.5 w-3.5 mr-2" />
                  Төлбөр хийх
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onCheckout(room)}
                  className="w-full"
                  data-testid={`button-checkout-${room.roomNumber}`}
                >
                  <LogOut className="h-3.5 w-3.5 mr-2" />
                  {balance > 0 ? `Check-out (${balance.toLocaleString()}₮ үлдэгдэл)` : "Check-out хийх"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="w-full"
                >
                  <Link href={`/guests/${room.guest.id}`} data-testid={`link-guest-from-room-${room.roomNumber}`}>
                    <ArrowRight className="h-3.5 w-3.5 mr-2" />
                    Зочны дэлгэрэнгүй
                  </Link>
                </Button>
              </div>
              <Separator />
              <p className="text-xs font-medium text-muted-foreground">Яаралтай хаалт</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950 text-xs" onClick={() => statusChangeMutation.mutate("OUT_OF_ORDER")} disabled={statusChangeMutation.isPending} data-testid={`button-ooo-${room.roomNumber}`}>
                  <WrenchIcon className="h-3 w-3 mr-1" />OOO
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => statusChangeMutation.mutate("OUT_OF_SERVICE")} disabled={statusChangeMutation.isPending} data-testid={`button-oos-${room.roomNumber}`}>
                  <MinusCircle className="h-3 w-3 mr-1" />OOS
                </Button>
              </div>
            </div>
          )}

          {room.status === "PENDING" && room.guest && room.activeBooking && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {room.guest.lastName} {room.guest.firstName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {new Date(room.activeBooking.checkIn).toLocaleDateString("mn-MN")} - {new Date(room.activeBooking.checkOut).toLocaleDateString("mn-MN")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Нийт: {Number(room.activeBooking.totalAmount).toLocaleString()}₮ | Төлсөн: {Number(room.activeBooking.depositPaid).toLocaleString()}₮
                  </span>
                </div>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">
                {room.activeBooking.status === "NO_SHOW"
                  ? "⚠️ Зочин ирээгүй — Оройтлын check-in эсвэл цуцлах"
                  : room.activeBooking.status === "PENDING"
                  ? "Урьдчилгаа төлбөр хүлээгдэж байна"
                  : "Баталгаажсан - Check-in хийх боломжтой"}
              </p>
              <div className="flex flex-col gap-2">
                {room.activeBooking.status !== "NO_SHOW" && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => onPayment(room)}
                    data-testid={`button-payment-${room.roomNumber}`}
                  >
                    <Banknote className="h-3.5 w-3.5 mr-2" />
                    Төлбөр хийх
                  </Button>
                )}
                {(room.activeBooking.status === "CONFIRMED" || room.activeBooking.status === "NO_SHOW") && (
                  <Button
                    size="sm"
                    variant={room.activeBooking.status === "NO_SHOW" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => checkinMutation.mutate()}
                    disabled={checkinMutation.isPending}
                    data-testid={`button-checkin-${room.roomNumber}`}
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-2" />
                    {checkinMutation.isPending ? "Check-in хийж байна..." : "Check-in хийх"}
                  </Button>
                )}
                {room.activeBooking.status === "NO_SHOW" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full"
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    data-testid={`button-cancel-${room.roomNumber}`}
                  >
                    <X className="h-3.5 w-3.5 mr-2" />
                    {cancelMutation.isPending ? "Цуцалж байна..." : "Захиалга цуцлах"}
                  </Button>
                )}
              </div>
              <Separator />
              <p className="text-xs font-medium text-muted-foreground">Яаралтай хаалт</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950 text-xs" onClick={() => statusChangeMutation.mutate("OUT_OF_ORDER")} disabled={statusChangeMutation.isPending} data-testid={`button-ooo-${room.roomNumber}`}>
                  <WrenchIcon className="h-3 w-3 mr-1" />OOO
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => statusChangeMutation.mutate("OUT_OF_SERVICE")} disabled={statusChangeMutation.isPending} data-testid={`button-oos-${room.roomNumber}`}>
                  <MinusCircle className="h-3 w-3 mr-1" />OOS
                </Button>
              </div>
            </div>
          )}

          {room.status === "AVAILABLE" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Энэ өрөө захиалгад бэлэн</p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => onQuickBook(room)}
                data-testid={`button-quick-book-${room.roomNumber}`}
              >
                <Calendar className="h-3.5 w-3.5 mr-2" />
                Захиалга үүсгэх
              </Button>
              <Separator />
              <p className="text-xs font-medium text-muted-foreground">Өрөөний удирдлага</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                onClick={() => statusChangeMutation.mutate("OUT_OF_ORDER")}
                disabled={statusChangeMutation.isPending}
                data-testid={`button-ooo-${room.roomNumber}`}
              >
                <WrenchIcon className="h-3.5 w-3.5 mr-2" />
                Засварт оруулах (OOO)
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => statusChangeMutation.mutate("OUT_OF_SERVICE")}
                disabled={statusChangeMutation.isPending}
                data-testid={`button-oos-${room.roomNumber}`}
              >
                <MinusCircle className="h-3.5 w-3.5 mr-2" />
                Хаалттай болгох (OOS)
              </Button>
            </div>
          )}

          {room.status === "CLEANING" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Цэвэрлэгээ хийгдэхийг хүлээж байна</p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => statusChangeMutation.mutate("CLEANING_IN_PROGRESS")}
                disabled={statusChangeMutation.isPending}
                data-testid={`button-start-clean-${room.roomNumber}`}
              >
                <PlayCircle className="h-3.5 w-3.5 mr-2" />
                {statusChangeMutation.isPending ? "Шинэчилж байна..." : "Цэвэрлэж эхлэх"}
              </Button>
              <Separator />
              <p className="text-xs font-medium text-muted-foreground">Яаралтай хаалт</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950 text-xs" onClick={() => statusChangeMutation.mutate("OUT_OF_ORDER")} disabled={statusChangeMutation.isPending} data-testid={`button-ooo-${room.roomNumber}`}>
                  <WrenchIcon className="h-3 w-3 mr-1" />OOO
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => statusChangeMutation.mutate("OUT_OF_SERVICE")} disabled={statusChangeMutation.isPending} data-testid={`button-oos-${room.roomNumber}`}>
                  <MinusCircle className="h-3 w-3 mr-1" />OOS
                </Button>
              </div>
            </div>
          )}

          {room.status === "CLEANING_IN_PROGRESS" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-purple-600 dark:text-purple-400">Цэвэрлэгч одоо ажиллаж байна</p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => statusChangeMutation.mutate("INSPECTED")}
                disabled={statusChangeMutation.isPending}
                data-testid={`button-finish-clean-${room.roomNumber}`}
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                {statusChangeMutation.isPending ? "Шинэчилж байна..." : "Цэвэрлэгээ дуусгах"}
              </Button>
              <Separator />
              <p className="text-xs font-medium text-muted-foreground">Яаралтай хаалт</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950 text-xs" onClick={() => statusChangeMutation.mutate("OUT_OF_ORDER")} disabled={statusChangeMutation.isPending} data-testid={`button-ooo-${room.roomNumber}`}>
                  <WrenchIcon className="h-3 w-3 mr-1" />OOO
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => statusChangeMutation.mutate("OUT_OF_SERVICE")} disabled={statusChangeMutation.isPending} data-testid={`button-oos-${room.roomNumber}`}>
                  <MinusCircle className="h-3 w-3 mr-1" />OOS
                </Button>
              </div>
            </div>
          )}

          {room.status === "INSPECTED" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-teal-600 dark:text-teal-400">Менежерийн шалгалт хүлээж байна</p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => statusChangeMutation.mutate("AVAILABLE")}
                disabled={statusChangeMutation.isPending}
                data-testid={`button-approve-${room.roomNumber}`}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-2" />
                {statusChangeMutation.isPending ? "Шинэчилж байна..." : "Баталгаажуулах — Сул болгох"}
              </Button>
              <Separator />
              <p className="text-xs font-medium text-muted-foreground">Яаралтай хаалт</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950 text-xs" onClick={() => statusChangeMutation.mutate("OUT_OF_ORDER")} disabled={statusChangeMutation.isPending} data-testid={`button-ooo-${room.roomNumber}`}>
                  <WrenchIcon className="h-3 w-3 mr-1" />OOO
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => statusChangeMutation.mutate("OUT_OF_SERVICE")} disabled={statusChangeMutation.isPending} data-testid={`button-oos-${room.roomNumber}`}>
                  <MinusCircle className="h-3 w-3 mr-1" />OOS
                </Button>
              </div>
            </div>
          )}

          {room.status === "OUT_OF_ORDER" && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">⚠️ Засвар хийгдэж байна</p>
              <p className="text-xs text-muted-foreground">Борлуулах боломжгүй өрөө</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => statusChangeMutation.mutate("AVAILABLE")}
                disabled={statusChangeMutation.isPending}
                data-testid={`button-repair-done-${room.roomNumber}`}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-2" />
                {statusChangeMutation.isPending ? "Шинэчилж байна..." : "Засвар дуусгах — Нээх"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => statusChangeMutation.mutate("OUT_OF_SERVICE")}
                disabled={statusChangeMutation.isPending}
                data-testid={`button-ooo-to-oos-${room.roomNumber}`}
              >
                <MinusCircle className="h-3.5 w-3.5 mr-2" />
                {statusChangeMutation.isPending ? "Шинэчилж байна..." : "Хаалттай болгох (OOS)"}
              </Button>
            </div>
          )}

          {room.status === "OUT_OF_SERVICE" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Өрөө түр хаалттай (шаардлага гарвал нээх боломжтой)</p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => statusChangeMutation.mutate("AVAILABLE")}
                disabled={statusChangeMutation.isPending}
                data-testid={`button-reopen-${room.roomNumber}`}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-2" />
                {statusChangeMutation.isPending ? "Шинэчилж байна..." : "Нээх — Захиалгад бэлэн болгох"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                onClick={() => statusChangeMutation.mutate("OUT_OF_ORDER")}
                disabled={statusChangeMutation.isPending}
                data-testid={`button-oos-to-ooo-${room.roomNumber}`}
              >
                <WrenchIcon className="h-3.5 w-3.5 mr-2" />
                Засварт оруулах (OOO)
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const paymentSchema = z.object({
  amount: z.string().min(1, "Дүн оруулна уу"),
  type: z.enum(["DEPOSIT", "FINAL"]),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER"]),
});

type PaymentValues = z.infer<typeof paymentSchema>;

export default function RoomGridPage() {
  const { toast } = useToast();
  const [selectedFloor, setSelectedFloor] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [quickBookRoom, setQuickBookRoom] = useState<RoomGridItem | null>(null);
  const [paymentRoom, setPaymentRoom] = useState<RoomGridItem | null>(null);
  const [checkoutRoom, setCheckoutRoom] = useState<RoomGridItem | null>(null);
  const [showNewGuestForm, setShowNewGuestForm] = useState(false);

  const { data: roomGrid = [], isLoading } = useQuery<RoomGridItem[]>({
    queryKey: ["/api/room-grid"],
  });

  const { data: allGuests = [] } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  const { data: dbFloors = [] } = useQuery<Floor[]>({
    queryKey: ["/api/floors"],
  });

  const floorNameMap = dbFloors.reduce<Record<string, string>>((acc, f) => {
    acc[f.number] = f.name;
    return acc;
  }, {});

  const floors = Array.from(
    new Set([...dbFloors.map(f => f.number), ...roomGrid.map((r) => r.floor)])
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const statusFilteredRooms = selectedStatus === "all" ? roomGrid : roomGrid.filter((r) => {
    switch (selectedStatus) {
      case "AVAILABLE": return r.status === "AVAILABLE";
      case "OCCUPIED": return r.status === "OCCUPIED" || r.status === "DUE_OUT";
      case "DUE_OUT": return r.status === "DUE_OUT";
      case "PENDING": return r.status === "PENDING" && r.activeBooking?.status !== "CONFIRMED" && r.activeBooking?.status !== "NO_SHOW";
      case "CONFIRMED": return r.status === "PENDING" && r.activeBooking?.status === "CONFIRMED";
      case "NO_SHOW": return r.activeBooking?.status === "NO_SHOW";
      case "CLEANING": return r.status === "CLEANING" || r.status === "CLEANING_IN_PROGRESS" || r.status === "INSPECTED";
      case "OUT_OF_ORDER": return r.status === "OUT_OF_ORDER";
      case "OUT_OF_SERVICE": return r.status === "OUT_OF_SERVICE";
      default: return true;
    }
  });

  const filteredRooms = selectedFloor === "all"
    ? statusFilteredRooms
    : statusFilteredRooms.filter((r) => String(r.floor) === selectedFloor);

  const sortedRooms = [...filteredRooms].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));

  const todayMidnightForStats = new Date();
  todayMidnightForStats.setHours(0, 0, 0, 0);

  const stats = {
    total: roomGrid.length,
    sellable: roomGrid.filter(r => r.status !== "OUT_OF_ORDER" && r.status !== "OUT_OF_SERVICE").length,
    available: roomGrid.filter((r) => r.status === "AVAILABLE").length,
    occupied: roomGrid.filter((r) => r.status === "OCCUPIED" || r.status === "DUE_OUT").length,
    dueOut: roomGrid.filter((r) => r.status === "DUE_OUT").length,
    pending: roomGrid.filter((r) => r.status === "PENDING" && r.activeBooking?.status !== "CONFIRMED" && r.activeBooking?.status !== "NO_SHOW").length,
    confirmed: roomGrid.filter((r) => r.status === "PENDING" && r.activeBooking?.status === "CONFIRMED").length,
    noShow: roomGrid.filter((r) => r.activeBooking?.status === "NO_SHOW").length,
    cleaning: roomGrid.filter((r) => r.status === "CLEANING").length,
    cleaningInProgress: roomGrid.filter((r) => r.status === "CLEANING_IN_PROGRESS").length,
    inspected: roomGrid.filter((r) => r.status === "INSPECTED").length,
    outOfOrder: roomGrid.filter((r) => r.status === "OUT_OF_ORDER").length,
    outOfService: roomGrid.filter((r) => r.status === "OUT_OF_SERVICE").length,
  };

  const form = useForm<QuickBookingValues>({
    resolver: zodResolver(quickBookingSchema),
    defaultValues: { guestId: "", checkIn: "", checkOut: "", guestCount: 1, totalAmount: "" },
  });

  const bookMutation = useMutation({
    mutationFn: (data: QuickBookingValues) =>
      apiRequest("POST", "/api/bookings", {
        guestId: data.guestId,
        roomId: quickBookRoom!.id,
        checkIn: new Date(data.checkIn).toISOString(),
        checkOut: new Date(data.checkOut).toISOString(),
        guestCount: data.guestCount,
        totalAmount: data.totalAmount,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setQuickBookRoom(null);
      form.reset();
      toast({ title: "Амжилттай", description: "Захиалга үүслээ. Урьдчилгаа төлбөр төлөгдсөний дараа баталгаажна." });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const onQuickBookSubmit = (values: QuickBookingValues) => {
    bookMutation.mutate(values);
  };

  const newGuestForm = useForm<NewGuestValues>({
    resolver: zodResolver(newGuestSchema),
    defaultValues: { lastName: "", firstName: "", idNumber: "", phone: "" },
  });

  const createGuestMutation = useMutation({
    mutationFn: (data: NewGuestValues) => apiRequest("POST", "/api/guests", data),
    onSuccess: async (newGuest: Guest) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      form.setValue("guestId", newGuest.id);
      newGuestForm.reset();
      setShowNewGuestForm(false);
      toast({ title: "Зочин бүртгэгдлээ", description: `${newGuest.lastName} ${newGuest.firstName} амжилттай нэмэгдлээ` });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const paymentForm = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: "", type: "DEPOSIT", paymentMethod: "CASH" },
  });

  const paymentMutation = useMutation({
    mutationFn: (data: PaymentValues) =>
      apiRequest("POST", "/api/transactions", {
        bookingId: paymentRoom!.activeBooking!.id,
        amount: data.amount,
        type: data.type,
        paymentMethod: data.paymentMethod,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setPaymentRoom(null);
      paymentForm.reset();
      toast({ title: "Амжилттай", description: "Төлбөр амжилттай бүртгэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const onPaymentSubmit = (values: PaymentValues) => {
    paymentMutation.mutate(values);
  };

  const checkoutPaymentForm = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: "", type: "FINAL", paymentMethod: "CASH" },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const room = checkoutRoom!;
      const booking = room.activeBooking!;
      const balance = Number(booking.totalAmount) - Number(booking.depositPaid);
      const paymentAmount = Number(checkoutPaymentForm.getValues("amount"));
      if (balance > 0) {
        if (paymentAmount < balance) {
          throw new Error(`Үлдэгдэл дүн (${balance.toLocaleString()}₮)-ээс бага төлбөр хийх боломжгүй`);
        }
        await apiRequest("POST", "/api/transactions", {
          bookingId: booking.id,
          amount: String(balance),
          type: checkoutPaymentForm.getValues("type"),
          paymentMethod: checkoutPaymentForm.getValues("paymentMethod"),
        });
      }
      return apiRequest("PATCH", `/api/bookings/${booking.id}/status`, { status: "CHECKED_OUT" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setCheckoutRoom(null);
      checkoutPaymentForm.reset();
      toast({ title: "Амжилттай", description: `Check-out амжилттай хийгдлээ` });
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const openCheckout = (room: RoomGridItem) => {
    setCheckoutRoom(room);
    const balance = Number(room.activeBooking!.totalAmount) - Number(room.activeBooking!.depositPaid);
    checkoutPaymentForm.reset({ amount: String(balance), type: "FINAL", paymentMethod: "CASH" });
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-6 space-y-6" data-testid="page-room-grid">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-room-grid-title">
          Өрөөний хяналтын самбар
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Бүх өрөөний бодит цагийн төлөв
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSelectedStatus("all")}
          data-testid="button-status-filter-all"
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${selectedStatus === "all" ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border hover:border-foreground/40"}`}
        >
          Бүгд
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedStatus === "all" ? "bg-background/20" : "bg-muted"}`}>{stats.total}</span>
        </button>
        <button
          onClick={() => setSelectedStatus("AVAILABLE")}
          data-testid="button-status-filter-available"
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${selectedStatus === "AVAILABLE" ? "bg-green-600 text-white border-green-600" : "bg-green-50 text-green-700 border-green-200 hover:border-green-400 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"}`}
        >
          <div className="h-2 w-2 rounded-full bg-green-500" />
          Сул
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedStatus === "AVAILABLE" ? "bg-white/20" : "bg-green-100 dark:bg-green-900/40"}`}>{stats.available}</span>
        </button>
        <button
          onClick={() => setSelectedStatus("OCCUPIED")}
          data-testid="button-status-filter-occupied"
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${selectedStatus === "OCCUPIED" ? "bg-red-600 text-white border-red-600" : "bg-red-50 text-red-700 border-red-200 hover:border-red-400 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"}`}
        >
          <div className="h-2 w-2 rounded-full bg-red-500" />
          Дүүрсэн
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedStatus === "OCCUPIED" ? "bg-white/20" : "bg-red-100 dark:bg-red-900/40"}`}>{stats.occupied}</span>
        </button>
        {stats.dueOut > 0 && (
          <button
            onClick={() => setSelectedStatus("DUE_OUT")}
            data-testid="button-status-filter-due-out"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${selectedStatus === "DUE_OUT" ? "bg-orange-500 text-white border-orange-500" : "bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800"}`}
          >
            <CalendarCheck className="h-3 w-3" />
            Гарах өдөр
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedStatus === "DUE_OUT" ? "bg-white/20" : "bg-orange-100 dark:bg-orange-900/40"}`}>{stats.dueOut}</span>
          </button>
        )}
        <button
          onClick={() => setSelectedStatus("PENDING")}
          data-testid="button-status-filter-pending"
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${selectedStatus === "PENDING" ? "bg-amber-500 text-white border-amber-500" : "bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"}`}
        >
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          Хүлээгдэж буй
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedStatus === "PENDING" ? "bg-white/20" : "bg-amber-100 dark:bg-amber-900/40"}`}>{stats.pending}</span>
        </button>
        {stats.confirmed > 0 && (
          <button
            onClick={() => setSelectedStatus("CONFIRMED")}
            data-testid="button-status-filter-confirmed"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${selectedStatus === "CONFIRMED" ? "bg-blue-600 text-white border-blue-600" : "bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"}`}
          >
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            Баталгаажсан
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedStatus === "CONFIRMED" ? "bg-white/20" : "bg-blue-100 dark:bg-blue-900/40"}`}>{stats.confirmed}</span>
          </button>
        )}
        {stats.noShow > 0 && (
          <button
            onClick={() => setSelectedStatus("NO_SHOW")}
            data-testid="button-status-filter-no-show"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${selectedStatus === "NO_SHOW" ? "bg-orange-600 text-white border-orange-600" : "bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800"}`}
          >
            <div className="h-2 w-2 rounded-full bg-orange-500" />
            Ирээгүй
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedStatus === "NO_SHOW" ? "bg-white/20" : "bg-orange-100 dark:bg-orange-900/40"}`}>{stats.noShow}</span>
          </button>
        )}
        <button
          onClick={() => setSelectedStatus("CLEANING")}
          data-testid="button-status-filter-cleaning"
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${selectedStatus === "CLEANING" ? "bg-slate-600 text-white border-slate-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-700"}`}
        >
          <div className="h-2 w-2 rounded-full bg-slate-400" />
          Цэвэрлэгээ
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedStatus === "CLEANING" ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}`}>{stats.cleaning + stats.cleaningInProgress + stats.inspected}</span>
        </button>
        {stats.outOfOrder > 0 && (
          <button
            onClick={() => setSelectedStatus("OUT_OF_ORDER")}
            data-testid="button-status-filter-ooo"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${selectedStatus === "OUT_OF_ORDER" ? "bg-red-700 text-white border-red-700" : "bg-red-50 text-red-800 border-red-300 hover:border-red-500 dark:bg-red-950/50 dark:text-red-300 dark:border-red-700"}`}
          >
            <div className="h-2 w-2 rounded-full bg-red-700" />
            Засвартай (OOO)
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedStatus === "OUT_OF_ORDER" ? "bg-white/20" : "bg-red-100 dark:bg-red-900/40"}`}>{stats.outOfOrder}</span>
          </button>
        )}
        {stats.outOfService > 0 && (
          <button
            onClick={() => setSelectedStatus("OUT_OF_SERVICE")}
            data-testid="button-status-filter-oos"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${selectedStatus === "OUT_OF_SERVICE" ? "bg-zinc-600 text-white border-zinc-600" : "bg-zinc-50 text-zinc-600 border-zinc-300 hover:border-zinc-500 dark:bg-zinc-900/40 dark:text-zinc-400 dark:border-zinc-700"}`}
          >
            <div className="h-2 w-2 rounded-full bg-zinc-400" />
            Хаалттай (OOS)
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedStatus === "OUT_OF_SERVICE" ? "bg-white/20" : "bg-zinc-100 dark:bg-zinc-800"}`}>{stats.outOfService}</span>
          </button>
        )}
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground border-l pl-3">
          <span>Борлуулах:</span>
          <span className="font-semibold text-foreground">{stats.sellable}/{stats.total}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant={selectedFloor === "all" ? "default" : "outline"}
          onClick={() => setSelectedFloor("all")}
          data-testid="button-floor-all"
        >
          Бүх давхар
        </Button>
        {floors.map((floor) => (
          <Button
            key={floor}
            size="sm"
            variant={selectedFloor === String(floor) ? "default" : "outline"}
            onClick={() => setSelectedFloor(String(floor))}
            data-testid={`button-floor-${floor}`}
          >
            {floorNameMap[floor] || `${floor}-р давхар`}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-md" />
          ))}
        </div>
      ) : sortedRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <BedDouble className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground" data-testid="text-no-rooms-grid">
            {selectedFloor === "all" ? "Өрөө бүртгэгдээгүй байна" : `${floorNameMap[selectedFloor] || selectedFloor} давхарт өрөө бүртгэгдээгүй`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {sortedRooms.map((room) => (
            <RoomCard key={room.id} room={room} onQuickBook={setQuickBookRoom} onPayment={setPaymentRoom} onCheckout={openCheckout} />
          ))}
        </div>
      )}

      <Dialog open={!!quickBookRoom} onOpenChange={(open) => { if (!open) { setQuickBookRoom(null); setShowNewGuestForm(false); newGuestForm.reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-quick-book-title">
              Захиалга үүсгэх - Өрөө {quickBookRoom?.roomNumber}
            </DialogTitle>
            <DialogDescription>
              {quickBookRoom?.category?.name} - {quickBookRoom?.category && Number(quickBookRoom.category.basePrice).toLocaleString()}₮/хоног
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onQuickBookSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="guestId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Зочин</FormLabel>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={() => setShowNewGuestForm(!showNewGuestForm)}
                        data-testid="button-add-new-guest"
                      >
                        <X className={`h-3 w-3 transition-transform ${showNewGuestForm ? "" : "rotate-45"}`} />
                        {showNewGuestForm ? "Болих" : "Шинэ зочин"}
                      </Button>
                    </div>
                    {!showNewGuestForm ? (
                      <>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-quick-book-guest">
                              <SelectValue placeholder="Зочин сонгох" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {allGuests.map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.lastName} {g.firstName} ({g.idNumber})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </>
                    ) : (
                      <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                        <p className="text-xs font-medium text-muted-foreground">Шинэ зочин бүртгэх</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Овог</label>
                            <Input
                              placeholder="Овог"
                              className="h-8 text-sm"
                              {...newGuestForm.register("lastName")}
                              data-testid="input-new-guest-lastname"
                            />
                            {newGuestForm.formState.errors.lastName && (
                              <p className="text-xs text-destructive">{newGuestForm.formState.errors.lastName.message}</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Нэр</label>
                            <Input
                              placeholder="Нэр"
                              className="h-8 text-sm"
                              {...newGuestForm.register("firstName")}
                              data-testid="input-new-guest-firstname"
                            />
                            {newGuestForm.formState.errors.firstName && (
                              <p className="text-xs text-destructive">{newGuestForm.formState.errors.firstName.message}</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Регистр №</label>
                            <Input
                              placeholder="АА12345678"
                              className="h-8 text-sm"
                              {...newGuestForm.register("idNumber")}
                              data-testid="input-new-guest-id"
                            />
                            {newGuestForm.formState.errors.idNumber && (
                              <p className="text-xs text-destructive">{newGuestForm.formState.errors.idNumber.message}</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Утас</label>
                            <Input
                              placeholder="99001122"
                              className="h-8 text-sm"
                              {...newGuestForm.register("phone")}
                              data-testid="input-new-guest-phone"
                            />
                            {newGuestForm.formState.errors.phone && (
                              <p className="text-xs text-destructive">{newGuestForm.formState.errors.phone.message}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="w-full h-8 text-sm"
                          onClick={() => newGuestForm.handleSubmit((data) => createGuestMutation.mutate(data))()}
                          disabled={createGuestMutation.isPending}
                          data-testid="button-save-new-guest"
                        >
                          {createGuestMutation.isPending ? "Бүртгэж байна..." : "Зочин бүртгэх"}
                        </Button>
                      </div>
                    )}
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="checkIn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Орох огноо</FormLabel>
                      <FormControl>
                        <Input type="date" defaultValue={today} {...field} data-testid="input-quick-book-checkin" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="checkOut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Гарах огноо</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-quick-book-checkout" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="guestCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Хүний тоо</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={quickBookRoom?.category?.capacity || 10}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-quick-book-guest-count"
                      />
                    </FormControl>
                    {quickBookRoom?.category && (
                      <p className="text-xs text-muted-foreground">Багтаамж: {quickBookRoom.category.capacity} хүн</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Нийт дүн (₮)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={quickBookRoom?.category ? Number(quickBookRoom.category.basePrice).toString() : "0"}
                        {...field}
                        data-testid="input-quick-book-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setQuickBookRoom(null)} data-testid="button-cancel-quick-book">
                  Цуцлах
                </Button>
                <Button type="submit" disabled={bookMutation.isPending} data-testid="button-confirm-quick-book">
                  {bookMutation.isPending ? "Захиалж байна..." : "Захиалах"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!paymentRoom} onOpenChange={(open) => { if (!open) { setPaymentRoom(null); paymentForm.reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-payment-title">
              Төлбөр хийх - Өрөө {paymentRoom?.roomNumber}
            </DialogTitle>
            <DialogDescription>
              {paymentRoom?.guest && `${paymentRoom.guest.lastName} ${paymentRoom.guest.firstName}`}
              {paymentRoom?.activeBooking && ` | Нийт: ${Number(paymentRoom.activeBooking.totalAmount).toLocaleString()}₮ | Төлсөн: ${Number(paymentRoom.activeBooking.depositPaid).toLocaleString()}₮ | Үлдэгдэл: ${(Number(paymentRoom.activeBooking.totalAmount) - Number(paymentRoom.activeBooking.depositPaid)).toLocaleString()}₮`}
            </DialogDescription>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
              <FormField
                control={paymentForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Төлбөрийн төрөл</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DEPOSIT">Урьдчилгаа төлбөр</SelectItem>
                        <SelectItem value="FINAL">Эцсийн төлбөр</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дүн (₮)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={paymentRoom?.activeBooking ? String(Number(paymentRoom.activeBooking.totalAmount) - Number(paymentRoom.activeBooking.depositPaid)) : "0"}
                        {...field}
                        data-testid="input-payment-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Төлбөрийн хэлбэр</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-method">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CASH">Бэлэн мөнгө</SelectItem>
                        <SelectItem value="CARD">Карт</SelectItem>
                        <SelectItem value="TRANSFER">Шилжүүлэг</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setPaymentRoom(null); paymentForm.reset(); }} data-testid="button-cancel-payment">
                  Цуцлах
                </Button>
                <Button type="submit" disabled={paymentMutation.isPending} data-testid="button-confirm-payment">
                  {paymentMutation.isPending ? "Бүртгэж байна..." : "Төлбөр бүртгэх"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkoutRoom} onOpenChange={(open) => { if (!open) { setCheckoutRoom(null); checkoutPaymentForm.reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-checkout-title">
              Check-out - Өрөө {checkoutRoom?.roomNumber}
            </DialogTitle>
            <DialogDescription>
              {checkoutRoom?.guest && `${checkoutRoom.guest.lastName} ${checkoutRoom.guest.firstName}`}
              {checkoutRoom?.activeBooking && ` | Нийт: ${Number(checkoutRoom.activeBooking.totalAmount).toLocaleString()}₮ | Төлсөн: ${Number(checkoutRoom.activeBooking.depositPaid).toLocaleString()}₮`}
            </DialogDescription>
          </DialogHeader>
          {checkoutRoom?.activeBooking && (() => {
            const balance = Number(checkoutRoom.activeBooking.totalAmount) - Number(checkoutRoom.activeBooking.depositPaid);
            if (balance <= 0) {
              return (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Бүх төлбөр төлөгдсөн. Check-out хийх үү?</p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setCheckoutRoom(null); checkoutPaymentForm.reset(); }} data-testid="button-cancel-checkout">
                      Цуцлах
                    </Button>
                    <Button variant="destructive" onClick={() => checkoutMutation.mutate()} disabled={checkoutMutation.isPending} data-testid="button-confirm-checkout">
                      {checkoutMutation.isPending ? "Гарч байна..." : "Check-out хийх"}
                    </Button>
                  </div>
                </div>
              );
            }
            return (
              <Form {...checkoutPaymentForm}>
                <form onSubmit={checkoutPaymentForm.handleSubmit(() => checkoutMutation.mutate())} className="space-y-4">
                  <div className="rounded-md border p-3 bg-amber-50 dark:bg-amber-950 text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-200">Үлдэгдэл төлбөр: {balance.toLocaleString()}₮</p>
                    <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">Check-out хийхийн өмнө үлдэгдэл төлбөрийг төлнө үү</p>
                  </div>
                  <FormField
                    control={checkoutPaymentForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Төлбөрийн дүн (₮)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-checkout-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={checkoutPaymentForm.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Төлбөрийн хэлбэр</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-checkout-payment-method">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CASH">Бэлэн мөнгө</SelectItem>
                            <SelectItem value="CARD">Карт</SelectItem>
                            <SelectItem value="TRANSFER">Шилжүүлэг</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setCheckoutRoom(null); checkoutPaymentForm.reset(); }} data-testid="button-cancel-checkout">
                      Цуцлах
                    </Button>
                    <Button type="submit" variant="destructive" disabled={checkoutMutation.isPending} data-testid="button-confirm-checkout">
                      {checkoutMutation.isPending ? "Гарч байна..." : "Төлбөр төлж Check-out хийх"}
                    </Button>
                  </div>
                </form>
              </Form>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
