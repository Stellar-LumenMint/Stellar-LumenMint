/**
 * NotificationService — Handles push notification registration,
 * permission management, and notification routing for the mobile app.
 *
 * Uses expo-notifications for cross-platform push support.
 */

import { Platform } from "react-native";

export interface NotificationPayload {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

export type NotificationPermissionStatus =
  | "granted"
  | "denied"
  | "undetermined";

export interface NotificationServiceState {
  pushToken: string | null;
  permissionStatus: NotificationPermissionStatus;
  lastNotification: NotificationPayload | null;
}

type StateListener = (state: NotificationServiceState) => void;

export class NotificationService {
  private static instance: NotificationService;
  private state: NotificationServiceState = {
    pushToken: null,
    permissionStatus: "undetermined",
    lastNotification: null,
  };
  private listeners = new Set<StateListener>();
  private notificationHandlers = new Set<
    (payload: NotificationPayload) => void
  >();
  private handlersSetup = false;
  private baseUrl: string;

  private constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? "http://localhost:3000";
  }

  /** Lazy getter for expo-notifications — avoids repeated require() calls */
  private get Notifications() {
    try {
      return require("expo-notifications");
    } catch {
      return null;
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  getState(): NotificationServiceState {
    return { ...this.state };
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onNotification(handler: (payload: NotificationPayload) => void): () => void {
    this.notificationHandlers.add(handler);
    return () => this.notificationHandlers.delete(handler);
  }

  /**
   * Request notification permissions from the user.
   * Returns the resulting permission status.
   */
  async requestPermissions(): Promise<NotificationPermissionStatus> {
    const Notifications = this.Notifications;
    if (!Notifications) {
      console.warn(
        "expo-notifications is not installed. Push notifications are disabled.",
      );
      return "undetermined";
    }

    try {

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        this.state.permissionStatus = status as NotificationPermissionStatus;
      } else {
        this.state.permissionStatus = "granted";
      }

      if (this.state.permissionStatus === "granted") {
        await this.registerForPushNotifications();
      }
    } catch {
      // expo-notifications not installed — degrade gracefully
      console.warn(
        "expo-notifications is not installed. Push notifications are disabled.",
      );
      this.state.permissionStatus = "undetermined";
    }

    this.notifyListeners();
    return this.state.permissionStatus;
  }

  /**
   * Register for push notifications and retrieve the Expo push token.
   */
  private async registerForPushNotifications(): Promise<void> {
    try {
      const Notifications = this.Notifications;
      if (!Notifications) return;

      // Android-specific channel setup
      if (Platform.OS === "android") {
        Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#4F46E5",
        });
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID,
      });

      this.state.pushToken = tokenData.data;
    } catch (err) {
      console.warn("Failed to register for push notifications:", err);
    }
  }

  /**
   * Set up notification handlers for foreground and background.
   * Call this once during app initialization.
   */
  setupHandlers(): void {
    // Guard against double-registration
    if (this.handlersSetup) return;

    const Notifications = this.Notifications;
    if (!Notifications) return;

    try {
      this.handlersSetup = true;

      // How to present notifications when app is in foreground
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Handle notification taps (foreground/background/killed)
      Notifications.addNotificationResponseReceivedListener((response: any) => {
        const payload: NotificationPayload = {
          title: response.notification.request.content.title,
          body: response.notification.request.content.body,
          data: response.notification.request.content.data,
        };
        this.state.lastNotification = payload;
        this.notifyListeners();
        this.notificationHandlers.forEach((h) => h(payload));
      });

      // Track received notifications while app is in foreground
      Notifications.addNotificationReceivedListener((notification: any) => {
        const payload: NotificationPayload = {
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notification.request.content.data,
        };
        this.state.lastNotification = payload;
        this.notifyListeners();
      });
    } catch {
      // expo-notifications not installed
    }
  }

  /**
   * Send the push token to the backend for targeting.
   * Call this after registration succeeds.
   */
  async syncTokenToBackend(): Promise<void> {
    if (!this.state.pushToken) return;

    try {
      await fetch(`${this.baseUrl}/api/v1/notifications/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: this.state.pushToken,
          platform: Platform.OS,
        }),
      });
    } catch {
      // Silently fail — will retry on next app launch
    }
  }

  private notifyListeners(): void {
    const snapshot = this.getState();
    this.listeners.forEach((l) => l(snapshot));
  }
}

export const notificationService = NotificationService.getInstance();
