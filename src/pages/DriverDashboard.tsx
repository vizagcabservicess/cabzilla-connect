import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DriverDashboard = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-medium mb-6">Driver Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Today's Rides</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium">₹0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium">0.0</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverDashboard; 