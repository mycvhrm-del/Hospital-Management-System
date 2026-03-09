import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CalendarDays, Search } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Booking, Guest, Room, RoomCategory, Service } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

const bookingFormSchema = z.object({
  guestId: z.string().min(1, "Зочин сонгоно уу"),
  roomId: z.string().min(1, "Өрөө сонгоно уу"),
  checkIn: z.string().min(1, "Орох огноо оруулна уу"),
  checkOut: z.string().min(1, "Гарах огноо оруулна уу"),
  totalAmount: z.string().min(1, "Дүн оруулна уу"),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

const statusLabels: Record<string, string> = {
  PENDING: "Хүлээгдэж буй",
  CONFIRMED: "Баталгаажсан",
  CHECKED_IN: "Бүртгэлтэй",
  CHECKED_OUT: "Гарсан",
  CANCELLED: "Цуцлагдсан",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  CHECKED_IN: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CHECKED_OUT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function BookingsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: allBookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: allGuests = [] } = useQuery<Guest[]>({
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

  const guestMap = Object.fromEntries(allGuests.map(g => [g.id, g]));
  const roomMap = Object.fromEntries(allRooms.map(r => [r.id, r]));
  const catMap = Object.fromEntries(allCategories.map(c => [c.id, c]));
  const availableRooms = allRooms.filter(r => r.status === "AVAILABLE");
  const activeServices = allServices.filter(s => s.isActive);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: { guestId: "", roomId: "", checkIn: "", checkOut: "", totalAmount: "0" },
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
    form.reset({ guestId: "", roomId: "", checkIn: "", checkOut: "", totalAmount: "0" });
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: BookingFormValues & { serviceIds: string[] }) =>
      apiRequest("POST", "/api/bookings", {
        ...data,
        totalAmount: String(grandTotal),
        checkIn: new Date(data.checkIn).toISOString(),
        checkOut: new Date(data.checkOut).toISOString(),
        serviceIds: data.serviceIds,
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

  const filtered = allBookings.filter(b => {
    if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
    if (searchQuery) {
      const guest = guestMap[b.guestId];
      const room = roomMap[b.roomId];
      const q = searchQuery.toLowerCase();
      const guestName = guest ? `${guest.lastName} ${guest.firstName}`.toLowerCase() : "";
      const roomNum = room ? room.roomNumber.toLowerCase() : "";
      return guestName.includes(q) || roomNum.includes(q);
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
  const today = new Date().toISOString().split("T")[0];

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
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-booking-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-booking-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Бүгд ({allBookings.length})</SelectItem>
            <SelectItem value="PENDING">Хүлээгдэж буй</SelectItem>
            <SelectItem value="CONFIRMED">Баталгаажсан</SelectItem>
            <SelectItem value="CHECKED_IN">Бүртгэлтэй</SelectItem>
            <SelectItem value="CHECKED_OUT">Гарсан</SelectItem>
            <SelectItem value="CANCELLED">Цуцлагдсан</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Ачаалж байна...</div>
      ) : sorted.length === 0 ? (
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((booking) => {
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-booking-dialog-title">Шинэ захиалга</DialogTitle>
            <DialogDescription>Өрөө, зочин, үйлчилгээ сонгож захиалга үүсгэнэ үү</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="guestId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Зочин</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-booking-guest">
                            <SelectValue placeholder="Зочин сонгох" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allGuests.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.lastName} {g.firstName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  <FormLabel>Үйлчилгээ / Багц сонгох</FormLabel>
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
                              {svc.type === "SERVICE" ? "Үйлч." : "Багц"}
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
