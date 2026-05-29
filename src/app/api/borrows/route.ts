import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { mapBorrow, mapProduct } from "@/lib/stock";

export async function GET() {
  const borrows = await prisma.borrowRecord.findMany({
    include: {
      product: {
        select: { code: true, name: true, unit: true, itemType: true },
      },
      user: {
        select: { id: true, name: true },
      },
    },
    orderBy: { borrowedAt: "desc" },
  });
  return NextResponse.json(borrows.map(mapBorrow));
}

export async function POST(request: Request) {
  const body = await request.json();
  const quantity = Number(body.quantity ?? 0);
  if (quantity <= 0) {
    return NextResponse.json({ message: "Quantity must be greater than zero" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: body.productId } });
  const user = await prisma.user.findUnique({ where: { id: body.userId } });

  if (!product || !user) {
    return NextResponse.json({ message: "Product or user not found" }, { status: 404 });
  }

  const balance = product.initialQty + product.receivedQty - product.issuedQty - product.damagedQty - product.lostQty;
  if (balance < quantity) {
    return NextResponse.json({ message: "Insufficient stock" }, { status: 400 });
  }

  const updatedProduct = await prisma.product.update({
    where: { id: product.id },
    data: { issuedQty: product.issuedQty + quantity },
  });

  const borrow = await prisma.borrowRecord.create({
    data: {
      productId: product.id,
      userId: user.id,
      quantity,
      status: product.itemType === "RETURNABLE" ? "BORROWING" : "CONSUMED",
      note: body.note || (product.itemType === "RETURNABLE" ? "ยืมใช้งานหน้าไซต์" : "เบิกใช้แล้วหมดไป"),
      borrowedAt: new Date(),
    },
    include: {
      product: {
        select: { code: true, name: true, unit: true, itemType: true },
      },
      user: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ borrow: mapBorrow(borrow), product: mapProduct(updatedProduct) }, { status: 201 });
}
