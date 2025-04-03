
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  useEffect(() => {
    document.title = "Welcome - Car Rental Service";
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">Welcome to Our Car Rental Service</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Book a Cab</CardTitle>
              <CardDescription>
                Find and book the perfect cab for your journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Choose from a variety of cab options for local trips, airport transfers, 
                outstation journeys, and tour packages.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link to="/cabs">Book Now</Link>
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Tour Packages</CardTitle>
              <CardDescription>
                Explore our curated tour packages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Discover exciting tour packages with experienced drivers and comfortable vehicles.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link to="/tours">View Tours</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="border rounded-lg bg-white p-6 space-y-4">
          <h2 className="text-xl font-semibold">System Tools</h2>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              asChild
            >
              <Link to="/admin">Admin Panel</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
