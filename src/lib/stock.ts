import { TransactionType, type Product, type Transaction } from "@prisma/client";

export type ProductWithComputed = {
  id: string;
  code: string;
  category: string;
  name: string;
  unit: string;
  initial: number;
  received: number;
  issued: number;
};

export type TransactionWithProduct = Transaction & {
  product: Product;
};

export function computeProduct(product: Product, transactions: Transaction[]): ProductWithComputed {
  const received = transactions
    .filter((tx) => tx.type === TransactionType.IN)
    .reduce((sum, tx) => sum + tx.quantity, 0);
  const issued = transactions
    .filter((tx) => tx.type === TransactionType.OUT)
    .reduce((sum, tx) => sum + tx.quantity, 0);

  return {
    id: product.id,
    code: product.code,
    category: product.category,
    name: product.name,
    unit: product.unit,
    initial: product.openingBalance,
    received,
    issued,
  };
}

export function mapTransaction(transaction: TransactionWithProduct) {
  return {
    id: transaction.id,
    date: transaction.date.toISOString().slice(0, 16).replace("T", " "),
    code: transaction.product.code,
    name: transaction.product.name,
    category: transaction.product.category,
    type: transaction.type.toLowerCase(),
    quantity: transaction.quantity,
    note: transaction.note,
    productId: transaction.productId,
  };
}
