import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { mapBorrow } from "@/lib/stock";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;

  const updated = await prisma.borrowRecord.update({
    where: { id },
    data: {
      status: "FULLY_CONSUMED",
      returnedAt: new Date(),
    },
    include: { product: true, user: true },
  });

  return NextResponse.json(mapBorrow(updated));
}
