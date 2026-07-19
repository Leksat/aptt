import type { WeekRange } from "./services/Backend";

export const currentWeekRange = (now: Date): WeekRange => {
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday + 6);
  return { from, to };
};
