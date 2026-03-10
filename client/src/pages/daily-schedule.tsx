import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock, CheckCircle, Clock, User, DoorOpen, Stethoscope, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScheduleItem {
  id: string;
  bookingId: string;
  serviceId: string | null;
  serviceName: string;
  staffId: string | null;
  scheduleTime: string;
  status: string;
  notes: string | null;
  completedAt: string | null;
  guest: { id: string; firstName: string; lastName: string } | null;
  room: { id: string; roomNumber: string } | null;
  staff: { id: string; name: string; role: string } | null;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });
}

function formatDateInput(date: Date) {
  return date.toISOString().split("T")[0];
}

export default function DailySchedulePage() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => formatDateInput(new Date()));
  const [lowStockItems, setLowStockItems] = useState<{ itemName: string; stockQuantity: string; minStockLevel: string }[]>([]);
  const [showLowStock, setShowLowStock] = useState(false);

  const { data: schedule = [], isLoading } = useQuery<ScheduleItem[]>({
    queryKey: ["/api/daily-schedule", `?date=${selectedDate}`],
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/treatment-plans/${id}/complete`, {}).then(r => r.json()),
    onSuccess: (data) => {
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

  const scheduledCount = schedule.filter(s => s.status === "SCHEDULED").length;
  const completedCount = schedule.filter(s => s.status === "COMPLETED").length;

  const today = formatDateInput(new Date());
  const isToday = selectedDate === today;

  return (
    <div className="p-6 space-y-6" data-testid="page-daily-schedule">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarClock className="h-6 w-6" />
            Өдрийн хуваарь
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isToday ? "Өнөөдрийн" : new Date(selectedDate).toLocaleDateString("mn-MN")} эмчилгээний хуваарь
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44"
            data-testid="input-schedule-date"
          />
          {!isToday && (
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(today)} data-testid="button-today">
              Өнөөдөр
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-treatments">{schedule.length}</p>
              <p className="text-xs text-muted-foreground">Нийт эмчилгээ</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-scheduled-count">{scheduledCount}</p>
              <p className="text-xs text-muted-foreground">Хүлээгдэж буй</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-completed-count">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Дууссан</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Эмчилгээний жагсаалт</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Ачааллаж байна...</p>
          ) : schedule.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-schedule">
              Энэ өдөр эмчилгээ төлөвлөгдөөгүй байна
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Цаг</TableHead>
                    <TableHead>Эмчилгээ</TableHead>
                    <TableHead>Зочин</TableHead>
                    <TableHead>Өрөө</TableHead>
                    <TableHead>Хариуцагч</TableHead>
                    <TableHead>Төлөв</TableHead>
                    <TableHead className="w-28"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((item) => (
                    <TableRow key={item.id} data-testid={`row-schedule-${item.id}`}>
                      <TableCell className="font-medium" data-testid={`text-time-${item.id}`}>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatTime(item.scheduleTime)}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-treatment-${item.id}`}>
                        <div className="flex items-center gap-1.5">
                          <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                          {item.serviceName}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-guest-${item.id}`}>
                        {item.guest ? (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            {item.guest.lastName} {item.guest.firstName}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell data-testid={`text-room-${item.id}`}>
                        {item.room ? (
                          <div className="flex items-center gap-1.5">
                            <DoorOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            {item.room.roomNumber}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell data-testid={`text-staff-${item.id}`}>
                        {item.staff ? (
                          <Badge variant="outline">{item.staff.name} ({item.staff.role === "DOCTOR" ? "Эмч" : "Сувилагч"})</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Тодорхойгүй</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.status === "SCHEDULED" ? (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Хүлээгдэж буй
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Дууссан
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.status === "SCHEDULED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => completeMutation.mutate(item.id)}
                            disabled={completeMutation.isPending}
                            data-testid={`button-complete-${item.id}`}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Дуусгах
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
            <AlertDialogCancel data-testid="button-close-low-stock">Хаах</AlertDialogCancel>
            <AlertDialogAction asChild>
              <a href="/inventory" data-testid="link-go-inventory">Агуулах руу очих</a>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
