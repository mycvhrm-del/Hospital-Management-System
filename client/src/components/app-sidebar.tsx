import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Settings, BedDouble, Users, CreditCard, Grid3X3,
  CalendarDays, Stethoscope, Warehouse, CalendarRange, ShoppingCart,
  Sparkles, CalendarClock, ChevronRight, Banknote,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type NavItem = { title: string; url: string; icon: React.ElementType };
type NavGroup = { label: string; icon: React.ElementType; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Хяналт",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Өрөөний самбар", url: "/room-grid", icon: Grid3X3 },
      { title: "Долоо хоногийн хуваарь", url: "/timeline", icon: CalendarRange },
    ],
  },
  {
    label: "Захиалга & Зочид",
    icon: CalendarDays,
    items: [
      { title: "Зочид", url: "/guests", icon: Users },
      { title: "Захиалга", url: "/bookings", icon: CalendarDays },
      { title: "Борлуулалт", url: "/sales", icon: ShoppingCart },
      { title: "Төлбөр", url: "/billing", icon: Banknote },
    ],
  },
  {
    label: "Эмнэлэг",
    icon: Stethoscope,
    items: [
      { title: "Үйлчилгээ & Багц", url: "/services", icon: Stethoscope },
      { title: "Өдрийн хуваарь", url: "/daily-schedule", icon: CalendarClock },
    ],
  },
  {
    label: "Үйл ажиллагаа",
    icon: Sparkles,
    items: [
      { title: "Засвар үйлчилгээ", url: "/housekeeping", icon: Sparkles },
      { title: "Агуулах", url: "/inventory", icon: Warehouse },
    ],
  },
];

const systemItems: NavItem[] = [
  { title: "Тохиргоо", url: "/settings", icon: Settings },
];

function NavGroupItem({
  group,
  isActive,
}: {
  group: NavGroup;
  isActive: (url: string) => boolean;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const groupActive = group.items.some((item) => isActive(item.url));
  const [open, setOpen] = useState(groupActive);

  if (isCollapsed) {
    return (
      <>
        {group.items.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton
              asChild
              data-active={isActive(item.url)}
              title={item.title}
            >
              <Link
                href={item.url}
                data-testid={`nav-${item.title.toLowerCase()}`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        data-active={groupActive && !open}
        className="w-full"
        onClick={() => setOpen((v) => !v)}
        data-testid={`nav-group-${group.label}`}
      >
        <group.icon className="h-4 w-4" />
        <span className="font-medium">{group.label}</span>
        <ChevronRight
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-90"
          )}
        />
      </SidebarMenuButton>

      {open && (
        <SidebarMenuSub>
          {group.items.map((item) => (
            <SidebarMenuSubItem key={item.url}>
              <SidebarMenuSubButton
                asChild
                isActive={isActive(item.url)}
              >
                <Link
                  href={item.url}
                  data-testid={`nav-${item.title.toLowerCase()}`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const [location] = useLocation();

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location === url || location.startsWith(url + "/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary flex-shrink-0">
            <BedDouble className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="overflow-hidden group-data-[collapsible=icon]:hidden">
            <h2 className="text-sm font-semibold tracking-tight">Сувилал ERP</h2>
            <p className="text-xs text-muted-foreground">Удирдлагын систем</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navGroups.map((group) => (
                <NavGroupItem
                  key={group.label}
                  group={group}
                  isActive={isActive}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild data-active={isActive(item.url)}>
                    <Link
                      href={item.url}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
