declare const __DEV__: boolean;
declare const process: {
  env: Record<string, string | undefined>;
  exit(code?: number): never;
};
declare function require(moduleName: string): any;

declare module 'react-native' {
  export const Platform: { OS: string };
}
