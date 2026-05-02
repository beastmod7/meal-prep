import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { PASS_PLANS, RESTAURANTS } from "@/constants/mockData";

export interface User {
  id: string;
  name: string;
  phone: string;
  campusId: string;
  campusName: string;
  foodPreference: "veg" | "non-veg" | "jain" | "egg";
  address: string;
}

export interface MealPass {
  id: string;
  planId: string;
  planName: string;
  totalCredits: number;
  remainingCredits: number;
  paidAmount: number;
  bonusCredits: number;
  effectiveCreditValue: number;
  validFrom: string;
  validUntil: string;
  status:
    | "active"
    | "paused"
    | "exhausted"
    | "expired"
    | "refund_requested"
    | "cancelled";
  lateCancellationFees: number;
  pausedUntil?: string;
}

export interface MealOrder {
  id: string;
  restaurantId: string;
  restaurantName: string;
  mealId: string;
  mealName: string;
  mealPassId: string;
  scheduledDate: string;
  slot: "lunch" | "dinner";
  status:
    | "scheduled"
    | "locked"
    | "preparing"
    | "delivered"
    | "cancelled_free"
    | "cancelled_late"
    | "cancelled_full";
  freeCancelUntil: string;
  lateCancelUntil: string;
  creditValue: number;
  premiumExtra: number;
}

export interface LedgerEntry {
  id: string;
  type:
    | "pass_purchase"
    | "meal_used"
    | "free_cancel"
    | "late_cancel"
    | "full_charge"
    | "refund"
    | "bonus";
  description: string;
  creditDelta: number;
  amountDelta: number;
  createdAt: string;
}

interface AppContextType {
  isLoading: boolean;
  isOnboarded: boolean;
  user: User | null;
  activePass: MealPass | null;
  orders: MealOrder[];
  ledger: LedgerEntry[];
  setOnboarded: () => Promise<void>;
  setUser: (user: User) => Promise<void>;
  buyPass: (planId: string) => Promise<void>;
  scheduleOrder: (params: {
    restaurantId: string;
    restaurantName: string;
    mealId: string;
    mealName: string;
    scheduledDate: string;
    slot: "lunch" | "dinner";
    premiumExtra: number;
  }) => Promise<void>;
  cancelOrder: (
    orderId: string
  ) => Promise<{ type: "free" | "late" | "full"; fee: number }>;
  pauseMeals: (days: number) => Promise<void>;
  requestRefund: () => Promise<void>;
  getOrderCancelStatus: (
    order: MealOrder
  ) => "free" | "late" | "full" | "none";
  refreshOrders: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  IS_ONBOARDED: "mp_is_onboarded",
  USER: "mp_user",
  ACTIVE_PASS: "mp_active_pass",
  ORDERS: "mp_orders",
  LEDGER: "mp_ledger",
};

function makeSeedOrders(passId: string): MealOrder[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);

  const todayStr = today.toISOString().split("T")[0];
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const dayAfterStr = dayAfter.toISOString().split("T")[0];

  const freeCancelTomorrow = new Date(today);
  freeCancelTomorrow.setHours(22, 0, 0, 0);
  const lateCancelTomorrow = new Date(tomorrow);
  lateCancelTomorrow.setHours(9, 0, 0, 0);

  const freeCancelDayAfter = new Date(tomorrow);
  freeCancelDayAfter.setHours(22, 0, 0, 0);
  const lateCancelDayAfter = new Date(dayAfter);
  lateCancelDayAfter.setHours(9, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(today.getDate() - 3);

  return [
    {
      id: "o1",
      restaurantId: "r1",
      restaurantName: "Green Bowl",
      mealId: "m1",
      mealName: "Mini Thali",
      mealPassId: passId,
      scheduledDate: tomorrowStr,
      slot: "lunch",
      status: "scheduled",
      freeCancelUntil: freeCancelTomorrow.toISOString(),
      lateCancelUntil: lateCancelTomorrow.toISOString(),
      creditValue: 190,
      premiumExtra: 0,
    },
    {
      id: "o2",
      restaurantId: "r2",
      restaurantName: "Spice Garden",
      mealId: "m4",
      mealName: "Masala Dosa",
      mealPassId: passId,
      scheduledDate: dayAfterStr,
      slot: "lunch",
      status: "scheduled",
      freeCancelUntil: freeCancelDayAfter.toISOString(),
      lateCancelUntil: lateCancelDayAfter.toISOString(),
      creditValue: 190,
      premiumExtra: 0,
    },
    {
      id: "o3",
      restaurantId: "r3",
      restaurantName: "Annapurna Tiffin",
      mealId: "m6",
      mealName: "Veg Tiffin",
      mealPassId: passId,
      scheduledDate: yesterday.toISOString().split("T")[0],
      slot: "lunch",
      status: "delivered",
      freeCancelUntil: new Date(twoDaysAgo.setHours(22, 0, 0, 0)).toISOString(),
      lateCancelUntil: new Date(
        yesterday.setHours(9, 0, 0, 0)
      ).toISOString(),
      creditValue: 190,
      premiumExtra: 0,
    },
    {
      id: "o4",
      restaurantId: "r1",
      restaurantName: "Green Bowl",
      mealId: "m2",
      mealName: "Rajma Rice",
      mealPassId: passId,
      scheduledDate: twoDaysAgo.toISOString().split("T")[0],
      slot: "dinner",
      status: "delivered",
      freeCancelUntil: new Date(
        threeDaysAgo.setHours(22, 0, 0, 0)
      ).toISOString(),
      lateCancelUntil: new Date(
        twoDaysAgo.setHours(15, 0, 0, 0)
      ).toISOString(),
      creditValue: 190,
      premiumExtra: 0,
    },
    {
      id: "o5",
      restaurantId: "r4",
      restaurantName: "Protein Hub",
      mealId: "m10",
      mealName: "Paneer Power Bowl",
      mealPassId: passId,
      scheduledDate: threeDaysAgo.toISOString().split("T")[0],
      slot: "lunch",
      status: "cancelled_free",
      freeCancelUntil: new Date(
        new Date(threeDaysAgo).setHours(22, 0, 0, 0)
      ).toISOString(),
      lateCancelUntil: new Date(
        new Date(threeDaysAgo).setHours(9, 0, 0, 0)
      ).toISOString(),
      creditValue: 190,
      premiumExtra: 0,
    },
  ];
}

function makeSeedLedger(passId: string): LedgerEntry[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(today.getDate() - 3);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  return [
    {
      id: "l1",
      type: "pass_purchase",
      description: "Monthly Pass purchased — 30 meal credits added",
      creditDelta: 30,
      amountDelta: -5699,
      createdAt: sevenDaysAgo.toISOString(),
    },
    {
      id: "l2",
      type: "free_cancel",
      description: "Cancelled: Protein Hub Paneer Power Bowl — credit restored",
      creditDelta: 1,
      amountDelta: 0,
      createdAt: threeDaysAgo.toISOString(),
    },
    {
      id: "l3",
      type: "meal_used",
      description: "Meal used: Green Bowl Rajma Rice",
      creditDelta: -1,
      amountDelta: -190,
      createdAt: twoDaysAgo.toISOString(),
    },
    {
      id: "l4",
      type: "meal_used",
      description: "Meal used: Annapurna Tiffin Veg Tiffin",
      creditDelta: -1,
      amountDelta: -190,
      createdAt: yesterday.toISOString(),
    },
  ];
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [user, setUserState] = useState<User | null>(null);
  const [activePass, setActivePass] = useState<MealPass | null>(null);
  const [orders, setOrders] = useState<MealOrder[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [onboardedRaw, userRaw, passRaw, ordersRaw, ledgerRaw] =
          await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.IS_ONBOARDED),
            AsyncStorage.getItem(STORAGE_KEYS.USER),
            AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_PASS),
            AsyncStorage.getItem(STORAGE_KEYS.ORDERS),
            AsyncStorage.getItem(STORAGE_KEYS.LEDGER),
          ]);

        if (onboardedRaw === "true") setIsOnboarded(true);
        if (userRaw) setUserState(JSON.parse(userRaw));
        if (passRaw) setActivePass(JSON.parse(passRaw));
        if (ordersRaw) setOrders(JSON.parse(ordersRaw));
        if (ledgerRaw) setLedger(JSON.parse(ledgerRaw));
      } catch (e) {
        // ignore storage errors
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

    // seed demo pass + orders on first user set
    const existingPass = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_PASS);
    if (!existingPass) {
      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 45);

      const newPass: MealPass = {
        id: "pass1",
        planId: "monthly",
        planName: "Monthly Pass",
        totalCredits: 30,
        remainingCredits: 14,
        paidAmount: 5699,
        bonusCredits: 0,
        effectiveCreditValue: 190,
        validFrom: validFrom.toISOString(),
        validUntil: validUntil.toISOString(),
        status: "active",
        lateCancellationFees: 0,
      };

      const seedOrders = makeSeedOrders(newPass.id);
      const seedLedger = makeSeedLedger(newPass.id);

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_PASS, JSON.stringify(newPass)),
        AsyncStorage.setItem(
          STORAGE_KEYS.ORDERS,
          JSON.stringify(seedOrders)
        ),
        AsyncStorage.setItem(
          STORAGE_KEYS.LEDGER,
          JSON.stringify(seedLedger)
        ),
      ]);

      setActivePass(newPass);
      setOrders(seedOrders);
      setLedger(seedLedger);
    }
  }, []);

  const buyPass = useCallback(
    async (planId: string) => {
      const plan = PASS_PLANS.find((p) => p.id === planId);
      if (!plan) return;

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + plan.validDays);

      const newPass: MealPass = {
        id: `pass_${Date.now()}`,
        planId: plan.id,
        planName: plan.name,
        totalCredits: plan.meals,
        remainingCredits: plan.meals,
        paidAmount: plan.price,
        bonusCredits: 0,
        effectiveCreditValue: Math.round(plan.price / plan.meals),
        validFrom: new Date().toISOString(),
        validUntil: validUntil.toISOString(),
        status: "active",
        lateCancellationFees: 0,
      };

      const newEntry: LedgerEntry = {
        id: `l_${Date.now()}`,
        type: "pass_purchase",
        description: `${plan.name} purchased — ${plan.meals} meal credits added`,
        creditDelta: plan.meals,
        amountDelta: -plan.price,
        createdAt: new Date().toISOString(),
      };

      const updatedLedger = [newEntry, ...ledger];
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_PASS, JSON.stringify(newPass)),
        AsyncStorage.setItem(
          STORAGE_KEYS.LEDGER,
          JSON.stringify(updatedLedger)
        ),
      ]);

      setActivePass(newPass);
      setLedger(updatedLedger);
    },
    [ledger]
  );

  const scheduleOrder = useCallback(
    async (params: {
      restaurantId: string;
      restaurantName: string;
      mealId: string;
      mealName: string;
      scheduledDate: string;
      slot: "lunch" | "dinner";
      premiumExtra: number;
    }) => {
      if (!activePass) return;

      const scheduledDay = new Date(params.scheduledDate);
      const prevDay = new Date(scheduledDay);
      prevDay.setDate(prevDay.getDate() - 1);
      const freeCancelUntil = new Date(prevDay);
      freeCancelUntil.setHours(22, 0, 0, 0);
      const lateCancelUntil = new Date(scheduledDay);
      lateCancelUntil.setHours(params.slot === "lunch" ? 9 : 15, 0, 0, 0);

      const newOrder: MealOrder = {
        id: `o_${Date.now()}`,
        restaurantId: params.restaurantId,
        restaurantName: params.restaurantName,
        mealId: params.mealId,
        mealName: params.mealName,
        mealPassId: activePass.id,
        scheduledDate: params.scheduledDate,
        slot: params.slot,
        status: "scheduled",
        freeCancelUntil: freeCancelUntil.toISOString(),
        lateCancelUntil: lateCancelUntil.toISOString(),
        creditValue: activePass.effectiveCreditValue,
        premiumExtra: params.premiumExtra,
      };

      const updatedOrders = [newOrder, ...orders];
      await AsyncStorage.setItem(
        STORAGE_KEYS.ORDERS,
        JSON.stringify(updatedOrders)
      );
      setOrders(updatedOrders);
    },
    [activePass, orders]
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
      const freeCancelTime = new Date(order.freeCancelUntil);
      const lateCancelTime = new Date(order.lateCancelUntil);

      if (now <= freeCancelTime) return "free";
      if (now <= lateCancelTime) return "late";
      return "full";
    },
    []
  );

  const cancelOrder = useCallback(
    async (
      orderId: string
    ): Promise<{ type: "free" | "late" | "full"; fee: number }> => {
      const order = orders.find((o) => o.id === orderId);
      if (!order || !activePass)
        return { type: "free", fee: 0 };

      const cancelType = getOrderCancelStatus(order);
      if (cancelType === "none") return { type: "free", fee: 0 };

      let newStatus: MealOrder["status"] = "cancelled_free";
      let creditDelta = 0;
      let fee = 0;
      let ledgerType: LedgerEntry["type"] = "free_cancel";
      let ledgerDesc = `Cancelled: ${order.restaurantName} ${order.mealName} — credit restored`;

      if (cancelType === "late") {
        newStatus = "cancelled_late";
        creditDelta = -0.5;
        fee = Math.round(order.creditValue * 0.5);
        ledgerType = "late_cancel";
        ledgerDesc = `Late cancel: ${order.restaurantName} ${order.mealName} — 50% credit deducted`;
      } else if (cancelType === "full") {
        newStatus = "cancelled_full";
        creditDelta = -1;
        fee = order.creditValue;
        ledgerType = "full_charge";
        ledgerDesc = `Full charge: ${order.restaurantName} ${order.mealName} — meal credit used`;
      } else {
        // free cancel — restore the credit logically
        creditDelta = 1;
      }

      const updatedOrders = orders.map((o) =>
        o.id === orderId ? { ...o, status: newStatus } : o
      );

      const remainingAfter = Math.max(
        0,
        activePass.remainingCredits + creditDelta
      );
      const updatedPass: MealPass = {
        ...activePass,
        remainingCredits: remainingAfter,
        lateCancellationFees: activePass.lateCancellationFees + fee,
        status:
          remainingAfter === 0
            ? ("exhausted" as const)
            : activePass.status,
      };

      const newEntry: LedgerEntry = {
        id: `l_${Date.now()}`,
        type: ledgerType,
        description: ledgerDesc,
        creditDelta:
          cancelType === "free" ? 0 : creditDelta,
        amountDelta: -fee,
        createdAt: new Date().toISOString(),
      };

      const updatedLedger = [newEntry, ...ledger];

      await Promise.all([
        AsyncStorage.setItem(
          STORAGE_KEYS.ORDERS,
          JSON.stringify(updatedOrders)
        ),
        AsyncStorage.setItem(
          STORAGE_KEYS.ACTIVE_PASS,
          JSON.stringify(updatedPass)
        ),
        AsyncStorage.setItem(
          STORAGE_KEYS.LEDGER,
          JSON.stringify(updatedLedger)
        ),
      ]);

      setOrders(updatedOrders);
      setActivePass(updatedPass);
      setLedger(updatedLedger);

      return {
        type: cancelType as "free" | "late" | "full",
        fee,
      };
    },
    [orders, activePass, ledger, getOrderCancelStatus]
  );

  const pauseMeals = useCallback(
    async (days: number) => {
      if (!activePass) return;
      const pausedUntil = new Date();
      pausedUntil.setDate(pausedUntil.getDate() + days);
      const updated: MealPass = {
        ...activePass,
        status: "paused",
        pausedUntil: pausedUntil.toISOString(),
      };
      await AsyncStorage.setItem(
        STORAGE_KEYS.ACTIVE_PASS,
        JSON.stringify(updated)
      );
      setActivePass(updated);
    },
    [activePass]
  );

  const requestRefund = useCallback(async () => {
    if (!activePass) return;
    const updated: MealPass = {
      ...activePass,
      status: "refund_requested",
    };
    const newEntry: LedgerEntry = {
      id: `l_${Date.now()}`,
      type: "refund",
      description: "Refund requested for unused paid meal credits",
      creditDelta: -activePass.remainingCredits,
      amountDelta:
        activePass.remainingCredits * activePass.effectiveCreditValue,
      createdAt: new Date().toISOString(),
    };
    const updatedLedger = [newEntry, ...ledger];
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_PASS, JSON.stringify(updated)),
      AsyncStorage.setItem(
        STORAGE_KEYS.LEDGER,
        JSON.stringify(updatedLedger)
      ),
    ]);
    setActivePass(updated);
    setLedger(updatedLedger);
  }, [activePass, ledger]);

  const refreshOrders = useCallback(() => {
    // Force re-render to pick up date-based status changes
    setOrders((prev) => [...prev]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        isLoading,
        isOnboarded,
        user,
        activePass,
        orders,
        ledger,
        setOnboarded,
        setUser,
        buyPass,
        scheduleOrder,
        cancelOrder,
        pauseMeals,
        requestRefund,
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
