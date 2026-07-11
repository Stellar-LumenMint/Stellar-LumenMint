import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, GestureResponderEvent } from 'react-native';
import { LMTheme } from '@/constants/theme';

interface AuthButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
}

export default function AuthButton({
  title,
  onPress,
  style,
  textStyle,
  icon,
  variant = 'primary',
  disabled = false,
}: AuthButtonProps) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primary;
      case 'secondary':
        return styles.secondary;
      case 'outline':
        return styles.outline;
      default:
        return styles.primary;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return LMTheme.colors.textLight;
      case 'secondary':
        return LMTheme.colors.textPrimary;
      case 'outline':
        return LMTheme.colors.teal;
      default:
        return LMTheme.colors.textLight;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyle(),
        style,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      {icon && <>{icon}</>}
      <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: LMTheme.borderRadius.lg,
    paddingVertical: 16,
    marginVertical: 4,
  },
  primary: {
    backgroundColor: LMTheme.colors.teal,
  },
  secondary: {
    backgroundColor: LMTheme.colors.surface,
    borderWidth: 1,
    borderColor: LMTheme.colors.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: LMTheme.colors.tealAlpha(0.3),
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
