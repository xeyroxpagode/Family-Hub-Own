#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { createRequire } = require('node:module');

const repositoryRoot = path.resolve(__dirname, '..');
const frontendRoot = path.join(repositoryRoot, 'front', 'mi-front-limpio');
const frontendRequire = createRequire(path.join(frontendRoot, 'package.json'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertRulesOfHooks() {
  const { ESLint } = frontendRequire('eslint');
  const eslint = new ESLint({
    cwd: frontendRoot,
    overrideConfig: {
      rules: {
        'react-hooks/rules-of-hooks': 'error',
      },
    },
  });
  const results = await eslint.lintFiles(['**/*.{js,jsx,ts,tsx}']);
  const violations = results.flatMap((result) =>
    result.messages
      .filter((message) => message.ruleId === 'react-hooks/rules-of-hooks')
      .map((message) =>
        `${path.relative(repositoryRoot, result.filePath)}:${message.line}:${message.column} ${message.message}`,
      ),
  );
  assert(
    violations.length === 0,
    `Rules of Hooks violations:\n${violations.map((value) => `- ${value}`).join('\n')}`,
  );
  console.log('PASS rules-of-hooks AST gate');
}

function installTypeScriptLoader() {
  const babel = frontendRequire('@babel/core');
  const presetTypeScript = frontendRequire('@babel/preset-typescript');
  const presetReact = frontendRequire('@babel/preset-react');
  const commonJs = frontendRequire('@babel/plugin-transform-modules-commonjs');

  for (const extension of ['.ts', '.tsx']) {
    Module._extensions[extension] = (module, filename) => {
      const source = fs.readFileSync(filename, 'utf8');
      const transformed = babel.transformSync(source, {
        filename,
        babelrc: false,
        configFile: false,
        sourceMaps: 'inline',
        presets: [
          [presetTypeScript, { allExtensions: true, isTSX: true }],
          [presetReact, { runtime: 'classic' }],
        ],
        plugins: [commonJs],
      });
      assert(transformed?.code, `Babel did not produce code for ${filename}`);
      module._compile(transformed.code, filename);
    };
  }

  for (const extension of ['.png', '.jpg', '.jpeg', '.gif', '.webp']) {
    Module._extensions[extension] = (module, filename) => {
      module.exports = filename;
    };
  }
}

function createRuntimeMocks(React) {
  const host = (name) => {
    const Component = ({ children }) => React.createElement(React.Fragment, null, children);
    Component.displayName = `RuntimeSmoke${name}`;
    return Component;
  };
  const subscription = () => ({ remove() {}, unsubscribe() {} });
  const dimensions = { width: 390, height: 844, scale: 1, fontScale: 1 };

  class AnimatedValue {
    constructor(value) {
      this.value = value;
    }
    setValue(value) {
      this.value = value;
    }
    interpolate() {
      return this.value;
    }
  }

  const animation = {
    start(callback) {
      if (callback) callback({ finished: true });
    },
    stop() {},
  };
  const Animated = {
    Value: AnimatedValue,
    View: host('AnimatedView'),
    Text: host('AnimatedText'),
    Image: host('AnimatedImage'),
    ScrollView: host('AnimatedScrollView'),
    timing: () => animation,
    spring: () => animation,
    decay: () => animation,
    sequence: () => animation,
    parallel: () => animation,
    stagger: () => animation,
    loop: () => animation,
    event: () => () => {},
  };

  const reactNative = new Proxy(
    {
      ActivityIndicator: host('ActivityIndicator'),
      Alert: { alert() {} },
      Animated,
      AppState: { currentState: 'active', addEventListener: subscription },
      Appearance: { getColorScheme: () => 'light', addChangeListener: subscription },
      BackHandler: { addEventListener: subscription, exitApp() {} },
      Dimensions: { get: () => dimensions, addEventListener: subscription },
      Easing: new Proxy({}, { get: () => (value) => value }),
      Image: host('Image'),
      Keyboard: { addListener: subscription, dismiss() {} },
      Linking: {
        addEventListener: subscription,
        getInitialURL: async () => null,
        openURL: async () => {},
        canOpenURL: async () => true,
      },
      Modal: host('Modal'),
      Platform: {
        OS: 'android',
        Version: 36,
        select: (options) => options.android ?? options.native ?? options.default,
      },
      Pressable: host('Pressable'),
      ScrollView: host('ScrollView'),
      SectionList: host('SectionList'),
      StatusBar: host('StatusBar'),
      StyleSheet: {
        create: (styles) => styles,
        compose: (first, second) => [first, second],
        flatten: (style) => style,
        absoluteFillObject: {},
        hairlineWidth: 1,
      },
      Switch: host('Switch'),
      Text: host('Text'),
      TextInput: host('TextInput'),
      TouchableOpacity: host('TouchableOpacity'),
      View: host('View'),
      FlatList: host('FlatList'),
      useColorScheme: () => 'light',
      useWindowDimensions: () => dimensions,
    },
    {
      get(target, property) {
        if (property in target) return target[property];
        return host(String(property));
      },
    },
  );

  const navigatorFactory = () => ({
    Navigator: host('Navigator'),
    Screen: host('Screen'),
    Group: host('Group'),
  });
  const navigation = {
    NavigationContainer: host('NavigationContainer'),
    createNavigationContainerRef: () => ({
      isReady: () => false,
      navigate() {},
      dispatch() {},
    }),
    useFocusEffect() {},
    useIsFocused: () => true,
    useNavigation: () => ({
      addListener: subscription,
      canGoBack: () => false,
      dispatch() {},
      goBack() {},
      navigate() {},
      setParams() {},
    }),
    useRoute: () => ({ key: 'runtime-smoke', name: 'RuntimeSmoke', params: {} }),
    CommonActions: new Proxy({}, { get: () => (...args) => ({ args }) }),
    StackActions: new Proxy({}, { get: () => (...args) => ({ args }) }),
  };

  const asyncStorage = {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
    multiRemove: async () => {},
  };
  const supabaseClient = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: subscription() } }),
      signInWithPassword: async () => ({ data: {}, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: () => supabaseClient,
    select: () => supabaseClient,
    eq: () => supabaseClient,
    single: async () => ({ data: null, error: null }),
    rpc: async () => ({ data: null, error: null }),
  };

  const expoModule = new Proxy(
    {
      createURL: (route = '') => `homeplus://${route}`,
      maybeCompleteAuthSession() {},
      openAuthSessionAsync: async () => ({ type: 'cancel' }),
      openBrowserAsync: async () => ({ type: 'cancel' }),
      dismissBrowser() {},
      useFonts: () => [true, null],
      StatusBar: host('ExpoStatusBar'),
      AppleAuthenticationButton: host('AppleAuthenticationButton'),
      AppleAuthenticationButtonType: { SIGN_IN: 0 },
      AppleAuthenticationButtonStyle: { BLACK: 0 },
      isAvailableAsync: async () => false,
      signInAsync: async () => ({}),
      impactAsync: async () => {},
      notificationAsync: async () => {},
      selectionAsync: async () => {},
    },
    { get: (target, property) => target[property] ?? (() => undefined) },
  );

  return {
    host,
    reactNative,
    navigation,
    navigatorFactory,
    asyncStorage,
    supabaseClient,
    expoModule,
  };
}

function installRuntimeMocks(React, onRegisterRootComponent) {
  const mocks = createRuntimeMocks(React);
  const originalLoad = Module._load;

  Module._load = function runtimeSmokeLoad(request, parent, isMain) {
    if (request.startsWith('.') && parent?.filename) {
      const base = path.resolve(path.dirname(parent.filename), request);
      for (const extension of ['.ts', '.tsx']) {
        const candidate = `${base}${extension}`;
        if (fs.existsSync(candidate)) return originalLoad.call(this, candidate, parent, isMain);
      }
    }
    if (request === 'react-native') return mocks.reactNative;
    if (request === 'expo') return { registerRootComponent: onRegisterRootComponent };
    if (request === '@react-navigation/native') return mocks.navigation;
    if (request === '@react-navigation/native-stack') {
      return { createNativeStackNavigator: mocks.navigatorFactory };
    }
    if (request === '@react-navigation/bottom-tabs') {
      return { createBottomTabNavigator: mocks.navigatorFactory };
    }
    if (request === 'react-native-safe-area-context') {
      return {
        SafeAreaProvider: mocks.host('SafeAreaProvider'),
        SafeAreaView: mocks.host('SafeAreaView'),
        useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
      };
    }
    if (request === '@react-native-async-storage/async-storage') {
      return { __esModule: true, default: mocks.asyncStorage };
    }
    if (request === '@supabase/supabase-js') {
      return {
        createClient: () => mocks.supabaseClient,
        processLock: async (_name, _timeout, callback) => callback(),
      };
    }
    if (request === '@expo/vector-icons') {
      return new Proxy({}, { get: (_target, property) => mocks.host(String(property)) });
    }
    if (request.startsWith('expo-')) return mocks.expoModule;
    if (request === 'react-native-calendars') return { Calendar: mocks.host('Calendar') };
    if (request === 'react-native-keyboard-aware-scroll-view') {
      return { KeyboardAwareScrollView: mocks.host('KeyboardAwareScrollView') };
    }
    if (request === 'react-native-qrcode-svg') {
      return { __esModule: true, default: mocks.host('QRCode') };
    }
    if (request === 'react-native-svg') {
      return new Proxy(
        { __esModule: true, default: mocks.host('Svg') },
        { get: (target, property) => target[property] ?? mocks.host(String(property)) },
      );
    }
    if (request === 'react-native-url-polyfill/auto') return {};
    return originalLoad.call(this, request, parent, isMain);
  };

  return () => {
    Module._load = originalLoad;
  };
}

function assertEntryEvaluationAndRender() {
  global.__DEV__ = false;
  process.env.EXPO_PUBLIC_API_URL ||= 'http://runtime-smoke.invalid';
  process.env.EXPO_PUBLIC_SUPABASE_URL ||= 'http://runtime-smoke.invalid';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||= 'runtime-smoke-anon-key';

  installTypeScriptLoader();
  const React = frontendRequire('react');
  const { renderToStaticMarkup } = frontendRequire('react-dom/server');
  let registeredApp = null;
  const restoreMocks = installRuntimeMocks(React, (App) => {
    registeredApp = App;
  });

  try {
    const entryPath = path.join(frontendRoot, 'index.ts');
    const homePath = path.join(frontendRoot, 'screens', 'home', 'HomePlannerSections.tsx');
    const plannerPath = path.join(frontendRoot, 'screens', 'planner', 'PlannerScreen.tsx');

    require(entryPath);
    let AppComponent = registeredApp;
    while (AppComponent && typeof AppComponent === 'object' && 'default' in AppComponent) {
      AppComponent = AppComponent.default;
    }
    assert(
      typeof AppComponent === 'function',
      `Expo entry point did not register a component (received ${typeof registeredApp}; keys ${Object.keys(registeredApp || {}).join(',')})`,
    );
    assert(require.cache[homePath], 'Critical HomePlannerSections import was not evaluated');
    assert(require.cache[plannerPath], 'Critical PlannerScreen import was not evaluated');

    const markup = renderToStaticMarkup(React.createElement(AppComponent));
    assert(markup.includes('Preparando tu hogar'), 'App/providers did not render the Auth bootstrap screen');
    console.log('PASS entry evaluation and critical Home/Planner imports');
    console.log('PASS App/navigation provider render');
  } finally {
    restoreMocks();
  }
}

async function main() {
  await assertRulesOfHooks();
  assertEntryEvaluationAndRender();
  console.log('HOMEPLUS RUNTIME SMOKE: PASSED');
}

main().catch((error) => {
  console.error(`HOMEPLUS RUNTIME SMOKE: FAILED\n${error.stack || error.message}`);
  process.exitCode = 1;
});
