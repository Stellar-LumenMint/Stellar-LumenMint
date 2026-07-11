import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { useAuthStore } from '@/stores/authStore';
import FormInput from './components/FormInput';
import PasswordStrengthIndicator from './components/PasswordStrengthIndicator';
import { validateEmail, validatePassword, validateUsername, validateConfirmPassword } from './utils/validation';
import { LMTheme } from '@/constants/theme';
import { ChevronLeft } from 'lucide-react-native';

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailRegister'>;

export default function EmailRegisterScreen({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setUser, setError: setAuthError } = useAuthStore();

  const validateForm = (): boolean => {
    setUsernameError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);

    let isValid = true;
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) { setUsernameError(usernameValidation.error); isValid = false; }
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) { setEmailError(emailValidation.error); isValid = false; }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) { setPasswordError(passwordValidation.error); isValid = false; }
    const confirmPasswordValidation = validateConfirmPassword(password, confirmPassword);
    if (!confirmPasswordValidation.isValid) { setConfirmPasswordError(confirmPasswordValidation.error); isValid = false; }
    return isValid;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    try {
      setIsLoading(true);
      setAuthError(null);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUser({ id: Date.now().toString(), email, createdAt: new Date() });
      Alert.alert('Success', 'Account created successfully!');
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to register';
      setAuthError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <ChevronLeft size={20} color={LMTheme.colors.textSecondary} />
      </TouchableOpacity>

      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>
        Sign up to start your NFT journey on Stellar
      </Text>

      <View style={styles.form}>
        <FormInput
          label="Username"
          placeholder="Choose a username"
          value={username}
          onChangeText={(text) => { setUsername(text); if (usernameError) setUsernameError(null); }}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
          error={usernameError}
          testID="username-input"
        />
        <FormInput
          label="Email"
          placeholder="Enter your email"
          value={email}
          onChangeText={(text) => { setEmail(text); if (emailError) setEmailError(null); }}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading}
          error={emailError}
          testID="email-input"
        />
        <View style={styles.inputGroup}>
          <FormInput
            label="Password"
            placeholder="Create a password"
            value={password}
            onChangeText={(text) => { setPassword(text); if (passwordError) setPasswordError(null); }}
            secureTextEntry
            autoCapitalize="none"
            editable={!isLoading}
            error={passwordError}
            testID="password-input"
          />
          <PasswordStrengthIndicator password={password} />
        </View>
        <FormInput
          label="Confirm Password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChangeText={(text) => { setConfirmPassword(text); if (confirmPasswordError) setConfirmPasswordError(null); }}
          secureTextEntry
          autoCapitalize="none"
          editable={!isLoading}
          error={confirmPasswordError}
          testID="confirm-password-input"
        />
        <View style={styles.termsBox}>
          <Text style={styles.termsText}>
            By creating an account, you agree to our{' '}
            <Text style={styles.linkText}>Terms of Service</Text> and{' '}
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
          testID="register-button"
        >
          {isLoading ? (
            <ActivityIndicator color={LMTheme.colors.textLight} />
          ) : (
            <Text style={styles.primaryButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.row}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('EmailLogin')}>
            <Text style={styles.linkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LMTheme.colors.bg },
  content: { padding: LMTheme.spacing.lg, paddingTop: 60, gap: 20 },
  backButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: LMTheme.colors.surface, borderWidth: 1, borderColor: LMTheme.colors.border,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  title: { fontSize: 32, fontWeight: '700', color: LMTheme.colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: LMTheme.colors.textSecondary, lineHeight: 24 },
  form: { gap: 20, marginTop: 12 },
  inputGroup: { gap: 8 },
  termsBox: {
    backgroundColor: LMTheme.colors.surface, padding: 16, borderRadius: LMTheme.borderRadius.md,
    borderWidth: 1, borderColor: LMTheme.colors.border,
  },
  termsText: { fontSize: 13, color: LMTheme.colors.textMuted, lineHeight: 20, textAlign: 'center' },
  linkText: { color: LMTheme.colors.teal, fontWeight: '600' },
  footer: { paddingBottom: 32, gap: 16, marginTop: 12 },
  primaryButton: { backgroundColor: LMTheme.colors.teal, borderRadius: LMTheme.borderRadius.lg, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: LMTheme.colors.textLight, fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: LMTheme.colors.textMuted, fontSize: 14 },
});
