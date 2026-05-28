"use client";

import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Edit,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  Package,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

type Product = {
  id: string;
  code: string;
  category: string;
  name: string;
  unit: string;
  initial: number;
  received: number;
  issued: number;
};

type Transaction = {
  id: string;
  date: string;
  code: string;
  name: string;
  category: string;
  type: "initial" | "in" | "out";
  quantity: number;
  note: string;
};

type ProductForm = {
  id?: string;
  code: string;
  category: string;
  name: string;
  unit: string;
  initial: number;
  received: number;
  issued: number;
};

type AdjustForm = {
  productId: string;
  type: "in" | "out";
  quantity: number;
  note: string;
};

type ActiveTab = "dashboard" | "inventory" | "transactions" | "summary";

const defaultProductForm = (): ProductForm => ({
  code: "",
  category: "วัสดุช่างเหล็ก",
  name: "",
  unit: "อัน",
  initial: 0,
  received: 0,
  issued: 0,
});

async function loadStockData(
  setProducts: Dispatch<SetStateAction<Product[]>>,
  setTransactions: Dispatch<SetStateAction<Transaction[]>>,
) {
  const [productsResponse, transactionsResponse] = await Promise.all([
    fetch("/api/products", { cache: "no-store" }),
    fetch("/api/transactions", { cache: "no-store" }),
  ]);

  if (!productsResponse.ok || !transactionsResponse.ok) {
    throw new Error("Failed to load stock data");
  }

  const [productsData, transactionsData] = await Promise.all([
    productsResponse.json() as Promise<Product[]>,
    transactionsResponse.json() as Promise<Transaction[]>,
  ]);

  setProducts(productsData);
  setTransactions(transactionsData);
}

export default function Page() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [selectedStockStatus, setSelectedStockStatus] = useState("ทั้งหมด");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [summaryMonth, setSummaryMonth] = useState(String(new Date().getMonth() + 1));
  const [summaryYear, setSummaryYear] = useState(String(new Date().getFullYear()));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<ProductForm>(defaultProductForm());
  const [adjustData, setAdjustData] = useState<AdjustForm>({
    productId: "",
    type: "in",
    quantity: 1,
    note: "",
  });

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        await loadStockData(setProducts, setTransactions);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "โหลดข้อมูลจาก API ไม่สำเร็จ");
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return ["ทั้งหมด", ...Array.from(cats)];
  }, [products]);

  const stats = useMemo(() => {
    let totalQty = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      const balance = p.initial + p.received - p.issued;
      totalQty += balance;
      if (balance === 0) outOfStockCount += 1;
      else if (balance <= 5) lowStockCount += 1;
    });

    return {
      totalItems: products.length,
      totalQty,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === "ทั้งหมด" || p.category === selectedCategory;

      const balance = p.initial + p.received - p.issued;
      let matchesStatus = true;
      if (selectedStockStatus === "low") matchesStatus = balance > 0 && balance <= 5;
      else if (selectedStockStatus === "empty") matchesStatus = balance === 0;
      else if (selectedStockStatus === "available") matchesStatus = balance > 5;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, selectedStockStatus]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!transactionSearch.trim()) return true;
      const query = transactionSearch.toLowerCase();
      return (
        tx.code.toLowerCase().includes(query) ||
        tx.name.toLowerCase().includes(query) ||
        tx.category.toLowerCase().includes(query) ||
        tx.note.toLowerCase().includes(query)
      );
    });
  }, [transactions, transactionSearch]);

  const monthlySummary = useMemo(() => {
    const month = Number.parseInt(summaryMonth, 10);
    const year = Number.parseInt(summaryYear, 10);
    if (Number.isNaN(month) || Number.isNaN(year)) return [];

    return products.map((product) => {
      const related = transactions.filter((tx) => tx.code === product.code);
      const currentMonthTx = related.filter((tx) => {
        const date = new Date(tx.date.replace(" ", "T"));
        return date.getMonth() + 1 === month && date.getFullYear() === year;
      });

      const received = currentMonthTx.filter((tx) => tx.type === "in").reduce((sum, tx) => sum + tx.quantity, 0);
      const issued = currentMonthTx.filter((tx) => tx.type === "out").reduce((sum, tx) => sum + tx.quantity, 0);
      const balance = product.initial + product.received - product.issued;

      return {
        ...product,
        monthReceived: received,
        monthIssued: issued,
        endingBalance: balance,
      };
    });
  }, [products, transactions, summaryMonth, summaryYear]);

  const generateNextCode = () => {
    if (products.length === 0) return "STK0001";
    const maxNum = Math.max(
      ...products.map((p) => {
        const num = Number.parseInt(p.code.replace("STK", ""), 10);
        return Number.isNaN(num) ? 0 : num;
      }),
    );
    return `STK${String(maxNum + 1).padStart(4, "0")}`;
  };

  const openAddModal = () => {
    setCurrentProduct({ ...defaultProductForm(), code: generateNextCode() });
    setIsAddModalOpen(true);
  };

  const handleAddProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentProduct.name.trim()) return;
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentProduct),
    });
    if (!response.ok) {
      window.alert("บันทึกสินค้าไม่สำเร็จ");
      return;
    }
    await loadStockData(setProducts, setTransactions);
    setIsAddModalOpen(false);
  };

  const openEditModal = (product: Product) => {
    setCurrentProduct(product);
    setIsEditModalOpen(true);
  };

  const handleEditProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentProduct.id) return;
    const response = await fetch(`/api/products/${currentProduct.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentProduct),
    });
    if (!response.ok) {
      window.alert("แก้ไขสินค้าไม่สำเร็จ");
      return;
    }
    await loadStockData(setProducts, setTransactions);
    setIsEditModalOpen(false);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (window.confirm(`คุณต้องการลบรายการสินค้า "${name}" ใช่หรือไม่?`)) {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!response.ok) {
        window.alert("ลบสินค้าไม่สำเร็จ");
        return;
      }
      await loadStockData(setProducts, setTransactions);
    }
  };

  const openAdjustModal = (product: Product, defaultType: "in" | "out" = "in") => {
    setAdjustData({ productId: product.id, type: defaultType, quantity: 1, note: "" });
    setIsAdjustModalOpen(true);
  };

  const handleAdjustStock = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const product = products.find((p) => p.id === adjustData.productId);
    if (!product) return;

    const qty = Number(adjustData.quantity);
    if (qty <= 0) return;

    const currentBalance = product.initial + product.received - product.issued;
    if (adjustData.type === "out" && currentBalance < qty) {
      window.alert("ข้อผิดพลาด: ยอดสินค้าคงเหลือในสต็อกไม่เพียงพอต่อการจ่ายออก!");
      return;
    }

    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adjustData),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      window.alert(error?.message === "Insufficient stock" ? "ยอดคงเหลือไม่พอสำหรับเบิกออก" : "บันทึกรายการไม่สำเร็จ");
      return;
    }
    await loadStockData(setProducts, setTransactions);
    setIsAdjustModalOpen(false);
  };

  const selectedProduct = products.find((p) => p.id === adjustData.productId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg shadow-md shadow-blue-200">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">STK-Manager Pro</h1>
              <p className="text-xs text-slate-500 font-medium">ระบบคลังสินค้าวัสดุและอุปกรณ์</p>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
              <span>บันทึกอัตโนมัติเปิดอยู่</span>
            </div>
            <div className="text-slate-500">
              รายการธุรกรรม: <span className="font-semibold text-slate-700">{transactions.length}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">เมนูหลัก</p>
            <SidebarButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} icon={<LayoutDashboard className="h-5 w-5" />} label="แผงควบคุม (Dashboard)" />
            <SidebarButton active={activeTab === "inventory"} onClick={() => setActiveTab("inventory")} icon={<Package className="h-5 w-5" />} label="คลังสินค้า (Stock Inventory)" />
            <SidebarButton active={activeTab === "transactions"} onClick={() => setActiveTab("transactions")} icon={<History className="h-5 w-5" />} label="ประวัติรับ-จ่าย (History)" />
            <SidebarButton active={activeTab === "summary"} onClick={() => setActiveTab("summary")} icon={<FileSpreadsheet className="h-5 w-5" />} label="สรุปรายเดือน (Monthly Summary)" />

            <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
              <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">ทางลัดด่วน</p>
              <button onClick={openAddModal} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold rounded-lg transition-colors shadow-sm">
                <Plus className="h-4 w-4" />
                <span>เพิ่มสินค้าใหม่</span>
              </button>
            </div>
          </nav>
        </aside>

        <main className="flex-1 space-y-6">
          {isLoading && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              กำลังโหลดข้อมูลสินค้าจากฐานข้อมูล...
            </div>
          )}

          {loadError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              โหลดข้อมูลไม่สำเร็จ: {loadError}
            </div>
          )}

          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg shadow-blue-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Package className="w-48 h-48 rotate-12" />
                </div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold">ยินดีต้อนรับสู่ระบบคลังวัสดุ</h2>
                  <p className="text-blue-100 text-sm mt-1 max-w-xl">จัดการสต็อกวัสดุ ตรวจสอบยอดคงเหลือ รับเข้า เบิกออก และดูสรุปรายเดือนได้จากหน้าเดียว</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => setActiveTab("inventory")} className="bg-white text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm">ดูสต็อกทั้งหมด</button>
                    <button onClick={() => setActiveTab("summary")} className="bg-blue-600 text-white hover:bg-blue-500 border border-blue-500 px-4 py-2 rounded-lg text-xs font-semibold transition-colors">ไปหน้าสรุปรายเดือน</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<Package className="h-6 w-6" />} color="blue" label="สินค้าทั้งหมด" value={`${stats.totalItems} รายการ`} />
                <StatCard icon={<TrendingUp className="h-6 w-6" />} color="emerald" label="จำนวนหน่วยรวม" value={`${stats.totalQty} หน่วย`} />
                <StatCard icon={<AlertTriangle className="h-6 w-6" />} color="amber" label="ของใกล้หมด (≤ 5)" value={`${stats.lowStockCount} รายการ`} />
                <StatCard icon={<X className="h-6 w-6" />} color="rose" label="สินค้าหมดสต็อก" value={`${stats.outOfStockCount} รายการ`} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <span>รายการแจ้งเตือนคลังสินค้าเหลือน้อย</span>
                    </h3>
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-md font-medium">ควรเติมสต็อกด่วน</span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                    {products.filter((p) => p.initial + p.received - p.issued <= 5).map((p) => {
                      const balance = p.initial + p.received - p.issued;
                      return (
                        <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-sm text-slate-800">{p.name}</p>
                            <p className="text-xs text-slate-500">รหัส: {p.code} | หมวดหมู่: {p.category}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${balance === 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>คงเหลือ {balance} {p.unit}</span>
                            <button onClick={() => openAdjustModal(p, "in")} className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md font-semibold transition-colors">+ รับเข้าสต็อก</button>
                          </div>
                        </div>
                      );
                    })}
                    {products.filter((p) => p.initial + p.received - p.issued <= 5).length === 0 && <p className="text-center text-slate-400 py-6 text-sm">ไม่มีสินค้าใดเหลือน้อย ดีเยี่ยม!</p>}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                      <History className="h-5 w-5 text-blue-500" />
                      <span>ประวัติเบิกจ่ายล่าสุด</span>
                    </h3>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {transactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 border border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">{tx.code}</span>
                          <span className="text-[10px] text-slate-400">{tx.date}</span>
                        </div>
                        <p className="font-bold text-slate-900 truncate">{tx.name}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-500 truncate max-w-[120px]">{tx.note}</span>
                          <span className={`font-bold ${tx.type === "in" ? "text-emerald-600" : tx.type === "out" ? "text-rose-600" : "text-blue-600"}`}>{tx.type === "in" ? "+" : tx.type === "out" ? "-" : ""} {tx.quantity}</span>
                        </div>
                      </div>
                    ))}
                    {transactions.length === 0 && <p className="text-center text-slate-400 py-6 text-sm">ยังไม่มีธุรกรรมเกิดขึ้น</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6 animate-fadeIn">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                    <FileSpreadsheet className="text-emerald-600 h-5 w-5" />
                    <span>ตารางคลังสินค้า</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">ค้นหา คัดกรอง รับเข้า เบิกออก และแก้ไขข้อมูลสินค้าได้จากหน้าตารางนี้</p>
                </div>
                <button onClick={openAddModal} className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm">
                  <Plus className="h-4 w-4" />
                  <span>เพิ่มสินค้า</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="relative md:col-span-5">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="text" placeholder="ค้นหาด้วย รหัส, รายการสินค้า..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="md:col-span-3 flex items-center space-x-1.5">
                  <span className="text-xs text-slate-500 whitespace-nowrap">หมวดหมู่:</span>
                  <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full py-2 px-3 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="md:col-span-4 flex items-center space-x-1.5">
                  <span className="text-xs text-slate-500 whitespace-nowrap">สถานะ:</span>
                  <select value={selectedStockStatus} onChange={(e) => setSelectedStockStatus(e.target.value)} className="w-full py-2 px-3 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="ทั้งหมด">ทั้งหมด</option>
                    <option value="available">พร้อมใช้ (&gt; 5)</option>
                    <option value="low">ใกล้หมด (1 - 5)</option>
                    <option value="empty">หมดสต็อก (0)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">รหัสสินค้า</th>
                      <th className="px-4 py-3 text-left">หมวดหมู่</th>
                      <th className="px-4 py-3 text-left">รายการสินค้า</th>
                      <th className="px-4 py-3 text-center">หน่วยนับ</th>
                      <th className="px-3 py-3 text-center bg-blue-50 text-blue-800">ยอดยกมา</th>
                      <th className="px-3 py-3 text-center bg-emerald-50 text-emerald-800">รับเข้า (+)</th>
                      <th className="px-3 py-3 text-center bg-rose-50 text-rose-800">จ่ายออก (-)</th>
                      <th className="px-4 py-3 text-center bg-indigo-50 text-indigo-900 font-bold">คงเหลือ</th>
                      <th className="px-4 py-3 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredProducts.map((p) => {
                      const balance = p.initial + p.received - p.issued;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-700">{p.code}</td>
                          <td className="px-4 py-3.5 text-slate-500">{p.category}</td>
                          <td className="px-4 py-3.5 font-medium text-slate-900">{p.name}</td>
                          <td className="px-4 py-3.5 text-center text-slate-500">{p.unit}</td>
                          <td className="px-3 py-3.5 text-center bg-blue-50/50 font-semibold text-slate-700">{p.initial}</td>
                          <td className="px-3 py-3.5 text-center bg-emerald-50/50 text-emerald-600 font-semibold">{p.received}</td>
                          <td className="px-3 py-3.5 text-center bg-rose-50/50 text-rose-600 font-semibold">{p.issued}</td>
                          <td className="px-4 py-3.5 text-center bg-indigo-50/50">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${balance === 0 ? "bg-rose-100 text-rose-800" : balance <= 5 ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-900"}`}>{balance}</span>
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                            <button onClick={() => openAdjustModal(p, "in")} title="รับของเข้า" className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 p-1.5 rounded"><ArrowUpRight className="h-4 w-4" /></button>
                            <button onClick={() => openAdjustModal(p, "out")} title="จ่ายของออก" className="text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 p-1.5 rounded"><ArrowDownLeft className="h-4 w-4" /></button>
                            <button onClick={() => openEditModal(p)} title="แก้ไขข้อมูลสินค้า" className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 p-1.5 rounded"><Edit className="h-4 w-4" /></button>
                            <button onClick={() => void handleDeleteProduct(p.id, p.name)} title="ลบรายการสินค้า" className="text-xs bg-slate-100 text-rose-600 hover:bg-rose-50 p-1.5 rounded"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center text-slate-400 py-12 bg-slate-50/50">
                          <Package className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                          <p className="text-sm font-medium">ไม่พบสินค้าที่ตรงตามเงื่อนไขค้นหา</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between pt-2">
                <p>* สูตรคำนวณ: คงเหลือ = ยอดยกมา + รับเข้า - จ่ายออก</p>
                <p>จำนวนที่แสดงอยู่ทั้งหมด: {filteredProducts.length} รายการสินค้า</p>
              </div>
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 animate-fadeIn">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <History className="text-blue-600 h-5 w-5" />
                  <span>บันทึกประวัติการเดินคลังสินค้า</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">รายการรับเข้า ยอดยกมา และจ่ายออก เรียงจากล่าสุดไปเก่าสุด</p>
              </div>

              <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="ค้นหาธุรกรรมด้วย รหัสสินค้า / ชื่อ / หมายเหตุ" value={transactionSearch} onChange={(e) => setTransactionSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-left text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">วัน-เวลา</th>
                      <th className="px-4 py-3">รหัส</th>
                      <th className="px-4 py-3">หมวดหมู่</th>
                      <th className="px-4 py-3">รายการสินค้า</th>
                      <th className="px-4 py-3 text-center">ประเภท</th>
                      <th className="px-4 py-3 text-center">จำนวน</th>
                      <th className="px-4 py-3">หมายเหตุเพิ่มเติม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 font-mono">{tx.date}</td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{tx.code}</td>
                        <td className="px-4 py-3 text-slate-500">{tx.category}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{tx.name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block ${tx.type === "in" ? "bg-emerald-100 text-emerald-800" : tx.type === "out" ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-blue-800"}`}>{tx.type === "in" ? "รับเข้า" : tx.type === "out" ? "จ่ายออก" : "ยอดยกมา"}</span>
                        </td>
                        <td className={`px-4 py-3 text-center font-bold ${tx.type === "in" ? "text-emerald-600" : tx.type === "out" ? "text-rose-600" : "text-blue-600"}`}>{tx.type === "in" ? "+" : tx.type === "out" ? "-" : ""}{tx.quantity}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{tx.note}</td>
                      </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-slate-400 py-12"><p>ไม่พบธุรกรรมที่ตรงกับคำค้น</p></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "summary" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 animate-fadeIn">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                    <FileSpreadsheet className="text-blue-600 h-5 w-5" />
                    <span>สรุปรายเดือน</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">ดูภาพรวมยอดรับเข้า จ่ายออก และคงเหลือตามเดือนที่เลือก</p>
                </div>
                <div className="flex gap-3">
                  <select value={summaryMonth} onChange={(e) => setSummaryMonth(e.target.value)} className="py-2 px-3 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((month) => <option key={month} value={month}>{`เดือน ${month}`}</option>)}
                  </select>
                  <input value={summaryYear} onChange={(e) => setSummaryYear(e.target.value)} className="w-24 py-2 px-3 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={<ArrowUpRight className="h-6 w-6" />} color="emerald" label="รับเข้ารวมเดือนนี้" value={`${monthlySummary.reduce((sum, item) => sum + item.monthReceived, 0)} หน่วย`} />
                <StatCard icon={<ArrowDownLeft className="h-6 w-6" />} color="rose" label="จ่ายออกรวมเดือนนี้" value={`${monthlySummary.reduce((sum, item) => sum + item.monthIssued, 0)} หน่วย`} />
                <StatCard icon={<Package className="h-6 w-6" />} color="blue" label="คงเหลือรวมปัจจุบัน" value={`${monthlySummary.reduce((sum, item) => sum + item.endingBalance, 0)} หน่วย`} />
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">รหัสสินค้า</th>
                      <th className="px-4 py-3 text-left">หมวดหมู่</th>
                      <th className="px-4 py-3 text-left">รายการสินค้า</th>
                      <th className="px-4 py-3 text-center">ยอดยกมา</th>
                      <th className="px-4 py-3 text-center">รับเข้าเดือนนี้</th>
                      <th className="px-4 py-3 text-center">จ่ายออกเดือนนี้</th>
                      <th className="px-4 py-3 text-center">คงเหลือปัจจุบัน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {monthlySummary.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{item.code}</td>
                        <td className="px-4 py-3 text-slate-500">{item.category}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                        <td className="px-4 py-3 text-center">{item.initial}</td>
                        <td className="px-4 py-3 text-center text-emerald-600 font-semibold">{item.monthReceived}</td>
                        <td className="px-4 py-3 text-center text-rose-600 font-semibold">{item.monthIssued}</td>
                        <td className="px-4 py-3 text-center font-bold">{item.endingBalance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {isAddModalOpen && (
        <ProductModal title="เพิ่มสินค้าในบัญชี" product={currentProduct} setProduct={setCurrentProduct} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddProduct} submitLabel="ยืนยันบันทึก" />
      )}

      {isEditModalOpen && (
        <ProductModal title={`แก้ไขข้อมูลสินค้า (${currentProduct.code})`} product={currentProduct} setProduct={setCurrentProduct} onClose={() => setIsEditModalOpen(false)} onSubmit={handleEditProduct} submitLabel="บันทึกการปรับปรุง" disableCode />
      )}

      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-scaleUp">
            <div className={`px-6 py-4 flex items-center justify-between text-white ${adjustData.type === "in" ? "bg-emerald-600" : "bg-rose-600"}`}>
              <h3 className="font-bold text-base flex items-center space-x-1">
                {adjustData.type === "in" ? <><ArrowUpRight className="h-5 w-5" /><span>รับของเข้าคลังสินค้า</span></> : <><ArrowDownLeft className="h-5 w-5" /><span>จ่ายของออกจากคลัง (เบิกวัสดุ)</span></>}
              </h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-white/80 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleAdjustStock} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded border border-slate-100 text-xs space-y-1">
                <p className="font-bold text-slate-500">สินค้าที่เลือก: <span className="text-slate-900">{selectedProduct.name}</span></p>
                <p className="font-bold text-slate-500">รหัสสินค้า: <span className="font-mono text-slate-950">{selectedProduct.code}</span></p>
                <p className="font-bold text-slate-500">ยอดคงเหลือปัจจุบัน: <span className="text-blue-700 text-sm font-extrabold">{selectedProduct.initial + selectedProduct.received - selectedProduct.issued} {selectedProduct.unit}</span></p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ประเภทการทำรายการ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setAdjustData((prev) => ({ ...prev, type: "in" }))} className={`py-2 text-sm rounded font-bold transition-all border ${adjustData.type === "in" ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>+ นำเข้า (Receive)</button>
                  <button type="button" onClick={() => setAdjustData((prev) => ({ ...prev, type: "out" }))} className={`py-2 text-sm rounded font-bold transition-all border ${adjustData.type === "out" ? "bg-rose-50 border-rose-500 text-rose-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>- จ่ายออก (Issue/เบิก)</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">จำนวนที่ทำรายการ ({selectedProduct.unit})</label>
                  <input type="number" min="1" required value={adjustData.quantity} onChange={(e) => setAdjustData((prev) => ({ ...prev, quantity: Number.parseInt(e.target.value, 10) || 1 }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-center font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ผู้เบิก/โครงการ/หมายเหตุ</label>
                  <input type="text" placeholder="เช่น ช่างแดง, หน้างาน A" value={adjustData.note} onChange={(e) => setAdjustData((prev) => ({ ...prev, note: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded text-slate-500 text-sm font-medium hover:bg-slate-50">ยกเลิก</button>
                <button type="submit" className={`px-4 py-2 rounded text-sm font-bold text-white shadow transition-colors ${adjustData.type === "in" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>บันทึกรายการ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 space-y-1">
          <p>© 2026 STK-Manager Pro - NextJS Dashboard Mockup. All rights reserved.</p>
          <p className="text-slate-400">ข้อมูลถูกบันทึกใน SQLite ผ่าน API ของ Next.js และนำเข้ารายการเริ่มต้นจากไฟล์ Excel แล้ว</p>
        </div>
      </footer>
    </div>
  );
}

function SidebarButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatCard({ icon, color, label, value }: { icon: ReactNode; color: "blue" | "emerald" | "amber" | "rose"; label: string; value: string }) {
  const styles = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
      <div className={`p-3 rounded-lg ${styles[color]}`}>{icon}</div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function ProductModal({ title, product, setProduct, onClose, onSubmit, submitLabel, disableCode = false }: { title: string; product: ProductForm; setProduct: Dispatch<SetStateAction<ProductForm>>; onClose: () => void; onSubmit: (e: FormEvent<HTMLFormElement>) => void; submitLabel: string; disableCode?: boolean }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-scaleUp">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-base">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">รหัสสินค้า</label>
              <input type="text" required disabled={disableCode} value={product.code} onChange={(e) => setProduct((prev) => ({ ...prev, code: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono disabled:bg-slate-100 disabled:text-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">หมวดหมู่</label>
              <input type="text" required value={product.category} onChange={(e) => setProduct((prev) => ({ ...prev, category: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ชื่อรายการสินค้า</label>
            <input type="text" placeholder="เช่น ตะปู 3 นิ้ว, ค้อน, ฯลฯ" required value={product.name} onChange={(e) => setProduct((prev) => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">หน่วยนับ</label>
              <select value={product.unit} onChange={(e) => setProduct((prev) => ({ ...prev, unit: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="อัน">อัน</option>
                <option value="ม้วน">ม้วน</option>
                <option value="กล่อง">กล่อง</option>
                <option value="ถุง">ถุง</option>
                <option value="กิโลกรัม">กิโลกรัม</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ยอดยกมาเริ่มต้น</label>
              <input type="number" min="0" required value={product.initial} onChange={(e) => setProduct((prev) => ({ ...prev, initial: Number.parseInt(e.target.value, 10) || 0 }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-200 rounded text-slate-500 text-sm font-medium hover:bg-slate-50">ยกเลิก</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 shadow">{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
