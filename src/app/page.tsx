"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Calendar,
  Check,
  ChevronRight,
  Download,
  Edit,
  Flame,
  History,
  LayoutDashboard,
  Lock,
  LogOut,
  Package,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

type User = {
  id: string;
  name: string;
  role: "admin" | "worker";
  pin: string;
  avatar: string;
  department: string;
};

type Product = {
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

type Borrow = {
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

type ProductForm = {
  id?: string;
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

type Toast = {
  message: string;
  type: "success" | "error" | "warning";
};

const defaultProductForm = (): ProductForm => ({
  code: "",
  category: "วัสดุช่างเหล็ก",
  name: "",
  unit: "อัน",
  initial: 0,
  received: 0,
  issued: 0,
  damaged: 0,
  lost: 0,
  safetyStock: 5,
  itemType: "returnable",
});

const formatNumber = (num: number) => Number(Number(num).toFixed(2));

const getBalance = (product: Product) =>
  formatNumber(product.initial + product.received - product.issued - product.damaged - product.lost);

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export default function Page() {
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [activeTab, setActiveTab] = useState<"dashboard" | "inventory" | "transactions">("inventory");
  const [dashboardSubTab, setDashboardSubTab] = useState<"overview" | "monthly">("overview");
  const [selectedMonth, setSelectedMonth] = useState("2026-05");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [selectedStockStatus, setSelectedStockStatus] = useState("ทั้งหมด");

  const [toast, setToast] = useState<Toast | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isPartialReturnModalOpen, setIsPartialReturnModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; productId: string | null; productName: string }>({
    isOpen: false,
    productId: null,
    productName: "",
  });

  const [currentProduct, setCurrentProduct] = useState<ProductForm>(defaultProductForm());
  const [selectedProductForBorrow, setSelectedProductForBorrow] = useState<Product | null>(null);
  const [borrowFormData, setBorrowFormData] = useState({ quantity: 1, note: "" });
  const [selectedBorrowForIssue, setSelectedBorrowForIssue] = useState<Borrow | null>(null);
  const [issueFormData, setIssueFormData] = useState({ type: "damaged" as "damaged" | "lost", quantity: 1, note: "" });
  const [selectedBorrowForPartialReturn, setSelectedBorrowForPartialReturn] = useState<Borrow | null>(null);
  const [partialReturnQty, setPartialReturnQty] = useState("");

  const showToast = (message: string, type: Toast["type"] = "success") => setToast({ message, type });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadBootstrap = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchJson<{ users: User[]; products: Product[]; borrows: Borrow[] }>("/api/bootstrap", { cache: "no-store" });
      setUsers(data.users);
      setProducts(data.products);
      setBorrows(data.borrows);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBootstrap();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return ["ทั้งหมด", ...Array.from(cats)];
  }, [products]);

  const stats = useMemo(() => {
    let totalQty = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalDamaged = 0;
    let totalLost = 0;

    products.forEach((p) => {
      const balance = getBalance(p);
      totalQty += balance;
      totalDamaged += p.damaged;
      totalLost += p.lost;

      if (balance === 0) outOfStockCount += 1;
      else if (balance <= p.safetyStock) lowStockCount += 1;
    });

    return {
      totalItems: products.length,
      totalQty: formatNumber(totalQty),
      lowStockCount,
      outOfStockCount,
      activeBorrowsCount: borrows.filter((b) => b.status === "borrowing").length,
      totalDamaged: formatNumber(totalDamaged),
      totalLost: formatNumber(totalLost),
    };
  }, [products, borrows]);

  const monthlyStats = useMemo(() => {
    const monthlyBorrows = borrows.filter((b) => b.date.startsWith(selectedMonth));

    let totalIssued = 0;
    let totalReturned = 0;
    let totalDamaged = 0;
    let totalLost = 0;
    let totalConsumed = 0;
    const itemUsageMap: Record<string, number> = {};

    monthlyBorrows.forEach((b) => {
      if (b.status === "returned") totalReturned += b.quantity;
      if (b.status === "damaged") totalDamaged += b.quantity;
      if (b.status === "lost") totalLost += b.quantity;
      if (b.status === "consumed" || b.status === "fully_consumed") totalConsumed += b.quantity - b.leftoverReturned;

      totalIssued += b.quantity;
      const usedQty = b.quantity - b.leftoverReturned;
      itemUsageMap[b.name] = (itemUsageMap[b.name] || 0) + usedQty;
    });

    const topItems = Object.entries(itemUsageMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      monthlyBorrows,
      totalIssued: formatNumber(totalIssued),
      totalReturned: formatNumber(totalReturned),
      totalDamaged: formatNumber(totalDamaged),
      totalLost: formatNumber(totalLost),
      totalConsumed: formatNumber(totalConsumed),
      topItems,
    };
  }, [borrows, selectedMonth]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    borrows.forEach((b) => months.add(b.date.substring(0, 7)));
    if (months.size === 0) months.add(selectedMonth);
    return Array.from(months).sort().reverse();
  }, [borrows, selectedMonth]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "ทั้งหมด" || p.category === selectedCategory;
      const balance = getBalance(p);

      let matchesStatus = true;
      if (selectedStockStatus === "low") matchesStatus = balance > 0 && balance <= p.safetyStock;
      else if (selectedStockStatus === "empty") matchesStatus = balance === 0;
      else if (selectedStockStatus === "normal") matchesStatus = balance > p.safetyStock;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, selectedStockStatus]);

  const myBorrows = useMemo(() => {
    if (!currentUser) return [];
    return borrows.filter((b) => b.userId === currentUser.id);
  }, [borrows, currentUser]);

  const visibleBorrows = currentUser?.role === "admin" ? borrows : myBorrows;

  const mobileNavItems = currentUser?.role === "admin"
    ? [
        { key: "dashboard" as const, label: "แดชบอร์ด", icon: <LayoutDashboard className="h-4 w-4" /> },
        { key: "inventory" as const, label: "คลัง", icon: <Package className="h-4 w-4" /> },
        { key: "transactions" as const, label: "ประวัติ", icon: <History className="h-4 w-4" /> },
      ]
    : [
        { key: "inventory" as const, label: "คลัง", icon: <Package className="h-4 w-4" /> },
        { key: "transactions" as const, label: "ของฉัน", icon: <History className="h-4 w-4" /> },
      ];

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const foundUser = users.find((user) => user.pin === pinInput);
    if (!foundUser) {
      setLoginError("รหัส PIN ไม่ถูกต้อง! กรุณาลองใหม่อีกครั้ง");
      return;
    }

    setCurrentUser(foundUser);
    setPinInput("");
    setLoginError("");
    setActiveTab(foundUser.role === "admin" ? "dashboard" : "inventory");
    showToast(`ยินดีต้อนรับคุณ ${foundUser.name}!`, "success");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    showToast("ออกจากระบบเรียบร้อยแล้ว", "warning");
  };

  const generateNextCode = () => {
    if (products.length === 0) return "STK0001";
    const maxNum = Math.max(...products.map((p) => Number.parseInt(p.code.replace("STK", ""), 10) || 0));
    return `STK${String(maxNum + 1).padStart(4, "0")}`;
  };

  const openAddModal = () => {
    setCurrentProduct({ ...defaultProductForm(), code: generateNextCode() });
    setIsAddModalOpen(true);
  };

  const handleAddProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentProduct.name.trim()) {
      showToast("กรุณากรอกชื่อวัสดุพัสดุ!", "error");
      return;
    }

    const createdProduct = await fetchJson<Product>("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentProduct),
    });

    setIsAddModalOpen(false);
    setProducts((prev) => [...prev, createdProduct].sort((a, b) => a.code.localeCompare(b.code)));
    showToast(`ลงทะเบียนสินค้า "${currentProduct.name}" เรียบร้อย!`, "success");
  };

  const openEditModal = (product: Product) => {
    setCurrentProduct(product);
    setIsEditModalOpen(true);
  };

  const handleEditProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentProduct.id) return;

    const updatedProduct = await fetchJson<Product>(`/api/products/${currentProduct.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentProduct),
    });

    setIsEditModalOpen(false);
    setProducts((prev) => prev.map((product) => (product.id === updatedProduct.id ? updatedProduct : product)));
    showToast("ปรับปรุงข้อมูลเรียบร้อย!", "success");
  };

  const triggerDeleteProduct = (id: string, name: string) => {
    setDeleteConfirm({ isOpen: true, productId: id, productName: name });
  };

  const executeDeleteProduct = async () => {
    if (!deleteConfirm.productId) return;
    await fetchJson(`/api/products/${deleteConfirm.productId}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((product) => product.id !== deleteConfirm.productId));
    const deletedName = deleteConfirm.productName;
    setDeleteConfirm({ isOpen: false, productId: null, productName: "" });
    showToast(`ลบรายการ "${deletedName}" แล้ว`, "warning");
  };

  const openBorrowModal = (product: Product) => {
    setSelectedProductForBorrow(product);
    setBorrowFormData({ quantity: 1, note: "" });
    setIsBorrowModalOpen(true);
  };

  const handleBorrowSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProductForBorrow || !currentUser) return;

    await fetchJson("/api/borrows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: selectedProductForBorrow.id,
        userId: currentUser.id,
        quantity: borrowFormData.quantity,
        note: borrowFormData.note,
      }),
    });

    setIsBorrowModalOpen(false);
    await loadBootstrap();
    showToast(`บันทึกขอเบิก "${selectedProductForBorrow.name}" เรียบร้อยแล้ว`, "success");
  };

  const handleReturnProduct = async (borrowId: string) => {
    await fetchJson(`/api/borrows/${borrowId}/return`, { method: "POST" });
    await loadBootstrap();
    showToast("บันทึกรับคืนสำเร็จ", "success");
  };

  const handlePartialReturnOpen = (borrowRecord: Borrow) => {
    setSelectedBorrowForPartialReturn(borrowRecord);
    setPartialReturnQty("");
    setIsPartialReturnModalOpen(true);
  };

  const handlePartialReturnSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBorrowForPartialReturn) return;
    await fetchJson(`/api/borrows/${selectedBorrowForPartialReturn.id}/partial-return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: partialReturnQty }),
    });
    setIsPartialReturnModalOpen(false);
    await loadBootstrap();
    showToast("บันทึกคืนเศษวัสดุสำเร็จ", "success");
  };

  const handleMarkFullyConsumed = async (borrowId: string) => {
    await fetchJson(`/api/borrows/${borrowId}/mark-consumed`, { method: "POST" });
    await loadBootstrap();
    showToast("อัปเดตใบเบิกเป็นใช้หมดเรียบร้อย", "success");
  };

  const handleIssueReportOpen = (borrowRecord: Borrow) => {
    setSelectedBorrowForIssue(borrowRecord);
    setIssueFormData({
      type: "damaged",
      quantity: formatNumber(borrowRecord.quantity - borrowRecord.leftoverReturned),
      note: "",
    });
    setIsIssueModalOpen(true);
  };

  const handleIssueReportSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBorrowForIssue) return;
    await fetchJson(`/api/borrows/${selectedBorrowForIssue.id}/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(issueFormData),
    });
    setIsIssueModalOpen(false);
    await loadBootstrap();
    showToast(`ลงประวัติ "${selectedBorrowForIssue.name}" สำเร็จ`, "warning");
  };

  const handleMockExport = (format: string) => {
    showToast(`จัดเตรียมเอกสารประเภท ${format} เสร็จสิ้น!`, "success");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col pb-20 md:pb-0">
      {toast && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 z-50 animate-bounce">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-xl shadow-2xl border ${toast.type === "success" ? "bg-emerald-600 border-emerald-500 text-white" : toast.type === "error" ? "bg-rose-600 border-rose-500 text-white" : "bg-amber-500 border-amber-400 text-slate-950"}`}>
            {toast.type === "success" && <Check className="h-5 w-5 shrink-0" />}
            {toast.type === "error" && <AlertTriangle className="h-5 w-5 shrink-0" />}
            {toast.type === "warning" && <AlertCircle className="h-5 w-5 shrink-0" />}
            <span className="text-sm font-bold">{toast.message}</span>
          </div>
        </div>
      )}

      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-900 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg"><Package className="h-5 w-5 text-white" /></div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-black tracking-tight">สโตร์คลังอัจฉริยะ</span>
              <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1 py-0.5 rounded font-bold">V-Claims</span>
            </div>
            <p className="text-[10px] text-slate-400">ระบบคัดแยกยืม-คืน & แจ้งยอดชำรุดเสียหาย</p>
          </div>
        </div>
        {currentUser && (
          <div className="flex items-center space-x-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-200">{currentUser.name}</p>
              <p className="text-[9px] text-slate-400">{currentUser.department}</p>
            </div>
            <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800 flex items-center space-x-2">
              <span className="text-sm">{currentUser.avatar}</span>
              <button onClick={handleLogout} className="text-rose-400 hover:text-rose-300 text-xs p-1" title="ออกจากระบบ"><LogOut className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}
      </header>

      {!currentUser ? (
        <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full space-y-6 shadow-xl text-center">
            <div className="w-16 h-16 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto shadow-inner"><Lock className="h-7 w-7" /></div>
            <div className="space-y-1">
              <h2 className="text-lg font-black text-white">เข้าสู่ระบบเพื่อเดินงานเบิก</h2>
              <p className="text-xs text-slate-400">ระบุรหัสประจำตัวช่างเพื่อตรวจสอบประวัติผู้เบิก</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-left space-y-1">
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wide">สิทธิ์เข้าใช้งานทดลอง:</span>
              <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-300">
                {users.map((user) => (
                  <p key={user.id}>{user.avatar} {user.name} PIN: <strong className="text-blue-400 font-mono">{user.pin}</strong></p>
                ))}
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 text-left mb-1.5">รหัสผ่าน 4 หลัก (PIN)</label>
                <input type="password" maxLength={4} required placeholder="ป้อนรหัสผ่าน 4 หลัก" value={pinInput} onChange={(e) => setPinInput(e.target.value)} className="w-full bg-slate-950 text-white text-center font-bold font-mono tracking-widest py-3 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 text-sm" />
              </div>

              {loginError && <p className="text-xs text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">{loginError}</p>}
              {loadError && <p className="text-xs text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">{loadError}</p>}

              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-black transition-all shadow-lg disabled:opacity-60">{isLoading ? "กำลังโหลดข้อมูล..." : "ยืนยันเพื่อเข้าใช้งานคลัง"}</button>
            </form>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto w-full px-3 md:px-6 py-4 flex-1 flex flex-col md:flex-row gap-6">
          <aside className="hidden md:block w-64 flex-shrink-0">
            <nav className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">หน้าต่างผู้ใช้: {currentUser.role === "admin" ? "แอดมิน" : "ช่างหน้างาน"}</p>
              {currentUser.role === "admin" && <SidebarButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} icon={<LayoutDashboard className="h-4 w-4" />} label="แผงวิเคราะห์สโตร์" />}
              <SidebarButton active={activeTab === "inventory"} onClick={() => setActiveTab("inventory")} icon={<Package className="h-4 w-4" />} label="เช็คคลัง & ขอเบิก" right={<span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full">{products.length}</span>} />
              <SidebarButton active={activeTab === "transactions"} onClick={() => setActiveTab("transactions")} icon={<History className="h-4 w-4" />} label={currentUser.role === "admin" ? "คุมประวัติยืม-คืนทั้งหมด" : "ประวัติยืมของฉัน"} />
            </nav>

            <div className="mt-4 p-3 bg-slate-900/40 border border-slate-800 rounded-xl text-xs space-y-1.5 text-slate-400">
              <p className="font-bold text-slate-300">💡 การควบคุมคุณภาพสต็อก</p>
              <p>• ชำรุด: ของพังชำรุดคาปากไซต์งาน บันทึกส่งเคลม/สืบสวนหาเหตุผล</p>
              <p>• สูญหาย: ของพัสดุหรือเครื่องมือที่หาไม่พบ ตราหน้าผู้รับผิดชอบคุมสต็อก</p>
            </div>
          </aside>

          <main className="flex-1 space-y-4">
            {loadError && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">โหลดข้อมูลไม่สำเร็จ: {loadError}</div>}

            {activeTab === "dashboard" && currentUser.role === "admin" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 max-w-md">
                  <button onClick={() => setDashboardSubTab("overview")} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${dashboardSubTab === "overview" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}>📈 ภาพรวมคลังกลางสุทธิ</button>
                  <button onClick={() => setDashboardSubTab("monthly")} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${dashboardSubTab === "monthly" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}><Calendar className="h-3.5 w-3.5" /><span>สรุปรายงานรายเดือน</span></button>
                </div>

                {dashboardSubTab === "overview" && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
                      <DashCard label="สต็อกชิ้นทั้งหมด" value={stats.totalQty} color="text-emerald-400" />
                      <DashCard label="กำลังยืมใช้งาน" value={`${stats.activeBorrowsCount} เครื่องมือ`} color="text-amber-500" />
                      <DashCard label="ชำรุดรวมสะสม" value={stats.totalDamaged} color="text-rose-500" />
                      <DashCard label="สูญหายรวมสะสม" value={stats.totalLost} color="text-red-500" />
                      <DashCard label="จุดสั่งซื้อด่วน" value={stats.lowStockCount} color="text-yellow-500" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Panel title="ติดตามความรับผิดชอบ (ของชำรุด/สูญหาย)" icon={<AlertCircle className="h-4 w-4" />} accent="text-rose-400">
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {borrows.filter((b) => b.status === "lost" || b.status === "damaged").map((b) => (
                            <div key={b.id} className="bg-slate-950/80 p-3 rounded-lg flex items-center justify-between border border-slate-900">
                              <div>
                                <p className="text-xs font-bold text-slate-200">{b.name} ({b.quantity} {b.unit})</p>
                                <p className="text-[10px] text-slate-400">ผู้รับผิดชอบ: <strong className="text-blue-400">{b.userName}</strong> | วันแจ้ง: {b.date}</p>
                                <p className="text-[9px] text-slate-500 italic mt-0.5">เหตุผล: {b.note}</p>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${b.status === "lost" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>{b.status === "lost" ? "สูญหาย" : "ชำรุด"}</span>
                            </div>
                          ))}
                        </div>
                      </Panel>

                      <Panel title="วัสดุและอะไหล่เหลือน้อยกว่าเกณฑ์เซฟตี้" icon={<AlertTriangle className="h-4 w-4" />} accent="text-amber-400">
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {products.filter((p) => getBalance(p) <= p.safetyStock).map((p) => (
                            <div key={p.id} className="bg-slate-950/80 p-3 rounded-lg flex items-center justify-between border border-slate-900">
                              <div>
                                <p className="text-xs font-bold text-slate-200">{p.name}</p>
                                <p className="text-[10px] text-slate-500">สต็อกคงเหลือสุทธิ: <strong className="text-rose-400">{getBalance(p)} {p.unit}</strong> | จุดแจ้งสั่งเพิ่ม: {p.safetyStock}</p>
                              </div>
                              <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full font-bold">ต้องจัดซื้อ</span>
                            </div>
                          ))}
                        </div>
                      </Panel>
                    </div>
                  </div>
                )}

                {dashboardSubTab === "monthly" && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-2"><Calendar className="h-4 w-4 text-blue-400" /><span>เลือกเดือนที่ต้องการออกรายงานบัญชี</span></h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">ระบบจะกรองและคำนวณผลลัพธ์เพื่อนำส่งตรวจสอบสต็อก</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-slate-950 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-850 focus:outline-none focus:border-blue-500">
                          {availableMonths.map((m) => <option key={m} value={m}>{m} (ปี-เดือน)</option>)}
                        </select>
                        <button onClick={() => handleMockExport(`REPORT_${selectedMonth}`)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1"><Download className="h-3.5 w-3.5" /><span>พิมพ์ใบรายงาน</span></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <DashCard label="ยอดเบิกของทั้งหมด" value={`${monthlyStats.totalIssued} ชิ้น/ม้วน`} color="text-blue-400" />
                      <DashCard label="ยอดส่งของคืนสำเร็จ" value={`${monthlyStats.totalReturned} ชิ้น`} color="text-emerald-400" />
                      <DashCard label="ชำรุดคาไซต์งาน" value={`${monthlyStats.totalDamaged} ชิ้น`} color="text-rose-500" />
                      <DashCard label="ยอดสูญหายสะสม" value={`${monthlyStats.totalLost} ชิ้น`} color="text-red-500" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <Panel title="ท็อปวัสดุสิ้นเปลืองสูงสุด" icon={<Award className="h-4 w-4" />} accent="text-teal-400">
                        <div className="space-y-2">
                          {monthlyStats.topItems.map(([itemName, qty], idx) => (
                            <div key={itemName} className="bg-slate-950 p-2.5 rounded-lg flex items-center justify-between border border-slate-900"><div className="flex items-center space-x-2"><span className="text-xs font-black text-slate-500">#{idx + 1}</span><span className="text-xs font-bold text-slate-200">{itemName}</span></div><span className="text-xs text-teal-400 font-extrabold">{qty} ชิ้นที่ใช้จริง</span></div>
                          ))}
                          {monthlyStats.topItems.length === 0 && <p className="text-center py-10 text-slate-500 text-xs">ไม่มีสถิติเบิกจ่ายวัสดุสิ้นเปลืองในเดือนนี้</p>}
                        </div>
                      </Panel>

                      <Panel title={`รายละเอียดใบเบิกและปรับยอด (${selectedMonth})`} icon={<TrendingUp className="h-4 w-4" />} accent="text-slate-300" className="lg:col-span-2">
                        <div className="space-y-2 max-h-[220px] overflow-y-auto">
                          {monthlyStats.monthlyBorrows.map((b) => (
                            <div key={b.id} className="bg-slate-950 p-2.5 rounded-lg flex items-center justify-between text-[11px] border border-slate-900">
                              <div>
                                <p className="font-bold text-slate-200">{b.name} ({b.quantity} {b.unit})</p>
                                <p className="text-[10px] text-slate-500">ผู้รับผิดชอบ: {b.userName} | วันที่: {b.date}</p>
                              </div>
                              <BorrowStatusBadge status={b.status} />
                            </div>
                          ))}
                          {monthlyStats.monthlyBorrows.length === 0 && <p className="text-center py-10 text-slate-500 text-xs">ยังไม่มีใบเบิกพัสดุในเดือน {selectedMonth}</p>}
                        </div>
                      </Panel>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "inventory" && (
              <div className="space-y-3.5 animate-fadeIn">
                <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input type="text" placeholder="พิมพ์รหัสพัสดุ / ชื่ออุปกรณ์เพื่อค้นหา..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-white" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-bold block">กลุ่มหมวดหมู่:</span>
                      {currentUser.role === "admin" && <button onClick={openAddModal} className="text-[10px] text-blue-400 font-bold hover:underline flex items-center space-x-1"><Plus className="h-3 w-3" /><span>เพิ่มพัสดุใหม่</span></button>}
                    </div>
                    <div className="flex overflow-x-auto space-x-1.5 pb-1 -mx-1 scrollbar-none">
                      {categories.map((c) => (
                        <button key={c} onClick={() => setSelectedCategory(c)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all shrink-0 ${selectedCategory === c ? "bg-blue-600 text-white" : "bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-900"}`}>{c}</button>
                      ))}
                    </div>
                    <div className="flex space-x-2 overflow-x-auto pb-1">
                      {[
                        { value: "ทั้งหมด", label: "ทั้งหมด" },
                        { value: "normal", label: "ปกติ" },
                        { value: "low", label: "ใกล้หมด" },
                        { value: "empty", label: "หมด" },
                      ].map((item) => (
                        <button key={item.value} onClick={() => setSelectedStockStatus(item.value)} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${selectedStockStatus === item.value ? "bg-slate-200 text-slate-950" : "bg-slate-950 text-slate-400 border border-slate-800"}`}>{item.label}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="block md:hidden space-y-2.5">
                  {filteredProducts.map((p) => {
                    const balance = getBalance(p);
                    let colorClass = "border-emerald-500/20 bg-emerald-500/5 text-emerald-400";
                    if (balance === 0) colorClass = "border-rose-500/20 bg-rose-500/5 text-rose-400";
                    else if (balance <= p.safetyStock) colorClass = "border-amber-500/20 bg-amber-500/5 text-amber-400";

                    return (
                      <div key={p.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-[10px] text-slate-500 font-bold">{p.code}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${p.itemType === "returnable" ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-teal-500/20 text-teal-400 border border-teal-500/30"}`}>{p.itemType === "returnable" ? "🔄 ยืม-คืน" : "⏳ ใช้เศษหมดไป"}</span>
                          </div>
                          <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded-full text-slate-400">{p.category}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="max-w-[70%]">
                            <h4 className="text-xs font-bold text-slate-100">{p.name}</h4>
                            <div className="flex flex-wrap gap-1 mt-1 text-[9px] text-slate-400">
                              {p.damaged > 0 && <span className="text-rose-400 bg-rose-500/10 px-1 rounded">ชำรุด: {p.damaged}</span>}
                              {p.lost > 0 && <span className="text-red-400 bg-red-500/10 px-1 rounded">สูญหาย: {p.lost}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-slate-500">คงคลังสุทธิ</p>
                            <span className={`inline-block px-3 py-1 rounded-lg text-sm font-extrabold border ${colorClass}`}>{balance}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-500">เกณฑ์เซฟตี้: <strong>{p.safetyStock}</strong> {p.unit}</span>
                          <div className="flex space-x-1">
                            <button onClick={() => openBorrowModal(p)} disabled={balance <= 0} className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${balance <= 0 ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white"}`}>ขอเบิกอุปกรณ์</button>
                            {currentUser.role === "admin" && <><button onClick={() => openEditModal(p)} className="p-1.5 bg-slate-950 text-slate-400 border border-slate-800 rounded-lg"><Edit className="h-3.5 w-3.5" /></button><button onClick={() => triggerDeleteProduct(p.id, p.name)} className="p-1.5 bg-slate-950 text-rose-500 border border-slate-800 rounded-lg"><Trash2 className="h-3.5 w-3.5" /></button></>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden md:block overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
                  <table className="min-w-full divide-y divide-slate-800 text-xs">
                    <thead className="bg-slate-900 text-slate-400 font-bold uppercase">
                      <tr>
                        <th className="px-3 py-3 text-left">รหัส</th>
                        <th className="px-3 py-3 text-left">ประเภทวัสดุ</th>
                        <th className="px-4 py-3 text-left">รายการวัสดุ</th>
                        <th className="px-3 py-3 text-center">หน่วย</th>
                        <th className="px-2 py-3 text-center bg-blue-500/5">ยกมา</th>
                        <th className="px-2 py-3 text-center bg-emerald-500/5">รับเข้า</th>
                        <th className="px-2 py-3 text-center bg-rose-500/5">จ่ายออก</th>
                        <th className="px-2 py-3 text-center bg-red-500/5 text-red-400">ชำรุด</th>
                        <th className="px-2 py-3 text-center bg-orange-500/5 text-orange-400">สูญหาย</th>
                        <th className="px-3 py-3 text-center">คงเหลือสุทธิ</th>
                        <th className="px-3 py-3 text-left">จุดสั่ง</th>
                        <th className="px-4 py-3 text-right">ดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredProducts.map((p) => {
                        const balance = getBalance(p);
                        return (
                          <tr key={p.id} className="hover:bg-slate-900/40">
                            <td className="px-3 py-3 font-mono font-bold text-slate-400">{p.code}</td>
                            <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.itemType === "returnable" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/25" : "bg-teal-500/10 text-teal-400 border border-teal-500/25"}`}>{p.itemType === "returnable" ? "ยืม-คืน" : "ใช้เศษหมดไป"}</span></td>
                            <td className="px-4 py-3"><p className="font-bold text-slate-200">{p.name}</p><span className="text-[10px] text-slate-500">{p.category}</span></td>
                            <td className="px-3 py-3 text-center text-slate-400">{p.unit}</td>
                            <td className="px-2 py-3 text-center bg-blue-500/5 text-slate-300">{p.initial}</td>
                            <td className="px-2 py-3 text-center bg-emerald-500/5 text-emerald-400">{p.received}</td>
                            <td className="px-2 py-3 text-center bg-rose-500/5 text-rose-400">{p.issued}</td>
                            <td className="px-2 py-3 text-center bg-red-500/5 text-rose-400 font-bold">{p.damaged}</td>
                            <td className="px-2 py-3 text-center bg-orange-500/5 text-orange-400 font-bold">{p.lost}</td>
                            <td className="px-3 py-3 text-center"><span className={`px-2 py-0.5 rounded font-extrabold ${balance === 0 ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : balance <= p.safetyStock ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>{balance}</span></td>
                            <td className="px-3 py-3 text-slate-400">{p.safetyStock} {p.unit}</td>
                            <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                              <button onClick={() => openBorrowModal(p)} disabled={balance <= 0} className={`px-2.5 py-1 rounded text-[11px] font-bold ${balance <= 0 ? "bg-slate-800 text-slate-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white"}`}>ขอเบิก</button>
                              {currentUser.role === "admin" && <><button onClick={() => openEditModal(p)} className="p-1 text-slate-400 hover:text-white"><Edit className="h-4.5 w-4.5" /></button><button onClick={() => triggerDeleteProduct(p.id, p.name)} className="p-1 text-rose-400 hover:text-rose-300"><Trash2 className="h-4.5 w-4.5" /></button></>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "transactions" && (
              <div className="space-y-3.5 animate-fadeIn">
                <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                  <p className="text-xs font-bold text-slate-300 mb-2">{currentUser.role === "admin" ? "รายการยืม-คืนทั้งหมดของไซต์งาน" : "รายการยืมอุปกรณ์ของฉัน"}</p>
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                    {visibleBorrows.map((borrow) => (
                      <div key={borrow.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-slate-500">{borrow.code}</span>
                            <BorrowStatusBadge status={borrow.status} />
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${borrow.itemType === "returnable" ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-teal-500/20 text-teal-400 border border-teal-500/30"}`}>{borrow.itemType === "returnable" ? "ยืม-คืน" : "ใช้เศษหมดไป"}</span>
                          </div>
                          <p className="text-sm font-bold text-slate-200 mt-1">{borrow.name} ({borrow.quantity} {borrow.unit})</p>
                          <p className="text-[10px] text-slate-500">ผู้เบิก: {borrow.userName} | วันที่: {borrow.date}{borrow.returnDate ? ` | คืน: ${borrow.returnDate}` : ""}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{borrow.note}</p>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-end">
                          {currentUser.role === "admin" && borrow.status === "borrowing" && borrow.itemType === "returnable" && <ActionButton onClick={() => void handleReturnProduct(borrow.id)} label="รับคืน" icon={<RotateCcw className="h-3.5 w-3.5" />} variant="success" />}
                          {currentUser.role === "admin" && borrow.itemType === "consumable" && (borrow.status === "consumed" || borrow.status === "fully_consumed") && <ActionButton onClick={() => handlePartialReturnOpen(borrow)} label="คืนเศษ" icon={<RotateCcw className="h-3.5 w-3.5" />} variant="secondary" />}
                          {currentUser.role === "admin" && borrow.itemType === "consumable" && borrow.status === "consumed" && <ActionButton onClick={() => void handleMarkFullyConsumed(borrow.id)} label="ใช้หมดแล้ว" icon={<Flame className="h-3.5 w-3.5" />} variant="warning" />}
                          {currentUser.role === "admin" && (borrow.status === "borrowing" || borrow.status === "consumed") && <ActionButton onClick={() => handleIssueReportOpen(borrow)} label="แจ้งชำรุด/สูญหาย" icon={<AlertTriangle className="h-3.5 w-3.5" />} variant="danger" />}
                        </div>
                      </div>
                    ))}
                    {visibleBorrows.length === 0 && <p className="text-center py-12 text-slate-500 text-xs">ยังไม่มีประวัติรายการในระบบ</p>}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {isAddModalOpen && <ProductModal title="เพิ่มสินค้าใหม่" product={currentProduct} setProduct={setCurrentProduct} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddProduct} />}
      {isEditModalOpen && <ProductModal title="แก้ไขข้อมูลสินค้า" product={currentProduct} setProduct={setCurrentProduct} onClose={() => setIsEditModalOpen(false)} onSubmit={handleEditProduct} />}

      {isBorrowModalOpen && selectedProductForBorrow && (
        <FormShell title={`ขอเบิก: ${selectedProductForBorrow.name}`} onClose={() => setIsBorrowModalOpen(false)}>
          <form onSubmit={handleBorrowSubmit} className="space-y-4">
            <div className="text-xs text-slate-400">คงเหลือสุทธิ: <strong className="text-white">{getBalance(selectedProductForBorrow)} {selectedProductForBorrow.unit}</strong></div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">จำนวน</label>
              <input type="number" min="1" value={borrowFormData.quantity} onChange={(e) => setBorrowFormData((prev) => ({ ...prev, quantity: Number(e.target.value) || 1 }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">หมายเหตุ</label>
              <textarea value={borrowFormData.note} onChange={(e) => setBorrowFormData((prev) => ({ ...prev, note: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm min-h-24" />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-bold">ยืนยันการเบิก</button>
          </form>
        </FormShell>
      )}

      {isIssueModalOpen && selectedBorrowForIssue && (
        <FormShell title={`แจ้งปัญหา: ${selectedBorrowForIssue.name}`} onClose={() => setIsIssueModalOpen(false)}>
          <form onSubmit={handleIssueReportSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setIssueFormData((prev) => ({ ...prev, type: "damaged" }))} className={`py-2 rounded-lg text-sm font-bold ${issueFormData.type === "damaged" ? "bg-rose-600 text-white" : "bg-slate-950 border border-slate-800 text-slate-300"}`}>ชำรุด</button>
              <button type="button" onClick={() => setIssueFormData((prev) => ({ ...prev, type: "lost" }))} className={`py-2 rounded-lg text-sm font-bold ${issueFormData.type === "lost" ? "bg-red-600 text-white" : "bg-slate-950 border border-slate-800 text-slate-300"}`}>สูญหาย</button>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">จำนวน</label>
              <input type="number" min="1" value={issueFormData.quantity} onChange={(e) => setIssueFormData((prev) => ({ ...prev, quantity: Number(e.target.value) || 1 }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">เหตุผล</label>
              <textarea value={issueFormData.note} onChange={(e) => setIssueFormData((prev) => ({ ...prev, note: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm min-h-24" />
            </div>
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-2 rounded-lg text-sm font-bold">บันทึกรายงาน</button>
          </form>
        </FormShell>
      )}

      {isPartialReturnModalOpen && selectedBorrowForPartialReturn && (
        <FormShell title={`คืนเศษวัสดุ: ${selectedBorrowForPartialReturn.name}`} onClose={() => setIsPartialReturnModalOpen(false)}>
          <form onSubmit={handlePartialReturnSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">จำนวนที่คืน</label>
              <input type="number" min="0.01" step="0.01" value={partialReturnQty} onChange={(e) => setPartialReturnQty(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-bold">บันทึกคืนเศษ</button>
          </form>
        </FormShell>
      )}

      {deleteConfirm.isOpen && (
        <FormShell title="ยืนยันการลบสินค้า" onClose={() => setDeleteConfirm({ isOpen: false, productId: null, productName: "" })}>
          <div className="space-y-4 text-sm text-slate-300">
            <p>ต้องการลบรายการ <strong>{deleteConfirm.productName}</strong> ใช่หรือไม่</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm({ isOpen: false, productId: null, productName: "" })} className="flex-1 bg-slate-900 border border-slate-800 py-2 rounded-lg">ยกเลิก</button>
              <button onClick={() => void executeDeleteProduct()} className="flex-1 bg-rose-600 hover:bg-rose-500 py-2 rounded-lg text-white font-bold">ลบสินค้า</button>
            </div>
          </div>
        </FormShell>
      )}

      {currentUser && (
        <nav className="fixed bottom-0 inset-x-0 md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur px-2 py-2 z-40">
          <div className={`grid gap-2 ${mobileNavItems.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {mobileNavItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold transition-colors ${activeTab === item.key ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-900"}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

function SidebarButton({ active, onClick, icon, label, right }: { active: boolean; onClick: () => void; icon: ReactNode; label: string; right?: ReactNode }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all ${active ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}>
      <div className="flex items-center space-x-2">{icon}<span>{label}</span></div>
      {right ?? <ChevronRight className="h-3.5 w-3.5" />}
    </button>
  );
}

function DashCard({ label, value, color }: { label: string; value: ReactNode; color: string }) {
  return (
    <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/80">
      <p className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-black mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function Panel({ title, icon, accent, className, children }: { title: string; icon: ReactNode; accent: string; className?: string; children: ReactNode }) {
  return (
    <div className={`bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3 ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className={`text-xs font-bold flex items-center space-x-1 ${accent}`}>{icon}<span>{title}</span></span>
      </div>
      {children}
    </div>
  );
}

function BorrowStatusBadge({ status }: { status: Borrow["status"] }) {
  const config: Record<Borrow["status"], string> = {
    borrowing: "bg-amber-500/10 text-amber-400",
    returned: "bg-emerald-500/10 text-emerald-400",
    consumed: "bg-slate-800 text-slate-400",
    fully_consumed: "bg-orange-500/10 text-orange-400",
    damaged: "bg-rose-500/10 text-rose-400",
    lost: "bg-red-500/10 text-red-400",
  };

  const label: Record<Borrow["status"], string> = {
    borrowing: "ค้างยืม",
    returned: "คืนแล้ว",
    consumed: "ใช้ไป",
    fully_consumed: "ใช้หมด",
    damaged: "ชำรุด",
    lost: "สูญหาย",
  };

  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${config[status]}`}>{label[status]}</span>;
}

function ActionButton({ onClick, label, icon, variant }: { onClick: () => void; label: string; icon: ReactNode; variant: "success" | "secondary" | "warning" | "danger" }) {
  const styles = {
    success: "bg-emerald-600 hover:bg-emerald-500 text-white",
    secondary: "bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800",
    warning: "bg-amber-500 text-slate-950 hover:bg-amber-400",
    danger: "bg-rose-600 hover:bg-rose-500 text-white",
  };

  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 ${styles[variant]}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function FormShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProductModal({ title, product, setProduct, onClose, onSubmit }: { title: string; product: ProductForm; setProduct: (updater: (prev: ProductForm) => ProductForm) => void; onClose: () => void; onSubmit: (e: FormEvent<HTMLFormElement>) => void }) {
  return (
    <FormShell title={title} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="รหัสสินค้า"><input value={product.code} onChange={(e) => setProduct((prev) => ({ ...prev, code: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="หน่วย"><input value={product.unit} onChange={(e) => setProduct((prev) => ({ ...prev, unit: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm" /></Field>
        </div>
        <Field label="หมวดหมู่"><input value={product.category} onChange={(e) => setProduct((prev) => ({ ...prev, category: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm" /></Field>
        <Field label="ชื่อรายการ"><input value={product.name} onChange={(e) => setProduct((prev) => ({ ...prev, name: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ยกมา"><input type="number" value={product.initial} onChange={(e) => setProduct((prev) => ({ ...prev, initial: Number(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="รับเข้า"><input type="number" value={product.received} onChange={(e) => setProduct((prev) => ({ ...prev, received: Number(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ชำรุด"><input type="number" value={product.damaged} onChange={(e) => setProduct((prev) => ({ ...prev, damaged: Number(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="สูญหาย"><input type="number" value={product.lost} onChange={(e) => setProduct((prev) => ({ ...prev, lost: Number(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="จุดสั่งซื้อ"><input type="number" value={product.safetyStock} onChange={(e) => setProduct((prev) => ({ ...prev, safetyStock: Number(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="ประเภท">
            <select value={product.itemType} onChange={(e) => setProduct((prev) => ({ ...prev, itemType: e.target.value as ProductForm["itemType"] }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm">
              <option value="returnable">ยืม-คืน</option>
              <option value="consumable">สิ้นเปลือง</option>
            </select>
          </Field>
        </div>
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-bold">บันทึก</button>
      </form>
    </FormShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs text-slate-400 space-y-1">
      <span>{label}</span>
      {children}
    </label>
  );
}
