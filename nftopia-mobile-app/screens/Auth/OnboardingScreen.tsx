import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Linking } from 'react-native';
import AuthButton from './components/AuthButton';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { LMTheme } from '@/constants/theme';
import { Sparkles, Shield, Zap } from 'lucide-react-native';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const features = [
    { icon: Sparkles, text: 'Create & Collect NFTs', desc: 'Mint, trade, and manage digital assets on Stellar' },
    { icon: Shield, text: 'Secure & Decentralized', desc: 'Bank-grade security with Soroban smart contracts' },
    { icon: Zap, text: 'Fast & Low Fees', desc: 'Lightning-fast transactions with minimal costs' },
  ];

  return (
    <View style={styles.container}>
      {/* Ambient glow */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Logo area */}
        <View style={styles.logoContainer}>
          <View style={styles.logoRing}>
            <View style={styles.logoInner}>
              <Text style={styles.logoText}>✦</Text>
            </View>
          </View>
        </View>

        <Text style={styles.title}>
          Welcome to{'\n'}
          Stellar<Text style={styles.titleAccent}>-LumenMint</Text>
        </Text>
        <Text style={styles.subtitle}>
          Your gateway to the world of NFTs on Stellar
        </Text>

        {/* Features */}
        <View style={styles.features}>
          {features.map(({ icon: Icon, text, desc }, i) => (
            <Animated.View
              key={text}
              style={[
                styles.feature,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.featureIcon}>
                <Icon size={20} color={LMTheme.colors.teal} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{text}</Text>
                <Text style={styles.featureDesc}>{desc}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <AuthButton
          title="Get Started"
          onPress={() => navigation.navigate('WalletSelection')}
          variant="primary"
        />
        <AuthButton
          title="Sign In with Email"
          onPress={() => navigation.navigate('EmailLogin')}
          variant="outline"
        />
        <TouchableOpacity
          onPress={() => Linking.openURL('https://stellar-lumenmint.io/learn-more')}
          style={styles.learnMore}
        >
          <Text style={styles.learnMoreText}>Learn More →</Text>
        </TouchableOpacity>
      </Animated.View>
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
    backgroundColor: LMTheme.colors.tealAlpha(0.06),
  },
  glowBottom: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: LMTheme.colors.violetAlpha(0.06),
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: LMTheme.colors.tealAlpha(0.25),
    justifyContent: 'center',
    alignItems: 'center',
    ...LMTheme.shadow.glow,
  },
  logoInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: LMTheme.colors.surface,
    borderWidth: 1.5,
    borderColor: LMTheme.colors.tealAlpha(0.3),
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 28,
    color: LMTheme.colors.teal,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: LMTheme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: LMTheme.colors.teal,
    fontWeight: '300',
  },
  subtitle: {
    fontSize: 16,
    color: LMTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  features: {
    gap: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: LMTheme.borderRadius.lg,
    backgroundColor: LMTheme.colors.surface,
    borderWidth: 1,
    borderColor: LMTheme.colors.border,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: LMTheme.colors.tealAlpha(0.1),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LMTheme.colors.tealAlpha(0.15),
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: LMTheme.colors.textPrimary,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: LMTheme.colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    paddingBottom: 32,
    gap: 12,
  },
  learnMore: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  learnMoreText: {
    color: LMTheme.colors.teal,
    fontSize: 15,
    fontWeight: '500',
  },
});
