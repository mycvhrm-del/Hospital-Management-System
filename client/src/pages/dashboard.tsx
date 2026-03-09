import { useQuery } from "@tanstack/react-query";
import { BedDouble, Layers, CheckCircle, AlertTriangle, DollarSign, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface DashboardStats {
  rooms: { total: number; available: number; occupied: number; pending: number; cleaning: number };
  todayRevenue: number;
  totalBookings: number;
  activeBookings: number;
}

const ROOM_COLORS: Record<string, string> = {
  "Сул": "#22c55e",
  "Дүүрсэн": "#ef4444",
  "Хүлээгдэж буй": "#eab308",
  "Цэвэрлэж буй": "#9ca3af",
};

export default function Dashboard() {
  const { data: stats } = useQuery<DashboardStats>({ queryKey: ["/api/dashboard/stats"] });

  const roomChartData = stats ? [
    { name: "Сул", value: stats.rooms.available },
    { name: "Дүүрсэн", value: stats.rooms.occupied },
    { name: "Хүлээгдэж буй", value: stats.rooms.pending },
    { name: "Цэвэрлэж буй", value: stats.rooms.cleaning },
  ].filter(d => d.value > 0) : [];

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
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={roomChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {roomChartData.map((entry) => (
                      <Cell key={entry.name} fill={ROOM_COLORS[entry.name] || "#666"} />
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
            <CardTitle className="text-base">Тавтай морил</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Сувиллын ERP системд тавтай морилно уу. Зүүн талын цэснээс бүх модулиудыг удирдаарай.
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Сул — захиалгад бэлэн</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Дүүрсэн — зочин байгаа</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>Хүлээгдэж буй — захиалга баталгаажаагүй</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span>Цэвэрлэж буй</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
