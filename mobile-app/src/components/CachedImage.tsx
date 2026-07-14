import React, { useState, useCallback } from "react";
import {
  View,
  Image,
  ImageProps,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { LMTheme } from "../../constants/theme";

export interface CachedImageProps extends Omit<ImageProps, "source"> {
  source: { uri: string } | number;
  /** Fallback image shown when the primary source fails to load */
  fallbackSource?: { uri: string } | number;
  /** Show a loading indicator while the image loads */
  showLoader?: boolean;
  /** Custom loader color */
  loaderColor?: string;
  /** Width for the skeleton/loader container */
  width?: number;
  /** Height for the skeleton/loader container */
  height?: number;
}

/**
 * CachedImage — An enhanced Image component with:
 * - Automatic retry on error (up to 3 attempts)
 * - Fallback image when all retries fail
 * - Loading indicator
 * - Consistent sizing via explicit width/height
 */
export function CachedImage({
  source,
  fallbackSource,
  showLoader = true,
  loaderColor = LMTheme.colors.tealAlpha(0.4),
  width,
  height,
  style,
  onError,
  ...props
}: CachedImageProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const maxRetries = 3;

  const handleError = useCallback(
    (e: any) => {
      if (retryCount < maxRetries - 1) {
        // Retry by incrementing the key
        setRetryCount((c) => c + 1);
        setIsLoading(true);
        setHasError(false);
      } else {
        setHasError(true);
        setIsLoading(false);
      }
      onError?.(e);
    },
    [retryCount, onError],
  );

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const activeSource = hasError && fallbackSource ? fallbackSource : source;

  return (
    <View style={[width && height ? { width, height } : undefined, style]}>
      {showLoader && isLoading && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={loaderColor} />
        </View>
      )}

      <Image
        key={`retry-${retryCount}`}
        source={activeSource}
        style={[
          styles.image,
          width && height ? { width, height } : undefined,
          isLoading ? styles.hidden : undefined,
        ]}
        onError={handleError}
        onLoad={handleLoad}
        resizeMode="cover"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: LMTheme.colors.surface2,
    borderRadius: LMTheme.borderRadius.md,
    minHeight: 80,
  },
  image: {
    borderRadius: LMTheme.borderRadius.md,
  },
  hidden: {
    opacity: 0,
    position: "absolute",
  },
});
