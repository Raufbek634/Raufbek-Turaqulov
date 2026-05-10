import React, { useState, useEffect, FormEvent, ReactNode } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Users, 
  CreditCard, 
  LayoutDashboard, 
  LogOut, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Filter, 
  Bell, 
  Calendar,
  ChevronRight,
  TrendingUp,
  Download,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  X,
  Menu,
  Cake
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from "recharts";
import jsPDF from "jspdf";

// --- Types ---
interface Student {
  id: string;
  name: string;
  birthDate: string;
  parentPhone: string;
  group: string;
  amount: number;
  paymentDeadline: string;
  photo?: string;
  createdAt: string;
  debt: number;
  totalPaid: number;
  parentChatId?: number;
}

interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  date: string;
  method: string;
}

// --- API Helpers ---
const handleResponse = async (r: Response) => {
  if (!r.ok) {
    const errorData = await r.json().catch(() => ({}));
    throw new Error(errorData.message || `Xatolik: ${r.status}`);
  }
  return r.json();
};

const getAdminId = () => {
  const adminStr = localStorage.getItem("admin");
  if (!adminStr) return null;
  try {
    return JSON.parse(adminStr).id;
  } catch {
    return null;
  }
};

const api = {
  getStudents: () => fetch("/api/students", { headers: { "admin-id": getAdminId() || "" } }).then(handleResponse),
  addStudent: (data: any) => fetch("/api/students", { method: "POST", headers: { "Content-Type": "application/json", "admin-id": getAdminId() || "" }, body: JSON.stringify(data) }).then(handleResponse),
  updateStudent: (id: string, data: any) => fetch(`/api/students/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", "admin-id": getAdminId() || "" }, body: JSON.stringify(data) }).then(handleResponse),
  deleteStudent: (id: string) => fetch(`/api/students/${id}`, { method: "DELETE", headers: { "admin-id": getAdminId() || "" } }).then(handleResponse),
  getPayments: () => fetch("/api/payments", { headers: { "admin-id": getAdminId() || "" } }).then(handleResponse),
  addPayment: (data: any) => fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json", "admin-id": getAdminId() || "" }, body: JSON.stringify(data) }).then(handleResponse),
  getStats: () => fetch("/api/stats", { headers: { "admin-id": getAdminId() || "" } }).then(handleResponse),
  notify: (data: any) => fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json", "admin-id": getAdminId() || "" }, body: JSON.stringify(data) }).then(handleResponse),
  broadcast: (data: any) => fetch("/api/broadcast", { method: "POST", headers: { "Content-Type": "application/json", "admin-id": getAdminId() || "" }, body: JSON.stringify(data) }).then(handleResponse),
  getExpenses: () => fetch("/api/expenses", { headers: { "admin-id": getAdminId() || "" } }).then(handleResponse),
  addExpense: (data: any) => fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json", "admin-id": getAdminId() || "" }, body: JSON.stringify(data) }).then(handleResponse),
};

// --- Components ---

const LoginPage = ({ onLogin }: { onLogin: () => void }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const endpoint = isRegister ? "/api/register" : "/api/login";
      const res = await fetch(endpoint, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ phone, password, name }) 
      });
      const data = await res.json();
      if (data.success) {
        if (isRegister) {
          setIsRegister(false);
          alert("Muvaffaqiyatli ro'yxatdan o'tdingiz. Endi tizimga kiring.");
        } else {
          localStorage.setItem("auth", "true");
          localStorage.setItem("admin", JSON.stringify(data.admin));
          onLogin();
        }
      } else {
        setError(data.message || "Login muvaffaqiyatsiz tugadi");
      }
    } catch (err) {
      console.error("Login detail error:", err);
      setError(`Server bilan aloqa uzildi: ${err instanceof Error ? err.message : 'Noma\'lum xato'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 p-10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#1E293B] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-100">
            <Users className="text-blue-400" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SmartKids<span className="text-blue-500">CRM</span></h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">{isRegister ? "Ro'yxatdan O'tish" : "Administrator Portali"}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ism Familiya</label>
              <input 
                type="text" required
                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium placeholder:text-slate-300"
                placeholder="Ismingizni kiriting"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Telefon Raqam</label>
            <input 
              type="text" 
              required
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium placeholder:text-slate-300"
              placeholder="99-319-07-12"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Maxfiy Parol</label>
            <input 
              type="password" 
              required
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium placeholder:text-slate-300"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 text-red-600 text-xs font-bold px-4 py-3 rounded-xl border border-red-100 text-center uppercase tracking-tight"
            >
              {error}
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#1E293B] hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-lg shadow-slate-200 disabled:opacity-50 text-sm uppercase tracking-widest mt-4"
          >
            {loading ? "Jarayon..." : (isRegister ? "Ro'yxatdan O'tish" : "Kirish")}
          </button>

          <button 
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-500 transition-colors"
          >
            {isRegister ? "Akkauntingiz bormi? Kirish" : "Yangi Akkaunt yaratish"}
          </button>
        </form>
        
        <div className="mt-8 pt-8 border-t border-slate-50 text-center">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Smart Management Solutions © 2024</p>
        </div>
      </motion.div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const adminStr = localStorage.getItem("admin");
  const admin = adminStr ? JSON.parse(adminStr) : { name: "Administrator", phone: "Noma'lum" };

  useEffect(() => {
    api.getStats().then(setStats);
  }, []);

  if (!stats) return <div className="p-8">Yuklanmoqda...</div>;

  const cards = [
    { title: "Jami o'quvchilar", value: stats.totalStudents, icon: Users, color: "bg-white", textColor: "text-slate-900", iconStyle: "bg-blue-50 text-blue-500" },
    { title: "Qarzdorlar", value: stats.debtorsCount, icon: AlertCircle, color: "bg-white", textColor: "text-red-600", iconStyle: "bg-red-50 text-red-500" },
    { title: "Net Foyda", value: `${stats.netProfit.toLocaleString()}`, icon: TrendingUp, color: "bg-emerald-600 text-white", textColor: "text-white", iconStyle: "bg-white/20 text-white", suffix: "UZS" },
    { title: "Faol Guruhlar", value: `${stats.activeGroups} ta`, icon: LayoutDashboard, color: "bg-[#1E293B] text-white", textColor: "text-white", iconStyle: "bg-white/20 text-white" },
  ];

  return (
    <div className="p-8 space-y-8">
      <header className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Xush kelibsiz, {admin.name}</h1>
          <p className="text-slate-500 text-sm">Bog'chaning bugungi holati va statistikalari</p>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">{admin.phone}</p>
            <p className="text-xs text-slate-500">ID: {admin.id.slice(-4)}</p>
          </div>
          <div className="w-10 h-10 bg-slate-200 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-100 flex items-center justify-center text-slate-500 font-bold">
            {admin.name.charAt(0)}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`${card.color} p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden`}
          >
            <div className={`w-10 h-10 ${card.iconStyle} rounded-lg flex items-center justify-center mb-3`}>
              <card.icon size={20} />
            </div>
            <p className={`${card.color === 'bg-white' ? 'text-slate-500' : 'text-white/80'} text-[10px] font-bold uppercase tracking-widest mb-1`}>{card.title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className={`text-2xl font-bold ${card.textColor}`}>{card.value}</h3>
              {card.suffix && <span className="text-[10px] font-bold opacity-60 uppercase">{card.suffix}</span>}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Slot */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900">Tushum Dinamikasi</h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-xs text-slate-500">Bu oygi ko'rsatkichlar</span>
            </div>
          </div>
          <div className="h-64 mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: "Aprel", total: stats.monthlyRevenue * 0.8 }, { name: "May", total: stats.monthlyRevenue }]}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-10} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={45}>
                  <Cell fill="#cbd5e1" />
                  <Cell fill="#3b82f6" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Widgets */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Tug'ilgan kunlar</h3>
              <div className="w-6 h-6 bg-pink-100 text-pink-600 rounded flex items-center justify-center text-[10px]">🎉</div>
            </div>
            <div className="space-y-4">
              {stats.birthdaysToday && stats.birthdaysToday.length > 0 ? (
                stats.birthdaysToday.map((name: string, i: number) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-pink-50 text-pink-500 rounded-lg flex items-center justify-center text-xs font-bold ring-1 ring-pink-100 italic">
                        {name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Bugun tabriklang</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => api.notify({ message: `🎉 Bugun ${name}ning tug'ilgan kuni! Baxtli bo'lsin!` })}
                      className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-pink-500 group-hover:text-white transition-all"
                    >
                      <Bell size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 opacity-40">
                  <Cake size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-bold uppercase tracking-widest">Tug'ilgan kunlar yo'q</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#1E293B] p-6 rounded-2xl shadow-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-400" />
              Tezkor Harakatlar
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/students" className="bg-slate-800 p-3 rounded-xl border border-slate-700 hover:border-blue-500 transition-all cursor-pointer group">
                <div className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded flex items-center justify-center mb-2 font-bold group-hover:bg-blue-500 group-hover:text-white transition-all">+</div>
                <p className="text-white text-[10px] font-bold uppercase tracking-wider">Bola Qo'shish</p>
              </Link>
              <Link to="/payments" className="bg-slate-800 p-3 rounded-xl border border-slate-700 hover:border-emerald-500 transition-all cursor-pointer group">
                <div className="w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded flex items-center justify-center mb-2 font-bold group-hover:bg-emerald-500 group-hover:text-white transition-all">$</div>
                <p className="text-white text-[10px] font-bold uppercase tracking-wider">To'lov Olish</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = () => api.getStudents().then(setStudents);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (currentStudent.id) {
      await api.updateStudent(currentStudent.id, currentStudent);
    } else {
      await api.addStudent(currentStudent);
    }
    await fetchStudents();
    setIsModalOpen(false);
    setCurrentStudent({});
    setLoading(false);
  };

  const deleteStudent = async (id: string) => {
    if (window.confirm("Haqiqatan ham o'chirmoqchimisiz?")) {
      await api.deleteStudent(id);
      fetchStudents();
    }
  };

  const filtered = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.group.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">O'quvchilar Boshqaruvi</h1>
          <p className="text-slate-500 text-sm">Markaz o'quvchilarini nazorat qilish va tahrirlash</p>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="F.I.SH bo'yicha qidirish..." 
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-72 text-sm shadow-sm transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setCurrentStudent({ amount: 250000, group: "Boshlang'ich" }); setIsModalOpen(true); }}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-bold text-sm uppercase tracking-wide"
          >
            <Plus size={18} strokeWidth={3} />
            Bola Qo'shish
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">F.I.SH</th>
                <th className="px-6 py-4">Guruh Yo'nalishi</th>
                <th className="px-6 py-4">Ota-ona Tel</th>
                <th className="px-6 py-4">Tug'ilgan Sana</th>
                <th className="px-6 py-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold ring-1 ring-blue-100 italic">
                        {s.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-semibold text-slate-900">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-500 font-medium">{s.group}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-900 font-medium">{s.parentPhone}</p>
                    {s.parentChatId ? (
                      <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Bot Faol</span>
                    ) : (
                      <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Bot Ulanmagan</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${s.debt > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {s.debt > 0 ? `-${s.debt.toLocaleString()}` : "Qarz yo'q"}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Qoldiq</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => api.notify({ 
                          studentId: s.id, 
                          message: `📢 Hurmatli ota-ona! Farzandingiz ${s.name} bo'yicha qarzdorlik mavjud: ${s.debt.toLocaleString()} so'm. Iltimos, to'lovni amalga oshiring.` 
                        })}
                        disabled={!s.parentChatId}
                        className={`p-2 rounded-lg transition-all ${s.parentChatId ? 'text-blue-600 hover:bg-blue-50' : 'text-slate-300 cursor-not-allowed'}`}
                        title={s.parentChatId ? "Eslatma yuborish" : "Ota-ona botdan ro'yxatdan o'tmagan"}
                      >
                        <Bell size={16} />
                      </button>
                      <button 
                        onClick={() => { setCurrentStudent(s); setIsModalOpen(true); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => deleteStudent(s.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-6">
                {currentStudent.id ? "O'quvchini tahrirlash" : "Yangi o'quvchi qo'shish"}
              </h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">F.I.SH</label>
                  <input 
                    type="text" required value={currentStudent.name || ""} 
                    onChange={e => setCurrentStudent({...currentStudent, name: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Guruh nomi</label>
                  <input 
                    type="text" required value={currentStudent.group || ""}
                    onChange={e => setCurrentStudent({...currentStudent, group: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefon raqam</label>
                  <input 
                    type="text" required value={currentStudent.parentPhone || ""}
                    onChange={e => setCurrentStudent({...currentStudent, parentPhone: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tug'ilgan sana</label>
                  <input 
                    type="date" required value={currentStudent.birthDate || ""}
                    onChange={e => setCurrentStudent({...currentStudent, birthDate: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To'lov summasi</label>
                  <input 
                    type="number" required value={currentStudent.amount || ""}
                    onChange={e => setCurrentStudent({...currentStudent, amount: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bot Chat ID (Ixtiyoriy)</label>
                  <input 
                    type="number" value={currentStudent.parentChatId || ""}
                    onChange={e => setCurrentStudent({...currentStudent, parentChatId: Number(e.target.value)})}
                    placeholder="Bot orqali topiladi"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-2 mt-4 flex gap-3">
                  <button 
                    type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all"
                  >
                    Bekor qilish
                  </button>
                  <button 
                    type="submit" disabled={loading}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                  >
                    {loading ? "Saqlanmoqda..." : "Saqlash"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Payments = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ studentId: "", amount: 0, method: "Naqd" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getStudents().then(setStudents);
    api.getPayments().then(setPayments);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const student = students.find(s => s.id === formData.studentId);
    if (!student) return;

    const res = await api.addPayment({
      ...formData,
      studentName: student.name
    });

    // Notify Telegram
    await api.notify({
      message: `✅ To'lov qabul qilindi!\n\nKimdan: ${student.name}\nSumma: ${Number(formData.amount).toLocaleString()} so'm\nUsul: ${formData.method}\nSana: ${new Date().toLocaleDateString()}`
    });

    setPayments([res, ...payments]);
    setIsModalOpen(false);
    setLoading(false);
    generateReceipt(res);
  };

  const generateReceipt = (data: Payment) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("SMART KINDERGARTEN", 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.text("TO'LOV KOTITANSIYASI", 105, 30, { align: "center" });
    doc.line(20, 35, 190, 35);
    
    doc.text(`Kvitansiya ID: ${data.id}`, 20, 50);
    doc.text(`F.I.SH: ${data.studentName}`, 20, 60);
    doc.text(`Summa: ${data.amount.toLocaleString()} so'm`, 20, 70);
    doc.text(`To'lov usuli: ${data.method}`, 20, 80);
    doc.text(`Sana: ${format(new Date(data.date), "dd.MM.yyyy HH:mm")}`, 20, 90);
    
    doc.setFontSize(10);
    doc.text("To'lovingiz uchun rahmat!", 105, 120, { align: "center" });
    
    doc.save(`Receipt-${data.id}.pdf`);
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Moliya va To'lovlar</h1>
          <p className="text-slate-500 text-sm">Bog'cha to'lovlari monitoringi va kvitansiyalar</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-bold text-sm uppercase tracking-wide"
        >
          <Plus size={18} strokeWidth={3} />
          To'lov Qabul Qilish
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">ID / Sana</th>
                <th className="px-6 py-4">O'quvchi F.I.SH</th>
                <th className="px-6 py-4">Summa</th>
                <th className="px-6 py-4">Usul</th>
                <th className="px-6 py-4">Holat</th>
                <th className="px-6 py-4 text-right">Hujjat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-mono text-[10px] text-slate-400">{p.id.split('-').pop()}</p>
                    <p className="text-xs font-bold text-slate-500 uppercase">{format(new Date(p.date), "dd.MM.yyyy")}</p>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{p.studentName}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{Number(p.amount).toLocaleString()} <span className="text-[10px] text-slate-400">UZS</span></td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-tight text-slate-600">
                      {p.method}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight">Muvaffaqiyatli</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => generateReceipt(p)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-6">Yangi to'lov qabul qilish</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">O'quvchini tanlang</label>
                  <select 
                    required 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    onChange={e => setFormData({...formData, studentId: e.target.value})}
                  >
                    <option value="">O'quvchi...</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.group})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To'lov summasi</label>
                  <input 
                    type="number" required 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To'lov usuli</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Naqd", "Karta"].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFormData({...formData, method: m})}
                        className={`py-2 rounded-xl text-sm font-medium transition-all ${formData.method === m ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Bekor qilish
                  </button>
                  <button 
                    type="submit" disabled={loading}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {loading ? "Tasdiqlanmoqda..." : "Tasdiqlash"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Expenses = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", amount: 0, category: "Oziq-ovqat" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getExpenses().then(setExpenses);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await api.addExpense(formData);
    setExpenses([res, ...expenses]);
    setIsModalOpen(false);
    setLoading(false);
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Xarajatlar</h1>
          <p className="text-slate-500 text-sm">Barcha chiqim amallarini boshqarish</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 bg-red-600 text-white rounded-xl flex items-center gap-2 hover:bg-red-700 shadow-lg shadow-red-100 font-bold text-sm uppercase tracking-wide"
        >
          <Plus size={18} />
          Xarajat qo'shish
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Nomi</th>
              <th className="px-6 py-4">Kategoriya</th>
              <th className="px-6 py-4">Summa</th>
              <th className="px-6 py-4">Sana</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map(e => (
              <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-semibold text-slate-900">{e.title}</td>
                <td className="px-6 py-4 text-slate-500">{e.category}</td>
                <td className="px-6 py-4 font-bold text-red-600">-{Number(e.amount).toLocaleString()}</td>
                <td className="px-6 py-4 text-slate-400 font-mono text-xs">{format(new Date(e.date), "dd.MM.yyyy")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for adding expense */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Xarajat Qo'shish</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Xarajat Nomi</label>
                  <input 
                    type="text" required
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    placeholder="Masalan: Go'sht, Un, Elektr..."
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Turi</label>
                  <select 
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:bg-white"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option>Oziq-ovqat</option>
                    <option>Kommunal</option>
                    <option>Xon xo'jaligi</option>
                    <option>Oylik maosh</option>
                    <option>Boshqa</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Summa (UZS)</label>
                  <input 
                    type="number" required
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                  />
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-100 uppercase tracking-widest text-sm mt-4"
                >
                  {loading ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Layout = ({ children }: { children: ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "O'quvchilar", icon: Users, path: "/students" },
    { label: "To'lovlar", icon: CreditCard, path: "/payments" },
    { label: "Xarajatlar", icon: TrendingUp, path: "/expenses" },
    { label: "E'lon va Reklama", icon: Megaphone, path: "/broadcast" },
  ];

  const logout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("admin");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#1E293B] h-screen sticky top-0">
        <div className="p-6 flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Users className="text-white" size={18} />
          </div>
          <h1 className="text-white font-bold text-lg leading-tight">SmartKids<span className="text-blue-400">CRM</span></h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${location.pathname === item.path ? "bg-blue-600/20 text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <item.icon size={20} className={location.pathname === item.path ? "opacity-100" : "opacity-60"} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-700/50">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm font-medium"
          >
            <LogOut size={20} className="opacity-60" />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Users size={16} />
          </div>
          <span className="font-bold text-slate-800">SmartKidsCRM</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500">
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.aside 
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-[#1E293B] shadow-2xl"
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                    <Users size={16} />
                  </div>
                  <span className="font-bold text-white uppercase tracking-tighter">SmartKidsCRM</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400"><X size={24} /></button>
              </div>
              <nav className="p-4 space-y-1">
                {menuItems.map((item) => (
                  <Link 
                    key={item.path} to={item.path} 
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-4 rounded-xl font-medium ${location.pathname === item.path ? "bg-blue-600/20 text-blue-400" : "text-slate-400"}`}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 min-w-0 pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
};

// --- App Root ---
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("auth"));

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <LoginPage onLogin={() => setIsAuthenticated(true)} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/" 
          element={isAuthenticated ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/students" 
          element={isAuthenticated ? <Layout><Students /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/payments" 
          element={isAuthenticated ? <Layout><Payments /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/expenses" 
          element={isAuthenticated ? <Layout><Expenses /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/broadcast" 
          element={isAuthenticated ? <Layout><Broadcast /></Layout> : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
}

const Broadcast = () => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setLoading(true);
    try {
      const res = await api.broadcast({ message });
      setResult(res);
      if (res.success) {
        setMessage("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">E'lon va Reklama yuborish</h1>
        <p className="text-slate-500 text-sm">Botga ulangan barcha ota-onalarga reklama, e'lon yoki rasmli xabarlar yuborish</p>
      </div>

      <div className="max-w-2xl bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
        <form onSubmit={handleBroadcast} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Xabar matni</label>
            <textarea
              required
              rows={6}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-900"
              placeholder="Masalan: Ertaga bog'chada bayram tadbiri bo'lib o'tadi..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 italic mt-1">* Xabar barcha faol bot foydalanuvchilariga yuboriladi.</p>
          </div>

          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-100 disabled:opacity-50 text-sm uppercase tracking-widest"
          >
            {loading ? "Yuborilmoqda..." : "Xabarni Yuborish"}
          </button>
        </form>

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100"
          >
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Yakuniy natija:</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-emerald-500 uppercase">Muvaffaqiyatli</p>
                <p className="text-2xl font-bold text-slate-900">{result.successCount}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-red-500 uppercase">Xatolik</p>
                <p className="text-2xl font-bold text-slate-900">{result.failCount}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
