import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Stethoscope, Package } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Service } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const serviceFormSchema = z.object({
  name: z.string().min(1, "Нэр оруулна уу"),
  description: z.string().optional(),
  price: z.string().min(1, "Үнэ оруулна уу"),
  type: z.enum(["SERVICE", "PACKAGE"]),
  isActive: z.boolean(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export default function ServicesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("ALL");

  const { data: allServices = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: { name: "", description: "", price: "", type: "SERVICE", isActive: true },
  });

  const openCreate = () => {
    setEditingService(null);
    form.reset({ name: "", description: "", price: "", type: "SERVICE", isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    form.reset({
      name: service.name,
      description: service.description || "",
      price: service.price,
      type: service.type,
      isActive: service.isActive,
    });
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: ServiceFormValues) => apiRequest("POST", "/api/services", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setDialogOpen(false);
      toast({ title: "Амжилттай", description: "Эмчилгээ нэмэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ServiceFormValues) =>
      apiRequest("PATCH", `/api/services/${editingService!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setDialogOpen(false);
      toast({ title: "Амжилттай", description: "Эмчилгээ шинэчлэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setDeleteId(null);
      toast({ title: "Амжилттай", description: "Эмчилгээ устгагдлаа" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: ServiceFormValues) => {
    if (editingService) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const filtered = activeTab === "ALL" ? allServices :
    activeTab === "SERVICE" ? allServices.filter(s => s.type === "SERVICE") :
    allServices.filter(s => s.type === "PACKAGE");

  return (
    <div className="p-6 space-y-6" data-testid="page-services">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-services-title">
            Эмчилгээ
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Эмчилгээ болон багцуудын бүртгэл
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-service">
          <Plus className="h-4 w-4 mr-2" />
          Шинэ эмчилгээ
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ALL" data-testid="tab-all-services">
            Бүгд ({allServices.length})
          </TabsTrigger>
          <TabsTrigger value="SERVICE" data-testid="tab-services-only">
            <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
            Эмчилгээ ({allServices.filter(s => s.type === "SERVICE").length})
          </TabsTrigger>
          <TabsTrigger value="PACKAGE" data-testid="tab-packages-only">
            <Package className="h-3.5 w-3.5 mr-1.5" />
            Багц ({allServices.filter(s => s.type === "PACKAGE").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Ачаалж байна...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm" data-testid="text-no-services">
          Эмчилгээ бүртгэгдээгүй байна
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Нэр</TableHead>
                <TableHead>Тайлбар</TableHead>
                <TableHead>Төрөл</TableHead>
                <TableHead className="text-right">Үнэ</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((service) => (
                <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                    {service.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={service.type === "PACKAGE" ? "default" : "outline"}>
                      {service.type === "SERVICE" ? "Эмчилгээ" : "Багц"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {Number(service.price).toLocaleString()}₮
                  </TableCell>
                  <TableCell>
                    <Badge variant={service.isActive ? "default" : "secondary"}>
                      {service.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(service)}
                        data-testid={`button-edit-service-${service.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(service.id)}
                        data-testid={`button-delete-service-${service.id}`}>
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

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-service-dialog-title">
              {editingService ? "Эмчилгээ засах" : "Шинэ эмчилгээ"}
            </DialogTitle>
            <DialogDescription>
              Эмчилгээ эсвэл багцын мэдээлэл оруулна уу
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
                      <Input {...field} data-testid="input-service-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тайлбар</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} data-testid="input-service-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Үнэ (₮)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-service-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Төрөл</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-service-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SERVICE">Эмчилгээ</SelectItem>
                          <SelectItem value="PACKAGE">Багц</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <FormLabel className="text-sm">Идэвхтэй</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange}
                        data-testid="switch-service-active" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel-service">
                  Цуцлах
                </Button>
                <Button type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-service">
                  {(createMutation.isPending || updateMutation.isPending) ? "Хадгалж байна..." : "Хадгалах"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Эмчилгээ устгах</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ эмчилгээг устгахдаа итгэлтэй байна уу?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-service">Цуцлах</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete-service">
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
