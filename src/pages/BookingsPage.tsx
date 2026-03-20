import AdminLayout from "@/components/admin/AdminLayout";
import { AdminBookingsList } from "@/components/admin/AdminBookingsList";
import { UpcomingTripsList } from "@/components/admin/UpcomingTripsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";

export default function BookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("view") === "upcoming" ? "upcoming" : "all";

  const onTabChange = (value: string) => {
    if (value === "upcoming") {
      setSearchParams({ view: "upcoming" });
    } else {
      setSearchParams({});
    }
  };

  return (
    <AdminLayout activeTab="bookings">
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-medium">Bookings</h1>
        <Tabs value={tab} onValueChange={onTabChange} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All bookings</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming trips</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-0">
            <AdminBookingsList />
          </TabsContent>
          <TabsContent value="upcoming" className="mt-0">
            <UpcomingTripsList />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
