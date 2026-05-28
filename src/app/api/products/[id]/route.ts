import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { mapProduct } from "@/lib/stock";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const body = await request.json();

  const product = await prisma.product.update({
    where: { id },
    data: {
      code: body.code,
      category: body.category,
      name: body.name,
      unit: body.unit,
      initialQty: Number(body.initial ?? 0),
      receivedQty: Number(body.received ?? 0),
      issuedQty: Number(body.issued ?? 0),
      damagedQty: Number(body.damaged ?? 0),
      lostQty: Number(body.lost ?? 0),
      safetyStock: Number(body.safetyStock ?? 5),
      itemType: body.itemType === "consumable" ? "CONSUMABLE" : "RETURNABLE",
    },
  });

  return NextResponse.json(mapProduct(product));
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
