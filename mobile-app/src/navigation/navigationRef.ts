import { createNavigationContainerRef } from '@react-navigation/native';
import type { AppRootParamList } from './appRootTypes';

/** Used for navigating from push handlers / overlays outside screen components. */
export const navigationRef = createNavigationContainerRef<AppRootParamList>();
