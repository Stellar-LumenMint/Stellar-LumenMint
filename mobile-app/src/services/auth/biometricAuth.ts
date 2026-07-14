/**
 * BiometricAuthService — Provides biometric (Face ID / Touch ID / fingerprint)
 * authentication for the mobile app using expo-local-authentication.
 *
 * Degrades gracefully when biometrics are unavailable or not enrolled.
 */

import { Platform } from "react-native";

export type BiometricType = "fingerprint" | "facial" | "iris" | "none";

export interface BiometricAvailability {
  isAvailable: boolean;
  biometricType: BiometricType;
  isEnrolled: boolean;
  error?: string;
}

export class BiometricAuthService {
  private static instance: BiometricAuthService;

  private constructor() {}

  static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  /**
   * Check if biometric authentication is available and enrolled on the device.
   */
  async isAvailable(): Promise<BiometricAvailability> {
    try {
      const LocalAuthentication = require("expo-local-authentication");

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return {
          isAvailable: false,
          biometricType: "none",
          isEnrolled: false,
          error: "No biometric hardware detected",
        };
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();

      let biometricType: BiometricType = "none";
      if (
        supportedTypes.includes(
          LocalAuthentication.AuthenticationType.FINGERPRINT,
        )
      ) {
        biometricType = "fingerprint";
      } else if (
        supportedTypes.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
        )
      ) {
        biometricType = "facial";
      } else if (
        supportedTypes.includes(
          LocalAuthentication.AuthenticationType.IRIS,
        )
      ) {
        biometricType = "iris";
      }

      return {
        isAvailable: true,
        biometricType,
        isEnrolled,
      };
    } catch {
      return {
        isAvailable: false,
        biometricType: "none",
        isEnrolled: false,
        error: "Failed to check biometric availability",
      };
    }
  }

  /**
   * Prompt the user to authenticate with biometrics.
   * Returns true if authentication succeeded, false otherwise.
   */
  async authenticate(
    promptMessage = "Authenticate to continue",
  ): Promise<boolean> {
    try {
      const LocalAuthentication = require("expo-local-authentication");

      const { isAvailable, isEnrolled } = await this.isAvailable();
      if (!isAvailable || !isEnrolled) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: "Use passcode",
        disableDeviceFallback: Platform.OS === "android",
        cancelLabel: "Cancel",
      });

      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Get a human-readable name for the biometric type on this device.
   */
  async getBiometricTypeName(): Promise<string> {
    const { biometricType } = await this.isAvailable();

    switch (biometricType) {
      case "facial":
        return Platform.OS === "ios" ? "Face ID" : "Face Recognition";
      case "fingerprint":
        return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
      case "iris":
        return "Iris";
      default:
        return "Biometric";
    }
  }
}

export const biometricAuth = BiometricAuthService.getInstance();
