import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { computeProduct } from "@/lib/stock";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = Number.parseInt(searchParams.get("month") ?? "", 10);
  const year = Number.parseInt(searchParams.get("year") ?? "", 10);

  if (Number.isNaN(month) || Number.isNaN(year)) {
    return NextResponse.json({ message: "month and year are required" }, { status: 400 });
  }

  const products = await prisma.product.findMany({
    include: {
      transactions: true,
    },
    orderBy: {
      code: "asc",
    },
  });

  const result = products.map((product) => {
    const computed = computeProduct(product, product.transactions);
    const monthTransactions = product.transactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month;
    });

    return {
      ...computed,
      monthReceived: monthTransactions.filter((tx) => tx.type === "IN").reduce((sum, tx) => sum + tx.quantity, 0),
      monthIssued: monthTransactions.filter((tx) => tx.type === "OUT").reduce((sum, tx) => sum + tx.quantity, 0),
      endingBalance: computed.initial + computed.received - computed.issued,
    };
  });

  return NextResponse.json(result);
}
