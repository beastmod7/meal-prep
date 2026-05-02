import { Alert, Platform } from "react-native";

type NotifType =
  | "meal_reminder"
  | "cancel_window"
  | "order_preparing"
  | "order_out"
  | "order_delivered"
  | "subscription_expiring"
  | "payment_success";

interface DemoNotif {
  title: string;
  body: string;
}

function buildNotif(
  type: NotifType,
  restaurantName: string,
  extra?: { slot?: string; days?: number; daysLeft?: number }
): DemoNotif {
  const slotLabel =
    extra?.slot === "both"
      ? "Lunch & Dinner"
      : extra?.slot === "lunch"
        ? "Lunch"
        : extra?.slot === "dinner"
          ? "Dinner"
          : "Meal";

  switch (type) {
    case "meal_reminder":
      return {
        title: `🍱 ${slotLabel} reminder`,
        body: `Your ${slotLabel.toLowerCase()} from ${restaurantName} arrives in 30 mins. Get ready!`,
      };
    case "cancel_window":
      return {
        title: "⏰ Free cancel window closing",
        body: `Last chance to cancel tomorrow's meal from ${restaurantName} for free. Deadline: 10 PM tonight.`,
      };
    case "order_preparing":
      return {
        title: "👨‍🍳 Your meal is being prepared",
        body: `${restaurantName} has started cooking your order. Delivery in ~40 mins.`,
      };
    case "order_out":
      return {
        title: "🛵 Out for delivery!",
        body: `Your meal from ${restaurantName} is on its way. ETA: 15–20 mins.`,
      };
    case "order_delivered":
      return {
        title: "✅ Meal delivered!",
        body: `Your order from ${restaurantName} has been delivered. Enjoy! 😊`,
      };
    case "subscription_expiring":
      return {
        title: "📅 Subscription running low",
        body: `Only ${extra?.daysLeft} day${extra?.daysLeft === 1 ? "" : "s"} left on your ${restaurantName} meal pass. Renew soon!`,
      };
    case "payment_success":
      return {
        title: "🎉 Subscription activated!",
        body: `Your ${extra?.days}-day ${slotLabel} pass at ${restaurantName} is live. Meals are auto-scheduled!`,
      };
  }
}

function showDemoNotif(notif: DemoNotif, delayMs = 0): void {
  if (Platform.OS === "web") return;
  const show = () => Alert.alert(notif.title, notif.body, [{ text: "OK" }]);
  if (delayMs > 0) {
    setTimeout(show, delayMs);
  } else {
    show();
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  return Platform.OS !== "web";
}

export async function notifyMealReminder(
  restaurantName: string,
  slot: "lunch" | "dinner" | "both"
): Promise<void> {
  showDemoNotif(buildNotif("meal_reminder", restaurantName, { slot }), 500);
}

export async function notifyCancelWindowClosing(
  restaurantName: string
): Promise<void> {
  showDemoNotif(buildNotif("cancel_window", restaurantName), 800);
}

export async function notifyOrderPreparing(
  restaurantName: string
): Promise<void> {
  showDemoNotif(buildNotif("order_preparing", restaurantName), 600);
}

export async function notifyOrderOutForDelivery(
  restaurantName: string
): Promise<void> {
  showDemoNotif(buildNotif("order_out", restaurantName), 600);
}

export async function notifyOrderDelivered(
  restaurantName: string
): Promise<void> {
  showDemoNotif(buildNotif("order_delivered", restaurantName), 600);
}

export async function notifySubscriptionExpiring(
  restaurantName: string,
  daysLeft: number
): Promise<void> {
  showDemoNotif(
    buildNotif("subscription_expiring", restaurantName, { daysLeft }),
    500
  );
}

export async function notifyPaymentSuccess(
  restaurantName: string,
  slot: string,
  days: number
): Promise<void> {
  showDemoNotif(
    buildNotif("payment_success", restaurantName, { slot, days }),
    300
  );
}

export async function triggerAllDemoNotifications(
  restaurantName: string
): Promise<void> {
  const notifs: DemoNotif[] = [
    buildNotif("meal_reminder", restaurantName, { slot: "lunch" }),
    buildNotif("cancel_window", restaurantName),
    buildNotif("order_preparing", restaurantName),
    buildNotif("order_out", restaurantName),
    buildNotif("order_delivered", restaurantName),
    buildNotif("subscription_expiring", restaurantName, { daysLeft: 3 }),
  ];
  notifs.forEach((n, i) => showDemoNotif(n, (i + 1) * 2000));
}
