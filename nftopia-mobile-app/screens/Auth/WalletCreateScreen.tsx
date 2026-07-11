import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { useAuthStore } from '@/stores/authStore';
import { StellarWalletService } from '@/src/services/stellar/wallet.service';
import { LMTheme } from '@/constants/theme';
import { ChevronLeft, Sparkles, Shield } from 'lucide-react-native';

type Props = NativeStackScreenProps<AuthStackParamList, 'WalletCreate'>;

export default function WalletCreateScreen({ navigation }: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuthStore();

  const handleCreateWallet = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    try {
      setIsLoading(true);
      const walletService = new StellarWalletService();
      const wallet = await walletService.createWallet(password);
      setUser({
        id: Date.now().toString(),
        walletAddress: wallet.wallet.publicKey,
        walletType: 'stellar',
        createdAt: new Date(),
      });
      Alert.alert(
        'Success',
        'Wallet created successfully! Make sure to backup your recovery phrase.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Wallet creation error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create wallet');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={isLoading}>
          <ChevronLeft size={20} color={LMTheme.colors.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.title}>Create New Wallet</Text>
        <Text style={styles.subtitle}>
          Set a secure password to encrypt your wallet
        </Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor={LMTheme.colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor={LMTheme.colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <View style={styles.warningBox}>
            <Shield size={20} color={LMTheme.colors.warning} />
            <Text style={styles.warningText}>
              Store your password securely. We cannot recover it if you lose it.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleCreateWallet}
          disabled={isLoading}
        >
          {isLoading ? (
            <Text style={styles.primaryButtonText}>Creating...</Text>
          ) : (
            <Text style={styles.primaryButtonText}>Create Wallet</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LMTheme.colors.bg, paddingHorizontal: LMTheme.spacing.lg },
  content: { flex: 1, justifyContent: 'center' },
  backButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: LMTheme.colors.surface, borderWidth: 1, borderColor: LMTheme.colors.border,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  title: { fontSize: 32, fontWeight: '700', color: LMTheme.colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: LMTheme.colors.textSecondary, marginBottom: 32, lineHeight: 24 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: LMTheme.colors.textPrimary },
  input: {
    backgroundColor: LMTheme.colors.surface,
    borderRadius: LMTheme.borderRadius.md,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: LMTheme.colors.border,
    color: LMTheme.colors.textPrimary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: LMTheme.colors.surface,
    padding: 16,
    borderRadius: LMTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: LMTheme.colors.border,
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: LMTheme.colors.textSecondary,
    lineHeight: 20,
  },
  footer: { paddingBottom: 32, gap: 12 },
  primaryButton: { backgroundColor: LMTheme.colors.teal, borderRadius: LMTheme.borderRadius.lg, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: LMTheme.colors.textLight, fontSize: 16, fontWeight: '600' },
});
