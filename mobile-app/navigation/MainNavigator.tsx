import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LMTheme } from '@/constants/theme';
import { Sparkles } from 'lucide-react-native';

export type MainStackParamList = {
  Home: undefined;
  Marketplace: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

// Placeholder screen for development
function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.glowCenter} />
      <Sparkles size={32} color={LMTheme.colors.tealAlpha(0.3)} style={styles.icon} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Coming Soon</Text>
      <View style={styles.divider} />
      <Text style={styles.hint}>
        This feature is being built{'\n'}with Stellar-LumenMint
      </Text>
    </View>
  );
}

export default function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: LMTheme.colors.bg },
      }}
    >
      <Stack.Screen name="Home">
        {(props) => <PlaceholderScreen {...props} title="Home" />}
      </Stack.Screen>
      <Stack.Screen name="Marketplace">
        {(props) => <PlaceholderScreen {...props} title="Marketplace" />}
      </Stack.Screen>
      <Stack.Screen name="Profile">
        {(props) => <PlaceholderScreen {...props} title="Profile" />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: LMTheme.colors.bg,
    padding: 24,
  },
  glowCenter: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: LMTheme.colors.tealAlpha(0.04),
  },
  icon: {
    marginBottom: 16,
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
    color: LMTheme.colors.teal,
    fontWeight: '500',
    marginBottom: 24,
  },
  divider: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: LMTheme.colors.tealAlpha(0.3),
    marginBottom: 24,
  },
  hint: {
    fontSize: 14,
    color: LMTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
