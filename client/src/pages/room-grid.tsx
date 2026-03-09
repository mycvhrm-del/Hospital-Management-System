import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import {
  BedDouble, User, Phone, Calendar, CreditCard, Crown,
  CheckCircle, Clock, Sparkles, LogOut, ArrowRight, FileText,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RoomCategory, Booking, Guest } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
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
  categoryId: string;
  status: "AVAILABLE" | "OCCUPIED" | "PENDING" | "CLEANING";
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

const statusConfig = {
  AVAILABLE: {
    label: "Сул",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle,
  },
  OCCUPIED: {
    label: "Эзэлсэн",
    bgClass: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800",
    dotClass: "bg-rose-500",
    textClass: "text-rose-700 dark:text-rose-400",
    icon: User,
  },
  PENDING: {
    label: "Хүлээгдэж буй",
    bgClass: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
    dotClass: "bg-amber-500",
    textClass: "text-amber-700 dark:text-amber-400",
    icon: Clock,
  },
  CLEANING: {
    label: "Цэвэрлэгээ",
    bgClass: "bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700",
    dotClass: "bg-slate-400",
    textClass: "text-slate-600 dark:text-slate-400",
    icon: Sparkles,
  },
};

const quickBookingSchema = z.object({
  guestId: z.string().min(1, "Зочин сонгоно уу"),
  checkIn: z.string().min(1, "Орох огноо оруулна уу"),
  checkOut: z.string().min(1, "Гарах огноо оруулна уу"),
  totalAmount: z.string().min(1, "Нийт дүн оруулна уу"),
});

type QuickBookingValues = z.infer<typeof quickBookingSchema>;

function RoomCard({ room, onQuickBook }: { room: RoomGridItem; onQuickBook: (room: RoomGridItem) => void }) {
  const { toast } = useToast();
  const config = statusConfig[room.status];
  const StatusIcon = config.icon;

  const checkoutMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/bookings/${room.activeBooking!.id}/status`, { status: "CHECKED_OUT" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({ title: "Амжилттай", description: `${room.roomNumber} өрөөнөөс check-out хийгдлээ` });
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
          {room.category && (
            <span className="text-[10px] text-muted-foreground">{room.category.name}</span>
          )}
          {room.guest && (
            <div className="flex items-center gap-1 mt-0.5">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs truncate max-w-[100px]">
                {room.guest.lastName.charAt(0)}. {room.guest.firstName}
              </span>
              {room.guest.isVip && <Crown className="h-3 w-3 text-amber-500" />}
            </div>
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

          {room.status === "OCCUPIED" && room.guest && room.activeBooking && (
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
                  variant="destructive"
                  onClick={() => checkoutMutation.mutate()}
                  disabled={checkoutMutation.isPending}
                  className="w-full"
                  data-testid={`button-checkout-${room.roomNumber}`}
                >
                  <LogOut className="h-3.5 w-3.5 mr-2" />
                  {checkoutMutation.isPending ? "Гарч байна..." : "Check-out хийх"}
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
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">Захиалга баталгаажаагүй байна</p>
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
                Хурдан захиалга
              </Button>
            </div>
          )}

          {room.status === "CLEANING" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Цэвэрлэгээ хийгдэж байна</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => statusChangeMutation.mutate("AVAILABLE")}
                disabled={statusChangeMutation.isPending}
                data-testid={`button-clean-done-${room.roomNumber}`}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-2" />
                {statusChangeMutation.isPending ? "Шинэчилж байна..." : "Цэвэрлэгээ дууссан"}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function RoomGridPage() {
  const { toast } = useToast();
  const [selectedFloor, setSelectedFloor] = useState<string>("all");
  const [quickBookRoom, setQuickBookRoom] = useState<RoomGridItem | null>(null);

  const { data: roomGrid = [], isLoading } = useQuery<RoomGridItem[]>({
    queryKey: ["/api/room-grid"],
  });

  const { data: allGuests = [] } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  const floors = Array.from(
    new Set(roomGrid.map((r) => r.roomNumber.charAt(0)))
  ).sort();

  const filteredRooms = selectedFloor === "all"
    ? roomGrid
    : roomGrid.filter((r) => r.roomNumber.charAt(0) === selectedFloor);

  const sortedRooms = [...filteredRooms].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));

  const stats = {
    total: roomGrid.length,
    available: roomGrid.filter((r) => r.status === "AVAILABLE").length,
    occupied: roomGrid.filter((r) => r.status === "OCCUPIED").length,
    pending: roomGrid.filter((r) => r.status === "PENDING").length,
    cleaning: roomGrid.filter((r) => r.status === "CLEANING").length,
  };

  const form = useForm<QuickBookingValues>({
    resolver: zodResolver(quickBookingSchema),
    defaultValues: { guestId: "", checkIn: "", checkOut: "", totalAmount: "" },
  });

  const bookMutation = useMutation({
    mutationFn: (data: QuickBookingValues) =>
      apiRequest("POST", "/api/bookings", {
        guestId: data.guestId,
        roomId: quickBookRoom!.id,
        checkIn: new Date(data.checkIn).toISOString(),
        checkOut: new Date(data.checkOut).toISOString(),
        totalAmount: data.totalAmount,
        status: "CHECKED_IN",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setQuickBookRoom(null);
      form.reset();
      toast({ title: "Амжилттай", description: "Захиалга амжилттай үүслээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const onQuickBookSubmit = (values: QuickBookingValues) => {
    bookMutation.mutate(values);
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

      <div className="flex items-center gap-6 flex-wrap text-sm">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Сул ({stats.available})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-rose-500" />
          <span className="text-muted-foreground">Эзэлсэн ({stats.occupied})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Хүлээгдэж буй ({stats.pending})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-slate-400" />
          <span className="text-muted-foreground">Цэвэрлэгээ ({stats.cleaning})</span>
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
            variant={selectedFloor === floor ? "default" : "outline"}
            onClick={() => setSelectedFloor(floor)}
            data-testid={`button-floor-${floor}`}
          >
            {floor}-р давхар
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
            {selectedFloor === "all" ? "Өрөө бүртгэгдээгүй байна" : `${selectedFloor}-р давхарт өрөө байхгүй`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {sortedRooms.map((room) => (
            <RoomCard key={room.id} room={room} onQuickBook={setQuickBookRoom} />
          ))}
        </div>
      )}

      <Dialog open={!!quickBookRoom} onOpenChange={(open) => !open && setQuickBookRoom(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-quick-book-title">
              Хурдан захиалга - Өрөө {quickBookRoom?.roomNumber}
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
                    <FormLabel>Зочин</FormLabel>
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
    </div>
  );
}
