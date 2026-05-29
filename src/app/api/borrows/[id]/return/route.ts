import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { mapBorrow, mapProduct } from "@/lib/stock";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  const borrow = await prisma.borrowRecord.findUnique({
    where: { id },
    include: { product: true, user: true },
  });

  if (!borrow) return NextResponse.json({ message: "Borrow not found" }, { status: 404 });
  if (borrow.status !== "BORROWING") return NextResponse.json({ message: "Borrow is not active" }, { status: 400 });

  const product = await prisma.product.update({
    where: { id: borrow.productId },
    data: { issuedQty: Math.max(0, borrow.product.issuedQty - borrow.quantity) },
  });

  const updated = await prisma.borrowRecord.update({
    where: { id },
    data: { status: "RETURNED", returnedAt: new Date() },
    include: {
      product: {
        select: { code: true, name: true, unit: true, itemType: true },
      },
      user: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ borrow: mapBorrow(updated), product: mapProduct(product) });
}
