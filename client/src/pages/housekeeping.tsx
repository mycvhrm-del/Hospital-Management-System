import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Sparkles, CheckCircle, BedDouble, Clock, PlayCircle,
  ShieldCheck, WrenchIcon, MinusCircle, CheckCheck, ArrowRight,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RoomCategory, Floor } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface RoomGridItem {
  id: string;
  roomNumber: string;
  floor: string;
  categoryId: string;
  status: "AVAILABLE" | "OCCUPIED" | "PENDING" | "CLEANING" | "CLEANING_IN_PROGRESS" | "INSPECTED" | "OUT_OF_ORDER" | "OUT_OF_SERVICE";
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

function useRoomStatusMutation(toastMsg: string) {
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ roomId, status }: { roomId: string; status: string }) =>
      apiRequest("PATCH", `/api/rooms/${roomId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-timeline"] });
      toast({ title: "Амжилттай", description: toastMsg });
    },
    onError: () => {
      toast({ title: "Алдаа", description: "Статус шинэчлэхэд алдаа гарлаа.", variant: "destructive" });
    },
  });
}

function RoomCard({
  room,
  floorMap,
  actions,
}: {
  room: RoomGridItem;
  floorMap: Record<string, string>;
  actions: { label: string; toStatus: string; icon: React.ElementType; variant?: "default" | "outline"; className?: string }[];
}) {
  const mutation = useMutation({
    mutationFn: (status: string) => apiRequest("PATCH", `/api/rooms/${room.id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-grid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });

  return (
    <Card data-testid={`card-hk-room-${room.roomNumber}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
              <BedDouble className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-lg" data-testid={`text-hk-room-number-${room.roomNumber}`}>
                Өрөө {room.roomNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                {floorMap[room.floorId] || "—"}
              </p>
            </div>
          </div>
          {room.category && (
            <Badge variant="outline">{room.category.name}</Badge>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {actions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <Button
                key={action.toStatus}
                size="sm"
                variant={action.variant ?? "default"}
                className={`w-full ${action.className ?? ""}`}
                onClick={() => mutation.mutate(action.toStatus)}
                disabled={mutation.isPending}
                data-testid={`button-hk-${action.toStatus.toLowerCase()}-${room.roomNumber}`}
              >
                <ActionIcon className="h-4 w-4 mr-2" />
                {mutation.isPending ? "Шинэчилж байна..." : action.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  icon: Icon,
  iconBg,
  iconColor,
  count,
  rooms,
  floorMap,
  actions,
  emptyText,
}: {
  title: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  count: number;
  rooms: RoomGridItem[];
  floorMap: Record<string, string>;
  actions: { label: string; toStatus: string; icon: React.ElementType; variant?: "default" | "outline"; className?: string }[];
  emptyText: string;
}) {
  if (count === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-md ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{count} өрөө</p>
        </div>
      </div>
      {rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => (
            <RoomCard key={room.id} room={room} floorMap={floorMap} actions={actions} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HousekeepingPage() {
  const { data: rooms, isLoading: roomsLoading } = useQuery<RoomGridItem[]>({
    queryKey: ["/api/room-grid"],
  });

  const { data: floors } = useQuery<Floor[]>({
    queryKey: ["/api/floors"],
  });

  const floorMap = Object.fromEntries((floors || []).map(f => [f.id, f.name]));

  const allRooms = rooms || [];

  const cleaningQueue = allRooms.filter(r => r.status === "CLEANING");
  const inProgress = allRooms.filter(r => r.status === "CLEANING_IN_PROGRESS");
  const inspected = allRooms.filter(r => r.status === "INSPECTED");
  const outOfOrder = allRooms.filter(r => r.status === "OUT_OF_ORDER");
  const outOfService = allRooms.filter(r => r.status === "OUT_OF_SERVICE");

  const availableCount = allRooms.filter(r => r.status === "AVAILABLE").length;
  const occupiedCount = allRooms.filter(r => r.status === "OCCUPIED").length;

  const totalHkWork = cleaningQueue.length + inProgress.length + inspected.length;

  return (
    <div className="p-6 space-y-8" data-testid="page-housekeeping">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-housekeeping-title">
          Өрөөний удирдлага
        </h1>
        <p className="text-sm text-muted-foreground">
          Цэвэрлэгээний урсгал: Хүлээгдэж буй → Цэвэрлэж буй → Шалгагдсан → Сул
        </p>
      </div>

      {roomsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card>
              <CardContent className="p-3 flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900">
                  <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xl font-bold" data-testid="text-cleaning-count">{cleaningQueue.length}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Цэвэрлэх шаардлагатай</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                  <PlayCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xl font-bold">{inProgress.length}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Цэвэрлэж буй</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900">
                  <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-xl font-bold">{inspected.length}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Шалгалт хүлээж буй</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xl font-bold" data-testid="text-available-count">{availableCount}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Сул өрөө</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900">
                  <WrenchIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">{outOfOrder.length}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Засвартай (OOO)</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <MinusCircle className="h-4 w-4 text-zinc-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-zinc-600 dark:text-zinc-400">{outOfService.length}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Хаалттай (OOS)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {totalHkWork === 0 && outOfOrder.length === 0 && outOfService.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold" data-testid="text-all-clean">Бүх өрөө цэвэр байна</h3>
                <p className="text-sm text-muted-foreground mt-1">Цэвэрлэх шаардлагатай өрөө байхгүй байна.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              <Section
                title="Цэвэрлэгээ хүлээгдэж буй"
                icon={Sparkles}
                iconBg="bg-amber-100 dark:bg-amber-900"
                iconColor="text-amber-600 dark:text-amber-400"
                count={cleaningQueue.length}
                rooms={cleaningQueue}
                floorMap={floorMap}
                emptyText="Цэвэрлэх шаардлагатай өрөө байхгүй"
                actions={[
                  { label: "Цэвэрлэж эхлэх", toStatus: "CLEANING_IN_PROGRESS", icon: PlayCircle },
                ]}
              />

              <Section
                title="Цэвэрлэж буй"
                icon={PlayCircle}
                iconBg="bg-purple-100 dark:bg-purple-900"
                iconColor="text-purple-600 dark:text-purple-400"
                count={inProgress.length}
                rooms={inProgress}
                floorMap={floorMap}
                emptyText="Идэвхтэй цэвэрлэж буй өрөө байхгүй"
                actions={[
                  { label: "Цэвэрлэгээ дуусгах", toStatus: "INSPECTED", icon: ShieldCheck },
                ]}
              />

              <Section
                title="Шалгалт хүлээгдэж буй"
                icon={ShieldCheck}
                iconBg="bg-teal-100 dark:bg-teal-900"
                iconColor="text-teal-600 dark:text-teal-400"
                count={inspected.length}
                rooms={inspected}
                floorMap={floorMap}
                emptyText="Шалгалт хүлээгдэж буй өрөө байхгүй"
                actions={[
                  { label: "Баталгаажуулах — Сул болгох", toStatus: "AVAILABLE", icon: CheckCheck },
                ]}
              />

              <Section
                title="Засвартай өрөөнүүд (Out of Order)"
                icon={WrenchIcon}
                iconBg="bg-red-100 dark:bg-red-900"
                iconColor="text-red-600 dark:text-red-400"
                count={outOfOrder.length}
                rooms={outOfOrder}
                floorMap={floorMap}
                emptyText="Засвартай өрөө байхгүй"
                actions={[
                  {
                    label: "Засвар дуусгах — Нээх",
                    toStatus: "AVAILABLE",
                    icon: CheckCircle,
                    variant: "outline",
                  },
                ]}
              />

              <Section
                title="Хаалттай өрөөнүүд (Out of Service)"
                icon={MinusCircle}
                iconBg="bg-zinc-100 dark:bg-zinc-800"
                iconColor="text-zinc-600 dark:text-zinc-400"
                count={outOfService.length}
                rooms={outOfService}
                floorMap={floorMap}
                emptyText="Хаалттай өрөө байхгүй"
                actions={[
                  {
                    label: "Нээх — Захиалгад бэлэн болгох",
                    toStatus: "AVAILABLE",
                    icon: CheckCircle,
                    variant: "outline",
                  },
                  {
                    label: "Засварт оруулах (OOO)",
                    toStatus: "OUT_OF_ORDER",
                    icon: WrenchIcon,
                    variant: "outline",
                    className: "text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800",
                  },
                ]}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
