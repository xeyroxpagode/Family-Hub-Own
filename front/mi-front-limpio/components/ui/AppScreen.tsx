import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edges } from 'react-native-safe-area-context';

import { useAppTheme } from '../../context/AppThemeContext';

export type AppScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  keyboardAvoiding?: boolean;
  background?: 'base' | 'soft' | 'alt';
  bottomInset?: 'none' | 'tab' | 'fab' | 'sheet';
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle'>;
  safeAreaEdges?: Edges;
};

export function AppScreen({
  children,
  scroll = false,
  padded = true,
  keyboardAvoiding = false,
  background = 'base',
  bottomInset = 'none',
  centered = false,
  style,
  contentContainerStyle,
  scrollProps,
  safeAreaEdges,
}: AppScreenProps) {
  const theme = useAppTheme();
  const { colors, spacing } = theme;
  const bottomInsets: Record<NonNullable<AppScreenProps['bottomInset']>, number> = {
    none: spacing[5],
    tab: 96,
    fab: 112,
    sheet: spacing[8],
  };
  const screenBackground = colors.background[background];
  const contentStyle: StyleProp<ViewStyle> = [
    {
      flexGrow: 1,
      paddingHorizontal: padded ? spacing[5] : 0,
      paddingTop: spacing[4],
      paddingBottom: bottomInsets[bottomInset],
    },
    centered ? { alignItems: 'center', justifyContent: 'center' } : null,
    contentContainerStyle,
  ];

  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
      contentContainerStyle={contentStyle}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
  );

  const wrappedBody = keyboardAvoiding ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  return (
    <SafeAreaView edges={safeAreaEdges} style={[{ flex: 1, backgroundColor: screenBackground }, style]}>
      {wrappedBody}
    </SafeAreaView>
  );
}
