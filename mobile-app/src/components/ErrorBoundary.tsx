import React, { Component, type ErrorInfo, type ReactNode } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { LMTheme } from "../../constants/theme";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  FallbackComponent?: React.ComponentType<{
    error: Error;
    resetError: () => void;
  }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
  showRetry?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { componentName = "Unknown", onError } = this.props;

    if (__DEV__) {
      console.error(`[ErrorBoundary] ${componentName}:`, error);
      console.error("Component stack:", errorInfo.componentStack);
    }

    onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error } = this.state;
    const { fallback, FallbackComponent, showRetry = true } = this.props;

    if (error && FallbackComponent) {
      return (
        <FallbackComponent error={error} resetError={this.handleReset} />
      );
    }

    if (fallback !== undefined) {
      return fallback;
    }

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {error?.message || "An unexpected error occurred."}
          </Text>

          {showRetry && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleReset}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Retry"
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}

          {__DEV__ && error?.stack && (
            <ScrollView
              style={styles.stackContainer}
              horizontal={false}
              accessibilityLabel="Error details"
            >
              <Text style={styles.stackText}>{error.stack}</Text>
            </ScrollView>
          )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: LMTheme.colors.bg,
    padding: 24,
  },
  card: {
    backgroundColor: LMTheme.colors.surface,
    borderRadius: LMTheme.borderRadius["2xl"],
    padding: 32,
    alignItems: "center",
    maxWidth: 360,
    width: "100%",
    ...LMTheme.shadow.md,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: LMTheme.fontSize.xl,
    fontWeight: LMTheme.fontWeight.bold,
    color: LMTheme.colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: LMTheme.fontSize.md,
    color: LMTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: LMTheme.colors.indigo,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: LMTheme.borderRadius.lg,
    minWidth: 120,
    alignItems: "center",
  },
  retryText: {
    color: LMTheme.colors.textLight,
    fontSize: LMTheme.fontSize.md,
    fontWeight: LMTheme.fontWeight.semibold,
  },
  stackContainer: {
    marginTop: 24,
    maxHeight: 200,
    width: "100%",
    backgroundColor: LMTheme.colors.surface2,
    borderRadius: LMTheme.borderRadius.md,
    padding: 12,
  },
  stackText: {
    fontSize: 10,
    color: LMTheme.colors.textMuted,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
