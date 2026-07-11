import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { useAuthStore } from '@/stores/authStore';
import { StellarWalletService } from '@/src/services/stellar/wallet.service';
import { LMTheme } from '@/constants/theme';
import { ChevronLeft, Shield } from 'lucide-react-native';

type Props = NativeStackScreenProps<AuthStackParamList, 'WalletImport'>;

export default function WalletImportScreen({ navigation }: Props) {
  const [secretKey, setSecretKey] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuthStore();

  const handleImportWallet = async () => {
    if (!secretKey || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      const walletService = new StellarWalletService();
      const wallet = await walletService.importFromSecretKey(secretKey, password);
      setUser({
        id: Date.now().toString(),
        walletAddress: wallet.publicKey,
        walletType: 'stellar',
        createdAt: new Date(),
      });
      Alert.alert('Success', 'Wallet imported successfully!');
    } catch (error) {
      console.error('Wallet import error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to import wallet');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={isLoading}>
        <ChevronLeft size={20} color={LMTheme.colors.textSecondary} />
      </TouchableOpacity>

      <Text style={styles.title}>Import Wallet</Text>
      <Text style={styles.subtitle}>
        Enter your Stellar secret key to import your wallet
      </Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Secret Key</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter your secret key (starts with S)"
            placeholderTextColor={LMTheme.colors.textMuted}
            value={secretKey}
            onChangeText={setSecretKey}
            secureTextEntry
            autoCapitalize="none"
            multiline
            numberOfLines={3}
            editable={!isLoading}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Create a password to encrypt your wallet"
            placeholderTextColor={LMTheme.colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!isLoading}
          />
        </View>

        <View style={styles.warningBox}>
          <Shield size={20} color={LMTheme.colors.info} />
          <Text style={styles.warningText}>
            Your secret key is stored encrypted on your device. Never share it with anyone.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleImportWallet}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>
            {isLoading ? 'Importing...' : 'Import Wallet'}
          </Text>
        </TouchableOpacity>
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
  subtitle: { fontSize: 16, color: LMTheme.colors.textSecondary, marginBottom: 16, lineHeight: 24 },
  form: { gap: 20, marginTop: 12 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: LMTheme.colors.textPrimary },
  input: {
    backgroundColor: LMTheme.colors.surface, borderRadius: LMTheme.borderRadius.md,
    paddingVertical: 16, paddingHorizontal: 16, fontSize: 16,
    borderWidth: 1, borderColor: LMTheme.colors.border,
    color: LMTheme.colors.textPrimary,
  },
  textArea: { fontFamily: 'monospace', fontSize: 14, minHeight: 80 },
  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: LMTheme.colors.surface, padding: 16,
    borderRadius: LMTheme.borderRadius.md, borderWidth: 1, borderColor: LMTheme.colors.border,
    marginTop: 8,
  },
  warningText: { flex: 1, fontSize: 14, color: LMTheme.colors.textSecondary, lineHeight: 20 },
  footer: { paddingBottom: 32, gap: 12, marginTop: 12 },
  primaryButton: { backgroundColor: LMTheme.colors.teal, borderRadius: LMTheme.borderRadius.lg, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: LMTheme.colors.textLight, fontSize: 16, fontWeight: '600' },
});
