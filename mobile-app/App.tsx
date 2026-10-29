import { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from './src/navigation/navigationRef';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from '@expo-google-fonts/inter/useFonts';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { GoogleMapsProvider } from './src/providers/GoogleMapsProvider';
import { AuthProvider } from './src/providers/AuthProvider';
import { PushNotificationBootstrap } from './src/components/PushNotificationBootstrap';
import { DriverTripAssignmentOverlay } from './src/components/DriverTripAssignmentOverlay';
import { RootNavigator } from './src/navigation/RootNavigator';
import { EventDutyScreen } from './src/screens/EventDutyScreen';
import { EventShareScreen } from './src/screens/EventShareScreen';
import { resumeEventDutyTrackingIfNeeded } from './src/lib/eventDutyLocationTask';
import { resumeDriverTripTrackingIfNeeded } from './src/lib/driverTripLocationTask';
import * as Notifications from 'expo-notifications';
import type { AppRootParamList } from './src/navigation/appRootTypes';

WebBrowser.maybeCompleteAuthSession();

SplashScreen.preventAutoHideAsync();

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const AppStack = createNativeStackNavigator<AppRootParamList>();
const linking = {
  prefixes: ['vizagtaxihub://', 'https://www.vizagtaxihub.com', 'https://vizagtaxihub.com'],
  config: {
    screens: {
      EventDuty: 'driver/register/:token',
      EventShare: 'event/share/:token',
      Tabs: '',
    },
  },
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const onLayoutRootView = useCallback(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    void resumeEventDutyTrackingIfNeeded();
    void resumeDriverTripTrackingIfNeeded();
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { type?: string; token?: string };
      if (data?.type === 'event_duty' && data.token && navigationRef.isReady()) {
        navigationRef.navigate('EventDuty', { token: String(data.token) });
      }
    });
    return () => sub.remove();
  }, []);

  // Don't block app on font load failure (common on web)
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <AuthProvider>
        <PushNotificationBootstrap />
        <GoogleMapsProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <NavigationContainer ref={navigationRef} linking={linking}>
            <AppStack.Navigator screenOptions={{ headerShown: false }}>
              <AppStack.Screen name="Tabs" component={RootNavigator} />
              <AppStack.Screen name="EventDuty" component={EventDutyScreen} />
              <AppStack.Screen name="EventShare" component={EventShareScreen} />
            </AppStack.Navigator>
          </NavigationContainer>
          {/* Modal must sit outside the navigator tree — otherwise some Android builds never show it above tabs */}
          <DriverTripAssignmentOverlay />
          <StatusBar style="auto" />
        </GoogleMapsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
