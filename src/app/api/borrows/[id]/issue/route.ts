import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { mapBorrow } from "@/lib/stock";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const body = await request.json();
  const reportQty = Number(body.quantity ?? 0);
  const issueType = body.type === "lost" ? "LOST" : "DAMAGED";

  const borrow = await prisma.borrowRecord.findUnique({
    where: { id },
    include: { product: true, user: true },
  });

  if (!borrow) return NextResponse.json({ message: "Borrow not found" }, { status: 404 });
  if (reportQty <= 0) return NextResponse.json({ message: "Quantity must be greater than zero" }, { status: 400 });

  const maxReportable = borrow.quantity - borrow.leftoverReturned;
  if (reportQty > maxReportable) {
    return NextResponse.json({ message: "Issue quantity exceeds borrowed quantity" }, { status: 400 });
  }

  await prisma.product.update({
    where: { id: borrow.productId },
    data: {
      issuedQty: Math.max(0, borrow.product.issuedQty - reportQty),
      damagedQty: issueType === "DAMAGED" ? borrow.product.damagedQty + reportQty : borrow.product.damagedQty,
      lostQty: issueType === "LOST" ? borrow.product.lostQty + reportQty : borrow.product.lostQty,
    },
  });

  let updated;
  if (reportQty === maxReportable) {
    updated = await prisma.borrowRecord.update({
      where: { id },
      data: {
        status: issueType,
        returnedAt: new Date(),
        note: `${borrow.note} [แจ้งเรื่อง: ${body.note || "ไม่ระบุเหตุผล"}]`,
      },
      include: { product: true, user: true },
    });
  } else {
    updated = await prisma.borrowRecord.update({
      where: { id },
      data: {
        quantity: borrow.quantity - reportQty,
      },
      include: { product: true, user: true },
    });

    await prisma.borrowRecord.create({
      data: {
        productId: borrow.productId,
        userId: borrow.userId,
        quantity: reportQty,
        status: issueType,
        borrowedAt: borrow.borrowedAt,
        returnedAt: new Date(),
        note: `แยกจากใบเบิกเดิม [แจ้งเรื่อง: ${body.note || "ไม่ระบุเหตุผล"}]`,
      },
    });
  }

  return NextResponse.json(mapBorrow(updated));
}
