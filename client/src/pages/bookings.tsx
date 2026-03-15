import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CalendarDays, Search, UserPlus, X, Check, ClipboardList, Clock, CheckCircle2, Pencil, Trash2, Banknote, LogOut, LogIn, Ban, CalendarClock } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Booking, Guest, Room, RoomCategory, Service, TreatmentPlan } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BOOKING_STATUS_LABELS as statusLabels, BOOKING_STATUS_BADGE_COLORS as statusColors } from "@/lib/booking-status";

const bookingFormSchema = z.object({
  guestId: z.string().min(1, "Зочин сонгоно уу"),
  roomId: z.string().min(1, "Өрөө сонгоно уу"),
  checkIn: z.string().min(1, "Орох огноо оруулна уу"),
  checkOut: z.string().min(1, "Гарах огноо оруулна уу"),
  guestCount: z.number().min(1, "Хүний тоо оруулна уу"),
  totalAmount: z.string().min(1, "Дүн оруулна уу"),
  depositAmount: z.string().default("0"),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

const editBookingSchema = z.object({
  checkIn: z.string().min(1, "Орох огноо оруулна уу"),
  checkOut: z.string().min(1, "Гарах огноо оруулна уу"),
  totalAmount: z.string().min(1, "Дүн оруулна уу"),
});

type EditBookingValues = z.infer<typeof editBookingSchema>;

const paymentSchema = z.object({
  amount: z.string().min(1, "Дүн оруулна уу"),
  type: z.enum(["DEPOSIT", "FINAL"]),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER"]),
});

type PaymentValues = z.infer<typeof paymentSchema>;

const newGuestSchema = z.object({
  idNumber: z.string().min(1, "Регистрийн дугаар оруулна уу"),
  firstName: z.string().min(1, "Нэр оруулна уу"),
  lastName: z.string().min(1, "Овог оруулна уу"),
  phone: z.string().min(1, "Утасны дугаар оруулна уу"),
  isVip: z.boolean().default(false),
});

type NewGuestFormValues = z.infer<typeof newGuestSchema>;

const treatmentFormSchema = z.object({
  serviceId: z.string().min(1, "Эмчилгээ сонгоно уу"),
  scheduleTime: z.string().min(1, "Цаг сонгоно уу"),
  notes: z.string().optional(),
});

type TreatmentFormValues = z.infer<typeof treatmentFormSchema>;

const treatmentStatusLabels: Record<string, string> = {
  SCHEDULED: "Төлөвлөсөн",
  COMPLETED: "Дууссан",
};

export default function BookingsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [guestSearch, setGuestSearch] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showNewGuestForm, setShowNewGuestForm] = useState(false);
  const [treatmentDialogOpen, setTreatmentDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showAddTreatment, setShowAddTreatment] = useState(false);

  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [deleteBookingId, setDeleteBookingId] = useState<string | null>(null);
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null);
  const [extendBooking, setExtendBooking] = useState<Booking | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const [page, setPage] = useState(1);
  const BOOKING_LIMIT = 50;

  type BookingsPage = { data: Booking[]; total: number; totalPages: number };
  const { data: bookingsResult, isLoading } = useQuery<BookingsPage>({
    queryKey: ["/api/bookings", { page, status: statusFilter, search: searchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(BOOKING_LIMIT) });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/bookings?${params}`);
      return res.json();
    },
  });
  const paginatedBookings = bookingsResult?.data ?? [];
  const totalPages = bookingsResult?.totalPages ?? 1;
  const totalCount = bookingsResult?.total ?? 0;

  const { data: allGuests = [], isLoading: guestsLoading } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  const { data: allRooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: allCategories = [] } = useQuery<RoomCategory[]>({
    queryKey: ["/api/room-categories"],
  });

  const { data: allServices = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: treatmentPlans = [], isLoading: treatmentsLoading } = useQuery<TreatmentPlan[]>({
    queryKey: ["/api/bookings", selectedBooking?.id, "treatment-plans"],
    enabled: !!selectedBooking,
  });

  const treatmentForm = useForm<TreatmentFormValues>({
    resolver: zodResolver(treatmentFormSchema),
    defaultValues: { serviceId: "", scheduleTime: "", notes: "" },
  });

  const createTreatmentMutation = useMutation({
    mutationFn: (data: { bookingId: string; serviceId: string; serviceName: string; scheduleTime: string; notes?: string }) =>
      apiRequest("POST", "/api/treatment-plans", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", selectedBooking?.id, "treatment-plans"] });
      treatmentForm.reset({ serviceId: "", scheduleTime: "", notes: "" });
      setShowAddTreatment(false);
      toast({ title: "Амжилттай", description: "Эмчилгээний төлөвлөгөө нэмэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const completeTreatmentMutation = useMutation({
    mutationFn: (planId: string) =>
      apiRequest("PATCH", `/api/treatment-plans/${planId}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", selectedBooking?.id, "treatment-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Амжилттай", description: "Эмчилгээ дууссан гэж тэмдэглэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const onSubmitTreatment = (values: TreatmentFormValues) => {
    if (!selectedBooking) return;
    const svc = allServices.find(s => s.id === values.serviceId);
    createTreatmentMutation.mutate({
      bookingId: selectedBooking.id,
      serviceId: values.serviceId,
      serviceName: svc?.name || "",
      scheduleTime: new Date(values.scheduleTime).toISOString(),
      notes: values.notes || undefined,
    });
  };

  const openTreatmentDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowAddTreatment(false);
    treatmentForm.reset({ serviceId: "", scheduleTime: "", notes: "" });
    setTreatmentDialogOpen(true);
  };

  const guestMap = Object.fromEntries(allGuests.map(g => [g.id, g]));
  const roomMap = Object.fromEntries(allRooms.map(r => [r.id, r]));
  const catMap = Object.fromEntries(allCategories.map(c => [c.id, c]));
  const availableRooms = allRooms.filter(r => r.status === "AVAILABLE");
  const activeServices = allServices.filter(s => s.isActive);

  const guestSearchResults = guestSearch.length >= 2
    ? allGuests.filter(g => {
        const q = guestSearch.toLowerCase();
        return g.phone.includes(q) || g.idNumber.toLowerCase().includes(q);
      })
    : [];

  const newGuestForm = useForm<NewGuestFormValues>({
    resolver: zodResolver(newGuestSchema),
    defaultValues: { idNumber: "", firstName: "", lastName: "", phone: "", isVip: false },
  });

  const createGuestMutation = useMutation({
    mutationFn: (data: NewGuestFormValues) => apiRequest("POST", "/api/guests", data),
    onSuccess: async (res: any) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      setSelectedGuest(created);
      form.setValue("guestId", created.id);
      setShowNewGuestForm(false);
      setGuestSearch("");
      newGuestForm.reset();
      toast({ title: "Амжилттай", description: "Зочин бүртгэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: { guestId: "", roomId: "", checkIn: "", checkOut: "", guestCount: 1, totalAmount: "0", depositAmount: "0" },
  });

  const selectedRoomId = form.watch("roomId");
  const selectedRoom = roomMap[selectedRoomId];
  const selectedCategory = selectedRoom ? catMap[selectedRoom.categoryId] : null;

  const servicesTotal = selectedServices.reduce((sum, svcId) => {
    const svc = allServices.find(s => s.id === svcId);
    return sum + (svc ? Number(svc.price) : 0);
  }, 0);

  const checkInVal = form.watch("checkIn");
  const checkOutVal = form.watch("checkOut");

  const nights = checkInVal && checkOutVal
    ? Math.max(1, Math.ceil((new Date(checkOutVal).getTime() - new Date(checkInVal).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const roomTotal = selectedCategory ? Number(selectedCategory.basePrice) * nights : 0;
  const grandTotal = roomTotal + servicesTotal;

  const openCreate = () => {
    setSelectedServices([]);
    setSelectedGuest(null);
    setGuestSearch("");
    setShowNewGuestForm(false);
    newGuestForm.reset();
    form.reset({ guestId: "", roomId: "", checkIn: "", checkOut: "", guestCount: 1, totalAmount: "0", depositAmount: "0" });
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: BookingFormValues & { serviceIds: string[] }) =>
      apiRequest("POST", "/api/bookings", {
        ...data,
        totalAmount: String(grandTotal),
        guestCount: data.guestCount,
        checkIn: new Date(data.checkIn).toISOString(),
        checkOut: new Date(data.checkOut).toISOString(),
        serviceIds: data.serviceIds,
        depositAmount: data.depositAmount,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      setDialogOpen(false);
      toast({ title: "Амжилттай", description: "Захиалга үүсгэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: BookingFormValues) => {
    createMutation.mutate({ ...values, totalAmount: String(grandTotal), serviceIds: selectedServices });
  };

  const toggleService = (svcId: string) => {
    setSelectedServices(prev =>
      prev.includes(svcId) ? prev.filter(id => id !== svcId) : [...prev, svcId]
    );
  };

  const paymentForm = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: "", type: "DEPOSIT", paymentMethod: "CASH" },
  });

  const paymentMutation = useMutation({
    mutationFn: (data: PaymentValues) =>
      apiRequest("POST", "/api/transactions", {
        bookingId: paymentBooking!.id,
        amount: data.amount,
        type: data.type,
        paymentMethod: data.paymentMethod,
      }),
    onSuccess: () => {
      const wasPayingBooking = paymentBooking;
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      setPaymentBooking(null);
      paymentForm.reset();
      if (wasPayingBooking && wasPayingBooking.status === "PENDING") {
        setStatusFilter("ALL");
        toast({ title: "Амжилттай", description: "Төлбөр бүртгэгдлээ. Захиалга баталгаажлаа." });
      } else {
        toast({ title: "Амжилттай", description: "Төлбөр бүртгэгдлээ" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const onPaymentSubmit = (values: PaymentValues) => {
    paymentMutation.mutate(values);
  };

  const openPayment = (booking: Booking) => {
    setPaymentBooking(booking);
    const balance = Number(booking.totalAmount) - Number(booking.depositPaid);
    paymentForm.reset({ amount: String(balance), type: "DEPOSIT", paymentMethod: "CASH" });
  };

  const editForm = useForm<EditBookingValues>({
    resolver: zodResolver(editBookingSchema),
    defaultValues: { checkIn: "", checkOut: "", totalAmount: "" },
  });

  const openEdit = (booking: Booking) => {
    setEditBooking(booking);
    editForm.reset({
      checkIn: new Date(booking.checkIn).toISOString().split("T")[0],
      checkOut: new Date(booking.checkOut).toISOString().split("T")[0],
      totalAmount: booking.totalAmount,
    });
  };

  const updateBookingMutation = useMutation({
    mutationFn: (data: EditBookingValues) =>
      apiRequest("PATCH", `/api/bookings/${editBooking!.id}`, {
        checkIn: new Date(data.checkIn).toISOString(),
        checkOut: new Date(data.checkOut).toISOString(),
        totalAmount: data.totalAmount,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      setEditBooking(null);
      toast({ title: "Амжилттай", description: "Захиалга шинэчлэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/bookings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      setDeleteBookingId(null);
      toast({ title: "Амжилттай", description: "Захиалга устгагдлаа" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const checkoutPaymentForm = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: "", type: "FINAL", paymentMethod: "CASH" },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const booking = checkoutBooking!;
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
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      setCheckoutBooking(null);
      checkoutPaymentForm.reset();
      toast({ title: "Амжилттай", description: "Check-out амжилттай хийгдлээ" });
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const openCheckout = (booking: Booking) => {
    setCheckoutBooking(booking);
    const balance = Number(booking.totalAmount) - Number(booking.depositPaid);
    checkoutPaymentForm.reset({ amount: String(balance), type: "FINAL", paymentMethod: "CASH" });
  };

  const checkinMutation = useMutation({
    mutationFn: (bookingId: string) =>
      apiRequest("PATCH", `/api/bookings/${bookingId}/status`, { status: "CHECKED_IN" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      toast({ title: "Амжилттай", description: "Check-in амжилттай хийгдлээ. Зочин борлуулалт руу шилжлээ." });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) =>
      apiRequest("PATCH", `/api/bookings/${bookingId}/status`, { status: "CANCELLED" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      setCancelBookingId(null);
      toast({ title: "Амжилттай", description: "Захиалга цуцлагдлаа" });
    },
    onError: (err: Error) => {
      setCancelBookingId(null);
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });
  const canCancel = (status: string) => status === "PENDING" || status === "CONFIRMED" || status === "NO_SHOW";

  const extendMutation = useMutation({
    mutationFn: ({ id, newCheckOut }: { id: string; newCheckOut: string }) =>
      apiRequest("POST", `/api/bookings/${id}/extend`, { newCheckOut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      setExtendBooking(null);
      setExtendDate("");
      toast({ title: "Амжилттай", description: "Захиалга сунгагдлаа" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const today = new Date().toISOString().split("T")[0];

  const canEdit = (status: string) => status !== "CHECKED_OUT" && status !== "CANCELLED" && status !== "NO_SHOW";
  const canDelete = (status: string) => status !== "CHECKED_IN" && status !== "NO_SHOW" && status !== "EXTENDED";
  const canCheckin = (status: string) => status === "CONFIRMED" || status === "PENDING" || status === "NO_SHOW";
  const canCheckout = (status: string) => status === "CHECKED_IN" || status === "EXTENDED";
  const canPay = (status: string) => status !== "CHECKED_OUT" && status !== "CANCELLED" && status !== "NO_SHOW";
  const canExtend = (status: string) => status === "CHECKED_IN" || status === "EXTENDED";

  return (
    <div className="p-6 space-y-6" data-testid="page-bookings">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-bookings-title">
            Захиалга
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Нийт захиалгын жагсаалт ба шинэ захиалга үүсгэх
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-new-booking">
          <Plus className="h-4 w-4 mr-2" />
          Шинэ захиалга
        </Button>
      </div>


      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Зочин, өрөөгөөр хайх..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-10"
            data-testid="input-booking-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]" data-testid="select-booking-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Бүгд ({totalCount})</SelectItem>
            <SelectItem value="PENDING">Хүлээгдэж буй</SelectItem>
            <SelectItem value="CONFIRMED">Баталгаажсан</SelectItem>
            <SelectItem value="NO_SHOW">⚠️ Ирээгүй</SelectItem>
            <SelectItem value="CANCELLED">Цуцлагдсан</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Ачаалж байна...</div>
      ) : paginatedBookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-bookings">
              Захиалга олдсонгүй
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Зочин</TableHead>
                <TableHead>Өрөө</TableHead>
                <TableHead>Орох</TableHead>
                <TableHead>Гарах</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead className="text-right">Нийт дүн</TableHead>
                <TableHead className="text-right">Төлсөн</TableHead>
                <TableHead className="text-right">Үлдэгдэл</TableHead>
                <TableHead className="w-48"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBookings.map((booking) => {
                const guest = guestMap[booking.guestId];
                const room = roomMap[booking.roomId];
                const category = room ? catMap[room.categoryId] : null;
                const balance = Number(booking.totalAmount) - Number(booking.depositPaid);
                return (
                  <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`}>
                    <TableCell className="font-medium">
                      {guest ? `${guest.lastName} ${guest.firstName}` : "—"}
                    </TableCell>
                    <TableCell>
                      {room ? room.roomNumber : "—"}
                      {category && (
                        <span className="text-xs text-muted-foreground ml-1">({category.name})</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(booking.checkIn).toLocaleDateString("mn-MN")}</TableCell>
                    <TableCell>{new Date(booking.checkOut).toLocaleDateString("mn-MN")}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[booking.status] || ""}`}>
                        {statusLabels[booking.status] || booking.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{Number(booking.totalAmount).toLocaleString()}₮</TableCell>
                    <TableCell className="text-right">{Number(booking.depositPaid).toLocaleString()}₮</TableCell>
                    <TableCell className={`text-right ${balance > 0 ? "text-destructive font-medium" : ""}`}>
                      {balance.toLocaleString()}₮
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {canCheckin(booking.status) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                            onClick={() => checkinMutation.mutate(booking.id)}
                            disabled={checkinMutation.isPending}
                            data-testid={`button-checkin-booking-${booking.id}`}
                            title="Check-in хийх"
                          >
                            <LogIn className="h-4 w-4" />
                          </Button>
                        )}
                        {canPay(booking.status) && balance > 0 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openPayment(booking)}
                            data-testid={`button-pay-booking-${booking.id}`}
                            title="Төлбөр хийх"
                          >
                            <Banknote className="h-4 w-4" />
                          </Button>
                        )}
                        {canCheckout(booking.status) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openCheckout(booking)}
                            data-testid={`button-checkout-booking-${booking.id}`}
                            title="Check-out"
                          >
                            <LogOut className="h-4 w-4" />
                          </Button>
                        )}
                        {canExtend(booking.status) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-purple-600 hover:text-purple-700"
                            onClick={() => { setExtendBooking(booking); setExtendDate(new Date(booking.checkOut).toISOString().split("T")[0]); }}
                            data-testid={`button-extend-booking-${booking.id}`}
                            title="Хугацаа сунгах"
                          >
                            <CalendarClock className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openTreatmentDialog(booking)}
                          data-testid={`button-treatment-plans-${booking.id}`}
                        >
                          <ClipboardList className="h-4 w-4 mr-1" />
                          Эмчилгээ
                        </Button>
                        {canCancel(booking.status) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setCancelBookingId(booking.id)}
                            data-testid={`button-cancel-booking-${booking.id}`}
                            title="Захиалга цуцлах"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        {canEdit(booking.status) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(booking)}
                            data-testid={`button-edit-booking-${booking.id}`}
                            title="Засах"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete(booking.status) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteBookingId(booking.id)}
                            data-testid={`button-delete-booking-${booking.id}`}
                            title="Устгах"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Нийт {totalCount} захиалга · {page}/{totalPages} хуудас</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              data-testid="button-bookings-prev"
            >
              Өмнөх
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              data-testid="button-bookings-next"
            >
              Дараах
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!paymentBooking} onOpenChange={(open) => { if (!open) { setPaymentBooking(null); paymentForm.reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-booking-payment-title">Төлбөр хийх</DialogTitle>
            <DialogDescription>
              {paymentBooking && (() => {
                const guest = guestMap[paymentBooking.guestId];
                const room = roomMap[paymentBooking.roomId];
                const bal = Number(paymentBooking.totalAmount) - Number(paymentBooking.depositPaid);
                return `${guest ? `${guest.lastName} ${guest.firstName}` : "—"} · Өрөө ${room?.roomNumber || "—"} | Нийт: ${Number(paymentBooking.totalAmount).toLocaleString()}₮ | Төлсөн: ${Number(paymentBooking.depositPaid).toLocaleString()}₮ | Үлдэгдэл: ${bal.toLocaleString()}₮`;
              })()}
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
                        <SelectTrigger data-testid="select-booking-payment-type">
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
                      <Input type="number" {...field} data-testid="input-booking-payment-amount" />
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
                        <SelectTrigger data-testid="select-booking-payment-method">
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
                <Button type="button" variant="outline" onClick={() => { setPaymentBooking(null); paymentForm.reset(); }}
                  data-testid="button-cancel-booking-payment">
                  Цуцлах
                </Button>
                <Button type="submit" disabled={paymentMutation.isPending}
                  data-testid="button-confirm-booking-payment">
                  {paymentMutation.isPending ? "Бүртгэж байна..." : "Төлбөр бүртгэх"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkoutBooking} onOpenChange={(open) => { if (!open) { setCheckoutBooking(null); checkoutPaymentForm.reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-checkout-dialog-title">Check-out хийх</DialogTitle>
            <DialogDescription>
              {checkoutBooking && (() => {
                const guest = guestMap[checkoutBooking.guestId];
                const room = roomMap[checkoutBooking.roomId];
                return `${guest ? `${guest.lastName} ${guest.firstName}` : "—"} · Өрөө ${room?.roomNumber || "—"}`;
              })()}
            </DialogDescription>
          </DialogHeader>
          {checkoutBooking && (() => {
            const balance = Number(checkoutBooking.totalAmount) - Number(checkoutBooking.depositPaid);
            return (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-md p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Нийт дүн</span>
                    <span className="font-medium">{Number(checkoutBooking.totalAmount).toLocaleString()}₮</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Төлсөн</span>
                    <span className="font-medium">{Number(checkoutBooking.depositPaid).toLocaleString()}₮</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className={`font-medium ${balance > 0 ? "text-destructive" : ""}`}>Үлдэгдэл</span>
                    <span className={`font-semibold ${balance > 0 ? "text-destructive" : ""}`}>{balance.toLocaleString()}₮</span>
                  </div>
                </div>

                {balance > 0 ? (
                  <Form {...checkoutPaymentForm}>
                    <form onSubmit={checkoutPaymentForm.handleSubmit(() => checkoutMutation.mutate())} className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Үлдэгдэл төлбөрийг төлж check-out хийнэ
                      </p>
                      <FormField
                        control={checkoutPaymentForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Төлөх дүн (₮)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-checkout-payment-amount" />
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
                        <Button type="button" variant="outline" onClick={() => { setCheckoutBooking(null); checkoutPaymentForm.reset(); }}
                          data-testid="button-cancel-checkout">
                          Цуцлах
                        </Button>
                        <Button type="submit" variant="destructive" disabled={checkoutMutation.isPending}
                          data-testid="button-confirm-checkout">
                          {checkoutMutation.isPending ? "Гарч байна..." : "Төлбөр төлж Check-out хийх"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setCheckoutBooking(null); checkoutPaymentForm.reset(); }}
                      data-testid="button-cancel-checkout">
                      Цуцлах
                    </Button>
                    <Button variant="destructive" onClick={() => checkoutMutation.mutate()} disabled={checkoutMutation.isPending}
                      data-testid="button-confirm-checkout">
                      {checkoutMutation.isPending ? "Гарч байна..." : "Check-out хийх"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editBooking} onOpenChange={(open) => { if (!open) setEditBooking(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-edit-booking-title">Захиалга засах</DialogTitle>
            <DialogDescription>
              {editBooking && (() => {
                const guest = guestMap[editBooking.guestId];
                const room = roomMap[editBooking.roomId];
                return `${guest ? `${guest.lastName} ${guest.firstName}` : "—"} · Өрөө ${room?.roomNumber || "—"}`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((v) => updateBookingMutation.mutate(v))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="checkIn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Орох огноо</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-edit-booking-checkin" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="checkOut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Гарах огноо</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-edit-booking-checkout" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Нийт дүн (₮)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-edit-booking-total" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditBooking(null)}
                  data-testid="button-cancel-edit-booking">
                  Цуцлах
                </Button>
                <Button type="submit" disabled={updateBookingMutation.isPending}
                  data-testid="button-save-edit-booking">
                  {updateBookingMutation.isPending ? "Хадгалж байна..." : "Хадгалах"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteBookingId} onOpenChange={(open) => { if (!open) setDeleteBookingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Захиалга устгах</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ захиалгыг устгахдаа итгэлтэй байна уу? Холбогдох төлбөр, эмчилгээний бүртгэл бүгд устгагдана.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-booking">Цуцлах</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteBookingId && deleteBookingMutation.mutate(deleteBookingId)}
              data-testid="button-confirm-delete-booking">
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cancelBookingId} onOpenChange={(open) => { if (!open) setCancelBookingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Захиалга цуцлах</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ захиалгыг цуцлахдаа итгэлтэй байна уу? Өрөөний хуваарь чөлөөлөгдөнө.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-dismiss-cancel-booking">Буцах</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancelBookingId && cancelMutation.mutate(cancelBookingId)}
              data-testid="button-confirm-cancel-booking"
            >
              Цуцлах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!extendBooking} onOpenChange={(open) => { if (!open) { setExtendBooking(null); setExtendDate(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-extend-dialog-title">Хугацаа сунгах</DialogTitle>
            <DialogDescription>
              {extendBooking && (() => {
                const guest = guestMap[extendBooking.guestId];
                const room = roomMap[extendBooking.roomId];
                return `${guest ? `${guest.lastName} ${guest.firstName}` : "—"} · Өрөө ${room?.roomNumber || "—"} | Одоогийн checkout: ${new Date(extendBooking.checkOut).toLocaleDateString("mn-MN")}`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Шинэ checkout огноо</label>
              <Input
                type="date"
                value={extendDate}
                min={extendBooking ? new Date(extendBooking.checkOut).toISOString().split("T")[0] : today}
                onChange={(e) => setExtendDate(e.target.value)}
                data-testid="input-extend-checkout-date"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setExtendBooking(null); setExtendDate(""); }} data-testid="button-cancel-extend">
                Цуцлах
              </Button>
              <Button
                onClick={() => extendBooking && extendMutation.mutate({ id: extendBooking.id, newCheckOut: extendDate })}
                disabled={!extendDate || extendMutation.isPending}
                data-testid="button-confirm-extend"
              >
                {extendMutation.isPending ? "Сунгаж байна..." : "Сунгах"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={treatmentDialogOpen} onOpenChange={(open) => { if (!open) setTreatmentDialogOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-treatment-dialog-title">
              Эмчилгээний төлөвлөгөө
            </DialogTitle>
            <DialogDescription>
              {selectedBooking && (() => {
                const guest = guestMap[selectedBooking.guestId];
                const room = roomMap[selectedBooking.roomId];
                return `${guest ? `${guest.lastName} ${guest.firstName}` : "—"} · Өрөө ${room?.roomNumber || "—"}`;
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">
                Төлөвлөгөөнүүд ({treatmentPlans.length})
              </h3>
              {!showAddTreatment && (
                <Button
                  size="sm"
                  onClick={() => setShowAddTreatment(true)}
                  data-testid="button-add-treatment"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Эмчилгээ нэмэх
                </Button>
              )}
            </div>

            {showAddTreatment && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Шинэ эмчилгээ нэмэх</p>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setShowAddTreatment(false)}
                      data-testid="button-cancel-add-treatment"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <form onSubmit={treatmentForm.handleSubmit(onSubmitTreatment)} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Эмчилгээ</label>
                      <Select
                        value={treatmentForm.watch("serviceId")}
                        onValueChange={(v) => treatmentForm.setValue("serviceId", v)}
                      >
                        <SelectTrigger data-testid="select-treatment-service">
                          <SelectValue placeholder="Эмчилгээ сонгох" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeServices.map((svc) => (
                            <SelectItem key={svc.id} value={svc.id}>
                              {svc.name} ({Number(svc.price).toLocaleString()}₮)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {treatmentForm.formState.errors.serviceId && (
                        <p className="text-xs text-destructive mt-1">{treatmentForm.formState.errors.serviceId.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Товлосон цаг</label>
                      <Input
                        type="datetime-local"
                        {...treatmentForm.register("scheduleTime")}
                        data-testid="input-treatment-schedule"
                      />
                      {treatmentForm.formState.errors.scheduleTime && (
                        <p className="text-xs text-destructive mt-1">{treatmentForm.formState.errors.scheduleTime.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Тэмдэглэл</label>
                      <Textarea
                        placeholder="Нэмэлт тэмдэглэл..."
                        {...treatmentForm.register("notes")}
                        data-testid="input-treatment-notes"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      className="w-full"
                      disabled={createTreatmentMutation.isPending}
                      data-testid="button-save-treatment"
                    >
                      {createTreatmentMutation.isPending ? "Нэмж байна..." : "Эмчилгээ нэмэх"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {treatmentsLoading ? (
              <div className="text-sm text-muted-foreground text-center py-4">Ачаалж байна...</div>
            ) : treatmentPlans.length === 0 ? (
              <div className="text-center py-6">
                <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground" data-testid="text-no-treatments">
                  Эмчилгээний төлөвлөгөө байхгүй байна
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {treatmentPlans.map((plan) => (
                  <Card key={plan.id} data-testid={`card-treatment-${plan.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium" data-testid={`text-treatment-name-${plan.id}`}>
                              {plan.serviceName}
                            </span>
                            <Badge
                              variant={plan.status === "COMPLETED" ? "default" : "outline"}
                              data-testid={`badge-treatment-status-${plan.id}`}
                            >
                              {plan.status === "COMPLETED" ? (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              ) : (
                                <Clock className="h-3 w-3 mr-1" />
                              )}
                              {treatmentStatusLabels[plan.status] || plan.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Товлосон: {new Date(plan.scheduleTime).toLocaleString("mn-MN")}
                          </p>
                          {plan.completedAt && (
                            <p className="text-xs text-muted-foreground" data-testid={`text-treatment-completed-${plan.id}`}>
                              Дууссан: {new Date(plan.completedAt).toLocaleString("mn-MN")}
                            </p>
                          )}
                          {plan.notes && (
                            <p className="text-xs text-muted-foreground mt-1" data-testid={`text-treatment-notes-${plan.id}`}>
                              {plan.notes}
                            </p>
                          )}
                        </div>
                        {plan.status !== "COMPLETED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => completeTreatmentMutation.mutate(plan.id)}
                            disabled={completeTreatmentMutation.isPending}
                            data-testid={`button-complete-treatment-${plan.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Дуусгах
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-booking-dialog-title">Шинэ захиалга</DialogTitle>
            <DialogDescription>Өрөө, зочин, эмчилгээ сонгож захиалга үүсгэнэ үү</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-3">
                <FormLabel>Зочин</FormLabel>
                {selectedGuest ? (
                  <div className="flex items-center gap-3 rounded-md border p-3 bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" data-testid="text-selected-guest-name">
                        {selectedGuest.lastName} {selectedGuest.firstName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedGuest.idNumber} · {selectedGuest.phone}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setSelectedGuest(null);
                        form.setValue("guestId", "");
                        setGuestSearch("");
                      }}
                      data-testid="button-clear-guest"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : showNewGuestForm ? (
                  <div className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Шинэ зочин бүртгэх</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowNewGuestForm(false)}
                        data-testid="button-cancel-new-guest"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Цуцлах
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Овог</label>
                        <Input
                          placeholder="Бат"
                          {...newGuestForm.register("lastName")}
                          data-testid="input-new-guest-lastname"
                        />
                        {newGuestForm.formState.errors.lastName && (
                          <p className="text-xs text-destructive mt-1">{newGuestForm.formState.errors.lastName.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Нэр</label>
                        <Input
                          placeholder="Болд"
                          {...newGuestForm.register("firstName")}
                          data-testid="input-new-guest-firstname"
                        />
                        {newGuestForm.formState.errors.firstName && (
                          <p className="text-xs text-destructive mt-1">{newGuestForm.formState.errors.firstName.message}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Регистрийн дугаар</label>
                      <Input
                        placeholder="АА00112233"
                        {...newGuestForm.register("idNumber")}
                        data-testid="input-new-guest-idnumber"
                      />
                      {newGuestForm.formState.errors.idNumber && (
                        <p className="text-xs text-destructive mt-1">{newGuestForm.formState.errors.idNumber.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Утасны дугаар</label>
                      <Input
                        placeholder="99112233"
                        {...newGuestForm.register("phone")}
                        data-testid="input-new-guest-phone"
                      />
                      {newGuestForm.formState.errors.phone && (
                        <p className="text-xs text-destructive mt-1">{newGuestForm.formState.errors.phone.message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={newGuestForm.watch("isVip")}
                        onCheckedChange={(v) => newGuestForm.setValue("isVip", !!v)}
                        data-testid="checkbox-new-guest-vip"
                      />
                      <label className="text-sm">VIP зочин</label>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      disabled={createGuestMutation.isPending}
                      onClick={newGuestForm.handleSubmit((vals) => createGuestMutation.mutate(vals))}
                      data-testid="button-save-new-guest"
                    >
                      {createGuestMutation.isPending ? "Бүртгэж байна..." : "Зочин бүртгэх"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Утас эсвэл регистрийн дугаараар хайх..."
                        value={guestSearch}
                        onChange={(e) => setGuestSearch(e.target.value)}
                        className="pl-10"
                        data-testid="input-guest-search"
                      />
                    </div>
                    {guestSearch.length >= 2 && (
                      <div className="rounded-md border max-h-[160px] overflow-auto">
                        {guestsLoading ? (
                          <div className="p-3 text-center text-sm text-muted-foreground">Ачаалж байна...</div>
                        ) : guestSearchResults.length > 0 ? (
                          guestSearchResults.map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              className="w-full flex items-center gap-3 p-2.5 text-left border-b last:border-b-0 transition-colors"
                              onClick={() => {
                                setSelectedGuest(g);
                                form.setValue("guestId", g.id);
                                setGuestSearch("");
                              }}
                              data-testid={`button-select-guest-${g.id}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{g.lastName} {g.firstName}</p>
                                <p className="text-xs text-muted-foreground">{g.idNumber} · {g.phone}</p>
                              </div>
                              <Check className="h-4 w-4 text-muted-foreground shrink-0" />
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-center">
                            <p className="text-sm text-muted-foreground mb-2">Зочин олдсонгүй</p>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowNewGuestForm(true);
                                newGuestForm.reset({ idNumber: "", firstName: "", lastName: "", phone: guestSearch.match(/^\d+$/) ? guestSearch : "", isVip: false });
                              }}
                              data-testid="button-create-new-guest"
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Шинэ зочин бүртгэх
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    {guestSearch.length < 2 && (
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground flex-1">Утас эсвэл регистрийн дугаар оруулна уу (2+ тэмдэгт)</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowNewGuestForm(true);
                            newGuestForm.reset();
                          }}
                          data-testid="button-create-new-guest-direct"
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Шинээр бүртгэх
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {form.formState.errors.guestId && !selectedGuest && (
                  <p className="text-xs text-destructive">{form.formState.errors.guestId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Өрөө</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-booking-room">
                            <SelectValue placeholder="Өрөө сонгох" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableRooms.map((r) => {
                            const cat = catMap[r.categoryId];
                            return (
                              <SelectItem key={r.id} value={r.id}>
                                {r.roomNumber} - {cat?.name || ""} ({Number(cat?.basePrice || 0).toLocaleString()}₮/хоног)
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
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
                        max={selectedCategory?.capacity || 10}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-booking-guest-count"
                      />
                    </FormControl>
                    {selectedCategory && (
                      <p className="text-xs text-muted-foreground">Багтаамж: {selectedCategory.capacity} хүн</p>
                    )}
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
                        <Input type="date" min={today} {...field} data-testid="input-booking-checkin" />
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
                        <Input type="date" min={checkInVal || today} {...field} data-testid="input-booking-checkout" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {activeServices.length > 0 && (
                <div className="space-y-3">
                  <FormLabel>Эмчилгээ / Багц сонгох</FormLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-auto rounded-md border p-3">
                    {activeServices.map((svc) => (
                      <label
                        key={svc.id}
                        className="flex items-start gap-3 rounded-md border p-2.5 cursor-pointer"
                        data-testid={`checkbox-service-${svc.id}`}
                      >
                        <Checkbox
                          checked={selectedServices.includes(svc.id)}
                          onCheckedChange={() => toggleService(svc.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">{svc.name}</span>
                            <Badge variant={svc.type === "PACKAGE" ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                              {svc.type === "SERVICE" ? "Эмч." : "Багц"}
                            </Badge>
                          </div>
                          {svc.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{svc.description}</p>
                          )}
                          <p className="text-xs font-medium mt-0.5">{Number(svc.price).toLocaleString()}₮</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-muted/50 rounded-md p-4 space-y-2">
                <h4 className="text-sm font-semibold">Төлбөрийн тооцоо</h4>
                <div className="space-y-1 text-sm">
                  {selectedCategory && nights > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Өрөө ({selectedCategory.name}) × {nights} хоног
                      </span>
                      <span>{roomTotal.toLocaleString()}₮</span>
                    </div>
                  )}
                  {selectedServices.length > 0 && selectedServices.map(svcId => {
                    const svc = allServices.find(s => s.id === svcId);
                    return svc ? (
                      <div key={svcId} className="flex justify-between">
                        <span className="text-muted-foreground">{svc.name}</span>
                        <span>{Number(svc.price).toLocaleString()}₮</span>
                      </div>
                    ) : null;
                  })}
                  <div className="flex justify-between pt-2 border-t font-semibold">
                    <span>Нийт дүн</span>
                    <span data-testid="text-booking-total">{grandTotal.toLocaleString()}₮</span>
                  </div>
                </div>
              </div>

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
                        max={grandTotal}
                        placeholder="0"
                        {...field}
                        data-testid="input-deposit-amount"
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
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel-booking">
                  Цуцлах
                </Button>
                <Button type="submit" disabled={createMutation.isPending || grandTotal === 0}
                  data-testid="button-create-booking">
                  {createMutation.isPending ? "Үүсгэж байна..." : "Захиалга үүсгэх"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
