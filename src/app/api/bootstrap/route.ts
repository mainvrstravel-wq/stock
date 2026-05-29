import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { mapBorrow, mapProduct, mapUser } from "@/lib/stock";

export async function GET() {
  const [users, products, borrows] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, role: true, pin: true, avatar: true, department: true },
      orderBy: { role: "asc" },
    }),
    prisma.product.findMany({
      select: {
        id: true,
        code: true,
        category: true,
        name: true,
        unit: true,
        initialQty: true,
        receivedQty: true,
        issuedQty: true,
        damagedQty: true,
        lostQty: true,
        safetyStock: true,
        itemType: true,
      },
      orderBy: { code: "asc" },
    }),
    prisma.borrowRecord.findMany({
      include: {
        product: {
          select: { code: true, name: true, unit: true, itemType: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { borrowedAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    users: users.map(mapUser),
    products: products.map(mapProduct),
    borrows: borrows.map(mapBorrow),
  });
}
