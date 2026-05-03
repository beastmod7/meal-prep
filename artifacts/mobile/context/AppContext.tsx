import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as api from "@/services/api";

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
  mealName: string;
  scheduledDate: string;
  slot: "lunch" | "dinner";
  status: string;
  freeCancelUntil: string;
  lateCancelUntil: string;
  pricePerDay: number;
}

export interface LedgerEntry {
  id: string;
  subscriptionId?: string;
  restaurantName?: string;
  type: string;
  description: string;
  amountDelta: number;
  createdAt: string;
}

export interface RestaurantRating {
  id: string;
  restaurantId: string;
  restaurantName: string;
  foodQuality: number;
  packaging: number;
  delivery: number;
  valueForMoney: number;
  hygiene: number;
  communication: number;
  overall: number;
  note: string;
  createdAt: string;
}

interface SubscribeParams {
  restaurantId: string;
  packageId: string;
}

interface RateRestaurantParams {
  restaurantId: string;
  restaurantName: string;
  ratings: Omit<RestaurantRating, "id" | "restaurantId" | "restaurantName" | "createdAt">;
}

interface AppContextType {
  isLoading: boolean;
  isOnboarded: boolean;
  user: User | null;
  subscriptions: RestaurantSubscription[];
  orders: MealOrder[];
  ledger: LedgerEntry[];
  restaurantRatings: RestaurantRating[];
  setOnboarded: () => Promise<void>;
  setUser: (user: User) => Promise<void>;
  subscribe: (params: SubscribeParams) => Promise<void>;
  cancelSubscription: (subscriptionId: string) => Promise<{ refundAmount: number }>;
  pauseSubscription: (subscriptionId: string, pauseDays: number) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<{ type: "free" | "late" | "full"; fee: number }>;
  getOrderCancelStatus: (order: MealOrder) => "free" | "late" | "full" | "none";
  rateRestaurant: (params: RateRestaurantParams) => Promise<void>;
  refreshOrders: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  IS_ONBOARDED: "mp_is_onboarded",
  USER: "mp_user",
  RATINGS: "mp_ratings",
};

function mapApiSub(s: api.ApiSubscription): RestaurantSubscription {
  return {
    id: s.id,
    restaurantId: s.restaurantId,
    restaurantName: s.restaurantName,
    slot: s.slot,
    totalDays: s.totalDays,
    usedDays: s.usedDays,
    remainingDays: s.remainingDays,
    pricePerDay: s.pricePerDay,
    totalPaid: s.totalPaid,
    startDate: s.startDate,
    endDate: s.endDate,
    status: s.status,
    pausedUntil: s.pausedUntil ?? undefined,
    lateCancellationFees: s.lateCancellationFees,
  };
}

function mapApiOrder(o: api.ApiOrder): MealOrder {
  return {
    id: o.id,
    subscriptionId: o.subscriptionId,
    restaurantId: o.restaurantId,
    restaurantName: o.restaurantName,
    mealName: o.mealName,
    scheduledDate: o.scheduledDate,
    slot: o.slot,
    status: o.status,
    freeCancelUntil: o.freeCancelUntil,
    lateCancelUntil: o.lateCancelUntil,
    pricePerDay: o.pricePerDay,
  };
}

function mapApiLedger(l: api.ApiLedgerEntry): LedgerEntry {
  return {
    id: l.id,
    subscriptionId: l.subscriptionId ?? undefined,
    restaurantName: l.restaurantName ?? undefined,
    type: l.type,
    description: l.description,
    amountDelta: l.amountDelta,
    createdAt: l.createdAt,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [user, setUserState] = useState<User | null>(null);
  const [subscriptions, setSubscriptions] = useState<RestaurantSubscription[]>([]);
  const [orders, setOrders] = useState<MealOrder[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [restaurantRatings, setRestaurantRatings] = useState<RestaurantRating[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [onboardedRaw, userRaw, ratingsRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.IS_ONBOARDED),
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.RATINGS),
        ]);
        if (onboardedRaw === "true") setIsOnboarded(true);
        if (userRaw) setUserState(JSON.parse(userRaw) as User);
        if (ratingsRaw) setRestaurantRatings(JSON.parse(ratingsRaw) as RestaurantRating[]);

        const token = await api.getToken();
        if (token) {
          const [subs, apiOrders, apiLedger] = await Promise.all([
            api.getSubscriptions(),
            api.getOrders(),
            api.getLedger(),
          ]);
          setSubscriptions(subs.map(mapApiSub));
          setOrders(apiOrders.map(mapApiOrder));
          setLedger(apiLedger.map(mapApiLedger));
        }
      } catch {
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

    try {
      const [subs, apiOrders, apiLedger] = await Promise.all([
        api.getSubscriptions(),
        api.getOrders(),
        api.getLedger(),
      ]);
      setSubscriptions(subs.map(mapApiSub));
      setOrders(apiOrders.map(mapApiOrder));
      setLedger(apiLedger.map(mapApiLedger));
    } catch {
    }
  }, []);

  const subscribe = useCallback(async (params: SubscribeParams) => {
    const result = await api.createSubscription({
      restaurantId: params.restaurantId,
      packageId: params.packageId,
    });
    const [subs, apiOrders, apiLedger] = await Promise.all([
      api.getSubscriptions(),
      api.getOrders(),
      api.getLedger(),
    ]);
    setSubscriptions(subs.map(mapApiSub));
    setOrders(apiOrders.map(mapApiOrder));
    setLedger(apiLedger.map(mapApiLedger));
    void result;
  }, []);

  const cancelSubscription = useCallback(
    async (subscriptionId: string): Promise<{ refundAmount: number }> => {
      const result = await api.cancelSubscription(subscriptionId);
      const [subs, apiOrders] = await Promise.all([
        api.getSubscriptions(),
        api.getOrders(),
      ]);
      setSubscriptions(subs.map(mapApiSub));
      setOrders(apiOrders.map(mapApiOrder));
      return { refundAmount: result.refundAmount };
    },
    [],
  );

  const pauseSubscription = useCallback(
    async (subscriptionId: string, pauseDays: number) => {
      await api.request(`/subscriptions/${subscriptionId}/pause`, {
        method: "POST",
        body: JSON.stringify({ pauseDays }),
      });
      const subs = await api.getSubscriptions();
      setSubscriptions(subs.map(mapApiSub));
    },
    [],
  );

  const getOrderCancelStatus = useCallback(
    (order: MealOrder): "free" | "late" | "full" | "none" => {
      const cancelled = ["cancelled_free", "cancelled_late", "cancelled_full", "cancelled", "delivered"];
      if (cancelled.some((s) => order.status === s)) return "none";

      const now = new Date();
      if (now <= new Date(order.freeCancelUntil)) return "free";
      if (now <= new Date(order.lateCancelUntil)) return "late";
      return "full";
    },
    [],
  );

  const cancelOrder = useCallback(
    async (orderId: string): Promise<{ type: "free" | "late" | "full"; fee: number }> => {
      const result = await api.cancelOrder(orderId);
      const [apiOrders, apiLedger] = await Promise.all([
        api.getOrders(),
        api.getLedger(),
      ]);
      setOrders(apiOrders.map(mapApiOrder));
      setLedger(apiLedger.map(mapApiLedger));
      return { type: result.type, fee: result.fee };
    },
    [],
  );

  const rateRestaurant = useCallback(async (params: RateRestaurantParams) => {
    await api.rateRestaurant(params.restaurantId, {
      foodQuality: params.ratings.foodQuality,
      packaging: params.ratings.packaging,
      delivery: params.ratings.delivery,
      valueForMoney: params.ratings.valueForMoney,
      hygiene: params.ratings.hygiene,
      communication: params.ratings.communication,
      note: params.ratings.note,
    });
    const rating: RestaurantRating = {
      id: `rating_${Date.now()}`,
      restaurantId: params.restaurantId,
      restaurantName: params.restaurantName,
      ...params.ratings,
      createdAt: new Date().toISOString(),
    };
    const updated = [rating, ...restaurantRatings];
    await AsyncStorage.setItem(STORAGE_KEYS.RATINGS, JSON.stringify(updated));
    setRestaurantRatings(updated);
  }, [restaurantRatings]);

  const refreshOrders = useCallback(() => {
    api.getOrders().then((apiOrders) => setOrders(apiOrders.map(mapApiOrder))).catch(() => {});
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
        restaurantRatings,
        setOnboarded,
        setUser,
        subscribe,
        cancelSubscription,
        pauseSubscription,
        cancelOrder,
        getOrderCancelStatus,
        rateRestaurant,
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
