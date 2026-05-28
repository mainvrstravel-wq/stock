import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { mapBorrow } from "@/lib/stock";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  if (!month) {
    return NextResponse.json({ message: "month is required" }, { status: 400 });
  }

  const borrows = await prisma.borrowRecord.findMany({
    include: { product: true, user: true },
    orderBy: { borrowedAt: "desc" },
  });

  const monthlyBorrows = borrows.map(mapBorrow).filter((borrow) => borrow.date.startsWith(month));
  return NextResponse.json(monthlyBorrows);
}
