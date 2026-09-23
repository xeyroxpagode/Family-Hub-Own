import type { ViewStyle } from 'react-native';

declare module 'react-native' {
  namespace StyleSheet {
    export const absoluteFillObject: Pick<ViewStyle, 'bottom' | 'left' | 'position' | 'right' | 'top'>;
  }
}

declare global {
  var global: typeof globalThis;
}
