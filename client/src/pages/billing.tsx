import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CreditCard, Users, Eye, Crown, FileText, Download } from "lucide-react";
import type { Guest, Booking, Transaction } from "@shared/schema";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface BillData {
  family: {
    parent: { id: string; name: string; phone: string };
    memberCount: number;
  };
  items: {
    bookingId: string;
    guestName: string;
    roomNumber: string;
    categoryName: string;
    checkIn: string;
    checkOut: string;
    status: string;
    totalAmount: number;
    totalPaid: number;
    balance: number;
    transactions: Transaction[];
  }[];
  summary: {
    grandTotal: number;
    grandPaid: number;
    grandBalance: number;
  };
  generatedAt: string;
}

const bookingStatusLabels: Record<string, string> = {
  PENDING: "Хүлээгдэж буй",
  CONFIRMED: "Баталгаажсан",
  CHECKED_IN: "Check-in",
  CHECKED_OUT: "Check-out",
  CANCELLED: "Цуцлагдсан",
};

const paymentTypeLabels: Record<string, string> = {
  DEPOSIT: "Урьдчилгаа",
  FINAL: "Эцсийн төлбөр",
};

const paymentMethodLabels: Record<string, string> = {
  CASH: "Бэлэн",
  CARD: "Карт",
  TRANSFER: "Шилжүүлэг",
};

function BillDialog({ billData, open, onClose }: { billData: BillData | null; open: boolean; onClose: () => void }) {
  if (!billData) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-bill-dialog-title">
            Нэхэмжлэх - {billData.family.parent.name}
          </DialogTitle>
          <DialogDescription>
            {billData.family.memberCount} гишүүн | Утас: {billData.family.parent.phone} | Огноо: {new Date(billData.generatedAt).toLocaleDateString("mn-MN")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {billData.items.map((item) => (
            <div key={item.bookingId} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-medium">{item.guestName}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    Өрөө {item.roomNumber} ({item.categoryName})
                  </span>
                </div>
                <Badge variant="outline">{bookingStatusLabels[item.status] || item.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(item.checkIn).toLocaleDateString("mn-MN")} - {new Date(item.checkOut).toLocaleDateString("mn-MN")}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Нийт: </span>
                  <span className="font-medium">{item.totalAmount.toLocaleString()}₮</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Төлсөн: </span>
                  <span className="font-medium">{item.totalPaid.toLocaleString()}₮</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Үлдэгдэл: </span>
                  <span className={`font-medium ${item.balance > 0 ? "text-destructive" : ""}`}>{item.balance.toLocaleString()}₮</span>
                </div>
              </div>
              {item.transactions.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Огноо</TableHead>
                        <TableHead className="text-xs">Төрөл</TableHead>
                        <TableHead className="text-xs">Хэлбэр</TableHead>
                        <TableHead className="text-xs text-right">Дүн</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {item.transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell className="text-xs">{new Date(txn.createdAt).toLocaleDateString("mn-MN")}</TableCell>
                          <TableCell className="text-xs">{paymentTypeLabels[txn.type] || txn.type}</TableCell>
                          <TableCell className="text-xs">{paymentMethodLabels[txn.paymentMethod] || txn.paymentMethod}</TableCell>
                          <TableCell className="text-xs text-right">{Number(txn.amount).toLocaleString()}₮</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <Separator />
            </div>
          ))}

          <div className="bg-muted/50 rounded-md p-4 space-y-2">
            <h4 className="text-sm font-semibold">Нийт дүн</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Нийт</p>
                <p className="text-lg font-bold" data-testid="text-bill-grand-total">{billData.summary.grandTotal.toLocaleString()}₮</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Төлсөн</p>
                <p className="text-lg font-bold" data-testid="text-bill-grand-paid">{billData.summary.grandPaid.toLocaleString()}₮</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Үлдэгдэл</p>
                <p className={`text-lg font-bold ${billData.summary.grandBalance > 0 ? "text-destructive" : ""}`} data-testid="text-bill-grand-balance">
                  {billData.summary.grandBalance.toLocaleString()}₮
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FamilyBillingCard({ parent, allGuests, allBookings, onGenerateBill }: {
  parent: Guest;
  allGuests: Guest[];
  allBookings: Booking[];
  onGenerateBill: (parentId: string) => void;
}) {
  const familyMembers = allGuests.filter((g) => g.parentId === parent.id);
  const familyIds = [parent.id, ...familyMembers.map((m) => m.id)];
  const familyBookings = allBookings.filter((b) => familyIds.includes(b.guestId));

  const totalAmount = familyBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
  const totalDeposit = familyBookings.reduce((sum, b) => sum + Number(b.depositPaid), 0);
  const balance = totalAmount - totalDeposit;

  const getGuestName = (id: string) => {
    const g = allGuests.find((guest) => guest.id === id);
    return g ? `${g.lastName} ${g.firstName}` : "—";
  };

  return (
    <Card data-testid={`card-family-billing-${parent.id}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <CardTitle className="text-base">
            {parent.lastName} {parent.firstName}
          </CardTitle>
          {parent.isVip && (
            <Badge variant="secondary">
              <Crown className="h-3 w-3 mr-1" />
              VIP
            </Badge>
          )}
          <Badge variant="outline">
            <Users className="h-3 w-3 mr-1" />
            {familyMembers.length + 1}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onGenerateBill(parent.id)}
            data-testid={`button-generate-bill-${parent.id}`}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Нэхэмжлэх
          </Button>
          <Button size="icon" variant="ghost" asChild>
            <Link href={`/guests/${parent.id}`} data-testid={`link-billing-detail-${parent.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Нийт дүн</p>
            <p className="text-lg font-semibold mt-0.5" data-testid={`text-billing-total-${parent.id}`}>
              {totalAmount.toLocaleString()}₮
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Төлсөн</p>
            <p className="text-lg font-semibold mt-0.5" data-testid={`text-billing-paid-${parent.id}`}>
              {totalDeposit.toLocaleString()}₮
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Үлдэгдэл</p>
            <p className={`text-lg font-semibold mt-0.5 ${balance > 0 ? "text-destructive" : ""}`} data-testid={`text-billing-balance-${parent.id}`}>
              {balance.toLocaleString()}₮
            </p>
          </div>
        </div>

        {familyBookings.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Зочин</TableHead>
                  <TableHead>Орох</TableHead>
                  <TableHead>Гарах</TableHead>
                  <TableHead>Төлөв</TableHead>
                  <TableHead className="text-right">Дүн</TableHead>
                  <TableHead className="text-right">Төлсөн</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {familyBookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{getGuestName(b.guestId)}</TableCell>
                    <TableCell>{new Date(b.checkIn).toLocaleDateString("mn-MN")}</TableCell>
                    <TableCell>{new Date(b.checkOut).toLocaleDateString("mn-MN")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{bookingStatusLabels[b.status] || b.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{Number(b.totalAmount).toLocaleString()}₮</TableCell>
                    <TableCell className="text-right">{Number(b.depositPaid).toLocaleString()}₮</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Захиалга байхгүй</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function BillingPage() {
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [billData, setBillData] = useState<BillData | null>(null);
  const [billLoading, setBillLoading] = useState(false);

  const { data: allGuests = [], isLoading: guestsLoading } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  const { data: allBookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const isLoading = guestsLoading || bookingsLoading;
  const parentGuests = allGuests.filter((g) => !g.parentId);

  const parentsWithFamily = parentGuests.filter((p) => {
    const hasFamily = allGuests.some((g) => g.parentId === p.id);
    return hasFamily;
  });

  const soloGuests = parentGuests.filter((p) => {
    return !allGuests.some((g) => g.parentId === p.id);
  });

  const handleGenerateBill = async (parentId: string) => {
    setBillLoading(true);
    try {
      const res = await fetch(`/api/family-bill/${parentId}`);
      if (!res.ok) throw new Error("Нэхэмжлэх үүсгэхэд алдаа гарлаа");
      const data = await res.json();
      setBillData(data);
      setBillDialogOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setBillLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-billing">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-billing-title">
          Төлбөрийн удирдлага
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Гэр бүлээр нэгтгэсэн төлбөрийн мэдээлэл ба нэхэмжлэх
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : parentGuests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-billing">
              Зочин бүртгэгдээгүй байна. Эхлээд зочдыг бүртгэнэ үү.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {parentsWithFamily.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Гэр бүлүүд ({parentsWithFamily.length})
              </h2>
              <div className="space-y-4">
                {parentsWithFamily.map((parent) => (
                  <FamilyBillingCard
                    key={parent.id}
                    parent={parent}
                    allGuests={allGuests}
                    allBookings={allBookings}
                    onGenerateBill={handleGenerateBill}
                  />
                ))}
              </div>
            </div>
          )}

          {soloGuests.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Ганц зочид ({soloGuests.length})
              </h2>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Овог, Нэр</TableHead>
                      <TableHead>Регистр</TableHead>
                      <TableHead>Захиалга</TableHead>
                      <TableHead className="text-right">Нийт дүн</TableHead>
                      <TableHead className="text-right">Төлсөн</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {soloGuests.map((guest) => {
                      const gBookings = allBookings.filter((b) => b.guestId === guest.id);
                      const total = gBookings.reduce((s, b) => s + Number(b.totalAmount), 0);
                      const paid = gBookings.reduce((s, b) => s + Number(b.depositPaid), 0);
                      return (
                        <TableRow key={guest.id} data-testid={`row-solo-billing-${guest.id}`}>
                          <TableCell className="font-medium">
                            {guest.lastName} {guest.firstName}
                            {guest.isVip && (
                              <Badge variant="secondary" className="ml-2">VIP</Badge>
                            )}
                          </TableCell>
                          <TableCell>{guest.idNumber}</TableCell>
                          <TableCell>{gBookings.length}</TableCell>
                          <TableCell className="text-right">{total.toLocaleString()}₮</TableCell>
                          <TableCell className="text-right">{paid.toLocaleString()}₮</TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" asChild>
                              <Link href={`/guests/${guest.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}

      <BillDialog billData={billData} open={billDialogOpen} onClose={() => setBillDialogOpen(false)} />
    </div>
  );
}
