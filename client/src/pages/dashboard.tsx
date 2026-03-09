import { useQuery } from "@tanstack/react-query";
import { BedDouble, Layers, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Room, RoomCategory } from "@shared/schema";

export default function Dashboard() {
  const { data: rooms = [] } = useQuery<Room[]>({ queryKey: ["/api/rooms"] });
  const { data: categories = [] } = useQuery<RoomCategory[]>({ queryKey: ["/api/room-categories"] });

  const availableRooms = rooms.filter((r) => r.status === "AVAILABLE").length;
  const occupiedRooms = rooms.filter((r) => r.status === "OCCUPIED").length;

  const stats = [
    {
      title: "Нийт өрөө",
      value: rooms.length,
      icon: BedDouble,
      description: "Бүртгэлтэй өрөөнүүд",
    },
    {
      title: "Ангилал",
      value: categories.length,
      icon: Layers,
      description: "Өрөөний ангилалууд",
    },
    {
      title: "Сул өрөө",
      value: availableRooms,
      icon: CheckCircle,
      description: "Захиалгад бэлэн",
    },
    {
      title: "Дүүрсэн",
      value: occupiedRooms,
      icon: AlertTriangle,
      description: "Одоогоор ашиглагдаж буй",
    },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="page-dashboard">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Сувиллын удирдлагын хяналтын самбар
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} data-testid={`card-stat-${stat.title}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-stat-value-${stat.title}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Тавтай морил</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Сувиллын ERP системд тавтай морилно уу. Зүүн талын цэснээс Settings хэсэг рүү орж өрөөний ангилал болон өрөөнүүдийг удирдаарай.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
