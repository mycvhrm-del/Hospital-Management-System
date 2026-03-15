import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Banknote, LogOut, User, Calendar, CreditCard, DollarSign, TrendingUp, CalendarPlus } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Booking, Guest, Room, RoomCategory, Transaction } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

import { BOOKING_STATUS_LABELS as statusLabels, BOOKING_STATUS_BADGE_COLORS as statusColors } from "@/lib/booking-status";

const paymentSchema = z.object({
  amount: z.string().min(1, "Дүн оруулна уу"),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER"]),
});

type PaymentValues = z.infer<typeof paymentSchema>;

const checkoutPaymentSchema = z.object({
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER"]),
});

type CheckoutPaymentValues = z.infer<typeof checkoutPaymentSchema>;

export default function SalesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null);
  const [extendBooking, setExtendBooking] = useState<Booking | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const { data: salesBookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings", "active-stays-with-checkouts"],
    queryFn: async () => {
      const res = await fetch("/api/bookings/active-stays?includeCheckouts=true");
      if (!res.ok) throw new Error("Failed to fetch active stays");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: allGuests = [] } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  const { data: allRooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: categories = [] } = useQuery<RoomCategory[]>({
    queryKey: ["/api/room-categories"],
  });

  const guestMap = Object.fromEntries(allGuests.map(g => [g.id, g]));
  const roomMap = Object.fromEntries(allRooms.map(r => [r.id, r]));
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

  const salesBookingIds = salesBookings.map(b => b.id);

  const { data: allTransactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions/bulk", salesBookingIds],
    queryFn: () =>
      salesBookingIds.length > 0
        ? apiRequest("POST", "/api/transactions/bulk", { bookingIds: salesBookingIds }).then(r => r.json())
        : Promise.resolve([]),
    enabled: salesBookingIds.length > 0,
  });

  const depositsByBooking: Record<string, number> = {};
  for (const txn of allTransactions) {
    if (txn.type === "DEPOSIT") {
      depositsByBooking[txn.bookingId] = (depositsByBooking[txn.bookingId] || 0) + Number(txn.amount);
    }
  }

  const filtered = salesBookings.filter(b => {
    if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const guest = guestMap[b.guestId];
      const room = roomMap[b.roomId];
      const guestName = guest ? `${guest.lastName} ${guest.firstName}`.toLowerCase() : "";
      const roomNum = room ? room.roomNumber.toLowerCase() : "";
      return guestName.includes(q) || roomNum.includes(q);
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());

  const totalRevenue = salesBookings.reduce((sum, b) => sum + Number(b.depositPaid), 0);
  const totalExpected = salesBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
  const totalOutstanding = totalExpected - totalRevenue;
  const activeCount = salesBookings.filter(b => b.status === "CHECKED_IN" || b.status === "EXTENDED").length;

  const paymentForm = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: "", paymentMethod: "CASH" },
  });

  const paymentMutation = useMutation({
    mutationFn: (data: PaymentValues) =>
      apiRequest("POST", "/api/transactions", {
        bookingId: paymentBooking!.id,
        amount: data.amount,
        type: "FINAL",
        paymentMethod: data.paymentMethod,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/bulk"] });
      setPaymentBooking(null);
      paymentForm.reset();
      toast({ title: "Амжилттай", description: "Төлбөр бүртгэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const checkoutPaymentForm = useForm<CheckoutPaymentValues>({
    resolver: zodResolver(checkoutPaymentSchema),
    defaultValues: { paymentMethod: "CASH" },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const booking = checkoutBooking!;
      const balance = Number(booking.totalAmount) - Number(booking.depositPaid);
      if (balance > 0) {
        await apiRequest("POST", "/api/transactions", {
          bookingId: booking.id,
          amount: String(balance),
          type: "FINAL",
          paymentMethod: checkoutPaymentForm.getValues("paymentMethod"),
        });
      }
      return apiRequest("PATCH", `/api/bookings/${booking.id}/status`, { status: "CHECKED_OUT" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/bulk"] });
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

  const extendMutation = useMutation({
    mutationFn: ({ id, newCheckOut }: { id: string; newCheckOut: string }) =>
      apiRequest("POST", `/api/bookings/${id}/extend`, { newCheckOut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      setExtendBooking(null);
      setExtendDate("");
      toast({ title: "Амжилттай", description: "Захиалга сунгагдлаа" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const openPayment = (booking: Booking) => {
    const balance = Number(booking.totalAmount) - Number(booking.depositPaid);
    setPaymentBooking(booking);
    paymentForm.reset({ amount: String(balance), type: "FINAL", paymentMethod: "CASH" });
  };

  const openCheckout = (booking: Booking) => {
    setCheckoutBooking(booking);
    const balance = Number(booking.totalAmount) - Number(booking.depositPaid);
    checkoutPaymentForm.reset({ amount: String(balance), type: "FINAL", paymentMethod: "CASH" });
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-sales">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-sales-title">
          Борлуулалт
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Check-in хийсэн болон гарсан зочдын борлуулалтын мэдээлэл
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <User className="h-4 w-4" />
              <span>Идэвхтэй</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-active-count">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span>Нийт борлуулалт</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-expected">{totalExpected.toLocaleString()}₮</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span>Төлөгдсөн</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600" data-testid="text-total-revenue">{totalRevenue.toLocaleString()}₮</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CreditCard className="h-4 w-4" />
              <span>Үлдэгдэл</span>
            </div>
            <p className={`text-2xl font-bold ${totalOutstanding > 0 ? "text-destructive" : ""}`} data-testid="text-total-outstanding">
              {totalOutstanding.toLocaleString()}₮
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Зочин, өрөөгөөр хайх..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-sales-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-sales-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Бүгд ({salesBookings.length})</SelectItem>
            <SelectItem value="CHECKED_IN">Байрлаж буй ({salesBookings.filter(b => b.status === "CHECKED_IN").length})</SelectItem>
            <SelectItem value="EXTENDED">Сунгасан ({salesBookings.filter(b => b.status === "EXTENDED").length})</SelectItem>
            <SelectItem value="CHECKED_OUT">Гарсан ({salesBookings.filter(b => b.status === "CHECKED_OUT").length})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Ачаалж байна...
          </CardContent>
        </Card>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Борлуулалт олдсонгүй
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Зочин</TableHead>
                <TableHead>Өрөө</TableHead>
                <TableHead>Орсон</TableHead>
                <TableHead>Гарах/Гарсан</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead className="text-right">Нийт дүн</TableHead>
                <TableHead className="text-right">Урьдчилгаа</TableHead>
                <TableHead className="text-right">Нийт төлсөн</TableHead>
                <TableHead className="text-right">Үлдэгдэл</TableHead>
                <TableHead>Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(booking => {
                const guest = guestMap[booking.guestId];
                const room = roomMap[booking.roomId];
                const category = room ? catMap[room.categoryId] : null;
                const balance = Number(booking.totalAmount) - Number(booking.depositPaid);

                return (
                  <TableRow key={booking.id} data-testid={`row-sale-${booking.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {guest ? `${guest.lastName} ${guest.firstName}` : "—"}
                        </span>
                        {guest?.isVip && <Badge variant="default" className="text-[10px] px-1 py-0">VIP</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {room ? room.roomNumber : "—"}
                      {category && <span className="text-xs text-muted-foreground ml-1">({category.name})</span>}
                    </TableCell>
                    <TableCell>{new Date(booking.checkIn).toLocaleDateString("mn-MN")}</TableCell>
                    <TableCell>{new Date(booking.checkOut).toLocaleDateString("mn-MN")}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[booking.status] || ""}`}>
                        {statusLabels[booking.status] || booking.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{Number(booking.totalAmount).toLocaleString()}₮</TableCell>
                    <TableCell className="text-right text-blue-600">{(depositsByBooking[booking.id] || 0).toLocaleString()}₮</TableCell>
                    <TableCell className="text-right">{Number(booking.depositPaid).toLocaleString()}₮</TableCell>
                    <TableCell className={`text-right ${balance > 0 ? "text-destructive font-medium" : ""}`}>
                      {balance.toLocaleString()}₮
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {booking.status === "CHECKED_IN" && balance > 0 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openPayment(booking)}
                            data-testid={`button-sale-pay-${booking.id}`}
                          >
                            <Banknote className="h-4 w-4" />
                          </Button>
                        )}
                        {(booking.status === "CHECKED_IN" || booking.status === "EXTENDED") && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Хугацаа сунгах"
                            onClick={() => { setExtendBooking(booking); setExtendDate(""); }}
                            data-testid={`button-sale-extend-${booking.id}`}
                          >
                            <CalendarPlus className="h-4 w-4" />
                          </Button>
                        )}
                        {booking.status === "CHECKED_IN" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openCheckout(booking)}
                            data-testid={`button-sale-checkout-${booking.id}`}
                          >
                            <LogOut className="h-4 w-4" />
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

      <Dialog open={!!paymentBooking} onOpenChange={(open) => { if (!open) { setPaymentBooking(null); paymentForm.reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-sale-payment-title">Төлбөр хийх</DialogTitle>
            <DialogDescription>
              {paymentBooking && (() => {
                const guest = guestMap[paymentBooking.guestId];
                const room = roomMap[paymentBooking.roomId];
                const balance = Number(paymentBooking.totalAmount) - Number(paymentBooking.depositPaid);
                return `${guest ? `${guest.lastName} ${guest.firstName}` : "—"} | Өрөө ${room?.roomNumber || "—"} | Үлдэгдэл: ${balance.toLocaleString()}₮`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit((v) => paymentMutation.mutate(v))} className="space-y-4">
              <FormField
                control={paymentForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дүн (₮)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-sale-payment-amount" />
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
                        <SelectTrigger data-testid="select-sale-payment-method">
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
                <Button type="button" variant="outline" onClick={() => { setPaymentBooking(null); paymentForm.reset(); }}>
                  Цуцлах
                </Button>
                <Button type="submit" disabled={paymentMutation.isPending} data-testid="button-confirm-sale-payment">
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
            <DialogTitle data-testid="text-sale-checkout-title">
              Check-out
            </DialogTitle>
            <DialogDescription>
              {checkoutBooking && (() => {
                const guest = guestMap[checkoutBooking.guestId];
                const room = roomMap[checkoutBooking.roomId];
                return `${guest ? `${guest.lastName} ${guest.firstName}` : "—"} | Өрөө ${room?.roomNumber || "—"} | Нийт: ${Number(checkoutBooking.totalAmount).toLocaleString()}₮ | Төлсөн: ${Number(checkoutBooking.depositPaid).toLocaleString()}₮`;
              })()}
            </DialogDescription>
          </DialogHeader>
          {checkoutBooking && (() => {
            const balance = Number(checkoutBooking.totalAmount) - Number(checkoutBooking.depositPaid);
            if (balance <= 0) {
              return (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Бүх төлбөр төлөгдсөн. Check-out хийх үү?</p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setCheckoutBooking(null); checkoutPaymentForm.reset(); }}>
                      Цуцлах
                    </Button>
                    <Button variant="destructive" onClick={() => checkoutMutation.mutate()} disabled={checkoutMutation.isPending} data-testid="button-confirm-sale-checkout">
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
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Төлбөрийн хэлбэр</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-sale-checkout-method">
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
                    <Button type="button" variant="outline" onClick={() => { setCheckoutBooking(null); checkoutPaymentForm.reset(); }}>
                      Цуцлах
                    </Button>
                    <Button type="submit" variant="destructive" disabled={checkoutMutation.isPending} data-testid="button-confirm-sale-checkout">
                      {checkoutMutation.isPending ? "Гарч байна..." : `${balance.toLocaleString()}₮ төлж Check-out хийх`}
                    </Button>
                  </div>
                </form>
              </Form>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!extendBooking} onOpenChange={(open) => { if (!open) { setExtendBooking(null); setExtendDate(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-sale-extend-title">Хугацаа сунгах</DialogTitle>
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
                min={extendBooking ? new Date(new Date(extendBooking.checkOut).getTime() + 86400000).toISOString().split("T")[0] : today}
                onChange={(e) => setExtendDate(e.target.value)}
                data-testid="input-sale-extend-checkout-date"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setExtendBooking(null); setExtendDate(""); }} data-testid="button-sale-cancel-extend">
                Цуцлах
              </Button>
              <Button
                onClick={() => extendBooking && extendMutation.mutate({ id: extendBooking.id, newCheckOut: extendDate })}
                disabled={!extendDate || extendMutation.isPending}
                data-testid="button-sale-confirm-extend"
              >
                {extendMutation.isPending ? "Сунгаж байна..." : "Сунгах"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
