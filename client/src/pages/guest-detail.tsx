import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft, Crown, Users, Phone, FileText, Calendar, CreditCard, Banknote,
} from "lucide-react";
import type { Guest, Booking, Transaction } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

function MedicalHistoryViewer({ data }: { data: unknown }) {
  if (!data) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="text-no-medical-history">
        Эмнэлгийн түүх бүртгэгдээгүй
      </p>
    );
  }

  const renderValue = (value: unknown, depth = 0): JSX.Element => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">—</span>;
    }
    if (typeof value === "boolean") {
      return <Badge variant={value ? "default" : "secondary"}>{value ? "Тийм" : "Үгүй"}</Badge>;
    }
    if (typeof value === "string" || typeof value === "number") {
      return <span className="text-sm">{String(value)}</span>;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-muted-foreground italic text-sm">Хоосон</span>;
      return (
        <div className="space-y-1">
          {value.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-muted-foreground text-xs mt-0.5">{i + 1}.</span>
              {renderValue(item, depth + 1)}
            </div>
          ))}
        </div>
      );
    }
    if (typeof value === "object") {
      return (
        <div className={depth > 0 ? "ml-4 border-l pl-3 space-y-2" : "space-y-2"}>
          {Object.entries(value as Record<string, unknown>).map(([key, val]) => (
            <div key={key} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{key}</span>
              {renderValue(val, depth + 1)}
            </div>
          ))}
        </div>
      );
    }
    return <span className="text-sm">{JSON.stringify(value)}</span>;
  };

  return (
    <div data-testid="medical-history-content">
      {renderValue(data)}
    </div>
  );
}

export default function GuestDetailPage() {
  const [, params] = useRoute("/guests/:id");
  const guestId = params?.id;
  return guestId ? <GuestDetailContent key={guestId} guestId={guestId} /> : null;
}

function GuestDetailContent({ guestId }: { guestId: string }) {
  const { data: guest, isLoading: guestLoading } = useQuery<Guest>({
    queryKey: ["/api/guests", guestId],
  });

  const { data: familyMembers = [] } = useQuery<Guest[]>({
    queryKey: ["/api/guests", guestId, "family"],
  });

  const { data: guestBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/guests", guestId, "bookings"],
  });

  const { data: allGuests = [] } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  if (guestLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Зочин олдсонгүй</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/guests">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Буцах
          </Link>
        </Button>
      </div>
    );
  }

  const parentGuest = guest.parentId ? allGuests.find((g) => g.id === guest.parentId) : null;

  return (
    <div className="p-6 space-y-6" data-testid="page-guest-detail">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" asChild data-testid="button-back-guests">
          <Link href="/guests">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-guest-fullname">
              {guest.lastName} {guest.firstName}
            </h1>
            {guest.isVip && (
              <Badge variant="secondary">
                <Crown className="h-3 w-3 mr-1" />
                VIP
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Регистр: {guest.idNumber}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Хувийн мэдээлэл
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Овог</p>
                <p className="text-sm font-medium mt-0.5" data-testid="text-detail-lastname">{guest.lastName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Нэр</p>
                <p className="text-sm font-medium mt-0.5" data-testid="text-detail-firstname">{guest.firstName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Регистрийн дугаар</p>
                <p className="text-sm font-medium mt-0.5" data-testid="text-detail-idnumber">{guest.idNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Утас</p>
                <p className="text-sm font-medium mt-0.5 flex items-center gap-1" data-testid="text-detail-phone">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {guest.phone}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Loyalty оноо</p>
                <p className="text-sm font-medium mt-0.5" data-testid="text-detail-loyalty">{guest.loyaltyPoints}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Бүртгүүлсэн</p>
                <p className="text-sm font-medium mt-0.5" data-testid="text-detail-created">
                  {new Date(guest.createdAt).toLocaleDateString("mn-MN")}
                </p>
              </div>
            </div>
            {parentGuest && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Гэр бүлийн толгой</p>
                  <Button variant="outline" size="sm" className="mt-1" asChild>
                    <Link href={`/guests/${parentGuest.id}`} data-testid="link-parent-guest">
                      {parentGuest.lastName} {parentGuest.firstName}
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Эмнэлгийн түүх
            </CardTitle>
          </CardHeader>
          <CardContent data-testid="section-medical-history">
            <MedicalHistoryViewer data={guest.medicalHistory} />
          </CardContent>
        </Card>
      </div>

      {!guest.parentId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Гэр бүлийн гишүүд
            </CardTitle>
            <Badge variant="outline">{familyMembers.length} гишүүн</Badge>
          </CardHeader>
          <CardContent>
            {familyMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-family">
                Гэр бүлийн гишүүн бүртгэгдээгүй
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Овог, Нэр</TableHead>
                      <TableHead>Регистр</TableHead>
                      <TableHead>Утас</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {familyMembers.map((member) => (
                      <TableRow key={member.id} data-testid={`row-family-member-${member.id}`}>
                        <TableCell className="font-medium">
                          {member.lastName} {member.firstName}
                          {member.isVip && (
                            <Badge variant="secondary" className="ml-2">VIP</Badge>
                          )}
                        </TableCell>
                        <TableCell>{member.idNumber}</TableCell>
                        <TableCell>{member.phone}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" asChild>
                            <Link href={`/guests/${member.id}`} data-testid={`link-family-detail-${member.id}`}>
                              <ArrowLeft className="h-4 w-4 rotate-180" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Захиалгууд
          </CardTitle>
          <Badge variant="outline">{guestBookings.length}</Badge>
        </CardHeader>
        <CardContent>
          {guestBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-bookings">
              Захиалга байхгүй
            </p>
          ) : (
            <div className="space-y-3">
              {guestBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const bookingStatusLabels: Record<string, string> = {
  PENDING: "Хүлээгдэж буй",
  CONFIRMED: "Баталгаажсан",
  CHECKED_IN: "Check-in",
  CHECKED_OUT: "Check-out",
  CANCELLED: "Цуцлагдсан",
};

function BookingCard({ booking }: { booking: Booking }) {
  const { data: txns = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/bookings", booking.id, "transactions"],
  });

  const totalPaid = txns.reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = Number(booking.totalAmount) - totalPaid;

  return (
    <div className="rounded-md border p-3 space-y-2" data-testid={`card-booking-${booking.id}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{new Date(booking.checkIn).toLocaleDateString("mn-MN")} - {new Date(booking.checkOut).toLocaleDateString("mn-MN")}</span>
        </div>
        <Badge variant="outline">{bookingStatusLabels[booking.status] || booking.status}</Badge>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span>Нийт: <strong>{Number(booking.totalAmount).toLocaleString()}₮</strong></span>
        <span>Төлсөн: <strong>{totalPaid.toLocaleString()}₮</strong></span>
        <span className={balance > 0 ? "text-destructive" : ""}>Үлдэгдэл: <strong>{balance.toLocaleString()}₮</strong></span>
      </div>
      {txns.length > 0 && (
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
              {txns.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="text-xs">{new Date(txn.createdAt).toLocaleDateString("mn-MN")}</TableCell>
                  <TableCell className="text-xs">{txn.type === "DEPOSIT" ? "Урьдчилгаа" : "Эцсийн"}</TableCell>
                  <TableCell className="text-xs">{txn.paymentMethod === "CASH" ? "Бэлэн" : txn.paymentMethod === "CARD" ? "Карт" : "Шилжүүлэг"}</TableCell>
                  <TableCell className="text-xs text-right">{Number(txn.amount).toLocaleString()}₮</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
