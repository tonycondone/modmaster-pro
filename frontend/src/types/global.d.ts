/// <reference types="react" />
/// <reference types="react-native" />

declare module '*.png' {
  const content: any;
  export default content;
}

declare module '*.jpg' {
  const content: any;
  export default content;
}

declare module '*.jpeg' {
  const content: any;
  export default content;
}

declare module '*.gif' {
  const content: any;
  export default content;
}

declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

declare module '*.json' {
  const content: any;
  export default content;
}

// Environment variables
declare module '@env' {
  export const API_URL: string;
  export const SOCKET_URL: string;
  export const SENTRY_DSN: string;
  export const GOOGLE_MAPS_API_KEY: string;
  export const STRIPE_PUBLISHABLE_KEY: string;
}

// Global types
declare global {
  namespace ReactNavigation {
    interface RootParamList {
      // Add your navigation params here
      Home: undefined;
      Login: undefined;
      Register: undefined;
      VehicleDetail: { vehicleId: string };
      ScanScreen: { vehicleId: string; scanType?: string };
      ScanProgress: { scanId: string; vehicleId: string; scanType: string };
      ScanResults: { scanId: string; vehicleId: string; scanType: string; results?: any };
      PartDetail: { partId: string };
      CreateProject: { 
        fromScan?: boolean; 
        scanId?: string; 
        vehicleId?: string; 
        suggestedParts?: any[] 
      };
    }
  }
}

export {};