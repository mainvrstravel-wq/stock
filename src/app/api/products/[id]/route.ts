import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { computeProduct } from "@/lib/stock";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const body = await request.json();
  const openingBalance = Number(body.initial ?? 0);

  await prisma.product.update({
    where: { id },
    data: {
      code: body.code,
      category: body.category,
      name: body.name,
      unit: body.unit,
      openingBalance,
    },
  });

  const initialTransaction = await prisma.transaction.findFirst({
    where: { productId: id, type: "INITIAL" },
    orderBy: { date: "asc" },
  });

  if (openingBalance > 0 && initialTransaction) {
    await prisma.transaction.update({
      where: { id: initialTransaction.id },
      data: { quantity: openingBalance, note: "ยอดยกมาเริ่มต้น" },
    });
  } else if (openingBalance > 0 && !initialTransaction) {
    await prisma.transaction.create({
      data: {
        productId: id,
        type: "INITIAL",
        quantity: openingBalance,
        note: "ยอดยกมาเริ่มต้น",
        date: new Date(),
      },
    });
  } else if (openingBalance <= 0 && initialTransaction) {
    await prisma.transaction.delete({ where: { id: initialTransaction.id } });
  }

  const updated = await prisma.product.findUniqueOrThrow({
    where: { id },
    include: { transactions: true },
  });

  return NextResponse.json(computeProduct(updated, updated.transactions));
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
