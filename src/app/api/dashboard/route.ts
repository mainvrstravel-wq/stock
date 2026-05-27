import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { computeProduct } from "@/lib/stock";

export async function GET() {
  const products = await prisma.product.findMany({
    include: { transactions: true },
  });

  const computed = products.map((product) => computeProduct(product, product.transactions));
  const totalQty = computed.reduce((sum, product) => sum + product.initial + product.received - product.issued, 0);
  const lowStockCount = computed.filter((product) => {
    const balance = product.initial + product.received - product.issued;
    return balance > 0 && balance <= 5;
  }).length;
  const outOfStockCount = computed.filter((product) => product.initial + product.received - product.issued === 0).length;

  return NextResponse.json({
    totalItems: computed.length,
    totalQty,
    lowStockCount,
    outOfStockCount,
  });
}
