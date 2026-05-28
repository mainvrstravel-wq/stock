import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getBalance, mapBorrow, mapProduct } from "@/lib/stock";

export async function GET() {
  const [products, borrows] = await Promise.all([
    prisma.product.findMany({ orderBy: { code: "asc" } }),
    prisma.borrowRecord.findMany({ include: { product: true, user: true }, orderBy: { borrowedAt: "desc" } }),
  ]);

  const frontendProducts = products.map(mapProduct);
  const frontendBorrows = borrows.map(mapBorrow);

  const totalQty = frontendProducts.reduce((sum, product) => sum + getBalance(product), 0);
  const lowStockCount = frontendProducts.filter((product) => getBalance(product) > 0 && getBalance(product) <= product.safetyStock).length;
  const outOfStockCount = frontendProducts.filter((product) => getBalance(product) === 0).length;
  const activeBorrowsCount = frontendBorrows.filter((borrow) => borrow.status === "borrowing").length;

  return NextResponse.json({
    totalItems: frontendProducts.length,
    totalQty,
    lowStockCount,
    outOfStockCount,
    activeBorrowsCount,
    totalDamaged: frontendProducts.reduce((sum, product) => sum + product.damaged, 0),
    totalLost: frontendProducts.reduce((sum, product) => sum + product.lost, 0),
  });
}
