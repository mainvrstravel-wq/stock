import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { mapTransaction } from "@/lib/stock";

export async function GET() {
  const transactions = await prisma.transaction.findMany({
    include: {
      product: true,
    },
    orderBy: {
      date: "desc",
    },
  });

  return NextResponse.json(transactions.map(mapTransaction));
}

export async function POST(request: Request) {
  const body = await request.json();
  const quantity = Number(body.quantity ?? 0);
  if (quantity <= 0) {
    return NextResponse.json({ message: "Quantity must be greater than zero" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: body.productId },
    include: { transactions: true },
  });

  if (!product) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  const received = product.transactions.filter((tx) => tx.type === "IN").reduce((sum, tx) => sum + tx.quantity, 0);
  const issued = product.transactions.filter((tx) => tx.type === "OUT").reduce((sum, tx) => sum + tx.quantity, 0);
  const balance = product.openingBalance + received - issued;

  if (body.type === "out" && balance < quantity) {
    return NextResponse.json({ message: "Insufficient stock" }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      productId: body.productId,
      type: body.type === "in" ? "IN" : "OUT",
      quantity,
      note: body.note || (body.type === "in" ? "นำสินค้าเข้าคลัง" : "จ่ายสินค้าออกจากคลัง"),
      date: body.date ? new Date(body.date) : new Date(),
    },
    include: {
      product: true,
    },
  });

  return NextResponse.json(mapTransaction(transaction), { status: 201 });
}
