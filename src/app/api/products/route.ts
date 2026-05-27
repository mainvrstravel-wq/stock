import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { computeProduct } from "@/lib/stock";

export async function GET() {
  const products = await prisma.product.findMany({
    include: {
      transactions: true,
    },
    orderBy: {
      code: "asc",
    },
  });

  return NextResponse.json(products.map((product) => computeProduct(product, product.transactions)));
}

export async function POST(request: Request) {
  const body = await request.json();
  const openingBalance = Number(body.initial ?? 0);

  const product = await prisma.product.create({
    data: {
      code: body.code,
      category: body.category,
      name: body.name,
      unit: body.unit,
      openingBalance,
      transactions:
        openingBalance > 0
          ? {
              create: {
                type: "INITIAL",
                quantity: openingBalance,
                note: "ยอดยกมาเริ่มต้น",
                date: new Date(),
              },
            }
          : undefined,
    },
    include: {
      transactions: true,
    },
  });

  return NextResponse.json(computeProduct(product, product.transactions), { status: 201 });
}
