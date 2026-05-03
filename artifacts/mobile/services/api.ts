import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "mp_jwt_token";

function getBaseUrl(): string {
  if (typeof window !== "undefined" && window.location) {
    return `${window.location.origin}/api/student`;
  }
  return "/api/student";
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${getBaseUrl()}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as { message?: string }).message ?? res.statusText;
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

// --- Auth ---

export async function sendOtp(phone: string): Promise<void> {
  await request("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export interface AuthResult {
  token: string;
  student: StudentProfile;
}

export async function verifyOtp(phone: string, otp: string): Promise<AuthResult> {
  return request<AuthResult>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, otp }),
  });
}

// --- Campuses ---

export interface Campus {
  id: string;
  name: string;
  city: string;
  area: string;
}

export async function getCampuses(): Promise<Campus[]> {
  return request<Campus[]>("/campuses");
}

// --- Profile ---

export interface StudentProfile {
  id: string;
  phone: string;
  name: string;
  campusId: string | null;
  campusName: string | null;
  foodPreference: "veg" | "non-veg" | "jain" | "egg";
  address: string | null;
  walletBalance: number;
  isProfileComplete: boolean;
}

export async function getProfile(): Promise<StudentProfile> {
  return request<StudentProfile>("/profile");
}

export async function updateProfile(data: {
  name?: string;
  campusId?: string;
  campusName?: string;
  foodPreference?: string;
  address?: string;
}): Promise<StudentProfile> {
  return request<StudentProfile>("/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// --- Restaurants ---

export interface ApiRestaurant {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  address: string | null;
  cuisineType: string | null;
  campusId: string | null;
  isVeg: boolean;
  lunchAvailable: boolean;
  dinnerAvailable: boolean;
  operatingDays: string[];
  maxCapacity: number | null;
  accentColor: string | null;
  lunchStartPrice: number | null;
  dinnerStartPrice: number | null;
  cancelCutoffHour: number | null;
  deliveryTime: string | null;
  distanceLabel: string | null;
  rating: number | null;
  reviewCount: number;
}

export interface ApiPackage {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  mealSlot: "lunch" | "dinner" | "both";
  pricePerDay: number;
  totalPrice: number;
  discountPercent: number;
  mealsPerDay: number;
}

export interface ApiMeal {
  id: string;
  name: string;
  shortDescription: string | null;
  category: string | null;
  vegType: string | null;
  spiceLevel: string | null;
  calories: number | null;
  storagePath: string | null;
  lunchAvailable: boolean;
  dinnerAvailable: boolean;
}

export interface ApiRestaurantDetail extends ApiRestaurant {
  packages: ApiPackage[];
  meals: ApiMeal[];
  ratingsBreakdown: {
    totalReviews: number;
    overall: number | null;
    foodQuality: number | null;
    packaging: number | null;
    delivery: number | null;
    valueForMoney: number | null;
    hygiene: number | null;
  } | null;
}

export async function getRestaurants(params?: {
  campusId?: string;
  slot?: "lunch" | "dinner" | "both";
}): Promise<ApiRestaurant[]> {
  const qs = new URLSearchParams();
  if (params?.campusId) qs.set("campusId", params.campusId);
  if (params?.slot) qs.set("slot", params.slot);
  const q = qs.toString();
  return request<ApiRestaurant[]>(`/restaurants${q ? `?${q}` : ""}`);
}

export async function getRestaurant(restaurantId: string): Promise<ApiRestaurantDetail> {
  return request<ApiRestaurantDetail>(`/restaurants/${restaurantId}`);
}

export async function rateRestaurant(
  restaurantId: string,
  ratings: {
    foodQuality: number;
    packaging: number;
    delivery: number;
    valueForMoney: number;
    hygiene: number;
    communication: number;
    note?: string;
  },
): Promise<void> {
  await request(`/ratings`, {
    method: "POST",
    body: JSON.stringify({ restaurantId, ...ratings }),
  });
}

// --- Subscriptions ---

export interface ApiSubscription {
  id: string;
  restaurantId: string;
  restaurantName: string;
  packageId: string;
  packageName: string;
  slot: "lunch" | "dinner" | "both";
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  pricePerDay: number;
  totalPaid: number;
  startDate: string;
  endDate: string;
  status: "active" | "paused" | "cancelled" | "completed" | "refund_requested";
  pausedUntil: string | null;
  lateCancellationFees: number;
  createdAt: string;
}

export async function getSubscriptions(): Promise<ApiSubscription[]> {
  return request<ApiSubscription[]>("/subscriptions");
}

export async function createSubscription(data: {
  restaurantId: string;
  packageId: string;
  startDate?: string;
}): Promise<{ subscription: ApiSubscription; ordersCreated: number; message: string }> {
  return request("/subscriptions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function cancelSubscription(
  subscriptionId: string,
): Promise<{ refundAmount: number; remainingDays: number; message: string }> {
  return request(`/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
  });
}

// --- Orders ---

export interface ApiOrder {
  id: string;
  subscriptionId: string;
  restaurantId: string;
  restaurantName: string;
  mealName: string;
  slot: "lunch" | "dinner";
  scheduledDate: string;
  status: string;
  pricePerDay: number;
  freeCancelUntil: string;
  lateCancelUntil: string;
  isLocked: boolean;
  cancelStatus: "free" | "late" | "full" | "none";
}

export interface OrdersPage {
  data: ApiOrder[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function getOrders(params?: {
  from?: string;
  to?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiOrder[]> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.status) qs.set("status", params.status);
  qs.set("page", String(params?.page ?? 1));
  qs.set("limit", String(params?.limit ?? 100));
  const result = await request<OrdersPage>(`/orders?${qs.toString()}`);
  return result.data;
}

export async function cancelOrder(
  orderId: string,
): Promise<{ type: "free" | "late" | "full"; fee: number; refund: number; message: string }> {
  return request(`/orders/${orderId}/cancel`, { method: "POST" });
}

// --- Free Meal ---

export async function getFreeMealStatus(): Promise<{ eligible: boolean }> {
  return request<{ eligible: boolean }>("/free-meal");
}

export async function bookFreeMeal(data: {
  restaurantId: string;
  slot: "lunch" | "dinner";
}): Promise<{
  subscriptionId: string;
  orderId: string;
  restaurantName: string;
  slot: "lunch" | "dinner";
  scheduledDate: string;
  message: string;
}> {
  return request("/free-meal/book", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Ledger ---

export interface ApiLedgerEntry {
  id: string;
  subscriptionId: string | null;
  restaurantName: string | null;
  type: string;
  description: string;
  amountDelta: number;
  createdAt: string;
}

export async function getLedger(): Promise<ApiLedgerEntry[]> {
  return request<ApiLedgerEntry[]>("/ledger");
}
