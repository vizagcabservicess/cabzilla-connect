
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VehicleManagement } from "@/components/admin/VehicleManagement";
import { VehiclePricingManagement } from "@/components/admin/VehiclePricingManagement";
import { UserManagement } from "@/components/admin/UserManagement";
import { BookingsManagement } from "@/components/admin/BookingsManagement";
import { VehicleTripFaresForm } from "@/components/admin/VehicleTripFaresForm";
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState("vehicles");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [vehicleAction, setVehicleAction] = useState<"manage" | "pricing">("manage");
  const [tripFareType, setTripFareType] = useState<"outstation" | "local" | "airport">("local");

  const handleAddFareClick = (fareType: "outstation" | "local" | "airport") => {
    setActiveTab("add-fares");
    setTripFareType(fareType);
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 mb-8">
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="pricing">Vehicle Pricing</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="fares">Fare Management</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Vehicle Management</h2>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New Vehicle
            </Button>
          </div>
          <VehicleManagement vehicleId="" />
        </TabsContent>

        <TabsContent value="pricing">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-4">Vehicle Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Button
                variant="outline"
                onClick={() => setVehicleAction("manage")}
                className={vehicleAction === "manage" ? "border-primary bg-primary/10" : ""}
              >
                Manage Base Pricing
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAddFareClick("local")}
                className={activeTab === "add-fares" && tripFareType === "local" ? "border-primary bg-primary/10" : ""}
              >
                Local Trip Fares
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAddFareClick("airport")}
                className={activeTab === "add-fares" && tripFareType === "airport" ? "border-primary bg-primary/10" : ""}
              >
                Airport Trip Fares
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAddFareClick("outstation")}
                className={activeTab === "add-fares" && tripFareType === "outstation" ? "border-primary bg-primary/10" : ""}
              >
                Outstation Trip Fares
              </Button>
            </div>
            <VehiclePricingManagement vehicleId={selectedVehicleId} />
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <UserManagement />
          </div>
        </TabsContent>

        <TabsContent value="bookings">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-4">Booking Management</h2>
            <BookingsManagement />
          </div>
        </TabsContent>

        <TabsContent value="fares">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-6">Fare Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Button
                variant="outline"
                onClick={() => handleAddFareClick("local")}
                className={tripFareType === "local" ? "border-primary bg-primary/10" : ""}
              >
                Local Trip Fares
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAddFareClick("airport")}
                className={tripFareType === "airport" ? "border-primary bg-primary/10" : ""}
              >
                Airport Trip Fares
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAddFareClick("outstation")}
                className={tripFareType === "outstation" ? "border-primary bg-primary/10" : ""}
              >
                Outstation Trip Fares
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="add-fares">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-4">
              {tripFareType === "local"
                ? "Local Trip Fares"
                : tripFareType === "airport"
                ? "Airport Trip Fares"
                : "Outstation Trip Fares"}
            </h2>
            <VehicleTripFaresForm
              tripType={tripFareType}
              onSuccess={() => setActiveTab("fares")}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
