import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, ChevronRight, CalendarDays, User, Phone, Crown, Users, Clock, LogIn, LogOut } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RoomCategory } from "@shared/schema";

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

interface TimelineGuest {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  isVip: boolean;
}

interface TimelineBooking {
  id: string;
  guestId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: string;
  depositPaid: string;
  guest: TimelineGuest | null;
  familyMembers: { id: string; firstName: string; lastName: string }[];
}

interface TimelineRoom {
  id: string;
  roomNumber: string;
  floor: number;
  status: string;
  category: RoomCategory | null;
  bookings: TimelineBooking[];
}

interface TimelineData {
  start: string;
  end: string;
  rooms: TimelineRoom[];
}

const DAYS_MN = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];
const MONTHS_MN = ["1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
  "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар"];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-400/80",
  CONFIRMED: "bg-blue-400/80",
  CHECKED_IN: "bg-emerald-500/80",
  NO_SHOW: "bg-orange-500/80",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Хүлээгдэж буй",
  CONFIRMED: "Баталгаажсан",
  CHECKED_IN: "Дүүрсэн",
  NO_SHOW: "Ирээгүй",
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDays(start: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

const quickBookingSchema = z.object({
  guestSearch: z.string().min(2, "2+ тэмдэгт оруулна уу"),
  checkOut: z.string().min(1, "Гарах огноо оруулна уу"),
  guestCount: z.number().min(1, "Хүний тоо оруулна уу"),
  depositAmount: z.string().default("0"),
});

type QuickBookingForm = z.infer<typeof quickBookingSchema>;

interface SearchGuest {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  idNumber: string;
}

export default function WeeklyTimelinePage() {
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [quickBookOpen, setQuickBookOpen] = useState(false);
  const [quickBookRoom, setQuickBookRoom] = useState<TimelineRoom | null>(null);
  const [quickBookDate, setQuickBookDate] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchGuest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<SearchGuest | null>(null);
  const [searching, setSearching] = useState(false);

  const days = useMemo(() => getDays(weekStart), [weekStart]);
  const startParam = formatDate(weekStart);

  const { data: timeline, isLoading } = useQuery<TimelineData>({
    queryKey: ["/api/weekly-timeline", `?start=${startParam}`],
  });

  const { data: categories = [] } = useQuery<RoomCategory[]>({
    queryKey: ["/api/room-categories"],
  });

  const form = useForm<QuickBookingForm>({
    resolver: zodResolver(quickBookingSchema),
    defaultValues: { guestSearch: "", checkOut: "", guestCount: 1, depositAmount: "0" },
  });

  const bookingMutation = useMutation({
    mutationFn: (data: { guestId: string; roomId: string; checkIn: string; checkOut: string; guestCount?: number; depositAmount?: string }) =>
      apiRequest("POST", "/api/bookings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setQuickBookOpen(false);
      setSelectedGuest(null);
      setSearchResults([]);
      toast({ title: "Амжилттай", description: "Захиалга үүсгэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const goToday = () => setWeekStart(getWeekStart(new Date()));

  const openQuickBook = (room: TimelineRoom, date: Date) => {
    setQuickBookRoom(room);
    setQuickBookDate(formatDate(date));
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    form.reset({ guestSearch: "", checkOut: formatDate(nextDay), depositAmount: "0" });
    setSelectedGuest(null);
    setSearchResults([]);
    setQuickBookOpen(true);
  };

  const handleGuestSearch = async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/guests?search=${encodeURIComponent(query)}`);
      const guests = await res.json();
      setSearchResults(guests.slice(0, 5));
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const submitQuickBooking = () => {
    if (!selectedGuest || !quickBookRoom || !quickBookDate) return;
    const checkOut = form.getValues("checkOut");
    const depositAmount = form.getValues("depositAmount");
    if (!checkOut) return;
    const guestCount = form.getValues("guestCount");
    bookingMutation.mutate({
      guestId: selectedGuest.id,
      roomId: quickBookRoom.id,
      checkIn: new Date(quickBookDate).toISOString(),
      checkOut: new Date(checkOut).toISOString(),
      guestCount: guestCount || 1,
      depositAmount: depositAmount || "0",
    });
  };

  const filteredRooms = useMemo(() => {
    if (!timeline) return [];
    if (categoryFilter === "ALL") return timeline.rooms;
    return timeline.rooms.filter(r => r.category?.id === categoryFilter);
  }, [timeline, categoryFilter]);

  const today = formatDate(new Date());
  const isToday = (d: Date) => formatDate(d) === today;

  return (
    <div className="p-6 space-y-4" data-testid="page-weekly-timeline">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-timeline-title">
            Долоо хоногийн хуваарь
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {MONTHS_MN[weekStart.getMonth()]} {weekStart.getDate()} - {MONTHS_MN[days[6].getMonth()]} {days[6].getDate()}, {days[6].getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-category-filter">
              <SelectValue placeholder="Бүх төрөл" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Бүх төрөл</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center border rounded-md">
            <Button variant="ghost" size="icon" onClick={prevWeek} data-testid="button-prev-week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToday} data-testid="button-today">
              Өнөөдөр
            </Button>
            <Button variant="ghost" size="icon" onClick={nextWeek} data-testid="button-next-week">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-muted/80 backdrop-blur-sm border-b border-r px-3 py-2 text-left text-xs font-medium text-muted-foreground w-[140px] min-w-[140px]">
                  Өрөө
                </th>
                {days.map(day => (
                  <th
                    key={formatDate(day)}
                    className={`border-b px-1 py-2 text-center text-xs font-medium min-w-[110px] ${
                      isToday(day) ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <div>{DAYS_MN[day.getDay()]}</div>
                    <div className={`text-sm font-semibold ${isToday(day) ? "text-primary" : "text-foreground"}`}>
                      {day.getMonth() + 1}/{day.getDate()}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map(room => (
                <TimelineRow
                  key={room.id}
                  room={room}
                  days={days}
                  today={today}
                  onEmptyCellClick={(date) => openQuickBook(room, date)}
                />
              ))}
            </tbody>
          </table>
          {filteredRooms.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground" data-testid="text-no-rooms">
              Өрөө олдсонгүй
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground flex-wrap">
        <span className="text-xs font-medium text-foreground">Захиалгын төлөв:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/80" /> Дүүрсэн</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-400/80" /> Баталгаажсан</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400/80" /> Хүлээгдэж буй</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-500/80" /> Ирээгүй</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border border-dashed" /> Сул (дарж захиалах)</span>
        <span className="w-px h-3 bg-border mx-1" />
        <span className="text-xs font-medium text-foreground">Өрөөний төлөв:</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Цэвэрлэх хүлээлт</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Цэвэрлэж буй</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Шалгагдсан</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-700" /> Засвартай (OOO)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-zinc-400" /> Хаалттай (OOS)</span>
      </div>

      <Dialog open={quickBookOpen} onOpenChange={(o) => { if (!o) setQuickBookOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-quick-book-title">Шуурхай захиалга</DialogTitle>
            <DialogDescription>
              {quickBookRoom && `Өрөө ${quickBookRoom.roomNumber} (${quickBookRoom.category?.name || ""}) — ${quickBookDate}`}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="guestSearch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Зочин хайх (утас/РД)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="99112233 эсвэл УБ90112233"
                        onChange={(e) => {
                          field.onChange(e);
                          handleGuestSearch(e.target.value);
                        }}
                        data-testid="input-quick-guest-search"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {searching && <p className="text-xs text-muted-foreground">Хайж байна...</p>}

              {searchResults.length > 0 && !selectedGuest && (
                <div className="border rounded-md divide-y max-h-40 overflow-auto">
                  {searchResults.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm flex items-center justify-between"
                      style={{ cursor: "pointer" }}
                      onClick={() => { setSelectedGuest(g); setSearchResults([]); }}
                      data-testid={`button-select-guest-${g.id}`}
                    >
                      <span className="font-medium">{g.lastName} {g.firstName}</span>
                      <span className="text-muted-foreground text-xs">{g.phone}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedGuest && (
                <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                  <div className="text-sm">
                    <span className="font-medium">{selectedGuest.lastName} {selectedGuest.firstName}</span>
                    <span className="text-muted-foreground ml-2">{selectedGuest.phone}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedGuest(null)}
                    data-testid="button-clear-guest">
                    Солих
                  </Button>
                </div>
              )}

              <FormField
                control={form.control}
                name="checkOut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Гарах огноо</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-quick-checkout" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        data-testid="input-quick-guest-count"
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
                name="depositAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Урьдчилгаа төлбөр (₮)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        data-testid="input-quick-deposit"
                      />
                    </FormControl>
                    <FormMessage />
                    {Number(field.value) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Урьдчилгаа төлсөн тохиолдолд захиалга автоматаар баталгаажна
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setQuickBookOpen(false)}>
                  Цуцлах
                </Button>
                <Button
                  type="button"
                  disabled={!selectedGuest || bookingMutation.isPending}
                  onClick={submitQuickBooking}
                  data-testid="button-submit-quick-booking"
                >
                  {bookingMutation.isPending ? "Үүсгэж байна..." : "Захиалга үүсгэх"}
                </Button>
              </div>
            </div>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TimelineRow({
  room,
  days,
  today,
  onEmptyCellClick,
}: {
  room: TimelineRoom;
  days: Date[];
  today: string;
  onEmptyCellClick: (date: Date) => void;
}) {
  const occupancy = useMemo(() => {
    const checkedIn = room.bookings.filter(b => b.status === "CHECKED_IN");
    const guestCount = checkedIn.length;
    const capacity = room.category?.capacity || 1;
    return { guestCount, capacity };
  }, [room]);

  const roomStatusConfig: Record<string, { dot: string; label: string; rowBg: string; tdBg: string; badgeClass: string }> = {
    AVAILABLE:            { dot: "bg-green-500",  label: "Сул",              rowBg: "",                                          tdBg: "bg-background",                                       badgeClass: "" },
    OCCUPIED:             { dot: "bg-red-500",    label: "Дүүрсэн",          rowBg: "",                                          tdBg: "bg-background",                                       badgeClass: "" },
    PENDING:              { dot: "bg-amber-400",  label: "Хүлээгдэж буй",    rowBg: "",                                          tdBg: "bg-background",                                       badgeClass: "" },
    CLEANING:             { dot: "bg-slate-400",  label: "Цэвэрлэх хүлээлт", rowBg: "bg-slate-50 dark:bg-slate-900/30",          tdBg: "bg-slate-50 dark:bg-slate-900/30",                    badgeClass: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600" },
    CLEANING_IN_PROGRESS: { dot: "bg-purple-500", label: "Цэвэрлэж буй",     rowBg: "bg-purple-50 dark:bg-purple-900/20",        tdBg: "bg-purple-50 dark:bg-purple-900/20",                  badgeClass: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700" },
    INSPECTED:            { dot: "bg-teal-500",   label: "Шалгагдсан",       rowBg: "bg-teal-50 dark:bg-teal-900/20",            tdBg: "bg-teal-50 dark:bg-teal-900/20",                      badgeClass: "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900 dark:text-teal-300 dark:border-teal-700" },
    OUT_OF_ORDER:         { dot: "bg-red-700",    label: "Засвартай (OOO)",   rowBg: "bg-red-50 dark:bg-red-900/20",              tdBg: "bg-red-50 dark:bg-red-900/20",                        badgeClass: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700" },
    OUT_OF_SERVICE:       { dot: "bg-zinc-400",   label: "Хаалттай (OOS)",   rowBg: "bg-zinc-50 dark:bg-zinc-900/30",            tdBg: "bg-zinc-50 dark:bg-zinc-900/30",                      badgeClass: "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600" },
  };
  const rs = roomStatusConfig[room.status] || roomStatusConfig.AVAILABLE;
  const isNonSellable = ["CLEANING", "CLEANING_IN_PROGRESS", "INSPECTED", "OUT_OF_ORDER", "OUT_OF_SERVICE"].includes(room.status);

  return (
    <tr data-testid={`timeline-row-${room.roomNumber}`} className={rs.rowBg}>
      <td className={`sticky left-0 z-10 border-b border-r px-3 py-2 ${rs.tdBg}`}>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${rs.dot}`} title={rs.label} data-testid={`dot-room-status-${room.roomNumber}`} />
            <span className="font-medium text-sm" data-testid={`text-room-number-${room.roomNumber}`}>{room.roomNumber}</span>
            <span className="text-xs text-muted-foreground">{room.category?.name || ""}</span>
          </div>
          {isNonSellable ? (
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-normal ${rs.badgeClass}`} data-testid={`badge-status-${room.roomNumber}`}>
              {rs.label}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal" data-testid={`badge-occupancy-${room.roomNumber}`}>
              {occupancy.guestCount}/{occupancy.capacity}
            </Badge>
          )}
        </div>
      </td>
      {days.map(day => {
        const dateStr = formatDate(day);
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const dayBookings = room.bookings.filter(b => {
          const ci = new Date(b.checkIn);
          const co = new Date(b.checkOut);
          return ci < dayEnd && co > dayStart;
        });

        const isTodayCell = dateStr === today;

        if (dayBookings.length === 0) {
          if (room.status === "OUT_OF_ORDER") {
            return (
              <td
                key={dateStr}
                className={`border-b px-1 py-1 ${isTodayCell ? "bg-red-50/80 dark:bg-red-900/10" : "bg-red-50/40 dark:bg-red-900/10"}`}
                data-testid={`cell-ooo-${room.roomNumber}-${dateStr}`}
              >
                <div className="h-8 rounded border border-red-200 dark:border-red-800 flex items-center justify-center bg-red-100/50 dark:bg-red-900/20">
                  <span className="text-[9px] text-red-500 dark:text-red-400 font-medium">OOO</span>
                </div>
              </td>
            );
          }
          if (room.status === "OUT_OF_SERVICE") {
            return (
              <td
                key={dateStr}
                className={`border-b px-1 py-1 ${isTodayCell ? "bg-zinc-100/80 dark:bg-zinc-800/20" : "bg-zinc-50/40 dark:bg-zinc-900/10"}`}
                data-testid={`cell-oos-${room.roomNumber}-${dateStr}`}
              >
                <div className="h-8 rounded border border-zinc-200 dark:border-zinc-700 flex items-center justify-center bg-zinc-100/50 dark:bg-zinc-800/20">
                  <span className="text-[9px] text-zinc-400 font-medium">OOS</span>
                </div>
              </td>
            );
          }
          if (["CLEANING", "CLEANING_IN_PROGRESS", "INSPECTED"].includes(room.status)) {
            return (
              <td
                key={dateStr}
                className={`border-b px-1 py-1 cursor-pointer ${isTodayCell ? "bg-primary/5" : rs.rowBg}`}
                onClick={() => onEmptyCellClick(day)}
                data-testid={`cell-empty-${room.roomNumber}-${dateStr}`}
              >
                <div className="h-8 rounded border border-dashed border-muted-foreground/20 flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground/40">+</span>
                </div>
              </td>
            );
          }
          return (
            <td
              key={dateStr}
              className={`border-b px-1 py-1 cursor-pointer ${isTodayCell ? "bg-primary/5" : ""}`}
              onClick={() => onEmptyCellClick(day)}
              data-testid={`cell-empty-${room.roomNumber}-${dateStr}`}
            >
              <div className="h-8 rounded border border-dashed border-muted-foreground/20 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground/40">+</span>
              </div>
            </td>
          );
        }

        return (
          <td
            key={dateStr}
            className={`border-b px-0.5 py-1 ${isTodayCell ? "bg-primary/5" : ""}`}
            data-testid={`cell-booked-${room.roomNumber}-${dateStr}`}
          >
            <div className="space-y-0.5">
              {dayBookings.map(booking => (
                <BookingCell key={booking.id} booking={booking} day={day} room={room} />
              ))}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

function BookingCell({
  booking,
  day,
  room,
}: {
  booking: TimelineBooking;
  day: Date;
  room: TimelineRoom;
}) {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const ci = new Date(booking.checkIn);
  const co = new Date(booking.checkOut);
  const isStart = ci >= dayStart && ci < new Date(dayStart.getTime() + 86400000);
  const isEnd = co > dayStart && co <= new Date(dayStart.getTime() + 86400000);

  const colorClass = STATUS_COLORS[booking.status] || "bg-gray-400/80";
  const roundLeft = isStart ? "rounded-l-md" : "";
  const roundRight = isEnd ? "rounded-r-md" : "";

  const guestName = booking.guest
    ? `${booking.guest.lastName?.charAt(0)}. ${booking.guest.firstName}`
    : "—";

  const totalGuests = 1 + booking.familyMembers.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`w-full h-8 ${colorClass} ${roundLeft} ${roundRight} text-white text-[11px] font-medium px-1.5 flex items-center gap-1 truncate`}
          style={{ cursor: "pointer" }}
          data-testid={`booking-bar-${booking.id}-${formatDate(day)}`}
        >
          {isStart && (
            <>
              {booking.guest?.isVip && <Crown className="h-3 w-3 shrink-0" />}
              <span className="truncate">{guestName}</span>
            </>
          )}
          {!isStart && !isEnd && <span className="truncate opacity-70">{guestName}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold" data-testid={`text-popup-guest-${booking.id}`}>
              {booking.guest ? `${booking.guest.lastName} ${booking.guest.firstName}` : "—"}
            </h4>
            <Badge variant="outline" className="text-[10px]">
              {STATUS_LABELS[booking.status] || booking.status}
            </Badge>
          </div>

          {booking.guest?.isVip && (
            <Badge variant="default" className="text-[10px]">
              <Crown className="h-3 w-3 mr-1" /> VIP
            </Badge>
          )}

          <div className="text-xs space-y-1 text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3" />
              <span>{booking.guest?.phone || "—"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              <span>{totalGuests} хүн / {room.category?.capacity || "?"} багтаамж</span>
            </div>
            <div className="flex items-center gap-1.5">
              <LogIn className="h-3 w-3" />
              <span>Ирэх: {new Date(booking.checkIn).toLocaleDateString("mn-MN")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <LogOut className="h-3 w-3" />
              <span>Буцах: {new Date(booking.checkOut).toLocaleDateString("mn-MN")}</span>
            </div>
          </div>

          {booking.familyMembers.length > 0 && (
            <div className="border-t pt-2 mt-2">
              <p className="text-[11px] font-medium mb-1">Гэр бүлийн гишүүд:</p>
              <div className="space-y-0.5">
                {booking.familyMembers.map(fm => (
                  <p key={fm.id} className="text-xs text-muted-foreground">
                    {fm.lastName} {fm.firstName}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-2 mt-2 text-xs text-muted-foreground">
            Нийт: {Number(booking.totalAmount).toLocaleString()}₮ | Төлсөн: {Number(booking.depositPaid).toLocaleString()}₮
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
