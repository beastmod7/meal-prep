import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, Plus, Pencil, Trash2, Image as ImageIcon, Utensils, Package, Search,
  Leaf, Egg, Flame, ChevronUp, ChevronDown, Eye, EyeOff, ToggleLeft, ToggleRight,
} from "lucide-react";
import { inr } from "@/lib/fmt";
import {
  useGetRestaurantMeals,
  getGetRestaurantMealsQueryKey,
  useCreateRestaurantMeal,
  useUpdateRestaurantMeal,
  useDeleteRestaurantMeal,
  useGetRestaurantPackages,
  getGetRestaurantPackagesQueryKey,
  useCreateRestaurantPackage,
  useUpdateRestaurantPackage,
  useDeleteRestaurantPackage,
} from "@workspace/api-client-react";

type MealForm = {
  name: string;
  shortDescription: string;
  description: string;
  category: string;
  vegType: "veg" | "non-veg" | "egg";
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  allergens: string;
  spiceLevel: "mild" | "medium" | "hot";
  imageUrl: string;
  isAvailableForLunch: boolean;
  isAvailableForDinner: boolean;
  isActive: boolean;
};

type PackageForm = {
  name: string;
  mealSlot: "lunch" | "dinner" | "both";
  validityDays: string;
  pricePerDay: string;
  discountPct: string;
  description: string;
  status: "active" | "paused" | "archived";
};

const defaultMealForm = (): MealForm => ({
  name: "",
  shortDescription: "",
  description: "",
  category: "",
  vegType: "veg",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  fiber: "",
  allergens: "",
  spiceLevel: "mild",
  imageUrl: "",
  isAvailableForLunch: true,
  isAvailableForDinner: true,
  isActive: true,
});

const defaultPackageForm = (): PackageForm => ({
  name: "",
  mealSlot: "lunch",
  validityDays: "30",
  pricePerDay: "",
  discountPct: "0",
  description: "",
  status: "active",
});

const vegTypeConfig = {
  veg: { label: "Veg", icon: Leaf, color: "text-green-600 bg-green-50 border-green-200" },
  "non-veg": { label: "Non-Veg", icon: Flame, color: "text-red-600 bg-red-50 border-red-200" },
  egg: { label: "Egg", icon: Egg, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
};

const spiceConfig = {
  mild: { label: "Mild", color: "text-green-600 bg-green-50 border-green-200" },
  medium: { label: "Medium", color: "text-orange-600 bg-orange-50 border-orange-200" },
  hot: { label: "Hot", color: "text-red-600 bg-red-50 border-red-200" },
};

const slotConfig = {
  lunch: { label: "Lunch", color: "text-orange-600 bg-orange-50 border-orange-200" },
  dinner: { label: "Dinner", color: "text-blue-600 bg-blue-50 border-blue-200" },
  both: { label: "Lunch + Dinner", color: "text-purple-600 bg-purple-50 border-purple-200" },
};

const statusConfig = {
  active: { label: "Active", color: "text-green-600 bg-green-50 border-green-200" },
  paused: { label: "Paused", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  archived: { label: "Archived", color: "text-slate-500 bg-slate-50 border-slate-200" },
};

const COMMON_CATEGORIES = ["Main Course", "Snack", "Breakfast", "Soup", "Salad", "Dessert", "Beverage", "Side Dish"];

function MealDialog({
  open,
  onClose,
  editingMeal,
  restaurantId,
}: {
  open: boolean;
  onClose: () => void;
  editingMeal: { id: string } & Partial<MealForm & { category: string; calories: number | null; sortOrder: number }> | null;
  restaurantId: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const isEditing = !!editingMeal;

  const [form, setForm] = useState<MealForm>(() => {
    if (editingMeal) {
      return {
        name: editingMeal.name ?? "",
        shortDescription: editingMeal.shortDescription ?? "",
        description: editingMeal.description ?? "",
        category: editingMeal.category ?? "",
        vegType: editingMeal.vegType ?? "veg",
        calories: editingMeal.calories != null ? String(editingMeal.calories) : "",
        protein: editingMeal.protein ?? "",
        carbs: editingMeal.carbs ?? "",
        fat: editingMeal.fat ?? "",
        fiber: editingMeal.fiber ?? "",
        allergens: editingMeal.allergens ?? "",
        spiceLevel: editingMeal.spiceLevel ?? "mild",
        imageUrl: editingMeal.imageUrl ?? "",
        isAvailableForLunch: editingMeal.isAvailableForLunch ?? true,
        isAvailableForDinner: editingMeal.isAvailableForDinner ?? true,
        isActive: editingMeal.isActive ?? true,
      };
    }
    return defaultMealForm();
  });

  const createMeal = useCreateRestaurantMeal();
  const updateMeal = useUpdateRestaurantMeal();

  const set = (key: keyof MealForm, val: MealForm[typeof key]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Please use an image under 2MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => set("imageUrl", ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetRestaurantMealsQueryKey(restaurantId, {}) });

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name.trim(),
      shortDescription: form.shortDescription || undefined,
      description: form.description || undefined,
      category: form.category || undefined,
      vegType: form.vegType,
      calories: form.calories ? parseInt(form.calories) : undefined,
      protein: form.protein || undefined,
      carbs: form.carbs || undefined,
      fat: form.fat || undefined,
      fiber: form.fiber || undefined,
      allergens: form.allergens || undefined,
      spiceLevel: form.spiceLevel,
      imageUrl: form.imageUrl || undefined,
      isAvailableForLunch: form.isAvailableForLunch,
      isAvailableForDinner: form.isAvailableForDinner,
      isActive: form.isActive,
    };

    if (isEditing && editingMeal) {
      updateMeal.mutate(
        { restaurantId, mealId: editingMeal.id, data: payload },
        {
          onSuccess: () => { toast({ description: "Meal updated." }); invalidate(); onClose(); },
          onError: () => toast({ title: "Failed to update meal", variant: "destructive" }),
        },
      );
    } else {
      createMeal.mutate(
        { restaurantId, data: payload },
        {
          onSuccess: () => { toast({ description: "Meal created." }); invalidate(); onClose(); },
          onError: () => toast({ title: "Failed to create meal", variant: "destructive" }),
        },
      );
    }
  };

  const isBusy = createMeal.isPending || updateMeal.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Meal" : "Add New Meal"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Meal Name <span className="text-destructive">*</span></Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Dal Tadka, Paneer Butter Masala"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>

              <div>
                <Label>Short Description</Label>
                <Input
                  className="mt-1"
                  placeholder="One line tagline for the meal"
                  value={form.shortDescription}
                  onChange={(e) => set("shortDescription", e.target.value)}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  className="mt-1 resize-none"
                  rows={3}
                  placeholder="Ingredients, cooking style, taste notes..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category || "__custom"} onValueChange={(v) => set("category", v === "__custom" ? "" : v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select or type" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                      <SelectItem value="__custom">Custom...</SelectItem>
                    </SelectContent>
                  </Select>
                  {(!form.category || !COMMON_CATEGORIES.includes(form.category)) && (
                    <Input
                      className="mt-1"
                      placeholder="Custom category"
                      value={form.category}
                      onChange={(e) => set("category", e.target.value)}
                    />
                  )}
                </div>

                <div>
                  <Label>Veg Type</Label>
                  <Select value={form.vegType} onValueChange={(v) => set("vegType", v as MealForm["vegType"])}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="veg">Veg</SelectItem>
                      <SelectItem value="non-veg">Non-Veg</SelectItem>
                      <SelectItem value="egg">Egg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Spice Level</Label>
                <div className="flex gap-2 mt-1">
                  {(["mild", "medium", "hot"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => set("spiceLevel", level)}
                      className={`flex-1 py-1.5 rounded-md border text-sm font-medium transition-all ${
                        form.spiceLevel === level
                          ? spiceConfig[level].color + " border-2"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {spiceConfig[level].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Meal Image</Label>
                <div className="mt-1 border-2 border-dashed border-border rounded-lg p-3 text-center space-y-2">
                  {form.imageUrl ? (
                    <div className="relative">
                      <img
                        src={form.imageUrl}
                        alt="Meal"
                        className="w-full h-32 object-cover rounded-md"
                        onError={() => set("imageUrl", "")}
                      />
                      <button
                        type="button"
                        onClick={() => set("imageUrl", "")}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center hover:bg-black/80"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 py-4">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">Upload or paste a URL</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste image URL..."
                      value={form.imageUrl.startsWith("data:") ? "" : form.imageUrl}
                      onChange={(e) => set("imageUrl", e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileRef.current?.click()}
                    >
                      Upload
                    </Button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">Nutrition Info <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Calories (kcal)</Label>
                    <Input
                      type="number"
                      className="mt-0.5 h-8 text-sm"
                      placeholder="e.g. 350"
                      value={form.calories}
                      onChange={(e) => set("calories", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Protein</Label>
                    <Input
                      className="mt-0.5 h-8 text-sm"
                      placeholder="e.g. 12g"
                      value={form.protein}
                      onChange={(e) => set("protein", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Carbs</Label>
                    <Input
                      className="mt-0.5 h-8 text-sm"
                      placeholder="e.g. 45g"
                      value={form.carbs}
                      onChange={(e) => set("carbs", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fat</Label>
                    <Input
                      className="mt-0.5 h-8 text-sm"
                      placeholder="e.g. 8g"
                      value={form.fat}
                      onChange={(e) => set("fat", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fiber</Label>
                    <Input
                      className="mt-0.5 h-8 text-sm"
                      placeholder="e.g. 3g"
                      value={form.fiber}
                      onChange={(e) => set("fiber", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Allergens</Label>
                <Input
                  className="mt-0.5 text-sm"
                  placeholder="e.g. Gluten, Dairy, Nuts"
                  value={form.allergens}
                  onChange={(e) => set("allergens", e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-semibold">Availability & Status</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Lunch</p>
                  <p className="text-xs text-muted-foreground">Available for lunch slot</p>
                </div>
                <Switch checked={form.isAvailableForLunch} onCheckedChange={(v) => set("isAvailableForLunch", v)} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Dinner</p>
                  <p className="text-xs text-muted-foreground">Available for dinner slot</p>
                </div>
                <Switch checked={form.isAvailableForDinner} onCheckedChange={(v) => set("isAvailableForDinner", v)} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">Visible to students</p>
                </div>
                <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isBusy}>Cancel</Button>
          <Button onClick={handleSave} disabled={isBusy}>
            {isBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? "Save Changes" : "Add Meal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PackageDialog({
  open,
  onClose,
  editingPackage,
  restaurantId,
}: {
  open: boolean;
  onClose: () => void;
  editingPackage: { id: string } & Partial<PackageForm> | null;
  restaurantId: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEditing = !!editingPackage;

  const [form, setForm] = useState<PackageForm>(() => {
    if (editingPackage) {
      return {
        name: editingPackage.name ?? "",
        mealSlot: editingPackage.mealSlot ?? "lunch",
        validityDays: editingPackage.validityDays ?? "30",
        pricePerDay: editingPackage.pricePerDay ?? "",
        discountPct: editingPackage.discountPct ?? "0",
        description: editingPackage.description ?? "",
        status: editingPackage.status ?? "active",
      };
    }
    return defaultPackageForm();
  });

  const createPkg = useCreateRestaurantPackage();
  const updatePkg = useUpdateRestaurantPackage();

  const set = (key: keyof PackageForm, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetRestaurantPackagesQueryKey(restaurantId, {}) });

  const pricePerDay = parseFloat(form.pricePerDay) || 0;
  const validityDays = parseInt(form.validityDays) || 0;
  const discountPct = parseFloat(form.discountPct) || 0;
  const totalBeforeDiscount = pricePerDay * validityDays;
  const totalPrice = totalBeforeDiscount * (1 - discountPct / 100);

  const handleSave = () => {
    if (!form.name.trim() || !pricePerDay || !validityDays) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name.trim(),
      mealSlot: form.mealSlot,
      validityDays,
      pricePerDay,
      discountPct: discountPct || undefined,
      description: form.description || undefined,
      status: form.status,
    };

    if (isEditing && editingPackage) {
      updatePkg.mutate(
        { restaurantId, packageId: editingPackage.id, data: payload },
        {
          onSuccess: () => { toast({ description: "Package updated." }); invalidate(); onClose(); },
          onError: () => toast({ title: "Failed to update package", variant: "destructive" }),
        },
      );
    } else {
      createPkg.mutate(
        { restaurantId, data: payload },
        {
          onSuccess: () => { toast({ description: "Package created." }); invalidate(); onClose(); },
          onError: () => toast({ title: "Failed to create package", variant: "destructive" }),
        },
      );
    }
  };

  const isBusy = createPkg.isPending || updatePkg.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Package" : "Create Package"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Package Name <span className="text-destructive">*</span></Label>
            <Input
              className="mt-1"
              placeholder="e.g. Monthly Lunch Plan"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Meal Slot <span className="text-destructive">*</span></Label>
              <Select value={form.mealSlot} onValueChange={(v) => set("mealSlot", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="both">Lunch + Dinner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Validity (days) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min={1}
                className="mt-1"
                placeholder="30"
                value={form.validityDays}
                onChange={(e) => set("validityDays", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price per Day (₹) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min={0}
                className="mt-1"
                placeholder="e.g. 120"
                value={form.pricePerDay}
                onChange={(e) => set("pricePerDay", e.target.value)}
              />
            </div>

            <div>
              <Label>Discount %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                className="mt-1"
                placeholder="0"
                value={form.discountPct}
                onChange={(e) => set("discountPct", e.target.value)}
              />
            </div>
          </div>

          {pricePerDay > 0 && validityDays > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Total before discount</span>
                <span>{inr(totalBeforeDiscount)}</span>
              </div>
              {discountPct > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({discountPct}%)</span>
                  <span>-{inr(totalBeforeDiscount - totalPrice)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Student pays</span>
                <span className="text-primary">{inr(totalPrice)}</span>
              </div>
            </div>
          )}

          <div>
            <Label>Description</Label>
            <Textarea
              className="mt-1 resize-none"
              rows={2}
              placeholder="What's included, special notes..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isBusy}>Cancel</Button>
          <Button onClick={handleSave} disabled={isBusy}>
            {isBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Package"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Menu() {
  const { activeRestaurantId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterVeg, setFilterVeg] = useState("all");
  const [filterActive, setFilterActive] = useState("all");

  const [mealDialogOpen, setMealDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<any>(null);
  const [deleteMealId, setDeleteMealId] = useState<string | null>(null);

  const [pkgDialogOpen, setPkgDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [deletePkgId, setDeletePkgId] = useState<string | null>(null);

  const { data: meals, isLoading: mealsLoading } = useGetRestaurantMeals(
    activeRestaurantId!,
    {},
    { query: { enabled: !!activeRestaurantId, queryKey: getGetRestaurantMealsQueryKey(activeRestaurantId!, {}) } },
  );

  const { data: packages, isLoading: pkgsLoading } = useGetRestaurantPackages(
    activeRestaurantId!,
    {},
    { query: { enabled: !!activeRestaurantId, queryKey: getGetRestaurantPackagesQueryKey(activeRestaurantId!, {}) } },
  );

  const deleteMeal = useDeleteRestaurantMeal();
  const deletePkg = useDeleteRestaurantPackage();

  const handleDeleteMeal = () => {
    if (!deleteMealId || !activeRestaurantId) return;
    deleteMeal.mutate(
      { restaurantId: activeRestaurantId, mealId: deleteMealId },
      {
        onSuccess: () => {
          toast({ description: "Meal deleted." });
          queryClient.invalidateQueries({ queryKey: getGetRestaurantMealsQueryKey(activeRestaurantId, {}) });
          setDeleteMealId(null);
        },
        onError: () => toast({ title: "Failed to delete meal", variant: "destructive" }),
      },
    );
  };

  const handleDeletePkg = () => {
    if (!deletePkgId || !activeRestaurantId) return;
    deletePkg.mutate(
      { restaurantId: activeRestaurantId, packageId: deletePkgId },
      {
        onSuccess: () => {
          toast({ description: "Package archived." });
          queryClient.invalidateQueries({ queryKey: getGetRestaurantPackagesQueryKey(activeRestaurantId, {}) });
          setDeletePkgId(null);
        },
        onError: () => toast({ title: "Failed to archive package", variant: "destructive" }),
      },
    );
  };

  const filteredMeals = (meals ?? []).filter((m) => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterVeg !== "all" && m.vegType !== filterVeg) return false;
    if (filterActive === "active" && !m.isActive) return false;
    if (filterActive === "inactive" && m.isActive) return false;
    return true;
  });

  if (!activeRestaurantId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Menu CMS</h1>
        <p className="text-muted-foreground mt-1">Manage your meals and subscription packages.</p>
      </div>

      <Tabs defaultValue="meals">
        <TabsList className="bg-muted">
          <TabsTrigger value="meals" className="gap-2">
            <Utensils className="w-4 h-4" /> Meals
            {meals && <Badge variant="secondary" className="ml-1 text-xs">{meals.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="packages" className="gap-2">
            <Package className="w-4 h-4" /> Packages
            {packages && <Badge variant="secondary" className="ml-1 text-xs">{packages.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meals" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search meals..."
                  className="pl-8 w-48"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterVeg} onValueChange={setFilterVeg}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Veg type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="veg">Veg</SelectItem>
                  <SelectItem value="non-veg">Non-Veg</SelectItem>
                  <SelectItem value="egg">Egg</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { setEditingMeal(null); setMealDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Meal
            </Button>
          </div>

          {mealsLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredMeals.length === 0 ? (
            <Card>
              <CardContent className="py-14 text-center">
                <Utensils className="mx-auto h-10 w-10 mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground font-medium">No meals found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search || filterVeg !== "all" || filterActive !== "all"
                    ? "Try adjusting your filters."
                    : "Add your first meal to get started."}
                </p>
                {!search && filterVeg === "all" && filterActive === "all" && (
                  <Button className="mt-4" onClick={() => { setEditingMeal(null); setMealDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" /> Add Your First Meal
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMeals.map((meal) => {
                const veg = vegTypeConfig[meal.vegType as keyof typeof vegTypeConfig];
                const VegIcon = veg?.icon ?? Leaf;
                return (
                  <Card key={meal.id} className={`overflow-hidden transition-all ${!meal.isActive ? "opacity-60" : ""}`}>
                    {meal.imageUrl ? (
                      <div className="relative h-36 overflow-hidden">
                        <img
                          src={meal.imageUrl}
                          alt={meal.name}
                          className="w-full h-full object-cover"
                        />
                        {!meal.isActive && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Badge variant="secondary" className="bg-black/60 text-white border-0">Inactive</Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-20 bg-muted/30 flex items-center justify-center">
                        <Utensils className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}

                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm leading-tight truncate">{meal.name}</h3>
                          {meal.shortDescription && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{meal.shortDescription}</p>
                          )}
                        </div>
                        <Badge variant="outline" className={`shrink-0 text-xs ${veg?.color ?? ""}`}>
                          <VegIcon className="w-3 h-3 mr-1" />{veg?.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {meal.category && (
                          <Badge variant="secondary" className="text-xs">{meal.category}</Badge>
                        )}
                        {meal.spiceLevel && (
                          <Badge variant="outline" className={`text-xs ${spiceConfig[meal.spiceLevel as keyof typeof spiceConfig]?.color ?? ""}`}>
                            {spiceConfig[meal.spiceLevel as keyof typeof spiceConfig]?.label}
                          </Badge>
                        )}
                        {meal.calories && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">{meal.calories} kcal</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {meal.isAvailableForLunch && (
                          <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded text-[10px] border border-orange-200">Lunch</span>
                        )}
                        {meal.isAvailableForDinner && (
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] border border-blue-200">Dinner</span>
                        )}
                      </div>

                      <Separator />

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8"
                          onClick={() => { setEditingMeal(meal); setMealDialogOpen(true); }}
                        >
                          <Pencil className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteMealId(meal.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="packages" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {packages?.length ?? 0} package{packages?.length !== 1 ? "s" : ""} total
            </p>
            <Button onClick={() => { setEditingPackage(null); setPkgDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Create Package
            </Button>
          </div>

          {pkgsLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !packages || packages.length === 0 ? (
            <Card>
              <CardContent className="py-14 text-center">
                <Package className="mx-auto h-10 w-10 mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground font-medium">No packages yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create subscription packages for students.</p>
                <Button className="mt-4" onClick={() => { setEditingPackage(null); setPkgDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" /> Create First Package
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => {
                const slot = slotConfig[pkg.mealSlot as keyof typeof slotConfig];
                const status = statusConfig[pkg.status as keyof typeof statusConfig];
                return (
                  <Card key={pkg.id} className={`overflow-hidden transition-all ${pkg.status === "archived" ? "opacity-60" : ""}`}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold leading-tight">{pkg.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{pkg.validityDays} days validity</p>
                        </div>
                        <Badge variant="outline" className={`text-xs shrink-0 ${status?.color ?? ""}`}>
                          {status?.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className={`text-xs ${slot?.color ?? ""}`}>
                          {slot?.label}
                        </Badge>
                        {pkg.discountPct && pkg.discountPct > 0 ? (
                          <Badge variant="outline" className="text-xs text-green-600 bg-green-50 border-green-200">
                            {pkg.discountPct}% off
                          </Badge>
                        ) : null}
                      </div>

                      <div className="bg-muted/40 rounded-lg p-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Per day</span>
                          <span className="font-semibold">{inr(pkg.pricePerDay)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total price</span>
                          <span className="font-bold text-primary">{inr(pkg.totalPrice)}</span>
                        </div>
                        <Separator className="my-1" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Active subscribers</span>
                          <span className="font-semibold text-foreground">{pkg.activeSubscribers}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Total sold</span>
                          <span className="font-semibold text-foreground">{pkg.totalSold}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8"
                          onClick={() => {
                            setEditingPackage({
                              id: pkg.id,
                              name: pkg.name,
                              mealSlot: pkg.mealSlot,
                              validityDays: String(pkg.validityDays),
                              pricePerDay: String(pkg.pricePerDay),
                              discountPct: String(pkg.discountPct ?? 0),
                              description: "",
                              status: pkg.status,
                            });
                            setPkgDialogOpen(true);
                          }}
                        >
                          <Pencil className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        {pkg.status !== "archived" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletePkgId(pkg.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <MealDialog
        open={mealDialogOpen}
        onClose={() => setMealDialogOpen(false)}
        editingMeal={editingMeal}
        restaurantId={activeRestaurantId}
      />

      <PackageDialog
        open={pkgDialogOpen}
        onClose={() => setPkgDialogOpen(false)}
        editingPackage={editingPackage}
        restaurantId={activeRestaurantId}
      />

      <AlertDialog open={!!deleteMealId} onOpenChange={(o) => { if (!o) setDeleteMealId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meal</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the meal. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMeal} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePkgId} onOpenChange={(o) => { if (!o) setDeletePkgId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Package</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive the package. It will no longer be available for new subscriptions, but existing ones will continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePkg} className="bg-destructive hover:bg-destructive/90">
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
