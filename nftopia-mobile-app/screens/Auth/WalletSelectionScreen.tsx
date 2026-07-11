import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AuthButton from './components/AuthButton';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { LMTheme } from '@/constants/theme';
import { Sparkles, Download, ChevronLeft } from 'lucide-react-native';

type Props = NativeStackScreenProps<AuthStackParamList, 'WalletSelection'>;

export default function WalletSelectionScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <ChevronLeft size={20} color={LMTheme.colors.textSecondary} />
      </TouchableOpacity>

      <Text style={styles.title}>Choose Your Wallet</Text>
      <Text style={styles.subtitle}>
        Select how you'd like to get started with Stellar-LumenMint
      </Text>

      <View style={styles.wallets}>
        {/* Create New Wallet */}
        <TouchableOpacity
          style={styles.walletCard}
          onPress={() => navigation.navigate('WalletCreate')}
          activeOpacity={0.8}
        >
          <View style={styles.walletIcon}>
            <Sparkles size={24} color={LMTheme.colors.teal} />
          </View>
          <View style={styles.walletInfo}>
            <Text style={styles.walletName}>Create New Wallet</Text>
            <Text style={styles.walletDescription}>
              Generate a new Stellar wallet with a secure recovery phrase
            </Text>
          </View>
        </TouchableOpacity>

        {/* Import Existing Wallet */}
        <TouchableOpacity
          style={styles.walletCard}
          onPress={() => navigation.navigate('WalletImport')}
          activeOpacity={0.8}
        >
          <View style={[styles.walletIcon, { backgroundColor: LMTheme.colors.violetAlpha(0.1), borderColor: LMTheme.colors.violetAlpha(0.2) }]}>
            <Download size={24} color={LMTheme.colors.violet} />
          </View>
          <View style={styles.walletInfo}>
            <Text style={styles.walletName}>Import Wallet</Text>
            <Text style={styles.walletDescription}>
              Import an existing wallet using your secret key
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.line} />
      </View>

      <AuthButton
        title="Sign in with Email"
        onPress={() => navigation.navigate('EmailLogin')}
        variant="outline"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LMTheme.colors.bg,
  },
  content: {
    padding: LMTheme.spacing.lg,
    paddingTop: 60,
    gap: 20,
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
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: LMTheme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: LMTheme.colors.textSecondary,
    lineHeight: 24,
  },
  wallets: {
    gap: 16,
    marginTop: 12,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: LMTheme.colors.surface,
    borderRadius: LMTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: LMTheme.colors.border,
    gap: 16,
  },
  walletIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: LMTheme.colors.tealAlpha(0.1),
    borderWidth: 1,
    borderColor: LMTheme.colors.tealAlpha(0.2),
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: 17,
    fontWeight: '600',
    color: LMTheme.colors.textPrimary,
    marginBottom: 4,
  },
  walletDescription: {
    fontSize: 13,
    color: LMTheme.colors.textSecondary,
    lineHeight: 18,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: LMTheme.colors.divider,
  },
  orText: {
    marginHorizontal: 16,
    color: LMTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
});
