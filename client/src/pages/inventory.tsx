import { useState, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Pencil, Trash2, Package, ShoppingCart, AlertTriangle, ChevronDown, ChevronRight,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Inventory, InventoryPurchase } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const inventoryFormSchema = z.object({
  itemName: z.string().min(1, "Барааны нэр оруулна уу"),
  unit: z.string().min(1, "Хэмжих нэгж оруулна уу"),
  stockQuantity: z.string().min(1, "Анхны нөөц оруулна уу"),
  minStockLevel: z.string().min(1, "Доод нөөц оруулна уу"),
});

type InventoryFormValues = z.infer<typeof inventoryFormSchema>;

const purchaseFormSchema = z.object({
  quantity: z.string().min(1, "Тоо ширхэг оруулна уу"),
  purchaseDate: z.string().min(1, "Огноо оруулна уу"),
  note: z.string().optional(),
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

function PurchaseHistory({ itemId }: { itemId: string }) {
  const { data: purchases = [], isLoading } = useQuery<InventoryPurchase[]>({
    queryKey: ["/api/inventory", itemId, "purchases"],
  });

  if (isLoading) return <Skeleton className="h-12 w-full" />;

  if (purchases.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2" data-testid={`text-no-purchases-${itemId}`}>
        Нийлүүлэлтийн түүх байхгүй
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Огноо</TableHead>
          <TableHead className="text-right">Тоо хэмжээ</TableHead>
          <TableHead>Тэмдэглэл</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {purchases.map((p) => (
          <TableRow key={p.id} data-testid={`row-purchase-${p.id}`}>
            <TableCell data-testid={`text-purchase-date-${p.id}`}>
              {new Date(p.purchaseDate).toLocaleDateString("mn-MN")}
            </TableCell>
            <TableCell className="text-right font-medium" data-testid={`text-purchase-qty-${p.id}`}>
              {Number(p.quantity).toLocaleString()}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground" data-testid={`text-purchase-note-${p.id}`}>
              {p.note || "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function InventoryPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [purchaseDialogItem, setPurchaseDialogItem] = useState<Inventory | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory"],
  });

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: { itemName: "", unit: "", stockQuantity: "", minStockLevel: "" },
  });

  const purchaseForm = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: { quantity: "", purchaseDate: new Date().toISOString().split("T")[0], note: "" },
  });

  const openCreate = () => {
    setEditingItem(null);
    form.reset({ itemName: "", unit: "", stockQuantity: "", minStockLevel: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: Inventory) => {
    setEditingItem(item);
    form.reset({
      itemName: item.itemName,
      unit: item.unit,
      stockQuantity: item.stockQuantity,
      minStockLevel: item.minStockLevel,
    });
    setDialogOpen(true);
  };

  const openPurchase = (item: Inventory) => {
    setPurchaseDialogItem(item);
    purchaseForm.reset({ quantity: "", purchaseDate: new Date().toISOString().split("T")[0], note: "" });
  };

  const createMutation = useMutation({
    mutationFn: (data: InventoryFormValues) => apiRequest("POST", "/api/inventory", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setDialogOpen(false);
      toast({ title: "Амжилттай", description: "Бараа нэмэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<InventoryFormValues>) =>
      apiRequest("PATCH", `/api/inventory/${editingItem!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setDialogOpen(false);
      toast({ title: "Амжилттай", description: "Бараа шинэчлэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/inventory/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setDeleteId(null);
      toast({ title: "Амжилттай", description: "Бараа устгагдлаа" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: (data: PurchaseFormValues) =>
      apiRequest("POST", `/api/inventory/${purchaseDialogItem!.id}/purchases`, {
        quantity: data.quantity,
        purchaseDate: data.purchaseDate,
        note: data.note || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      if (purchaseDialogItem) {
        queryClient.invalidateQueries({ queryKey: ["/api/inventory", purchaseDialogItem.id, "purchases"] });
      }
      setPurchaseDialogItem(null);
      toast({ title: "Амжилттай", description: "Нийлүүлэлт бүртгэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: InventoryFormValues) => {
    if (editingItem) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const onPurchaseSubmit = (values: PurchaseFormValues) => {
    purchaseMutation.mutate(values);
  };

  const isLowStock = (item: Inventory) => Number(item.stockQuantity) < Number(item.minStockLevel);
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 space-y-6" data-testid="page-inventory">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-inventory-title">
            Агуулах
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Бараа материалын нөөцийн удирдлага
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-inventory">
          <Plus className="h-4 w-4 mr-2" />
          Шинэ бараа
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-inventory">
              Бараа бүртгэгдээгүй байна
            </p>
            <Button variant="outline" className="mt-4" onClick={openCreate} data-testid="button-add-inventory-empty">
              <Plus className="h-4 w-4 mr-2" />
              Эхний барааг бүртгэх
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Барааны нэр</TableHead>
                <TableHead>Нэгж</TableHead>
                <TableHead className="text-right">Нөөц</TableHead>
                <TableHead className="text-right">Доод нөөц</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead className="w-36 text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const lowStock = isLowStock(item);
                const isExpanded = expandedId === item.id;
                return (
                  <Fragment key={item.id}>
                    <TableRow data-testid={`row-inventory-${item.id}`}>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          data-testid={`button-expand-${item.id}`}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-item-name-${item.id}`}>
                        {item.itemName}
                      </TableCell>
                      <TableCell data-testid={`text-item-unit-${item.id}`}>{item.unit}</TableCell>
                      <TableCell className="text-right font-medium" data-testid={`text-item-stock-${item.id}`}>
                        {Number(item.stockQuantity).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-item-minstock-${item.id}`}>
                        {Number(item.minStockLevel).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {lowStock ? (
                          <Badge variant="destructive" data-testid={`badge-lowstock-${item.id}`}>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Дутагдалтай
                          </Badge>
                        ) : (
                          <Badge variant="outline" data-testid={`badge-instock-${item.id}`}>
                            Хангалттай
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openPurchase(item)}
                            data-testid={`button-purchase-${item.id}`}>
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(item)}
                            data-testid={`button-edit-inventory-${item.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteId(item.id)}
                            data-testid={`button-delete-inventory-${item.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${item.id}-expand`}>
                        <TableCell colSpan={7} className="bg-muted/30 p-4">
                          <h4 className="text-sm font-medium mb-2">Нийлүүлэлтийн түүх</h4>
                          <PurchaseHistory itemId={item.id} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-inventory-dialog-title">
              {editingItem ? "Бараа засах" : "Шинэ бараа бүртгэх"}
            </DialogTitle>
            <DialogDescription>
              Барааны мэдээллийг оруулна уу
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="itemName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Барааны нэр</FormLabel>
                    <FormControl>
                      <Input placeholder="Жишээ: Массажны тос" {...field} data-testid="input-item-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Хэмжих нэгж</FormLabel>
                    <FormControl>
                      <Input placeholder="Жишээ: литр, ширхэг, кг" {...field} data-testid="input-item-unit" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stockQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{editingItem ? "Нөөцийн тоо" : "Анхны нөөц"}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} data-testid="input-item-stock" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minStockLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Доод нөөц</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} data-testid="input-item-minstock" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel-inventory">
                  Цуцлах
                </Button>
                <Button type="submit" disabled={isPending} data-testid="button-save-inventory">
                  {isPending ? "Хадгалж байна..." : "Хадгалах"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!purchaseDialogItem} onOpenChange={(open) => { if (!open) setPurchaseDialogItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-purchase-dialog-title">
              Бараа нэмэх
            </DialogTitle>
            <DialogDescription>
              {purchaseDialogItem && `"${purchaseDialogItem.itemName}" барааны нийлүүлэлт бүртгэх`}
            </DialogDescription>
          </DialogHeader>
          <Form {...purchaseForm}>
            <form onSubmit={purchaseForm.handleSubmit(onPurchaseSubmit)} className="space-y-4">
              <FormField
                control={purchaseForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тоо хэмжээ {purchaseDialogItem && `(${purchaseDialogItem.unit})`}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0.01" {...field} data-testid="input-purchase-quantity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={purchaseForm.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Огноо</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-purchase-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={purchaseForm.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тэмдэглэл</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Нэмэлт тэмдэглэл..." {...field} data-testid="input-purchase-note" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPurchaseDialogItem(null)}
                  data-testid="button-cancel-purchase">
                  Цуцлах
                </Button>
                <Button type="submit" disabled={purchaseMutation.isPending} data-testid="button-save-purchase">
                  {purchaseMutation.isPending ? "Хадгалж байна..." : "Нэмэх"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Бараа устгах</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ барааг устгахдаа итгэлтэй байна уу? Устгасан тохиолдолд буцаах боломжгүй.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-inventory">Цуцлах</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete-inventory">
              {deleteMutation.isPending ? "Устгаж байна..." : "Устгах"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
