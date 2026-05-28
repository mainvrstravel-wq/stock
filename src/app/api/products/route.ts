import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { mapProduct } from "@/lib/stock";

export async function GET() {
  const products = await prisma.product.findMany({ orderBy: { code: "asc" } });
  return NextResponse.json(products.map(mapProduct));
}

export async function POST(request: Request) {
  const body = await request.json();

  const product = await prisma.product.create({
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

  return NextResponse.json(mapProduct(product), { status: 201 });
}
