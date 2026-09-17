import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

type AuthScreenLayoutProps = {
  children: React.ReactNode;
  screenIndicator: string;
  centerContent?: boolean;
  dismissKeyboardOnTapOutside?: boolean;
  presentation?: 'standard' | 'premium';
};

export const AuthScreenLayout = ({
  children,
  screenIndicator,
  centerContent = false,
  dismissKeyboardOnTapOutside = true,
  presentation = 'standard',
}: AuthScreenLayoutProps) => {
  const isPremium = presentation === 'premium';
  const contentOpacity = useRef(new Animated.Value(isPremium ? 0 : 1)).current;
  const contentTranslateY = useRef(new Animated.Value(isPremium ? 10 : 0)).current;

  useEffect(() => {
    if (!isPremium) {
      contentOpacity.setValue(1);
      contentTranslateY.setValue(0);
      return;
    }

    contentOpacity.setValue(0);
    contentTranslateY.setValue(10);

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, contentTranslateY, isPremium]);

  const handlePressOutside = () => {
    if (dismissKeyboardOnTapOutside) {
      Keyboard.dismiss();
    }
  };

  const scrollContent = (
    <KeyboardAwareScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        isPremium ? styles.premiumScrollContent : null,
        centerContent ? styles.centerContent : styles.startContent,
      ]}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid={true}
      extraScrollHeight={24}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[
          styles.inner,
          isPremium ? styles.premiumInner : null,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        {children}
      </Animated.View>
      <Text style={[styles.screenIndicator, isPremium ? styles.premiumScreenIndicator : null]}>
        {screenIndicator}
      </Text>
    </KeyboardAwareScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, isPremium ? styles.premiumContainer : null]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        {dismissKeyboardOnTapOutside ? (
          <Pressable style={styles.flex} onPress={handlePressOutside}>
            {scrollContent}
          </Pressable>
        ) : (
          scrollContent
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F4' },
  premiumContainer: { backgroundColor: '#FBFAF8' },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  premiumScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 28,
  },
  centerContent: { justifyContent: 'center' },
  startContent: { justifyContent: 'flex-start' },
  inner: { width: '100%' },
  premiumInner: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(56, 45, 38, 0.09)',
    borderRadius: 8,
    paddingHorizontal: 22,
    paddingVertical: 26,
    shadowColor: '#241F1C',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  screenIndicator: {
    fontSize: 10,
    color: '#A3A3A3',
    textAlign: 'center',
    paddingTop: 16,
    letterSpacing: 1,
  },
  premiumScreenIndicator: {
    color: '#B8AEA4',
    paddingTop: 18,
  },
});
