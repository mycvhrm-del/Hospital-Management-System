import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Layers, BedDouble, Users } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RoomCategory, Room } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Нэр оруулна уу"),
  basePrice: z.string().min(1, "Үнэ оруулна уу"),
  capacity: z.coerce.number().min(1, "Багтаамж 1-ээс их байх ёстой"),
});

const roomFormSchema = z.object({
  roomNumber: z.string().min(1, "Өрөөний дугаар оруулна уу"),
  floor: z.coerce.number().min(1, "Давхар сонгоно уу"),
  categoryId: z.string().min(1, "Ангилал сонгоно уу"),
  status: z.enum(["AVAILABLE", "OCCUPIED", "PENDING", "CLEANING"]),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;
type RoomFormValues = z.infer<typeof roomFormSchema>;

const statusLabels: Record<string, string> = {
  AVAILABLE: "Сул",
  OCCUPIED: "Эзэлсэн",
  PENDING: "Хүлээгдэж буй",
  CLEANING: "Цэвэрлэж буй",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  AVAILABLE: "default",
  OCCUPIED: "destructive",
  PENDING: "outline",
  CLEANING: "secondary",
};

function CategorySection() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RoomCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useQuery<RoomCategory[]>({
    queryKey: ["/api/room-categories"],
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", basePrice: "", capacity: 1 },
  });

  const createMutation = useMutation({
    mutationFn: (data: CategoryFormValues) =>
      apiRequest("POST", "/api/room-categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-categories"] });
      setDialogOpen(false);
      form.reset();
      toast({ title: "Амжилттай", description: "Ангилал нэмэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CategoryFormValues) =>
      apiRequest("PATCH", `/api/room-categories/${editingCategory!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-categories"] });
      setDialogOpen(false);
      setEditingCategory(null);
      form.reset();
      toast({ title: "Амжилттай", description: "Ангилал шинэчлэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/room-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setDeleteId(null);
      toast({ title: "Амжилттай", description: "Ангилал устгагдлаа" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingCategory(null);
    form.reset({ name: "", basePrice: "", capacity: 1 });
    setDialogOpen(true);
  };

  const openEdit = (cat: RoomCategory) => {
    setEditingCategory(cat);
    form.reset({
      name: cat.name,
      basePrice: cat.basePrice,
      capacity: cat.capacity,
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: CategoryFormValues) => {
    if (editingCategory) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-categories-title">Өрөөний ангилал</h3>
          <p className="text-sm text-muted-foreground">Өрөөний төрлүүдийг удирдах</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-category">
          <Plus className="h-4 w-4 mr-2" />
          Ангилал нэмэх
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-categories">
              Ангилал бүртгэгдээгүй байна
            </p>
            <Button variant="outline" className="mt-4" onClick={openCreate} data-testid="button-add-category-empty">
              <Plus className="h-4 w-4 mr-2" />
              Эхний ангилалаа нэмэх
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Нэр</TableHead>
                <TableHead>Суурь үнэ (₮)</TableHead>
                <TableHead>Багтаамж</TableHead>
                <TableHead className="w-24 text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id} data-testid={`row-category-${cat.id}`}>
                  <TableCell className="font-medium" data-testid={`text-category-name-${cat.id}`}>
                    {cat.name}
                  </TableCell>
                  <TableCell data-testid={`text-category-price-${cat.id}`}>
                    {Number(cat.basePrice).toLocaleString()}₮
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span data-testid={`text-category-capacity-${cat.id}`}>{cat.capacity}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(cat)}
                        data-testid={`button-edit-category-${cat.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteId(cat.id)}
                        data-testid={`button-delete-category-${cat.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-category-dialog-title">
              {editingCategory ? "Ангилал засах" : "Шинэ ангилал"}
            </DialogTitle>
            <DialogDescription>
              Өрөөний ангилалын мэдээллийг оруулна уу
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Нэр</FormLabel>
                    <FormControl>
                      <Input placeholder="Жишээ: Deluxe" {...field} data-testid="input-category-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Суурь үнэ (₮)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="150000" {...field} data-testid="input-category-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Багтаамж (хүн)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} placeholder="2" {...field} data-testid="input-category-capacity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-category">
                  Цуцлах
                </Button>
                <Button type="submit" disabled={isPending} data-testid="button-save-category">
                  {isPending ? "Хадгалж байна..." : "Хадгалах"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ангилал устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ ангилалыг устгасан тохиолдолд буцаах боломжгүй. Энэ ангилалд хамаарах өрөөнүүд мөн устах болно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-category">Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete-category"
            >
              {deleteMutation.isPending ? "Устгаж байна..." : "Устгах"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RoomSection() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: allRooms = [], isLoading: roomsLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: categories = [], isLoading: catsLoading } = useQuery<RoomCategory[]>({
    queryKey: ["/api/room-categories"],
  });

  const isLoading = roomsLoading || catsLoading;

  const categoryMap = categories.reduce<Record<string, RoomCategory>>((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {});

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: { roomNumber: "", floor: 1, categoryId: "", status: "AVAILABLE" },
  });

  const createMutation = useMutation({
    mutationFn: (data: RoomFormValues) => apiRequest("POST", "/api/rooms", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setDialogOpen(false);
      form.reset();
      toast({ title: "Амжилттай", description: "Өрөө нэмэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: RoomFormValues) =>
      apiRequest("PATCH", `/api/rooms/${editingRoom!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setDialogOpen(false);
      setEditingRoom(null);
      form.reset();
      toast({ title: "Амжилттай", description: "Өрөө шинэчлэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/rooms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setDeleteId(null);
      toast({ title: "Амжилттай", description: "Өрөө устгагдлаа" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingRoom(null);
    form.reset({ roomNumber: "", floor: 1, categoryId: "", status: "AVAILABLE" });
    setDialogOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditingRoom(room);
    form.reset({
      roomNumber: room.roomNumber,
      floor: room.floor,
      categoryId: room.categoryId,
      status: room.status,
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: RoomFormValues) => {
    if (editingRoom) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-rooms-title">Өрөөнүүд</h3>
          <p className="text-sm text-muted-foreground">Бүх өрөөнүүдийг удирдах</p>
        </div>
        <Button onClick={openCreate} disabled={categories.length === 0} data-testid="button-add-room">
          <Plus className="h-4 w-4 mr-2" />
          Өрөө нэмэх
        </Button>
      </div>

      {categories.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground" data-testid="text-no-categories-for-rooms">
              Эхлээд ангилал бүртгэнэ үү
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : allRooms.length === 0 && categories.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BedDouble className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-rooms">
              Өрөө бүртгэгдээгүй байна
            </p>
            <Button variant="outline" className="mt-4" onClick={openCreate} data-testid="button-add-room-empty">
              <Plus className="h-4 w-4 mr-2" />
              Эхний өрөөгөө нэмэх
            </Button>
          </CardContent>
        </Card>
      ) : allRooms.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дугаар</TableHead>
                <TableHead>Давхар</TableHead>
                <TableHead>Ангилал</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead className="w-24 text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allRooms.map((room) => (
                <TableRow key={room.id} data-testid={`row-room-${room.id}`}>
                  <TableCell className="font-medium" data-testid={`text-room-number-${room.id}`}>
                    {room.roomNumber}
                  </TableCell>
                  <TableCell data-testid={`text-room-floor-${room.id}`}>
                    {room.floor}-р давхар
                  </TableCell>
                  <TableCell data-testid={`text-room-category-${room.id}`}>
                    {categoryMap[room.categoryId]?.name || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[room.status]} data-testid={`badge-room-status-${room.id}`}>
                      {statusLabels[room.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(room)}
                        data-testid={`button-edit-room-${room.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteId(room.id)}
                        data-testid={`button-delete-room-${room.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-room-dialog-title">
              {editingRoom ? "Өрөө засах" : "Шинэ өрөө"}
            </DialogTitle>
            <DialogDescription>
              Өрөөний мэдээллийг оруулна уу
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="roomNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Өрөөний дугаар</FormLabel>
                      <FormControl>
                        <Input placeholder="Жишээ: 101" {...field} data-testid="input-room-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="floor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Давхар</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger data-testid="select-room-floor">
                            <SelectValue placeholder="Давхар сонгох" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((f) => (
                            <SelectItem key={f} value={String(f)}>
                              {f}-р давхар
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ангилал</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-room-category">
                          <SelectValue placeholder="Ангилал сонгох" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} data-testid={`option-category-${cat.id}`}>
                            {cat.name}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Төлөв</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-room-status">
                          <SelectValue placeholder="Төлөв сонгох" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">Сул</SelectItem>
                        <SelectItem value="OCCUPIED">Эзэлсэн</SelectItem>
                        <SelectItem value="PENDING">Хүлээгдэж буй</SelectItem>
                        <SelectItem value="CLEANING">Цэвэрлэж буй</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-room">
                  Цуцлах
                </Button>
                <Button type="submit" disabled={isPending} data-testid="button-save-room">
                  {isPending ? "Хадгалж байна..." : "Хадгалах"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Өрөө устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ өрөөг устгасан тохиолдолд буцаах боломжгүй.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-room">Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete-room"
            >
              {deleteMutation.isPending ? "Устгаж байна..." : "Устгах"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6" data-testid="page-settings">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-settings-title">
          Тохиргоо
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Өрөөний ангилал болон өрөөнүүдийг удирдах
        </p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList data-testid="tabs-settings">
          <TabsTrigger value="categories" data-testid="tab-categories">
            <Layers className="h-4 w-4 mr-2" />
            Ангилалууд
          </TabsTrigger>
          <TabsTrigger value="rooms" data-testid="tab-rooms">
            <BedDouble className="h-4 w-4 mr-2" />
            Өрөөнүүд
          </TabsTrigger>
        </TabsList>
        <TabsContent value="categories" className="mt-4">
          <CategorySection />
        </TabsContent>
        <TabsContent value="rooms" className="mt-4">
          <RoomSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
