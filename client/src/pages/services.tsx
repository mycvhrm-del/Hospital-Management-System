import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Stethoscope, Package, Layers, X, Search } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Service, Inventory, ServiceMaterial, PackageService } from "@shared/schema";

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
  isActive: z.boolean(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

const packageFormSchema = z.object({
  name: z.string().min(1, "Нэр оруулна уу"),
  description: z.string().optional(),
  price: z.string().min(1, "Үнэ оруулна уу"),
  isActive: z.boolean(),
});

type PackageFormValues = z.infer<typeof packageFormSchema>;

interface PendingMaterial {
  inventoryId: string;
  quantityNeeded: string;
}

export default function ServicesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("ALL");
  const [materialsServiceId, setMaterialsServiceId] = useState<string | null>(null);
  const [pendingMaterials, setPendingMaterials] = useState<PendingMaterial[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [dialogMaterials, setDialogMaterials] = useState<PendingMaterial[]>([]);

  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Service | null>(null);
  const [packageServiceIds, setPackageServiceIds] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");

  const { data: allServices = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: inventoryItems = [] } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: serviceMaterials = [], isLoading: materialsLoading } = useQuery<ServiceMaterial[]>({
    queryKey: ["/api/services", materialsServiceId, "materials"],
    enabled: !!materialsServiceId,
  });

  const editingServiceId = editingService?.id;
  const { data: editingServiceMaterials = [] } = useQuery<ServiceMaterial[]>({
    queryKey: ["/api/services", editingServiceId, "materials"],
    enabled: !!editingServiceId && dialogOpen,
  });

  const editingPackageId = editingPackage?.id;
  const { data: editingPackageServices = [] } = useQuery<PackageService[]>({
    queryKey: ["/api/services", editingPackageId, "package-services"],
    enabled: !!editingPackageId && packageDialogOpen,
  });

  const materialsService = allServices.find(s => s.id === materialsServiceId);

  const inventoryMap = Object.fromEntries(inventoryItems.map(i => [i.id, i]));

  const individualServices = useMemo(() => allServices.filter(s => s.type === "SERVICE"), [allServices]);
  const serviceMap = useMemo(() => Object.fromEntries(allServices.map(s => [s.id, s])), [allServices]);

  const openMaterialsDialog = useCallback((serviceId: string) => {
    setMaterialsServiceId(serviceId);
    setHasChanges(false);
  }, []);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: { name: "", description: "", price: "", isActive: true },
  });

  const packageForm = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: { name: "", description: "", price: "", isActive: true },
  });

  const openCreateService = () => {
    setEditingService(null);
    form.reset({ name: "", description: "", price: "", isActive: true });
    setDialogMaterials([]);
    setDialogOpen(true);
  };

  const openEditService = (service: Service) => {
    setEditingService(service);
    form.reset({
      name: service.name,
      description: service.description || "",
      price: service.price,
      isActive: service.isActive,
    });
    setDialogMaterials([]);
    setDialogOpen(true);
  };

  const openCreatePackage = () => {
    setEditingPackage(null);
    packageForm.reset({ name: "", description: "", price: "", isActive: true });
    setPackageServiceIds([]);
    setServiceSearch("");
    setPackageDialogOpen(true);
  };

  const openEditPackage = (pkg: Service) => {
    setEditingPackage(pkg);
    packageForm.reset({
      name: pkg.name,
      description: pkg.description || "",
      price: pkg.price,
      isActive: pkg.isActive,
    });
    setPackageServiceIds([]);
    setServiceSearch("");
    setPackageDialogOpen(true);
  };

  useEffect(() => {
    if (editingPackage && packageDialogOpen && editingPackageServices.length > 0) {
      setPackageServiceIds(editingPackageServices.map(ps => ps.serviceId));
    }
  }, [editingPackage, packageDialogOpen, editingPackageServices]);

  const createMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      const res = await apiRequest("POST", "/api/services", { ...data, type: "SERVICE" });
      const newService = await res.json();
      const validMats = dialogMaterials.filter(m => m.inventoryId && Number(m.quantityNeeded) > 0);
      if (validMats.length > 0) {
        await apiRequest("POST", `/api/services/${newService.id}/materials`, { materials: validMats });
      }
      return newService;
    },
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
    mutationFn: async (data: ServiceFormValues) => {
      await apiRequest("PATCH", `/api/services/${editingService!.id}`, { ...data, type: editingService!.type });
      const validMats = dialogMaterials.filter(m => m.inventoryId && Number(m.quantityNeeded) > 0);
      await apiRequest("POST", `/api/services/${editingService!.id}/materials`, { materials: validMats });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      if (editingService) {
        queryClient.invalidateQueries({ queryKey: ["/api/services", editingService.id, "materials"] });
      }
      setDialogOpen(false);
      toast({ title: "Амжилттай", description: "Эмчилгээ шинэчлэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const createPackageMutation = useMutation({
    mutationFn: async (data: PackageFormValues) => {
      const res = await apiRequest("POST", "/api/services", { ...data, type: "PACKAGE" });
      const newPkg = await res.json();
      if (packageServiceIds.length > 0) {
        await apiRequest("POST", `/api/services/${newPkg.id}/package-services`, { serviceIds: packageServiceIds });
      }
      return newPkg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setPackageDialogOpen(false);
      toast({ title: "Амжилттай", description: "Багц нэмэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async (data: PackageFormValues) => {
      await apiRequest("PATCH", `/api/services/${editingPackage!.id}`, { ...data, type: "PACKAGE" });
      await apiRequest("POST", `/api/services/${editingPackage!.id}/package-services`, { serviceIds: packageServiceIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      if (editingPackage) {
        queryClient.invalidateQueries({ queryKey: ["/api/services", editingPackage.id, "package-services"] });
      }
      setPackageDialogOpen(false);
      toast({ title: "Амжилттай", description: "Багц шинэчлэгдлээ" });
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
      toast({ title: "Амжилттай", description: "Устгагдлаа" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const saveMaterialsMutation = useMutation({
    mutationFn: (materials: PendingMaterial[]) =>
      apiRequest("POST", `/api/services/${materialsServiceId}/materials`, { materials }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services", materialsServiceId, "materials"] });
      setHasChanges(false);
      toast({ title: "Амжилттай", description: "Бараа материал хадгалагдлаа" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const currentMaterials: PendingMaterial[] = hasChanges
    ? pendingMaterials
    : serviceMaterials.map(m => ({ inventoryId: m.inventoryId, quantityNeeded: m.quantityNeeded }));

  const handleAddRow = () => {
    const mats = hasChanges ? [...pendingMaterials] : serviceMaterials.map(m => ({ inventoryId: m.inventoryId, quantityNeeded: m.quantityNeeded }));
    mats.push({ inventoryId: "", quantityNeeded: "" });
    setPendingMaterials(mats);
    setHasChanges(true);
  };

  const handleUpdateRow = (index: number, field: "inventoryId" | "quantityNeeded", value: string) => {
    const mats = hasChanges
      ? [...pendingMaterials]
      : serviceMaterials.map(m => ({ inventoryId: m.inventoryId, quantityNeeded: m.quantityNeeded }));
    mats[index] = { ...mats[index], [field]: value };
    setPendingMaterials(mats);
    setHasChanges(true);
  };

  const handleRemoveRow = (index: number) => {
    const mats = hasChanges
      ? [...pendingMaterials]
      : serviceMaterials.map(m => ({ inventoryId: m.inventoryId, quantityNeeded: m.quantityNeeded }));
    mats.splice(index, 1);
    setPendingMaterials(mats);
    setHasChanges(true);
  };

  const handleSaveMaterials = () => {
    const valid = currentMaterials.filter(m => m.inventoryId && Number(m.quantityNeeded) > 0);
    const duplicates = valid.filter((m, i) => valid.findIndex(v => v.inventoryId === m.inventoryId) !== i);
    if (duplicates.length > 0) {
      toast({ title: "Алдаа", description: "Давхардсан бараа байна", variant: "destructive" });
      return;
    }
    saveMaterialsMutation.mutate(valid);
  };

  useEffect(() => {
    if (editingService && dialogOpen && editingServiceMaterials.length > 0) {
      setDialogMaterials(editingServiceMaterials.map(m => ({
        inventoryId: m.inventoryId,
        quantityNeeded: m.quantityNeeded,
      })));
    }
  }, [editingService, dialogOpen, editingServiceMaterials]);

  const handleDialogAddRow = () => {
    setDialogMaterials([...dialogMaterials, { inventoryId: "", quantityNeeded: "" }]);
  };

  const handleDialogUpdateRow = (index: number, field: "inventoryId" | "quantityNeeded", value: string) => {
    const mats = [...dialogMaterials];
    mats[index] = { ...mats[index], [field]: value };
    setDialogMaterials(mats);
  };

  const handleDialogRemoveRow = (index: number) => {
    const mats = [...dialogMaterials];
    mats.splice(index, 1);
    setDialogMaterials(mats);
  };

  const onSubmitService = (values: ServiceFormValues) => {
    if (editingService) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const onSubmitPackage = (values: PackageFormValues) => {
    if (editingPackage) {
      updatePackageMutation.mutate(values);
    } else {
      createPackageMutation.mutate(values);
    }
  };

  const toggleServiceInPackage = (serviceId: string) => {
    setPackageServiceIds(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const filteredServicesForPackage = useMemo(() => {
    const search = serviceSearch.toLowerCase().trim();
    if (!search) return individualServices;
    return individualServices.filter(s =>
      s.name.toLowerCase().includes(search) || (s.description || "").toLowerCase().includes(search)
    );
  }, [individualServices, serviceSearch]);

  const filtered = activeTab === "ALL" ? allServices :
    activeTab === "SERVICE" ? allServices.filter(s => s.type === "SERVICE") :
    allServices.filter(s => s.type === "PACKAGE");

  const handleEditClick = (service: Service) => {
    if (service.type === "PACKAGE") {
      openEditPackage(service);
    } else {
      openEditService(service);
    }
  };

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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openCreatePackage} data-testid="button-add-package">
            <Package className="h-4 w-4 mr-2" />
            Багц үүсгэх
          </Button>
          <Button onClick={openCreateService} data-testid="button-add-service">
            <Plus className="h-4 w-4 mr-2" />
            Шинэ эмчилгээ
          </Button>
        </div>
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
                <TableHead className="w-32"></TableHead>
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
                      <Button size="icon" variant="ghost" onClick={() => openMaterialsDialog(service.id)}
                        data-testid={`button-materials-service-${service.id}`}>
                        <Layers className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleEditClick(service)}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-service-dialog-title">
              {editingService ? "Эмчилгээ засах" : "Шинэ эмчилгээ"}
            </DialogTitle>
            <DialogDescription>
              Эмчилгээний мэдээлэл оруулна уу
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitService)} className="space-y-4">
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

              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Бараа материал</p>
                  <Button type="button" variant="outline" size="sm" onClick={handleDialogAddRow}
                    data-testid="button-dialog-add-material">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Нэмэх
                  </Button>
                </div>
                {dialogMaterials.length === 0 ? (
                  <p className="text-xs text-muted-foreground" data-testid="text-dialog-no-materials">
                    Бараа материал нэмэгдээгүй байна
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dialogMaterials.map((mat, index) => {
                      const otherUsed = new Set(dialogMaterials.filter((_, i) => i !== index).map(m => m.inventoryId));
                      const rowAvailable = inventoryItems.filter(i => !otherUsed.has(i.id));
                      return (
                        <div key={index} className="grid grid-cols-[1fr_100px_32px] gap-2 items-center"
                          data-testid={`dialog-row-material-${index}`}>
                          <Select value={mat.inventoryId} onValueChange={(v) => handleDialogUpdateRow(index, "inventoryId", v)}>
                            <SelectTrigger className="h-9 text-sm" data-testid={`dialog-select-material-${index}`}>
                              <SelectValue placeholder="Бараа сонгох" />
                            </SelectTrigger>
                            <SelectContent>
                              {mat.inventoryId && inventoryMap[mat.inventoryId] && (
                                <SelectItem value={mat.inventoryId}>
                                  {inventoryMap[mat.inventoryId].itemName} ({inventoryMap[mat.inventoryId].unit})
                                </SelectItem>
                              )}
                              {rowAvailable.filter(i => i.id !== mat.inventoryId).map(inv => (
                                <SelectItem key={inv.id} value={inv.id}>
                                  {inv.itemName} ({inv.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            placeholder="Тоо"
                            className="h-9 text-sm"
                            value={mat.quantityNeeded}
                            onChange={(e) => handleDialogUpdateRow(index, "quantityNeeded", e.target.value)}
                            min="0.01"
                            step="0.01"
                            data-testid={`dialog-input-material-qty-${index}`}
                          />
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8"
                            onClick={() => handleDialogRemoveRow(index)}
                            data-testid={`dialog-btn-remove-material-${index}`}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

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

      <Dialog open={packageDialogOpen} onOpenChange={(open) => { if (!open) setPackageDialogOpen(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-package-dialog-title">
              {editingPackage ? "Багц засах" : "Багц үүсгэх"}
            </DialogTitle>
            <DialogDescription>
              Багцын мэдээлэл болон эмчилгээнүүдийг сонгоно уу
            </DialogDescription>
          </DialogHeader>
          <Form {...packageForm}>
            <form onSubmit={packageForm.handleSubmit(onSubmitPackage)} className="space-y-4">
              <FormField
                control={packageForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Багцын нэр</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-package-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={packageForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тайлбар</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} data-testid="input-package-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={packageForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Багцын үнэ (₮)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-package-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={packageForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <FormLabel className="text-sm">Идэвхтэй</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange}
                        data-testid="switch-package-active" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Эмчилгээний жагсаалт</p>
                  <Badge variant="outline" data-testid="badge-package-service-count">
                    {packageServiceIds.length} сонгосон
                  </Badge>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Эмчилгээ хайх..."
                    className="pl-9 h-9 text-sm"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    data-testid="input-package-service-search"
                  />
                </div>

                {packageServiceIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {packageServiceIds.map(sid => {
                      const svc = serviceMap[sid];
                      if (!svc) return null;
                      return (
                        <Badge key={sid} variant="secondary" className="gap-1 pr-1" data-testid={`badge-selected-service-${sid}`}>
                          {svc.name}
                          <button type="button" onClick={() => toggleServiceInPackage(sid)}
                            className="ml-0.5 rounded-full p-0.5"
                            data-testid={`button-remove-pkg-service-${sid}`}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                  {filteredServicesForPackage.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4" data-testid="text-no-services-found">
                      {individualServices.length === 0 ? "Эмчилгээ бүртгэгдээгүй байна" : "Хайлтад тохирох эмчилгээ олдсонгүй"}
                    </div>
                  ) : (
                    filteredServicesForPackage.map(svc => {
                      const isSelected = packageServiceIds.includes(svc.id);
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                            isSelected ? "bg-primary/5" : ""
                          }`}
                          onClick={() => toggleServiceInPackage(svc.id)}
                          data-testid={`button-toggle-service-${svc.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{svc.name}</div>
                            {svc.description && (
                              <div className="text-xs text-muted-foreground truncate">{svc.description}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            <span className="text-xs text-muted-foreground">{Number(svc.price).toLocaleString()}₮</span>
                            <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                              isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                            }`}>
                              {isSelected && <span className="text-[10px] font-bold">✓</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPackageDialogOpen(false)}
                  data-testid="button-cancel-package">
                  Цуцлах
                </Button>
                <Button type="submit"
                  disabled={createPackageMutation.isPending || updatePackageMutation.isPending}
                  data-testid="button-save-package">
                  {(createPackageMutation.isPending || updatePackageMutation.isPending) ? "Хадгалж байна..." : "Хадгалах"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!materialsServiceId} onOpenChange={(open) => { if (!open) { setMaterialsServiceId(null); setHasChanges(false); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle data-testid="text-materials-dialog-title">
              Бараа материал тохируулах
            </DialogTitle>
            <DialogDescription>
              {materialsService ? `"${materialsService.name}" — зарцуулагдах бараа материалуудыг тохируулна уу` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {materialsLoading ? (
              <div className="text-sm text-muted-foreground">Ачаалж байна...</div>
            ) : (
              <>
                {currentMaterials.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center border rounded-md" data-testid="text-no-materials">
                    Бараа материал нэмэгдээгүй байна. Доорх товчийг дарж нэмнэ үү.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_120px_40px] gap-2 px-1">
                      <span className="text-xs font-medium text-muted-foreground">Бараа</span>
                      <span className="text-xs font-medium text-muted-foreground">Тоо хэмжээ</span>
                      <span />
                    </div>
                    {currentMaterials.map((mat, index) => {
                      const otherUsed = new Set(currentMaterials.filter((_, i) => i !== index).map(m => m.inventoryId));
                      const rowAvailable = inventoryItems.filter(i => !otherUsed.has(i.id));
                      return (
                        <div key={index} className="grid grid-cols-[1fr_120px_40px] gap-2 items-center" data-testid={`row-material-${index}`}>
                          <Select value={mat.inventoryId} onValueChange={(v) => handleUpdateRow(index, "inventoryId", v)}>
                            <SelectTrigger data-testid={`select-material-inventory-${index}`}>
                              <SelectValue placeholder="Бараа сонгох" />
                            </SelectTrigger>
                            <SelectContent>
                              {mat.inventoryId && inventoryMap[mat.inventoryId] && (
                                <SelectItem value={mat.inventoryId}>
                                  {inventoryMap[mat.inventoryId].itemName} ({inventoryMap[mat.inventoryId].unit})
                                </SelectItem>
                              )}
                              {rowAvailable.filter(i => i.id !== mat.inventoryId).map(inv => (
                                <SelectItem key={inv.id} value={inv.id}>
                                  {inv.itemName} ({inv.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            placeholder="Тоо"
                            value={mat.quantityNeeded}
                            onChange={(e) => handleUpdateRow(index, "quantityNeeded", e.target.value)}
                            min="0.01"
                            step="0.01"
                            data-testid={`input-material-quantity-${index}`}
                          />
                          <Button size="icon" variant="ghost" onClick={() => handleRemoveRow(index)}
                            data-testid={`button-remove-material-${index}`}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button variant="outline" onClick={handleAddRow} className="w-full" data-testid="button-add-material-row">
                  <Plus className="h-4 w-4 mr-2" />
                  Бараа материал нэмэх
                </Button>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => { setMaterialsServiceId(null); setHasChanges(false); }}
                    data-testid="button-cancel-materials">
                    Цуцлах
                  </Button>
                  <Button
                    onClick={handleSaveMaterials}
                    disabled={saveMaterialsMutation.isPending || !hasChanges}
                    data-testid="button-save-materials"
                  >
                    {saveMaterialsMutation.isPending ? "Хадгалж байна..." : "Хадгалах"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Устгах</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ бичлэгийг устгахдаа итгэлтэй байна уу?
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
