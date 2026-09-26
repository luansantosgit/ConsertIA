export declare const LOSS_RATE: number;
export declare const DEFAULT_SUPPORT_WA: string;
export declare const LANDING_LEAD_ENDPOINT: string;

export declare function digits(value: unknown): string;
export declare function formatBRL(value: number): string;
export declare function calculateMonthlyLoss(quotesPerDay: number, ticket: number): {
  monthlyLoss: number;
  lostQuotes: number;
};
export declare function validateLead(input: {
  name?: unknown;
  whatsapp?: unknown;
  store_name?: unknown;
}): {
  ok: boolean;
  errors: Record<string, string>;
  data: { name: string; whatsapp: string; store_name: string };
};
