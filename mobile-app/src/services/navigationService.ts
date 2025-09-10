import { createNavigationContainerRef, StackActions } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Navigate to a screen
 * @param name - Screen name
 * @param params - Screen parameters
 */
export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params as any);
  }
}

/**
 * Navigate back
 */
export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

/**
 * Reset navigation stack
 * @param name - Screen to reset to
 * @param params - Screen parameters
 */
export function reset<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: name as any, params: params as any }],
    });
  }
}

/**
 * Replace current screen
 * @param name - Screen name
 * @param params - Screen parameters
 */
export function replace<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.replace(name as any, params as any));
  }
}

/**
 * Push a new screen onto the stack
 * @param name - Screen name
 * @param params - Screen parameters
 */
export function push<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.push(name as any, params as any));
  }
}

/**
 * Pop screens from the stack
 * @param count - Number of screens to pop
 */
export function pop(count: number = 1) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.pop(count));
  }
}

/**
 * Pop to top of the stack
 */
export function popToTop() {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.popToTop());
  }
}

/**
 * Get current route name
 * @returns Current route name or undefined
 */
export function getCurrentRouteName(): string | undefined {
  if (navigationRef.isReady()) {
    return navigationRef.getCurrentRoute()?.name;
  }
  return undefined;
}

/**
 * Get current route params
 * @returns Current route params or undefined
 */
export function getCurrentRouteParams(): any {
  if (navigationRef.isReady()) {
    return navigationRef.getCurrentRoute()?.params;
  }
  return undefined;
}

/**
 * Check if can go back
 * @returns Boolean indicating if navigation can go back
 */
export function canGoBack(): boolean {
  return navigationRef.isReady() && navigationRef.canGoBack();
}

/**
 * Add listener for navigation state changes
 * @param callback - Callback function
 * @returns Unsubscribe function
 */
export function addNavigationListener(callback: () => void) {
  return navigationRef.addListener('state', callback);
}

// Export navigation ref for direct access if needed
export default navigationRef;