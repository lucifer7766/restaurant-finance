import TransactionsContent, {
  TransactionsProvider,
} from "@/components/transactions/TransactionsContent";

export default function TransactionsPage() {
  return (
    <TransactionsProvider>
      <TransactionsContent />
    </TransactionsProvider>
  );
}