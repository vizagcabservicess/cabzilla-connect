import { CommonActions } from '@react-navigation/native';

type ResetPayload = ReturnType<typeof CommonActions.reset>;

/** Parent tab navigator from `navigation.getParent()` — minimal typing so stack vs tab generics stay compatible. */
export type TabParentForReset =
  | { dispatch: (action: ResetPayload) => void }
  | undefined;

/**
 * Reset root tab state after logout. Driver tabs differ from guest/customer tabs;
 * dispatching guest routes on a driver tab navigator causes "RESET was not handled".
 */
export function resetTabsAfterLogout(tabNav: TabParentForReset, role: string | undefined): void {
  if (!tabNav) return;

  if (role === 'driver') {
    tabNav.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          { name: 'DriverTab', state: { routes: [{ name: 'DriverTripsList' }] } },
          { name: 'DriverFuelTab', state: { routes: [{ name: 'DriverFuelHome' }] } },
          { name: 'Profile', state: { routes: [{ name: 'ProfileHome' }] } },
        ],
      })
    );
    return;
  }

  tabNav.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        { name: 'Main', state: { routes: [{ name: 'Home', params: { showAuthSheet: true } }] } },
        { name: 'FleetVehicles' },
        { name: 'HireDriver' },
        { name: 'Profile' },
      ],
    })
  );
}
