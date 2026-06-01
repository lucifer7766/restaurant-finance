import { Suspense } from "react";
import { ExpenseContent } from "@/components/expense/ExpenseContent";

export default function ExpensePage() {
  return <Suspense><ExpenseContent /></Suspense>;
}
