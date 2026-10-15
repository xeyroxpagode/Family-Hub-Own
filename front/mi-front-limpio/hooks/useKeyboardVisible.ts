/**
 * Whether the software keyboard is currently on screen. Backed by the
 * keyboardDidShow / keyboardDidHide pair so a dismissed keyboard is never
 * reported as visible. Mirrors the private hook in components/ui/ActionSheet.
 */
import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
