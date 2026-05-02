import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { MEALS, RESTAURANTS } from "@/constants/mockData";

export interface User {
  id: string;
  name: string;
  phone: string;
  campusId: string;
  campusName: string;
  foodPreference: "veg" | "non-veg" | "jain" | "egg";
  address: string;
}

export interface RestaurantSubscription {
  id: string;
  restaurantId: string;
  restaurantName: string;
  slot: "lunch" | "dinner" | "both";
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  pricePerDay: number;
  totalPaid: number;
  startDate: string;
  endDate: string;
  status: "active" | "paused" | "cancelled" | "completed" | "refund_requested";
  pausedUntil?: string;
  lateCancellationFees: number;
}

export interface MealOrder {
  id: string;
  subscriptionId: string;
  restaurantId: string;
  restaurantName: string;
  mealId: string;
  mealName: string;
  scheduledDate: string;
  slot: "lunch" | "dinner";
  status:
    | "scheduled"
    | "preparing"
    | "delivered"
    | "cancelled_free"
    | "cancelled_late"
    | "cancelled_full";
  freeCancelUntil: string;
  lateCancelUntil: string;
  pricePerDay: number;
}

export interface LedgerEntry {
  id: string;
  subscriptionId?: string;
  restaurantName?: string;
  type:
    | "subscription_purchase"
    | "meal_used"
    | "free_cancel"
    | "late_cancel"
    | "full_charge"
    | "refund";
  description: string;
  amountDelta: number;
  createdAt: string;
}

interface SubscribeParams {
  restaurantId: string;
  restaurantName: string;
  slot: "lunch" | "dinner" | "both";
  days: number;
  pricePerDay: number;
  defaultMealId: string;
  defaultMealName: string;
}

interface AppContextType {
  isLoading: boolean;
  isOnboarded: boolean;
  user: User | null;
  subscriptions: RestaurantSubscription[];
  orders: MealOrder[];
  ledger: LedgerEntry[];
  setOnboarded: () => Promise<void>;
  setUser: (user: User) => Promise<void>;
  subscribe: (params: SubscribeParams) => Promise<void>;
  cancelSubscription: (
    subscriptionId: string
  ) => Promise<{ refundAmount: number }>;
  pauseSubscription: (
    subscriptionId: string,
    pauseDays: number
  ) => Promise<void>;
  cancelOrder: (
    orderId: string
  ) => Promise<{ type: "free" | "late" | "full"; fee: number }>;
  getOrderCancelStatus: (
    order: MealOrder
  ) => "free" | "late" | "full" | "none";
  refreshOrders: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  IS_ONBOARDED: "mp_is_onboarded",
  USER: "mp_user",
  SUBSCRIPTIONS: "mp_subscriptions",
  ORDERS: "mp_orders",
  LEDGER: "mp_ledger",
};

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function makeOrdersForSub(
  sub: RestaurantSubscription,
  mealId: string,
  mealName: string
): MealOrder[] {
  const result: MealOrder[] = [];
  const today = dateStr(new Date());
  const start = new Date(sub.startDate + "T12:00:00");

  for (let i = 0; i < sub.totalDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const ds = dateStr(d);

    let status: MealOrder["status"] = "scheduled";
    if (ds < today) status = "delivered";

    const prevDay = new Date(d);
    prevDay.setDate(prevDay.getDate() - 1);
    prevDay.setHours(22, 0, 0, 0);

    if (sub.slot === "both") {
      const lunchCutoff = new Date(d);
      lunchCutoff.setHours(9, 0, 0, 0);
      result.push({
        id: `${sub.id}_d${i}_l`,
        subscriptionId: sub.id,
        restaurantId: sub.restaurantId,
        restaurantName: sub.restaurantName,
        mealId,
        mealName,
        scheduledDate: ds,
        slot: "lunch",
        status,
        freeCancelUntil: prevDay.toISOString(),
        lateCancelUntil: lunchCutoff.toISOString(),
        pricePerDay: Math.round(sub.pricePerDay / 2),
      });
      const dinnerCutoff = new Date(d);
      dinnerCutoff.setHours(15, 0, 0, 0);
      result.push({
        id: `${sub.id}_d${i}_d`,
        subscriptionId: sub.id,
        restaurantId: sub.restaurantId,
        restaurantName: sub.restaurantName,
        mealId,
        mealName,
        scheduledDate: ds,
        slot: "dinner",
        status,
        freeCancelUntil: prevDay.toISOString(),
        lateCancelUntil: dinnerCutoff.toISOString(),
        pricePerDay: Math.round(sub.pricePerDay / 2),
      });
    } else {
      const mealDay = new Date(d);
      mealDay.setHours(sub.slot === "lunch" ? 9 : 15, 0, 0, 0);
      result.push({
        id: `${sub.id}_d${i}`,
        subscriptionId: sub.id,
        restaurantId: sub.restaurantId,
        restaurantName: sub.restaurantName,
        mealId,
        mealName,
        scheduledDate: ds,
        slot: sub.slot,
        status,
        freeCancelUntil: prevDay.toISOString(),
        lateCancelUntil: mealDay.toISOString(),
        pricePerDay: sub.pricePerDay,
      });
    }
  }
  return result;
}

function makeSeedData() {
  const today = new Date();
  const sub1Start = new Date(today);
  sub1Start.setDate(today.getDate() - 3);
  const sub1End = new Date(sub1Start);
  sub1End.setDate(sub1Start.getDate() + 19);

  const sub2Start = new Date(today);
  sub2Start.setDate(today.getDate() - 4);
  const sub2End = new Date(sub2Start);
  sub2End.setDate(sub2Start.getDate() + 9);

  const sub1: RestaurantSubscription = {
    id: "sub1",
    restaurantId: "r1",
    restaurantName: "Green Bowl",
    slot: "lunch",
    totalDays: 20,
    usedDays: 3,
    remainingDays: 17,
    pricePerDay: 179,
    totalPaid: 3580,
    startDate: dateStr(sub1Start),
    endDate: dateStr(sub1End),
    status: "active",
    lateCancellationFees: 0,
  };

  const sub2: RestaurantSubscription = {
    id: "sub2",
    restaurantId: "r3",
    restaurantName: "Annapurna Tiffin",
    slot: "dinner",
    totalDays: 10,
    usedDays: 4,
    remainingDays: 6,
    pricePerDay: 218,
    totalPaid: 2180,
    startDate: dateStr(sub2Start),
    endDate: dateStr(sub2End),
    status: "active",
    lateCancellationFees: 0,
  };

  const orders1 = makeOrdersForSub(sub1, "m1", "Mini Thali");
  const orders2 = makeOrdersForSub(sub2, "m6", "Veg Tiffin");

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const ledger: LedgerEntry[] = [
    {
      id: "l1",
      subscriptionId: "sub1",
      restaurantName: "Green Bowl",
      type: "subscription_purchase",
      description: "Green Bowl lunch — 20-day subscription",
      amountDelta: -3580,
      createdAt: new Date(today.getTime() - 7 * 86400000).toISOString(),
    },
    {
      id: "l2",
      subscriptionId: "sub2",
      restaurantName: "Annapurna Tiffin",
      type: "subscription_purchase",
      description: "Annapurna Tiffin dinner — 10-day subscription",
      amountDelta: -2180,
      createdAt: new Date(today.getTime() - 6 * 86400000).toISOString(),
    },
    {
      id: "l3",
      subscriptionId: "sub1",
      restaurantName: "Green Bowl",
      type: "meal_used",
      description: "Meal delivered: Green Bowl Mini Thali",
      amountDelta: -179,
      createdAt: new Date(today.getTime() - 1 * 86400000).toISOString(),
    },
  ];

  return {
    subscriptions: [sub1, sub2],
    orders: [...orders1, ...orders2],
    ledger,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [user, setUserState] = useState<User | null>(null);
  const [subscriptions, setSubscriptions] = useState<RestaurantSubscription[]>(
    []
  );
  const [orders, setOrders] = useState<MealOrder[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [onboardedRaw, userRaw, subsRaw, ordersRaw, ledgerRaw] =
          await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.IS_ONBOARDED),
            AsyncStorage.getItem(STORAGE_KEYS.USER),
            AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS),
            AsyncStorage.getItem(STORAGE_KEYS.ORDERS),
            AsyncStorage.getItem(STORAGE_KEYS.LEDGER),
          ]);
        if (onboardedRaw === "true") setIsOnboarded(true);
        if (userRaw) setUserState(JSON.parse(userRaw));
        if (subsRaw) setSubscriptions(JSON.parse(subsRaw));
        if (ordersRaw) setOrders(JSON.parse(ordersRaw));
        if (ledgerRaw) setLedger(JSON.parse(ledgerRaw));
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setOnboarded = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.IS_ONBOARDED, "true");
    setIsOnboarded(true);
  }, []);

  const setUser = useCallback(async (u: User) => {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u));
    setUserState(u);

    const existingSubs = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS);
    if (!existingSubs) {
      const seed = makeSeedData();
      await Promise.all([
        AsyncStorage.setItem(
          STORAGE_KEYS.SUBSCRIPTIONS,
          JSON.stringify(seed.subscriptions)
        ),
        AsyncStorage.setItem(
          STORAGE_KEYS.ORDERS,
          JSON.stringify(seed.orders)
        ),
        AsyncStorage.setItem(
          STORAGE_KEYS.LEDGER,
          JSON.stringify(seed.ledger)
        ),
      ]);
      setSubscriptions(seed.subscriptions);
      setOrders(seed.orders);
      setLedger(seed.ledger);
    }
  }, []);

  const subscribe = useCallback(
    async (params: SubscribeParams) => {
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + params.days - 1);

      const newSub: RestaurantSubscription = {
        id: `sub_${Date.now()}`,
        restaurantId: params.restaurantId,
        restaurantName: params.restaurantName,
        slot: params.slot,
        totalDays: params.days,
        usedDays: 0,
        remainingDays: params.days,
        pricePerDay: params.pricePerDay,
        totalPaid: params.pricePerDay * params.days,
        startDate: dateStr(startDate),
        endDate: dateStr(endDate),
        status: "active",
        lateCancellationFees: 0,
      };

      const newOrders = makeOrdersForSub(
        newSub,
        params.defaultMealId,
        params.defaultMealName
      );

      const ledgerEntry: LedgerEntry = {
        id: `l_${Date.now()}`,
        subscriptionId: newSub.id,
        restaurantName: params.restaurantName,
        type: "subscription_purchase",
        description: `${params.restaurantName} ${params.slot === "both" ? "Lunch + Dinner" : params.slot} — ${params.days}-day subscription`,
        amountDelta: -(params.pricePerDay * params.days),
        createdAt: new Date().toISOString(),
      };

      const updatedSubs = [...subscriptions, newSub];
      const updatedOrders = [...orders, ...newOrders];
      const updatedLedger = [ledgerEntry, ...ledger];

      await Promise.all([
        AsyncStorage.setItem(
          STORAGE_KEYS.SUBSCRIPTIONS,
          JSON.stringify(updatedSubs)
        ),
        AsyncStorage.setItem(
          STORAGE_KEYS.ORDERS,
          JSON.stringify(updatedOrders)
        ),
        AsyncStorage.setItem(
          STORAGE_KEYS.LEDGER,
          JSON.stringify(updatedLedger)
        ),
      ]);

      setSubscriptions(updatedSubs);
      setOrders(updatedOrders);
      setLedger(updatedLedger);
    },
    [subscriptions, orders, ledger]
  );

  const cancelSubscription = useCallback(
    async (subscriptionId: string): Promise<{ refundAmount: number }> => {
      const sub = subscriptions.find((s) => s.id === subscriptionId);
      if (!sub) return { refundAmount: 0 };

      const refundAmount = Math.max(
        0,
        sub.remainingDays * sub.pricePerDay - sub.lateCancellationFees
      );

      const updatedSubs = subscriptions.map((s) =>
        s.id === subscriptionId
          ? { ...s, status: "cancelled" as const }
          : s
      );

      const updatedOrders = orders.map((o) =>
        o.subscriptionId === subscriptionId && o.status === "scheduled"
          ? { ...o, status: "cancelled_free" as const }
          : o
      );

      const ledgerEntry: LedgerEntry = {
        id: `l_${Date.now()}`,
        subscriptionId,
        restaurantName: sub.restaurantName,
        type: "refund",
        description: `Subscription cancelled — ${sub.remainingDays} day refund: ${sub.restaurantName} ${sub.slot}`,
        amountDelta: refundAmount,
        createdAt: new Date().toISOString(),
      };

      const updatedLedger = [ledgerEntry, ...ledger];

      await Promise.all([
        AsyncStorage.setItem(
          STORAGE_KEYS.SUBSCRIPTIONS,
          JSON.stringify(updatedSubs)
        ),
        AsyncStorage.setItem(
          STORAGE_KEYS.ORDERS,
          JSON.stringify(updatedOrders)
        ),
        AsyncStorage.setItem(
          STORAGE_KEYS.LEDGER,
          JSON.stringify(updatedLedger)
        ),
      ]);

      setSubscriptions(updatedSubs);
      setOrders(updatedOrders);
      setLedger(updatedLedger);

      return { refundAmount };
    },
    [subscriptions, orders, ledger]
  );

  const pauseSubscription = useCallback(
    async (subscriptionId: string, pauseDays: number) => {
      const pausedUntil = new Date();
      pausedUntil.setDate(pausedUntil.getDate() + pauseDays);

      const updatedSubs = subscriptions.map((s) =>
        s.id === subscriptionId
          ? {
              ...s,
              status: "paused" as const,
              pausedUntil: pausedUntil.toISOString(),
            }
          : s
      );

      await AsyncStorage.setItem(
        STORAGE_KEYS.SUBSCRIPTIONS,
        JSON.stringify(updatedSubs)
      );
      setSubscriptions(updatedSubs);
    },
    [subscriptions]
  );

  const getOrderCancelStatus = useCallback(
    (order: MealOrder): "free" | "late" | "full" | "none" => {
      if (
        order.status === "delivered" ||
        order.status === "cancelled_free" ||
        order.status === "cancelled_late" ||
        order.status === "cancelled_full"
      )
        return "none";

      const now = new Date();
      if (now <= new Date(order.freeCancelUntil)) return "free";
      if (now <= new Date(order.lateCancelUntil)) return "late";
      return "full";
    },
    []
  );

  const cancelOrder = useCallback(
    async (
      orderId: string
    ): Promise<{ type: "free" | "late" | "full"; fee: number }> => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return { type: "free", fee: 0 };

      const cancelType = getOrderCancelStatus(order);
      if (cancelType === "none") return { type: "free", fee: 0 };

      let newStatus: MealOrder["status"] = "cancelled_free";
      let fee = 0;
      let ledgerType: LedgerEntry["type"] = "free_cancel";
      let ledgerDesc = `Free cancel: ${order.restaurantName} ${order.mealName}`;
      let amountDelta = 0;

      if (cancelType === "late") {
        newStatus = "cancelled_late";
        fee = Math.round(order.pricePerDay * 0.5);
        ledgerType = "late_cancel";
        ledgerDesc = `Late cancel: ${order.restaurantName} — 50% fee ₹${fee}`;
        amountDelta = -fee;
      } else if (cancelType === "full") {
        newStatus = "cancelled_full";
        fee = order.pricePerDay;
        ledgerType = "full_charge";
        ledgerDesc = `Full charge: ${order.restaurantName} — prep started ₹${fee}`;
        amountDelta = -fee;
      }

      const updatedOrders = orders.map((o) =>
        o.id === orderId ? { ...o, status: newStatus } : o
      );

      const updatedSubs = subscriptions.map((s) =>
        s.id === order.subscriptionId
          ? {
              ...s,
              lateCancellationFees: s.lateCancellationFees + fee,
              remainingDays:
                cancelType === "free"
                  ? s.remainingDays + 1
                  : s.remainingDays,
            }
          : s
      );

      const newEntry: LedgerEntry = {
        id: `l_${Date.now()}`,
        subscriptionId: order.subscriptionId,
        restaurantName: order.restaurantName,
        type: ledgerType,
        description: ledgerDesc,
        amountDelta,
        createdAt: new Date().toISOString(),
      };

      const updatedLedger = [newEntry, ...ledger];

      await Promise.all([
        AsyncStorage.setItem(
          STORAGE_KEYS.ORDERS,
          JSON.stringify(updatedOrders)
        ),
        AsyncStorage.setItem(
          STORAGE_KEYS.SUBSCRIPTIONS,
          JSON.stringify(updatedSubs)
        ),
        AsyncStorage.setItem(
          STORAGE_KEYS.LEDGER,
          JSON.stringify(updatedLedger)
        ),
      ]);

      setOrders(updatedOrders);
      setSubscriptions(updatedSubs);
      setLedger(updatedLedger);

      return { type: cancelType as "free" | "late" | "full", fee };
    },
    [orders, subscriptions, ledger, getOrderCancelStatus]
  );

  const refreshOrders = useCallback(() => {
    setOrders((prev) => [...prev]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        isLoading,
        isOnboarded,
        user,
        subscriptions,
        orders,
        ledger,
        setOnboarded,
        setUser,
        subscribe,
        cancelSubscription,
        pauseSubscription,
        cancelOrder,
        getOrderCancelStatus,
        refreshOrders,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
