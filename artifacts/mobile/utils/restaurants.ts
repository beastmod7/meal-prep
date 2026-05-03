import type { ApiRestaurant } from "@/services/api";

export interface CardRestaurant {
  id: string;
  name: string;
  tagline: string;
  cuisine: string;
  rating: number;
  reviewCount: number;
  distance: string;
  deliveryTime: string;
  isVeg: boolean;
  accentColor: string;
  lunchAvailable: boolean;
  dinnerAvailable: boolean;
  lunchStartPrice: number;
  dinnerStartPrice: number;
}

export function toCardRestaurant(r: ApiRestaurant): CardRestaurant {
  return {
    id: r.id,
    name: r.name,
    tagline: r.tagline ?? "",
    cuisine: r.cuisineType ?? "Restaurant",
    rating: r.rating ?? 0,
    reviewCount: r.reviewCount,
    distance: r.distanceLabel ?? "",
    deliveryTime: r.deliveryTime ?? "",
    isVeg: r.isVeg,
    accentColor: r.accentColor ?? "#3B82F6",
    lunchAvailable: r.lunchAvailable,
    dinnerAvailable: r.dinnerAvailable,
    lunchStartPrice: r.lunchStartPrice ?? 0,
    dinnerStartPrice: r.dinnerStartPrice ?? 0,
  };
}
