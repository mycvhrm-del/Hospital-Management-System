import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import {
  Plus, Pencil, Trash2, Users, Search, Eye, Crown, UserPlus,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Guest } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";

const guestFormSchema = z.object({
  idNumber: z.string().min(1, "Регистрийн дугаар оруулна уу"),
  firstName: z.string().min(1, "Нэр оруулна уу"),
  lastName: z.string().min(1, "Овог оруулна уу"),
  phone: z.string().min(1, "Утасны дугаар оруулна уу"),
  isVip: z.boolean().default(false),
  parentId: z.string().nullable().optional(),
});

type GuestFormValues = z.infer<typeof guestFormSchema>;

export default function GuestsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [familyParent, setFamilyParent] = useState<Guest | null>(null);
  const [page, setPage] = useState(1);
  const GUEST_LIMIT = 50;

  const { data: allGuests = [], isLoading } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  const parentGuests = allGuests.filter((g) => !g.parentId);

  const filtered = allGuests.filter((g) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.firstName.toLowerCase().includes(q) ||
      g.lastName.toLowerCase().includes(q) ||
      g.idNumber.toLowerCase().includes(q) ||
      g.phone.includes(q)
    );
  });

  const totalGuestPages = Math.max(1, Math.ceil(filtered.length / GUEST_LIMIT));
  const pagedGuests = filtered.slice((page - 1) * GUEST_LIMIT, page * GUEST_LIMIT);

  const form = useForm<GuestFormValues>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: { idNumber: "", firstName: "", lastName: "", phone: "", isVip: false, parentId: null },
  });

  const familyForm = useForm<GuestFormValues>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: { idNumber: "", firstName: "", lastName: "", phone: "", isVip: false, parentId: null },
  });

  const createMutation = useMutation({
    mutationFn: (data: GuestFormValues) => apiRequest("POST", "/api/guests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      setDialogOpen(false);
      form.reset();
      toast({ title: "Амжилттай", description: "Зочин бүртгэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: GuestFormValues) =>
      apiRequest("PATCH", `/api/guests/${editingGuest!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      setDialogOpen(false);
      setEditingGuest(null);
      form.reset();
      toast({ title: "Амжилттай", description: "Зочны мэдээлэл шинэчлэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const createFamilyMutation = useMutation({
    mutationFn: (data: GuestFormValues) => apiRequest("POST", "/api/guests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      setFamilyDialogOpen(false);
      setFamilyParent(null);
      familyForm.reset();
      toast({ title: "Амжилттай", description: "Гэр бүлийн гишүүн нэмэгдлээ" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/guests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      setDeleteId(null);
      toast({ title: "Амжилттай", description: "Зочин устгагдлаа" });
    },
    onError: (err: Error) => {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingGuest(null);
    form.reset({ idNumber: "", firstName: "", lastName: "", phone: "", isVip: false, parentId: null });
    setDialogOpen(true);
  };

  const openEdit = (guest: Guest) => {
    setEditingGuest(guest);
    form.reset({
      idNumber: guest.idNumber,
      firstName: guest.firstName,
      lastName: guest.lastName,
      phone: guest.phone,
      isVip: guest.isVip,
      parentId: guest.parentId,
    });
    setDialogOpen(true);
  };

  const openFamilyAdd = (parent: Guest) => {
    setFamilyParent(parent);
    familyForm.reset({
      idNumber: "", firstName: "", lastName: parent.lastName, phone: "", isVip: false, parentId: parent.id,
    });
    setFamilyDialogOpen(true);
  };

  const onSubmit = (values: GuestFormValues) => {
    const data = { ...values, parentId: values.parentId || null };
    if (editingGuest) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const onFamilySubmit = (values: GuestFormValues) => {
    createFamilyMutation.mutate({ ...values, parentId: familyParent!.id });
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId) return null;
    const parent = allGuests.find((g) => g.id === parentId);
    return parent ? `${parent.lastName} ${parent.firstName}` : null;
  };

  const getFamilyCount = (guestId: string) => {
    return allGuests.filter((g) => g.parentId === guestId).length;
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 space-y-6" data-testid="page-guests">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-guests-title">
            Зочид
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Үйлчлүүлэгчдийн бүртгэл
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-guest">
          <Plus className="h-4 w-4 mr-2" />
          Зочин бүртгэх
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Нэр, регистр, утас..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          className="pl-9"
          data-testid="input-search-guests"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-guests">
              {searchQuery ? "Хайлтын үр дүн олдсонгүй" : "Зочин бүртгэгдээгүй байна"}
            </p>
            {!searchQuery && (
              <Button variant="outline" className="mt-4" onClick={openCreate} data-testid="button-add-guest-empty">
                <Plus className="h-4 w-4 mr-2" />
                Эхний зочноо бүртгэх
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Овог, Нэр</TableHead>
                <TableHead>Регистр</TableHead>
                <TableHead>Утас</TableHead>
                <TableHead>Төрөл</TableHead>
                <TableHead>Гэр бүл</TableHead>
                <TableHead className="w-36 text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedGuests.map((guest) => {
                const parentName = getParentName(guest.parentId);
                const familyCount = getFamilyCount(guest.id);
                return (
                  <TableRow key={guest.id} data-testid={`row-guest-${guest.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium" data-testid={`text-guest-name-${guest.id}`}>
                          {guest.lastName} {guest.firstName}
                        </span>
                        {guest.isVip && (
                          <Badge variant="secondary" data-testid={`badge-vip-${guest.id}`}>
                            <Crown className="h-3 w-3 mr-1" />
                            VIP
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-guest-id-${guest.id}`}>{guest.idNumber}</TableCell>
                    <TableCell data-testid={`text-guest-phone-${guest.id}`}>{guest.phone}</TableCell>
                    <TableCell>
                      {parentName ? (
                        <span className="text-sm text-muted-foreground" data-testid={`text-guest-parent-${guest.id}`}>
                          {parentName}-н гишүүн
                        </span>
                      ) : (
                        <span className="text-sm" data-testid={`text-guest-type-${guest.id}`}>Үндсэн</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!guest.parentId && familyCount > 0 && (
                        <Badge variant="outline" data-testid={`badge-family-${guest.id}`}>
                          <Users className="h-3 w-3 mr-1" />
                          {familyCount}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" asChild data-testid={`button-view-guest-${guest.id}`}>
                          <Link href={`/guests/${guest.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {!guest.parentId && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openFamilyAdd(guest)}
                            data-testid={`button-add-family-${guest.id}`}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(guest)}
                          data-testid={`button-edit-guest-${guest.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteId(guest.id)}
                          data-testid={`button-delete-guest-${guest.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalGuestPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Нийт {filtered.length} зочин · {page}/{totalGuestPages} хуудас</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              data-testid="button-guests-prev"
            >
              Өмнөх
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalGuestPages, p + 1))}
              disabled={page >= totalGuestPages}
              data-testid="button-guests-next"
            >
              Дараах
            </Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-guest-dialog-title">
              {editingGuest ? "Зочин засах" : "Шинэ зочин бүртгэх"}
            </DialogTitle>
            <DialogDescription>
              Зочны мэдээллийг оруулна уу
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Овог</FormLabel>
                      <FormControl>
                        <Input placeholder="Бат" {...field} data-testid="input-guest-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Нэр</FormLabel>
                      <FormControl>
                        <Input placeholder="Болд" {...field} data-testid="input-guest-firstname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="idNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Регистрийн дугаар</FormLabel>
                    <FormControl>
                      <Input placeholder="АА00112233" {...field} data-testid="input-guest-idnumber" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Утасны дугаар</FormLabel>
                    <FormControl>
                      <Input placeholder="99112233" {...field} data-testid="input-guest-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isVip"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-guest-vip"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">VIP зочин</FormLabel>
                  </FormItem>
                )}
              />
              {!editingGuest && parentGuests.length > 0 && (
                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Гэр бүлийн толгой (заавал биш)</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "__none__" ? null : v)} value={field.value || "__none__"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-guest-parent">
                            <SelectValue placeholder="Сонгоогүй" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Сонгоогүй</SelectItem>
                          {parentGuests.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.lastName} {g.firstName} ({g.idNumber})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-guest">
                  Цуцлах
                </Button>
                <Button type="submit" disabled={isPending} data-testid="button-save-guest">
                  {isPending ? "Хадгалж байна..." : "Хадгалах"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={familyDialogOpen} onOpenChange={setFamilyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-family-dialog-title">
              Гэр бүлийн гишүүн нэмэх
            </DialogTitle>
            <DialogDescription>
              {familyParent && `${familyParent.lastName} ${familyParent.firstName}-н гэр бүлийн гишүүн`}
            </DialogDescription>
          </DialogHeader>
          <Form {...familyForm}>
            <form onSubmit={familyForm.handleSubmit(onFamilySubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={familyForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Овог</FormLabel>
                      <FormControl>
                        <Input placeholder="Бат" {...field} data-testid="input-family-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={familyForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Нэр</FormLabel>
                      <FormControl>
                        <Input placeholder="Болд" {...field} data-testid="input-family-firstname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={familyForm.control}
                name="idNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Регистрийн дугаар</FormLabel>
                    <FormControl>
                      <Input placeholder="АА00112233" {...field} data-testid="input-family-idnumber" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={familyForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Утасны дугаар</FormLabel>
                    <FormControl>
                      <Input placeholder="99112233" {...field} data-testid="input-family-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={familyForm.control}
                name="isVip"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-family-vip"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">VIP зочин</FormLabel>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setFamilyDialogOpen(false)} data-testid="button-cancel-family">
                  Цуцлах
                </Button>
                <Button type="submit" disabled={createFamilyMutation.isPending} data-testid="button-save-family">
                  {createFamilyMutation.isPending ? "Хадгалж байна..." : "Нэмэх"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Зочин устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ зочныг устгасан тохиолдолд буцаах боломжгүй.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-guest">Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete-guest"
            >
              {deleteMutation.isPending ? "Устгаж байна..." : "Устгах"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
