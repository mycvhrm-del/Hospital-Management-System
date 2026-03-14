import { useQuery } from "@tanstack/react-query";
import {
  BedDouble, Layers, CheckCircle, AlertTriangle, DollarSign, CalendarDays,
  Sparkles, PlayCircle, ShieldCheck, WrenchIcon, MinusCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface DashboardStats {
  rooms: {
    total: number;
    available: number;
    occupied: number;
    pending: number;
    cleaning: number;
    cleaningInProgress: number;
    inspected: number;
    outOfOrder: number;
    outOfService: number;
  };
  todayRevenue: number;
  totalBookings: number;
  activeBookings: number;
}

const STATUS_CONFIG: { key: keyof DashboardStats["rooms"]; label: string; color: string; icon: React.ElementType; description: string }[] = [
  { key: "available",          label: "Сул",              color: "#22c55e", icon: CheckCircle,  description: "Захиалгад бэлэн" },
  { key: "occupied",           label: "Дүүрсэн",          color: "#ef4444", icon: AlertTriangle, description: "Одоогоор ашиглагдаж буй" },
  { key: "pending",            label: "Хүлээгдэж буй",    color: "#eab308", icon: CalendarDays, description: "Захиалга баталгаажаагүй" },
  { key: "cleaning",           label: "Цэвэрлэх хүлээлт", color: "#f97316", icon: Sparkles,      description: "Цэвэрлэгдэхийг хүлээж буй" },
  { key: "cleaningInProgress", label: "Цэвэрлэж буй",     color: "#a855f7", icon: PlayCircle,    description: "Цэвэрлэгч ажиллаж байна" },
  { key: "inspected",          label: "Шалгагдсан",       color: "#14b8a6", icon: ShieldCheck,   description: "Менежер шалгалт хүлээж буй" },
  { key: "outOfOrder",         label: "Засвартай (OOO)",  color: "#dc2626", icon: WrenchIcon,    description: "Борлуулах боломжгүй" },
  { key: "outOfService",       label: "Хаалттай (OOS)",   color: "#71717a", icon: MinusCircle,   description: "Түр хаалттай" },
];

export default function Dashboard() {
  const { data: stats } = useQuery<DashboardStats>({ queryKey: ["/api/dashboard/stats"] });

  const roomChartData = stats
    ? STATUS_CONFIG
        .map(cfg => ({ name: cfg.label, value: (stats.rooms[cfg.key] ?? 0), color: cfg.color }))
        .filter(d => d.value > 0)
    : [];

  const statCards = [
    {
      title: "Өнөөдрийн орлого",
      value: stats ? `${stats.todayRevenue.toLocaleString()}₮` : "—",
      icon: DollarSign,
      description: "Өнөөдөр хийгдсэн төлбөрүүд",
    },
    {
      title: "Сул өрөө",
      value: stats?.rooms.available ?? "—",
      icon: CheckCircle,
      description: "Захиалгад бэлэн",
    },
    {
      title: "Дүүрсэн",
      value: stats?.rooms.occupied ?? "—",
      icon: AlertTriangle,
      description: "Одоогоор ашиглагдаж буй",
    },
    {
      title: "Идэвхтэй захиалга",
      value: stats?.activeBookings ?? "—",
      icon: CalendarDays,
      description: "Бүртгэлтэй зочид",
    },
    {
      title: "Нийт өрөө",
      value: stats?.rooms.total ?? "—",
      icon: BedDouble,
      description: "Бүртгэлтэй өрөөнүүд",
    },
    {
      title: "Нийт захиалга",
      value: stats?.totalBookings ?? "—",
      icon: Layers,
      description: "Бүх захиалгууд",
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Өрөөний төлөв</CardTitle>
          </CardHeader>
          <CardContent>
            {roomChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={roomChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {roomChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} өрөө`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Мэдээлэл байхгүй</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Өрөөний статусын тайлбар</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {STATUS_CONFIG.map(cfg => {
                const count = stats?.rooms[cfg.key] ?? 0;
                const Icon = cfg.icon;
                return (
                  <div key={cfg.key} className="flex items-center gap-2.5" data-testid={`legend-${cfg.key}`}>
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{cfg.label}</span>
                      <span className="text-xs text-muted-foreground ml-1">— {cfg.description}</span>
                    </div>
                    <span className="text-sm font-bold shrink-0" style={{ color: count > 0 ? cfg.color : undefined }}>
                      {count}
                    </span>
                  </div>
                );
              })}
              <div className="border-t pt-2 mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Борлуулах боломжтой нийт:</span>
                <span className="font-bold">
                  {stats ? stats.rooms.total - (stats.rooms.outOfOrder ?? 0) : "—"}
                  <span className="text-muted-foreground font-normal"> / {stats?.rooms.total ?? "—"}</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
