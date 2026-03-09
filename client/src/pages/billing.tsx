import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CreditCard, Users, Eye, Crown } from "lucide-react";
import type { Guest, Booking } from "@shared/schema";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

function FamilyBillingCard({ parent, allGuests, allBookings }: {
  parent: Guest;
  allGuests: Guest[];
  allBookings: Booking[];
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
        <Button size="icon" variant="ghost" asChild>
          <Link href={`/guests/${parent.id}`} data-testid={`link-billing-detail-${parent.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {familyBookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{getGuestName(b.guestId)}</TableCell>
                    <TableCell>{new Date(b.checkIn).toLocaleDateString("mn-MN")}</TableCell>
                    <TableCell>{new Date(b.checkOut).toLocaleDateString("mn-MN")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{b.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{Number(b.totalAmount).toLocaleString()}₮</TableCell>
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

  return (
    <div className="p-6 space-y-6" data-testid="page-billing">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-billing-title">
          Billing Overview
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Гэр бүлээр нэгтгэсэн төлбөрийн мэдээлэл
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
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {soloGuests.map((guest) => {
                      const gBookings = allBookings.filter((b) => b.guestId === guest.id);
                      const total = gBookings.reduce((s, b) => s + Number(b.totalAmount), 0);
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
    </div>
  );
}
