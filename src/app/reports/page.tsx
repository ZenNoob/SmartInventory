
'use client'
import { useUserRole } from "@/hooks/use-user-role";
import { redirect } from "next/navigation";

export default function ReportsPage() {
  const { permissions } = useUserRole();

  if (permissions?.reports_debt?.includes('view')) {
      redirect('/reports/debt');
  }
  if (permissions?.reports_income_statement?.includes('view')) {
      redirect('/reports/income-statement');
  }
  if (permissions?.reports_profit?.includes('view')) {
      redirect('/reports/profit');
  }
  if (permissions?.reports_revenue?.includes('view')) {
      redirect('/reports/revenue');
  }
  // Add other report redirects here as fallbacks
  
  // Default redirect if no specific report permission is found first
  redirect('/dashboard');
}
