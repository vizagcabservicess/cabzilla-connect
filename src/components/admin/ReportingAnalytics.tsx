import { useState } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart2, ArrowUpRight, ArrowDownRight, 
  Calendar, Download, Clock, MapPin
} from "lucide-react";

export function ReportingAnalytics() {
  // Sample data for charts
  const dailyRevenueData = [
    { name: 'Mon', revenue: 8500 },
    { name: 'Tue', revenue: 7200 },
    { name: 'Wed', revenue: 9100 },
    { name: 'Thu', revenue: 8300 },
    { name: 'Fri', revenue: 11500 },
    { name: 'Sat', revenue: 14800 },
    { name: 'Sun', revenue: 13200 }
  ];

  const monthlyRevenueData = [
    { name: 'Jan', revenue: 235000 },
    { name: 'Feb', revenue: 242000 },
    { name: 'Mar', revenue: 258000 },
    { name: 'Apr', revenue: 270000 },
    { name: 'May', revenue: 285000 },
    { name: 'Jun', revenue: 298000 }
  ];

  const tripTypeData = [
    { name: 'Local', value: 45 },
    { name: 'Outstation', value: 25 },
    { name: 'Airport', value: 20 },
    { name: 'Tour', value: 10 }
  ];

  const peakHoursData = [
    { hour: '6-8 AM', trips: 120 },
    { hour: '8-10 AM', trips: 240 },
    { hour: '10-12 PM', trips: 180 },
    { hour: '12-2 PM', trips: 150 },
    { hour: '2-4 PM', trips: 130 },
    { hour: '4-6 PM', trips: 210 },
    { hour: '6-8 PM', trips: 280 },
    { hour: '8-10 PM', trips: 230 },
    { hour: '10-12 AM', trips: 160 }
  ];

  const topDriversData = [
    { name: 'Rajesh K', trips: 352, earnings: 120000 },
    { name: 'Venkatesh S', trips: 298, earnings: 110000 },
    { name: 'Pavan R', trips: 215, earnings: 85500 },
    { name: 'Suresh V', trips: 180, earnings: 72000 },
    { name: 'Ramesh B', trips: 175, earnings: 65000 }
  ];

  const topRoutesData = [
    { route: 'Airport - City Center', trips: 450, revenue: 90000 },
    { route: 'Gachibowli - Hitech City', trips: 380, revenue: 45600 },
    { route: 'Secunderabad - Charminar', trips: 310, revenue: 37200 },
    { route: 'Kukatpally - Ameerpet', trips: 280, revenue: 33600 },
    { route: 'Madhapur - Kondapur', trips: 260, revenue: 31200 }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6 overflow-x-hidden px-2 md:px-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Reports & Analytics</h2>
        <div className="space-x-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Date Range
          </Button>
          <Button className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Export Reports
          </Button>
        </div>
      </div>

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="trips">Trip Analysis</TabsTrigger>
          <TabsTrigger value="drivers">Driver Performance</TabsTrigger>
          <TabsTrigger value="routes">Popular Routes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="revenue">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Daily Revenue (Last Week)</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹14,500</div>
                <div className="flex items-center text-xs mt-1 text-green-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" /> 
                  <span>+12% from yesterday</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Weekly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹72,600</div>
                <div className="flex items-center text-xs mt-1 text-green-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" /> 
                  <span>+8% from last week</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹298,000</div>
                <div className="flex items-center text-xs mt-1 text-red-600">
                  <ArrowDownRight className="h-3 w-3 mr-1" /> 
                  <span>-3% from last month</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="trips">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trip Types Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tripTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {tripTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Peak Hours Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakHoursData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="trips" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Trips Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">120</div>
                <div className="flex items-center text-xs mt-1 text-green-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" /> 
                  <span>+15% from yesterday</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Trip Distance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12.5 km</div>
                <div className="flex items-center text-xs mt-1 text-muted-foreground">
                  <span>Based on last 30 days</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Fare</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹420</div>
                <div className="flex items-center text-xs mt-1 text-green-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" /> 
                  <span>+5% from last month</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="drivers">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Top Performing Drivers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Driver Name</th>
                      <th className="text-right py-3 px-4">Total Trips</th>
                      <th className="text-right py-3 px-4">Total Earnings</th>
                      <th className="text-right py-3 px-4">Avg. Rating</th>
                      <th className="text-right py-3 px-4">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDriversData.map((driver, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 px-4 font-medium">{driver.name}</td>
                        <td className="text-right py-3 px-4">{driver.trips}</td>
                        <td className="text-right py-3 px-4">₹{driver.earnings.toLocaleString('en-IN')}</td>
                        <td className="text-right py-3 px-4">{(4.0 + Math.random() * 1.0).toFixed(1)}</td>
                        <td className="text-right py-3 px-4">{(90 + Math.random() * 10).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Active Drivers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">42</div>
                <div className="text-xs text-muted-foreground">Out of 65 registered</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Trips per Driver</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3.2</div>
                <div className="text-xs text-muted-foreground">Daily average</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">New Driver Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">15</div>
                <div className="text-xs text-muted-foreground">Pending review</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="routes">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Most Popular Routes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Route</th>
                      <th className="text-right py-3 px-4">Total Trips</th>
                      <th className="text-right py-3 px-4">Total Revenue</th>
                      <th className="text-right py-3 px-4">Avg. Fare</th>
                      <th className="text-right py-3 px-4">Peak Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topRoutesData.map((route, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 px-4 font-medium">{route.route}</td>
                        <td className="text-right py-3 px-4">{route.trips}</td>
                        <td className="text-right py-3 px-4">₹{route.revenue.toLocaleString('en-IN')}</td>
                        <td className="text-right py-3 px-4">₹{Math.round(route.revenue / route.trips)}</td>
                        <td className="text-right py-3 px-4">
                          {['Morning', 'Afternoon', 'Evening', 'Night'][Math.floor(Math.random() * 4)]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Most Requested Area</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Airport</div>
                <div className="text-xs text-muted-foreground">28% of all pickups</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Longest Route</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Hyderabad - Tirupati</div>
                <div className="text-xs text-muted-foreground">550 km average distance</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Most Profitable Route</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Airport - City Center</div>
                <div className="text-xs text-muted-foreground">₹200 avg. profit per trip</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
