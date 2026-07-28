const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function formatCurrency(cents: number): string { return brl.format(cents / 100); }
export function formatCompactCurrency(cents: number): string { const value = cents / 100; return Math.abs(value) >= 1000 ? `R$ ${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(".", ",")} mil` : formatCurrency(cents); }
