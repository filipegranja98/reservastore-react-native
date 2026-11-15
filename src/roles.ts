export const allowedAppRole = (role: string) =>
  role === "cliente" || role === "lojista";
export const landingRoute = (role?: string) =>
  role === "lojista" ? "MerchantCategories" : "Shops";
