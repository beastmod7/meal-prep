import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type BadgeVariant =
  | "free"
  | "late"
  | "locked"
  | "preparing"
  | "delivered"
  | "cancelled"
  | "active"
  | "paused"
  | "expired"
  | "premium"
  | "included";

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
  small?: boolean;
}

const BADGE_CONFIG: Record<
  BadgeVariant,
  { bg: string; text: string; defaultLabel: string }
> = {
  free: { bg: "#DCFCE7", text: "#166534", defaultLabel: "Free cancel" },
  late: { bg: "#FEF3C7", text: "#1E3A8A", defaultLabel: "Late fee" },
  locked: { bg: "#FEE2E2", text: "#991B1B", defaultLabel: "Locked" },
  preparing: { bg: "#EDE9FE", text: "#4C1D95", defaultLabel: "Preparing" },
  delivered: { bg: "#F0FDF4", text: "#166534", defaultLabel: "Delivered" },
  cancelled: { bg: "#F4F4F5", text: "#71717A", defaultLabel: "Cancelled" },
  active: { bg: "#DCFCE7", text: "#166534", defaultLabel: "Active" },
  paused: { bg: "#FEF3C7", text: "#1E3A8A", defaultLabel: "Paused" },
  expired: { bg: "#F4F4F5", text: "#71717A", defaultLabel: "Expired" },
  premium: { bg: "#FEF9C3", text: "#1E3A8A", defaultLabel: "1 credit + extra" },
  included: { bg: "#DCFCE7", text: "#166534", defaultLabel: "Included in pass" },
};

export default function StatusBadge({
  variant,
  label,
  small = false,
}: StatusBadgeProps) {
  const config = BADGE_CONFIG[variant];

  return (
    <View
      style={[
        styles.badge,
        small && styles.small,
        { backgroundColor: config.bg },
      ]}
    >
      <Text
        style={[
          styles.label,
          small && styles.smallLabel,
          { color: config.text },
        ]}
      >
        {label ?? config.defaultLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
  smallLabel: {
    fontSize: 11,
  },
});