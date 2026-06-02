import { Suspense } from "react";
import { ExpenseNewForm } from "@/components/expense/ExpenseNewForm";

export default function ExpenseNewPage() {
  return (
    <Suspense fallback={null}>
      <ExpenseNewForm />
    </Suspense>
  );
}
