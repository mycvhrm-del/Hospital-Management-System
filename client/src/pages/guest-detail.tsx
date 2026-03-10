import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft, Crown, Users, Phone, FileText, Calendar, CreditCard, Banknote,
  Stethoscope, Plus, CheckCircle, Clock, AlertTriangle, User,
} from "lucide-react";
import type { Guest, Booking, Transaction, Service, Staff } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function MedicalHistoryViewer({ data }: { data: unknown }) {
  if (!data) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="text-no-medical-history">
        Эмнэлгийн түүх бүртгэгдээгүй
      </p>
    );
  }

  const renderValue = (value: unknown, depth = 0): JSX.Element => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">—</span>;
    }
    if (typeof value === "boolean") {
      return <Badge variant={value ? "default" : "secondary"}>{value ? "Тийм" : "Үгүй"}</Badge>;
    }
    if (typeof value === "string" || typeof value === "number") {
      return <span className="text-sm">{String(value)}</span>;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-muted-foreground italic text-sm">Хоосон</span>;
      return (
        <div className="space-y-1">
          {value.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-muted-foreground text-xs mt-0.5">{i + 1}.</span>
              {renderValue(item, depth + 1)}
            </div>
          ))}
        </div>
      );
    }
    if (typeof value === "object") {
      return (
        <div className={depth > 0 ? "ml-4 border-l pl-3 space-y-2" : "space-y-2"}>
          {Object.entries(value as Record<string, unknown>).map(([key, val]) => (
            <div key={key} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{key}</span>
              {renderValue(val, depth + 1)}
            </div>
          ))}
        </div>
      );
    }
    return <span className="text-sm">{JSON.stringify(value)}</span>;
  };

  return (
    <div data-testid="medical-history-content">
      {renderValue(data)}
    </div>
  );
}

const treatmentFormSchema = z.object({
  bookingId: z.string().min(1, "Захиалга сонгоно уу"),
  serviceId: z.string().min(1, "Эмчилгээ сонгоно уу"),
  staffId: z.string().optional(),
  startDate: z.string().min(1, "Эхлэх огноо оруулна уу"),
  endDate: z.string().min(1, "Дуусах огноо оруулна уу"),
  dailyTime: z.string().min(1, "Цаг оруулна уу"),
  notes: z.string().optional(),
});

type TreatmentFormValues = z.infer<typeof treatmentFormSchema>;

interface TreatmentPlanItem {
  id: string;
  bookingId: string;
  serviceId: string | null;
  serviceName: string;
  staffId: string | null;
  scheduleTime: string;
  status: string;
  notes: string | null;
  completedAt: string | null;
  room: { id: string; roomNumber: string } | null;
  staff: { id: string; name: string; role: string } | null;
}

export default function GuestDetailPage() {
  const [, params] = useRoute("/guests/:id");
  const guestId = params?.id;
  return guestId ? <GuestDetailContent key={guestId} guestId={guestId} /> : null;
}

function GuestDetailContent({ guestId }: { guestId: string }) {
  const { toast } = useToast();
  const [treatmentDialogOpen, setTreatmentDialogOpen] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<{ itemName: string; stockQuantity: string; minStockLevel: string }[]>([]);
  const [showLowStock, setShowLowStock] = useState(false);

  const { data: guest, isLoading: guestLoading } = useQuery<Guest>({
    queryKey: ["/api/guests", guestId],
  });

  const { data: familyMembers = [] } = useQuery<Guest[]>({
    queryKey: ["/api/guests", guestId, "family"],
  });

  const { data: guestBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/guests", guestId, "bookings"],
  });

  const { data: allGuests = [] } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  const { data: treatmentPlans = [] } = useQuery<TreatmentPlanItem[]>({
    queryKey: ["/api/guests", guestId, "treatment-plans"],
  });

  const { data: allServices = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: allStaff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const activeBookings = guestBookings.filter(b => b.status === "CHECKED_IN" || b.status === "CONFIRMED");
  const activeServices = allServices.filter(s => s.isActive && s.type === "SERVICE");

  const form = useForm<TreatmentFormValues>({
    resolver: zodResolver(treatmentFormSchema),
    defaultValues: { bookingId: "", serviceId: "", staffId: "", startDate: "", endDate: "", dailyTime: "10:00", notes: "" },
  });

  const createTreatmentMutation = useMutation({
    mutationFn: (data: TreatmentFormValues) =>
      apiRequest("POST", "/api/treatment-plans/bulk", {
        bookingId: data.bookingId,
        serviceId: data.serviceId,
        staffId: data.staffId || null,
        startDate: data.startDate,
        endDate: data.endDate,
        dailyTime: data.dailyTime,
        notes: data.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests", guestId, "treatment-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-schedule"] });
      setTreatmentDialogOpen(false);
      form.reset();
      toast({ title: "Амжилттай", description: "Эмчилгээний төлөвлөгөө үүсгэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/treatment-plans/${id}/complete`, {}).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests", guestId, "treatment-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Амжилттай", description: "Эмчилгээ дууссан гэж тэмдэглэгдлээ" });

      if (data.lowStockWarnings && data.lowStockWarnings.length > 0) {
        setLowStockItems(data.lowStockWarnings);
        setShowLowStock(true);
      }
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  if (guestLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Зочин олдсонгүй</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/guests">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Буцах
          </Link>
        </Button>
      </div>
    );
  }

  const parentGuest = guest.parentId ? allGuests.find((g) => g.id === guest.parentId) : null;

  const upcomingPlans = treatmentPlans.filter(p => p.status === "SCHEDULED");
  const completedPlans = treatmentPlans.filter(p => p.status === "COMPLETED");

  return (
    <div className="p-6 space-y-6" data-testid="page-guest-detail">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" asChild data-testid="button-back-guests">
          <Link href="/guests">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-guest-fullname">
              {guest.lastName} {guest.firstName}
            </h1>
            {guest.isVip && (
              <Badge variant="secondary">
                <Crown className="h-3 w-3 mr-1" />
                VIP
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Регистр: {guest.idNumber}
          </p>
        </div>
        <Button onClick={() => setTreatmentDialogOpen(true)} data-testid="button-add-treatment">
          <Plus className="h-4 w-4 mr-2" />
          Эмчилгээ нэмэх
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Хувийн мэдээлэл
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Овог</p>
                <p className="text-sm font-medium mt-0.5" data-testid="text-detail-lastname">{guest.lastName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Нэр</p>
                <p className="text-sm font-medium mt-0.5" data-testid="text-detail-firstname">{guest.firstName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Регистрийн дугаар</p>
                <p className="text-sm font-medium mt-0.5" data-testid="text-detail-idnumber">{guest.idNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Утас</p>
                <p className="text-sm font-medium mt-0.5 flex items-center gap-1" data-testid="text-detail-phone">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {guest.phone}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Loyalty оноо</p>
                <p className="text-sm font-medium mt-0.5" data-testid="text-detail-loyalty">{guest.loyaltyPoints}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Бүртгүүлсэн</p>
                <p className="text-sm font-medium mt-0.5" data-testid="text-detail-created">
                  {new Date(guest.createdAt).toLocaleDateString("mn-MN")}
                </p>
              </div>
            </div>
            {parentGuest && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Гэр бүлийн толгой</p>
                  <Button variant="outline" size="sm" className="mt-1" asChild>
                    <Link href={`/guests/${parentGuest.id}`} data-testid="link-parent-guest">
                      {parentGuest.lastName} {parentGuest.firstName}
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Эмнэлгийн түүх
            </CardTitle>
          </CardHeader>
          <CardContent data-testid="section-medical-history">
            <MedicalHistoryViewer data={guest.medicalHistory} />
          </CardContent>
        </Card>
      </div>

      {!guest.parentId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Гэр бүлийн гишүүд
            </CardTitle>
            <Badge variant="outline">{familyMembers.length} гишүүн</Badge>
          </CardHeader>
          <CardContent>
            {familyMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-family">
                Гэр бүлийн гишүүн бүртгэгдээгүй
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Овог, Нэр</TableHead>
                      <TableHead>Регистр</TableHead>
                      <TableHead>Утас</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {familyMembers.map((member) => (
                      <TableRow key={member.id} data-testid={`row-family-member-${member.id}`}>
                        <TableCell className="font-medium">
                          {member.lastName} {member.firstName}
                          {member.isVip && (
                            <Badge variant="secondary" className="ml-2">VIP</Badge>
                          )}
                        </TableCell>
                        <TableCell>{member.idNumber}</TableCell>
                        <TableCell>{member.phone}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" asChild>
                            <Link href={`/guests/${member.id}`} data-testid={`link-family-detail-${member.id}`}>
                              <ArrowLeft className="h-4 w-4 rotate-180" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Миний хуваарь (Эмчилгээ)
          </CardTitle>
          <Badge variant="outline">{treatmentPlans.length}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {treatmentPlans.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-treatments">
              Эмчилгээний төлөвлөгөө байхгүй
            </p>
          ) : (
            <>
              {upcomingPlans.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Хүлээгдэж буй ({upcomingPlans.length})
                  </h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Огноо / Цаг</TableHead>
                          <TableHead>Эмчилгээ</TableHead>
                          <TableHead>Өрөө</TableHead>
                          <TableHead>Хариуцагч</TableHead>
                          <TableHead className="w-24"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upcomingPlans.map((plan) => (
                          <TableRow key={plan.id} data-testid={`row-treatment-${plan.id}`}>
                            <TableCell className="text-sm" data-testid={`text-treatment-time-${plan.id}`}>
                              {new Date(plan.scheduleTime).toLocaleDateString("mn-MN")}{" "}
                              {new Date(plan.scheduleTime).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })}
                            </TableCell>
                            <TableCell className="font-medium" data-testid={`text-treatment-name-${plan.id}`}>
                              {plan.serviceName}
                              {plan.notes && <p className="text-xs text-muted-foreground">{plan.notes}</p>}
                            </TableCell>
                            <TableCell>{plan.room?.roomNumber || "—"}</TableCell>
                            <TableCell>
                              {plan.staff ? (
                                <Badge variant="outline">{plan.staff.name}</Badge>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => completeMutation.mutate(plan.id)}
                                disabled={completeMutation.isPending}
                                data-testid={`button-complete-treatment-${plan.id}`}
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Дуусгах
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {completedPlans.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    Дууссан ({completedPlans.length})
                  </h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Огноо / Цаг</TableHead>
                          <TableHead>Эмчилгээ</TableHead>
                          <TableHead>Өрөө</TableHead>
                          <TableHead>Хариуцагч</TableHead>
                          <TableHead>Дууссан</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedPlans.map((plan) => (
                          <TableRow key={plan.id} className="opacity-70" data-testid={`row-completed-${plan.id}`}>
                            <TableCell className="text-sm">
                              {new Date(plan.scheduleTime).toLocaleDateString("mn-MN")}{" "}
                              {new Date(plan.scheduleTime).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })}
                            </TableCell>
                            <TableCell>{plan.serviceName}</TableCell>
                            <TableCell>{plan.room?.roomNumber || "—"}</TableCell>
                            <TableCell>
                              {plan.staff ? (
                                <Badge variant="outline">{plan.staff.name}</Badge>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {plan.completedAt ? new Date(plan.completedAt).toLocaleString("mn-MN") : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Захиалгууд
          </CardTitle>
          <Badge variant="outline">{guestBookings.length}</Badge>
        </CardHeader>
        <CardContent>
          {guestBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-bookings">
              Захиалга байхгүй
            </p>
          ) : (
            <div className="space-y-3">
              {guestBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={treatmentDialogOpen} onOpenChange={setTreatmentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Эмчилгээ нэмэх</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => createTreatmentMutation.mutate(v))} className="space-y-4">
              <FormField
                control={form.control}
                name="bookingId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Захиалга</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-treatment-booking">
                          <SelectValue placeholder="Захиалга сонгох" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeBookings.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {new Date(b.checkIn).toLocaleDateString("mn-MN")} - {new Date(b.checkOut).toLocaleDateString("mn-MN")} ({b.status === "CHECKED_IN" ? "Дүүрсэн" : "Баталгаажсан"})
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
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Эмчилгээний төрөл</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-treatment-service">
                          <SelectValue placeholder="Эмчилгээ сонгох" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeServices.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({Number(s.price).toLocaleString()}₮)
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
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Хариуцах эмч/сувилагч</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-treatment-staff">
                          <SelectValue placeholder="Сонгох (заавал биш)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allStaff.filter(s => s.isActive).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.role === "DOCTOR" ? "Эмч" : "Сувилагч"})
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
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Эхлэх огноо</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-treatment-start" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дуусах огноо</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-treatment-end" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dailyTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Өдөр бүрийн цаг</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} data-testid="input-treatment-time" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Жишээ: 10:00 - өдөр бүр энэ цагт</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тэмдэглэл</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Нэмэлт тэмдэглэл..." {...field} data-testid="input-treatment-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setTreatmentDialogOpen(false)}>
                  Цуцлах
                </Button>
                <Button type="submit" disabled={createTreatmentMutation.isPending} data-testid="button-submit-treatment">
                  {createTreatmentMutation.isPending ? "Үүсгэж байна..." : "Эмчилгээ нэмэх"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showLowStock} onOpenChange={setShowLowStock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Бараа материал дутагдалтай
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Дараах бараа материалын нөөц доод хэмжээнээс доогуур байна:</p>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Бараа</TableHead>
                        <TableHead>Үлдэгдэл</TableHead>
                        <TableHead>Доод хэмжээ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockItems.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell className="text-destructive font-bold">{Number(item.stockQuantity).toLocaleString()}</TableCell>
                          <TableCell>{Number(item.minStockLevel).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Хаах</AlertDialogCancel>
            <AlertDialogAction asChild>
              <a href="/inventory">Агуулах руу очих</a>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const bookingStatusLabels: Record<string, string> = {
  PENDING: "Хүлээгдэж буй",
  CONFIRMED: "Баталгаажсан",
  CHECKED_IN: "Дүүрсэн",
  CHECKED_OUT: "Check-out",
  CANCELLED: "Цуцлагдсан",
};

function BookingCard({ booking }: { booking: Booking }) {
  const { data: txns = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/bookings", booking.id, "transactions"],
  });

  const totalPaid = txns.reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = Number(booking.totalAmount) - totalPaid;

  return (
    <div className="rounded-md border p-3 space-y-2" data-testid={`card-booking-${booking.id}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{new Date(booking.checkIn).toLocaleDateString("mn-MN")} - {new Date(booking.checkOut).toLocaleDateString("mn-MN")}</span>
        </div>
        <Badge variant="outline">{bookingStatusLabels[booking.status] || booking.status}</Badge>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span>Нийт: <strong>{Number(booking.totalAmount).toLocaleString()}₮</strong></span>
        <span>Төлсөн: <strong>{totalPaid.toLocaleString()}₮</strong></span>
        <span className={balance > 0 ? "text-destructive" : ""}>Үлдэгдэл: <strong>{balance.toLocaleString()}₮</strong></span>
      </div>
      {txns.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Огноо</TableHead>
                <TableHead className="text-xs">Төрөл</TableHead>
                <TableHead className="text-xs">Хэлбэр</TableHead>
                <TableHead className="text-xs text-right">Дүн</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txns.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="text-xs">{new Date(txn.createdAt).toLocaleDateString("mn-MN")}</TableCell>
                  <TableCell className="text-xs">{txn.type === "DEPOSIT" ? "Урьдчилгаа" : "Эцсийн"}</TableCell>
                  <TableCell className="text-xs">{txn.paymentMethod === "CASH" ? "Бэлэн" : txn.paymentMethod === "CARD" ? "Карт" : "Шилжүүлэг"}</TableCell>
                  <TableCell className="text-xs text-right">{Number(txn.amount).toLocaleString()}₮</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
