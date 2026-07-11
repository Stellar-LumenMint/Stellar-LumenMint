import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { useAuthStore } from '@/stores/authStore';
import FormInput from './components/FormInput';
import { validateEmail, validatePassword } from './utils/validation';
import { LMTheme } from '@/constants/theme';
import { ChevronLeft } from 'lucide-react-native';

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailLogin'>;

export default function EmailLoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setUser, setError: setAuthError } = useAuthStore();

  const validateForm = (): boolean => {
    setEmailError(null);
    setPasswordError(null);

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error);
      return false;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error);
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      setAuthError(null);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUser({
        id: Date.now().toString(),
        email: email,
        createdAt: new Date(),
      });
      Alert.alert('Success', 'Logged in successfully!');
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to login';
      setAuthError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} color={LMTheme.colors.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>
          Sign in to continue to Stellar-LumenMint
        </Text>

        <View style={styles.form}>
          <FormInput
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) setEmailError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            error={emailError}
            testID="email-input"
          />

          <FormInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError(null);
            }}
            secureTextEntry
            autoCapitalize="none"
            editable={!isLoading}
            error={passwordError}
            testID="password-input"
          />

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => Alert.alert('Coming Soon', 'Password reset will be available soon.')}
            disabled={isLoading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
          testID="login-button"
        >
          {isLoading ? (
            <ActivityIndicator color={LMTheme.colors.textLight} />
          ) : (
            <Text style={styles.primaryButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.row}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('EmailRegister')}>
            <Text style={styles.linkText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LMTheme.colors.bg,
    paddingHorizontal: LMTheme.spacing.lg,
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: LMTheme.colors.tealAlpha(0.05),
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: LMTheme.colors.surface,
    borderWidth: 1,
    borderColor: LMTheme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: LMTheme.colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: LMTheme.colors.textSecondary,
    marginBottom: 32,
    lineHeight: 24,
  },
  form: {
    gap: 20,
  },
  forgotPassword: {
    alignItems: 'flex-end',
    marginTop: -8,
  },
  forgotPasswordText: {
    color: LMTheme.colors.teal,
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    paddingBottom: 32,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: LMTheme.colors.teal,
    borderRadius: LMTheme.borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: LMTheme.colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: LMTheme.colors.textMuted,
    fontSize: 14,
  },
  linkText: {
    color: LMTheme.colors.teal,
    fontSize: 14,
    fontWeight: '600',
  },
});
