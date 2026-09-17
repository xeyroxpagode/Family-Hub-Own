import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '../../constants/theme';
import { getSimpleHorizontalPadding } from './simpleLayout';

type SimpleScreenProps = {
  children: ReactNode;
  scrollable?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  emergencyAction?: ReactNode;
  keyboardAvoiding?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle'>;
  safeAreaEdges?: Edge[];
};

/**
 * Shared layout for the Simple experience. It centralizes safe areas,
 * responsive content width, optional scrolling and keyboard behaviour so
 * feature screens only provide their content.
 */
export function SimpleScreen({
  children,
  scrollable = true,
  header,
  footer,
  emergencyAction,
  keyboardAvoiding = false,
  style,
  contentStyle,
  scrollProps,
  safeAreaEdges,
}: SimpleScreenProps) {
  const { width } = useWindowDimensions();
  const horizontalPadding = getSimpleHorizontalPadding(width);
  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.nonScrollableContent, { paddingHorizontal: horizontalPadding }, contentStyle]}>{children}</View>
  );

  const body = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  ) : content;

  return (
    <SafeAreaView
      style={[styles.screen, style]}
      edges={safeAreaEdges ?? (header ? ['bottom'] : ['top', 'bottom'])}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.base} />
      {header}
      {body}
      {emergencyAction ? <View style={[styles.emergency, { paddingHorizontal: horizontalPadding }]}>{emergencyAction}</View> : null}
      {footer ? <View style={[styles.footer, { paddingHorizontal: horizontalPadding }]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.base },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingTop: spacing[4],
    paddingBottom: spacing[12],
    gap: spacing[3],
  },
  nonScrollableContent: { flex: 1 },
  emergency: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingTop: spacing[2],
  },
  footer: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingTop: spacing[3],
  },
});
