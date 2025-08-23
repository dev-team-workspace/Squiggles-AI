
"use client"

import { useAuthContext } from "@/providers/firebase-provider";
import type { NotificationType } from "@/types";
import type { ToastActionElement } from "@/components/ui/toast"; // Kept for potential future use if action elements are needed

// This hook now acts as a wrapper around the FirebaseProvider's addNotification function.
// It no longer manages its own state or dispatches actions for visual toasts.

export function useToast() {
  const { addNotification } = useAuthContext();

  const toast = ({
    title,
    description,
    variant,
    action, // Action is not directly used by addNotification but kept for API consistency
    ...props // Other toast props are not directly used by this simplified version
  }: {
    title: React.ReactNode;
    description?: React.ReactNode;
    variant?: NotificationType | 'destructive'; // Map destructive to error
    action?: ToastActionElement;
    duration?: number; // Duration is not used by the new notification system
  }) => {
    let type: NotificationType = 'default';
    if (variant === 'destructive') {
      type = 'error';
    } else if (variant) {
      type = variant;
    }
    
    // Call the centralized addNotification function from FirebaseProvider
    addNotification(title, description, type);

    // Return a mock object for API compatibility if any code expects dismiss/update.
    // These will be no-ops in this new system.
    return {
      id: Date.now().toString(), // Dummy ID
      dismiss: () => {},
      update: () => {},
    };
  };

  // The dismiss function from the original useToast is no longer relevant here
  // as notifications are managed via FirebaseProvider's context.
  // Consumers should use markNotificationAsRead or markAllNotificationsAsRead from useAuthContext.

  return {
    toast,
    // No longer exposing toasts array or direct dismiss from here.
    // Consumers should get notifications from useAuthContext().notifications.
  };
}
