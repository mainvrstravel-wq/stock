import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { mapBorrow, mapProduct, mapUser } from "@/lib/stock";

export async function GET() {
  const [users, products, borrows] = await Promise.all([
    prisma.user.findMany({ orderBy: { role: "asc" } }),
    prisma.product.findMany({ orderBy: { code: "asc" } }),
    prisma.borrowRecord.findMany({
      include: { product: true, user: true },
      orderBy: { borrowedAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    users: users.map(mapUser),
    products: products.map(mapProduct),
    borrows: borrows.map(mapBorrow),
  });
}
