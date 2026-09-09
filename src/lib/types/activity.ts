export type DashboardActivity = {
  id: string;
  time: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  subtitle?: string;
};
