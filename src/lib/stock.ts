import { BorrowStatus, ItemType, UserRole, type BorrowRecord, type Product, type User } from "@prisma/client";

export type FrontendUser = {
  id: string;
  name: string;
  role: "admin" | "worker";
  pin: string;
  avatar: string;
  department: string;
};

export type FrontendProduct = {
  id: string;
  code: string;
  category: string;
  name: string;
  unit: string;
  initial: number;
  received: number;
  issued: number;
  damaged: number;
  lost: number;
  safetyStock: number;
  itemType: "returnable" | "consumable";
};

export type BorrowWithRelations = BorrowRecord & {
  product: Product;
  user: User;
};

export type FrontendBorrow = {
  id: string;
  date: string;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  userId: string;
  userName: string;
  itemType: "returnable" | "consumable";
  status: "borrowing" | "returned" | "consumed" | "fully_consumed" | "damaged" | "lost";
  leftoverReturned: number;
  returnDate: string | null;
  note: string;
};

export function formatNumber(value: number) {
  return Number(Number(value).toFixed(2));
}

export function getBalance(product: FrontendProduct) {
  return formatNumber(product.initial + product.received - product.issued - product.damaged - product.lost);
}

export function mapUser(user: User): FrontendUser {
  return {
    id: user.id,
    name: user.name,
    role: user.role === UserRole.ADMIN ? "admin" : "worker",
    pin: user.pin,
    avatar: user.avatar,
    department: user.department,
  };
}

export function mapProduct(product: Product): FrontendProduct {
  return {
    id: product.id,
    code: product.code,
    category: product.category,
    name: product.name,
    unit: product.unit,
    initial: formatNumber(product.initialQty),
    received: formatNumber(product.receivedQty),
    issued: formatNumber(product.issuedQty),
    damaged: formatNumber(product.damagedQty),
    lost: formatNumber(product.lostQty),
    safetyStock: formatNumber(product.safetyStock),
    itemType: product.itemType === ItemType.RETURNABLE ? "returnable" : "consumable",
  };
}

export function mapBorrow(borrow: BorrowWithRelations): FrontendBorrow {
  const statusMap: Record<BorrowStatus, FrontendBorrow["status"]> = {
    BORROWING: "borrowing",
    RETURNED: "returned",
    CONSUMED: "consumed",
    FULLY_CONSUMED: "fully_consumed",
    DAMAGED: "damaged",
    LOST: "lost",
  };

  return {
    id: borrow.id,
    date: borrow.borrowedAt.toISOString().slice(0, 16).replace("T", " "),
    code: borrow.product.code,
    name: borrow.product.name,
    quantity: formatNumber(borrow.quantity),
    unit: borrow.product.unit,
    userId: borrow.userId,
    userName: borrow.user.name,
    itemType: borrow.product.itemType === ItemType.RETURNABLE ? "returnable" : "consumable",
    status: statusMap[borrow.status],
    leftoverReturned: formatNumber(borrow.leftoverReturned),
    returnDate: borrow.returnedAt ? borrow.returnedAt.toISOString().slice(0, 16).replace("T", " ") : null,
    note: borrow.note,
  };
}
