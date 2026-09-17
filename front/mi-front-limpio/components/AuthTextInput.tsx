import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

type AuthTextInputProps = TextInputProps & {
  label: string;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
  isPasswordField?: boolean;
};

export const AuthTextInput = forwardRef<TextInput, AuthTextInputProps>(
  ({ label, error, containerStyle, isPasswordField = false, style, ...props }, ref) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const secureTextEntry = isPasswordField ? !isPasswordVisible : props.secureTextEntry;

    return (
      <View style={containerStyle}>
        <Text style={styles.label}>{label}</Text>
        <View
          style={[
            styles.inputContainer,
            isFocused ? styles.inputContainerFocused : null,
            error ? styles.inputContainerError : null,
            props.editable === false ? styles.inputContainerDisabled : null,
          ]}
        >
          <TextInput
            ref={ref}
            {...props}
            style={[styles.input, style]}
            placeholderTextColor="#746D66"
            selectionColor="#E7643F"
            cursorColor="#1C1C1C"
            editable={props.editable}
            importantForAutofill="yes"
            secureTextEntry={secureTextEntry}
            onFocus={(event) => {
              setIsFocused(true);
              props.onFocus?.(event);
            }}
            onBlur={(event) => {
              setIsFocused(false);
              props.onBlur?.(event);
            }}
          />
          {isPasswordField ? (
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setIsPasswordVisible((current) => !current)}
              disabled={props.editable === false}
              accessibilityRole="button"
              accessibilityLabel={
                isPasswordVisible ? 'Ocultar contrasena' : 'Mostrar contrasena'
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.toggleText}>
                {isPasswordVisible ? 'Ocultar' : 'Mostrar'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  },
);

AuthTextInput.displayName = 'AuthTextInput';

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    color: '#1C1C1C',
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E3DC',
    borderRadius: 12,
    minHeight: 56,
    paddingLeft: 16,
    paddingRight: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainerFocused: {
    borderColor: '#E7643F',
    backgroundColor: '#FFFFFF',
  },
  inputContainerError: {
    borderColor: '#C46B6B',
    backgroundColor: '#FFFFFF',
  },
  inputContainerDisabled: {
    backgroundColor: '#F3F0EB',
    borderColor: '#D8D1C8',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    color: '#1C1C1C',
    fontSize: 15,
  },
  toggleButton: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 72,
    paddingVertical: 8,
    paddingLeft: 12,
  },
  toggleText: {
    color: '#E7643F',
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: '#B6472C',
    fontSize: 13,
    marginTop: -4,
    marginBottom: 12,
    lineHeight: 18,
  },
});
