import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { mapBorrow } from "@/lib/stock";

export async function GET() {
  const borrows = await prisma.borrowRecord.findMany({
    include: { product: true, user: true },
    orderBy: { borrowedAt: "desc" },
  });

  return NextResponse.json(borrows.map(mapBorrow));
}
