import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LMTheme } from '@/constants/theme';

export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <View style={styles.iconContainer}>
          <View style={styles.iconRing}>
            <View style={styles.iconInner}>
              <View style={styles.star} />
            </View>
          </View>
        </View>
        <Animated.Text style={[styles.title, { opacity }]}>
          Stellar<Text style={styles.titleAccent}>-LumenMint</Text>
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, { opacity }]}>
          NFT Marketplace
        </Animated.Text>
      </Animated.View>

      <View style={styles.loadingContainer}>
        <View style={styles.loadingDot} />
      </View>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: LMTheme.colors.bg,
  },
  glowTop: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: LMTheme.colors.tealAlpha(0.06),
  },
  glowBottom: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: LMTheme.colors.violetAlpha(0.06),
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: LMTheme.colors.tealAlpha(0.3),
    justifyContent: 'center',
    alignItems: 'center',
    ...LMTheme.shadow.glow,
  },
  iconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: LMTheme.colors.surface,
    borderWidth: 1.5,
    borderColor: LMTheme.colors.tealAlpha(0.4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: {
    width: 20,
    height: 20,
    backgroundColor: LMTheme.colors.teal,
    transform: [{ rotate: '45deg' }],
    borderRadius: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: LMTheme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: LMTheme.colors.teal,
    fontWeight: '300',
  },
  subtitle: {
    fontSize: 15,
    color: LMTheme.colors.textSecondary,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: LMTheme.colors.teal,
    opacity: 0.6,
  },
});
