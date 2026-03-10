import { useQuery, useMutation } from "@tanstack/react-query";
import { Sparkles, CheckCircle, BedDouble, Clock } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RoomCategory, Floor } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface RoomGridItem {
  id: string;
  roomNumber: string;
  floor: string;
  categoryId: string;
  status: "AVAILABLE" | "OCCUPIED" | "PENDING" | "CLEANING";
  category: RoomCategory | null;
  activeBooking: {
    id: string;
    guestId: string;
    checkIn: string;
    checkOut: string;
    status: string;
    totalAmount: string;
    depositPaid: string;
  } | null;
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    isVip: boolean;
  } | null;
}

export default function HousekeepingPage() {
  const { toast } = useToast();

  const { data: rooms, isLoading: roomsLoading } = useQuery<RoomGridItem[]>({
    queryKey: ["/api/room-grid"],
  });

  const { data: floors } = useQuery<Floor[]>({
    queryKey: ["/api/floors"],
  });

  const floorMap = Object.fromEntries((floors || []).map(f => [f.number, f.name]));

  const cleaningRooms = (rooms || []).filter(r => r.status === "CLEANING");
  const availableCount = (rooms || []).filter(r => r.status === "AVAILABLE").length;
  const occupiedCount = (rooms || []).filter(r => r.status === "OCCUPIED").length;
  const cleaningCount = cleaningRooms.length;

  const markCleanMutation = useMutation({
    mutationFn: async (roomId: string) => {
      return apiRequest("PATCH", `/api/rooms/${roomId}`, { status: "AVAILABLE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-timeline"] });
      toast({ title: "Цэвэрлэгээ дууссан", description: "Өрөө сул болж шинэчлэгдлээ." });
    },
    onError: () => {
      toast({ title: "Алдаа", description: "Статус шинэчлэхэд алдаа гарлаа.", variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6" data-testid="page-housekeeping">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-housekeeping-title">Цэвэрлэгээ</h1>
        <p className="text-sm text-muted-foreground">Өрөөний цэвэрлэгээний удирдлага</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-cleaning-count">{cleaningCount}</p>
              <p className="text-xs text-muted-foreground">Цэвэрлэх шаардлагатай</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-available-count">{availableCount}</p>
              <p className="text-xs text-muted-foreground">Сул өрөө</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900">
              <BedDouble className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-occupied-count">{occupiedCount}</p>
              <p className="text-xs text-muted-foreground">Дүүрсэн өрөө</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {roomsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : cleaningCount === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold" data-testid="text-all-clean">Бүх өрөө цэвэр</h3>
            <p className="text-sm text-muted-foreground mt-1">Цэвэрлэх шаардлагатай өрөө байхгүй байна.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cleaningRooms.map(room => (
            <Card key={room.id} className="border-amber-200 dark:border-amber-800" data-testid={`card-cleaning-room-${room.roomNumber}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900">
                      <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg" data-testid={`text-room-number-${room.roomNumber}`}>Өрөө {room.roomNumber}</p>
                      <p className="text-xs text-muted-foreground">{floorMap[room.floor] || `${room.floor}-р давхар`}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700">
                    Цэвэрлэгээ
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  {room.category && (
                    <div className="flex items-center gap-1.5">
                      <BedDouble className="h-3.5 w-3.5" />
                      <span>{room.category.name} — {room.category.capacity} хүний</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Цэвэрлэгээ хүлээгдэж байна</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant="default"
                  onClick={() => markCleanMutation.mutate(room.id)}
                  disabled={markCleanMutation.isPending}
                  data-testid={`button-mark-clean-${room.roomNumber}`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {markCleanMutation.isPending ? "Шинэчилж байна..." : "Цэвэрлэгээ дууссан"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
