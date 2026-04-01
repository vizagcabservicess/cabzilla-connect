import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../providers/AuthProvider';
import { HomeScreen } from '../screens/HomeScreen';
import { ToursListScreen } from '../screens/ToursListScreen';
import { TourDetailScreen } from '../screens/TourDetailScreen';
import { CabResultsScreen } from '../screens/CabResultsScreen';
import { BookingSummaryScreen } from '../screens/BookingSummaryScreen';
import { PassengerInfoScreen } from '../screens/PassengerInfoScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { ServicesScreen } from '../screens/ServicesScreen';
import { HireDriverScreen } from '../screens/HireDriverScreen';
import { FleetVehiclesScreen } from '../screens/FleetVehiclesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AdminDashboardScreen } from '../screens/AdminDashboardScreen';
import { AdminDriverOpsDashboardScreen } from '../screens/AdminDriverOpsDashboardScreen';
import { AdminBookingsListScreen } from '../screens/AdminBookingsListScreen';
import { AdminUpcomingTripsScreen } from '../screens/AdminUpcomingTripsScreen';
import { AdminMenuScreen } from '../screens/AdminMenuScreen';
import { AdminDriversListScreen } from '../screens/AdminDriversListScreen';
import { AdminDriverFormScreen } from '../screens/AdminDriverFormScreen';
import { AdminVehiclesListScreen } from '../screens/AdminVehiclesListScreen';
import { AdminVehicleFormScreen } from '../screens/AdminVehicleFormScreen';
import { AdminCreateBookingScreen } from '../screens/AdminCreateBookingScreen';
import { AdminComingSoonScreen } from '../screens/AdminComingSoonScreen';
import { AdminGroupToursScreen } from '../screens/AdminGroupToursScreen';
import { AdminFleetScreen } from '../screens/AdminFleetScreen';
import { AdminFaresScreen } from '../screens/AdminFaresScreen';
import { AdminCommissionScreen } from '../screens/AdminCommissionScreen';
import { AdminFuelScreen } from '../screens/AdminFuelScreen';
import { AdminMaintenanceScreen } from '../screens/AdminMaintenanceScreen';
import { AdminLedgerScreen } from '../screens/AdminLedgerScreen';
import { AdminExpensesScreen } from '../screens/AdminExpensesScreen';
import { AdminPayrollScreen } from '../screens/AdminPayrollScreen';
import { AdminPaymentsScreen } from '../screens/AdminPaymentsScreen';
import { AdminPaymentTrackingScreen } from '../screens/AdminPaymentTrackingScreen';
import { AdminUsersScreen } from '../screens/AdminUsersScreen';
import { AdminReportsScreen } from '../screens/AdminReportsScreen';
import { BookingDetailScreen } from '../screens/BookingDetailScreen';
import { BookingEditScreen } from '../screens/BookingEditScreen';
import { AssignDriverScreen } from '../screens/AssignDriverScreen';
import { AssignVehicleScreen } from '../screens/AssignVehicleScreen';
import { InvoiceScreen } from '../screens/InvoiceScreen';
import { WebViewScreen } from '../screens/WebViewScreen';
import { ContactUsScreen } from '../screens/ContactUsScreen';
import { HelpCenterScreen } from '../screens/HelpCenterScreen';
import { StaticContentScreen } from '../screens/StaticContentScreen';
import { DataDeletionScreen } from '../screens/DataDeletionScreen';
import { DriverTripDetailScreen } from '../screens/DriverTripDetailScreen';
import { FuelEntryScreen } from '../screens/FuelEntryScreen';
import { DriverTripsDashboardScreen } from '../screens/DriverTripsDashboardScreen';
import { DriverFuelScreen } from '../screens/DriverFuelScreen';
import { DriverEarningsScreen } from '../screens/DriverEarningsScreen';
import { MenuProvider } from '../providers/MenuProvider';
import type { RootStackParamList, ServicesStackParamList } from './types';
import { colors } from '../theme/colors';
const Stack = createNativeStackNavigator<RootStackParamList>();
const ServicesStackNav = createNativeStackNavigator<ServicesStackParamList>();
const Tab = createBottomTabNavigator();

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminDriverOpsDashboard" component={AdminDriverOpsDashboardScreen} />
      <Stack.Screen name="AdminBookingsList" component={AdminBookingsListScreen} />
      <Stack.Screen name="AdminUpcomingTrips" component={AdminUpcomingTripsScreen} />
      <Stack.Screen name="AdminMenu" component={AdminMenuScreen} />
      <Stack.Screen name="AdminDriversList" component={AdminDriversListScreen} />
      <Stack.Screen name="AdminDriverAdd" component={AdminDriverFormScreen} />
      <Stack.Screen name="AdminDriverEdit" component={AdminDriverFormScreen} />
      <Stack.Screen name="AdminVehiclesList" component={AdminVehiclesListScreen} />
      <Stack.Screen name="AdminVehicleAdd" component={AdminVehicleFormScreen} />
      <Stack.Screen name="AdminVehicleEdit" component={AdminVehicleFormScreen} />
      <Stack.Screen name="AdminCreateBooking" component={AdminCreateBookingScreen} />
      <Stack.Screen name="AdminGroupTours" component={AdminGroupToursScreen} />
      <Stack.Screen name="AdminFleet" component={AdminFleetScreen} />
      <Stack.Screen name="AdminFares" component={AdminFaresScreen} />
      <Stack.Screen name="AdminCommission" component={AdminCommissionScreen} />
      <Stack.Screen name="AdminFuel" component={AdminFuelScreen} />
      <Stack.Screen name="AdminMaintenance" component={AdminMaintenanceScreen} />
      <Stack.Screen name="AdminLedger" component={AdminLedgerScreen} />
      <Stack.Screen name="AdminExpenses" component={AdminExpensesScreen} />
      <Stack.Screen name="AdminPayroll" component={AdminPayrollScreen} />
      <Stack.Screen name="AdminPayments" component={AdminPaymentsScreen} />
      <Stack.Screen name="AdminPaymentTracking" component={AdminPaymentTrackingScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
      <Stack.Screen name="AdminComingSoon" component={AdminComingSoonScreen} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="BookingEdit" component={BookingEditScreen} />
      <Stack.Screen name="AssignDriver" component={AssignDriverScreen} />
      <Stack.Screen name="AssignVehicle" component={AssignVehicleScreen} />
      <Stack.Screen name="BookingInvoice" component={InvoiceScreen} />
      <Stack.Screen name="ContactUs" component={ContactUsScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="StaticContent" component={StaticContentScreen} />
      <Stack.Screen name="DataDeletion" component={DataDeletionScreen} />
      <Stack.Screen
        name="WebView"
        component={WebViewScreen}
        options={({ route }) => ({ title: (route.params as { title: string }).title })}
      />
    </Stack.Navigator>
  );
}

function ServicesStack() {
  return (
    <ServicesStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ServicesStackNav.Screen name="ServicesList" component={ServicesScreen} />
      <ServicesStackNav.Screen name="HireDriver" component={HireDriverScreen} />
    </ServicesStackNav.Navigator>
  );
}

function DriverTripsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverTripsList" component={DriverTripsDashboardScreen} />
      <Stack.Screen name="DriverTripDetail" component={DriverTripDetailScreen} />
      <Stack.Screen name="FuelEntry" component={FuelEntryScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <MenuProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="WebView"
          component={WebViewScreen}
          options={({ route }) => ({ title: (route.params as { title: string }).title })}
        />
        <Stack.Screen name="ToursList" component={ToursListScreen} />
        <Stack.Screen name="TourDetail" component={TourDetailScreen} />
        <Stack.Screen name="CabResults" component={CabResultsScreen} />
        <Stack.Screen name="BookingSummary" component={BookingSummaryScreen} />
        <Stack.Screen name="PassengerInfo" component={PassengerInfoScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
      </Stack.Navigator>
    </MenuProvider>
  );
}

function DriverFuelStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverFuelHome" component={DriverFuelScreen} />
      <Stack.Screen name="FuelEntry" component={FuelEntryScreen} />
      <Stack.Screen name="DriverTripDetail" component={DriverTripDetailScreen} />
    </Stack.Navigator>
  );
}

function DriverEarningsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverEarningsHome" component={DriverEarningsScreen} />
      <Stack.Screen name="DriverTripDetail" component={DriverTripDetailScreen} />
      <Stack.Screen name="FuelEntry" component={FuelEntryScreen} />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  const { user, isAuthenticated } = useAuth();
  const isDriver = isAuthenticated && user?.role === 'driver';

  if (isDriver) {
    return (
      <>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#2563EB',
            tabBarInactiveTintColor: '#9CA3AF',
            tabBarLabelStyle: { fontSize: 11, textAlign: 'center' },
            tabBarItemStyle: { flex: 1 },
          }}
        >
          <Tab.Screen
            name="DriverTab"
            component={DriverTripsStack}
            options={{
              title: 'Trips',
              tabBarIcon: ({ focused }) => <TabBarIcon name="car" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="DriverFuelTab"
            component={DriverFuelStack}
            options={{
              title: 'Fuel',
              tabBarIcon: ({ focused }) => <TabBarIcon name="water" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="DriverEarningsTab"
            component={DriverEarningsStack}
            options={{
              title: 'Earnings',
              tabBarIcon: ({ focused }) => <TabBarIcon name="cash" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileStack}
            options={{
              title: 'Profile',
              tabBarIcon: ({ focused }) => <TabBarIcon name="person" focused={focused} />,
            }}
          />
        </Tab.Navigator>
      </>
    );
  }

  return (
    <>
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 11, textAlign: 'center' },
        tabBarItemStyle: { flex: 1 },
      }}
    >
      <Tab.Screen
        name="Main"
        component={MainStack}
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabBarIcon name="home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="FleetVehicles"
        component={FleetVehiclesScreen}
        options={{
          title: 'Fleet',
          tabBarIcon: ({ focused }) => <TabBarIcon name="car" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="HireDriver"
        component={HireDriverScreen}
        options={{
          title: 'Hire Driver',
          tabBarIcon: ({ focused }) => <TabBarIcon name="people" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabBarIcon name="person" focused={focused} />,
        }}
      />
    </Tab.Navigator>
    </>
  );
}

const ACTIVE_COLOR = '#2563EB';
const INACTIVE_COLOR = '#9CA3AF';
const ICON_SIZE = 26;

function TabBarIcon({ name, focused }: { name: keyof typeof Ionicons.glyphMap; focused: boolean }) {
  return (
    <Ionicons
      name={name}
      size={ICON_SIZE}
      color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
    />
  );
}
