import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, "db.json");

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({
    students: [],
    payments: [],
    admin: {
      phone: "993190712",
      password: "12345678"
    }
  }, null, 2));
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function writeDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // Register
  app.post("/api/register", (req, res) => {
    const { phone, password, name } = req.body;
    const db = readDB();
    if (!db.admins) db.admins = [];
    
    if (db.admins.find((a: any) => a.phone === phone)) {
      return res.status(400).json({ success: false, message: "Ushbu telefon raqam allaqachon mavjud" });
    }

    const newAdmin = { phone, password, name, id: Date.now().toString() };
    db.admins.push(newAdmin);
    db.admin = newAdmin; // Set as current main admin for simplicity
    writeDB(db);
    res.json({ success: true });
  });

  // Auth
  app.post("/api/login", (req, res) => {
    const phone = req.body.phone?.toString().trim();
    const password = req.body.password?.toString().trim();
    const db = readDB();
    
    const admin = (db.admins || []).find((a: any) => a.phone === phone && a.password === password) || 
                  (db.admin && db.admin.phone === phone && db.admin.password === password ? db.admin : null);
    
    if (admin) {
      res.json({ success: true, token: "fake-jwt-token", admin });
    } else {
      res.status(401).json({ success: false, message: "Xato telefon yoki parol" });
    }
  });

  // Students
  app.get("/api/students", (req, res) => {
    const adminId = req.headers["admin-id"];
    const db = readDB();
    
    // Filter by adminId
    const studentsByAdmin = db.students.filter((s: any) => s.adminId === adminId);
    
    const studentsWithDebt = studentsByAdmin.map((s: any) => {
      const studentPayments = db.payments.filter((p: any) => p.studentId === s.id);
      const totalPaid = studentPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      
      // Calculate months from createdAt (avoiding birthDate for debt)
      const startDate = new Date(s.createdAt || new Date().toISOString());
      const now = new Date();
      const monthsSinceJoin = Math.max(1, (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()) + 1);
      
      const expectedTotal = Number(s.amount) * monthsSinceJoin;
      return { ...s, debt: Math.max(0, expectedTotal - totalPaid), totalPaid };
    });
    res.json(studentsWithDebt);
  });

  app.post("/api/students", (req, res) => {
    const adminId = req.headers["admin-id"];
    if (!adminId) return res.status(401).json({ message: "Admin ID missing" });
    
    const db = readDB();
    const newStudent = {
      id: Date.now().toString(),
      adminId,
      ...req.body,
      createdAt: new Date().toISOString()
    };
    db.students.push(newStudent);
    writeDB(db);
    res.json(newStudent);
  });

  app.put("/api/students/:id", (req, res) => {
    const adminId = req.headers["admin-id"];
    const db = readDB();
    const index = db.students.findIndex((s: any) => String(s.id) === String(req.params.id) && String(s.adminId) === String(adminId));
    if (index !== -1) {
      db.students[index] = { ...db.students[index], ...req.body };
      writeDB(db);
      res.json(db.students[index]);
    } else {
      res.status(404).json({ message: "Student not found or access denied" });
    }
  });

  app.delete("/api/students/:id", (req, res) => {
    const adminId = req.headers["admin-id"];
    const db = readDB();
    const originalLength = db.students.length;
    db.students = db.students.filter((s: any) => !(String(s.id) === String(req.params.id) && String(s.adminId) === String(adminId)));
    if (db.students.length < originalLength) {
      writeDB(db);
      res.json({ success: true });
    } else {
      console.log(`Delete failed for student ${req.params.id} by admin ${adminId}`);
      res.status(404).json({ message: "Student not found or access denied" });
    }
  });

  // Similarly for Payments, Attendance, and Expenses
  app.get("/api/payments", (req, res) => {
    const adminId = req.headers["admin-id"];
    const db = readDB();
    res.json(db.payments.filter((p: any) => p.adminId === adminId));
  });

  app.post("/api/payments", (req, res) => {
    const adminId = req.headers["admin-id"];
    const db = readDB();
    const newPayment = {
      id: `CH-${Date.now()}`,
      adminId,
      ...req.body,
      date: new Date().toISOString()
    };
    db.payments.push(newPayment);
    writeDB(db);
    res.json(newPayment);
  });

  // Expenses
  app.get("/api/expenses", (req, res) => {
    const adminId = req.headers["admin-id"];
    const db = readDB();
    if (!db.expenses) db.expenses = [];
    res.json(db.expenses.filter((e: any) => e.adminId === adminId));
  });

  app.post("/api/expenses", (req, res) => {
    const adminId = req.headers["admin-id"];
    const db = readDB();
    if (!db.expenses) db.expenses = [];
    const newExpense = {
      id: Date.now().toString(),
      adminId,
      ...req.body,
      date: new Date().toISOString()
    };
    db.expenses.push(newExpense);
    writeDB(db);
    res.json(newExpense);
  });

  // Stats
  app.get("/api/stats", (req, res) => {
    const adminId = req.headers["admin-id"];
    const db = readDB();

    const myStudents = db.students.filter((s: any) => s.adminId === adminId);
    const myPayments = db.payments.filter((p: any) => p.adminId === adminId);
    const myExpenses = (db.expenses || []).filter((e: any) => e.adminId === adminId);

    const totalStudents = myStudents.length;
    const totalPayments = myPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const totalExpenses = myExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const paidStudentIds = new Set(myPayments
      .filter((p: any) => {
        const d = new Date(p.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .map((p: any) => p.studentId)
    );
    
    const debtorsCount = myStudents.filter((s: any) => !paidStudentIds.has(s.id)).length;

    const today = new Date();
    const todayStr = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    const birthdaysToday = myStudents.filter((s: any) => {
      if (!s.birthDate) return false;
      const bDay = new Date(s.birthDate);
      const bDayStr = `${(bDay.getMonth() + 1).toString().padStart(2, '0')}-${bDay.getDate().toString().padStart(2, '0')}`;
      return bDayStr === todayStr;
    });

    res.json({
      totalStudents,
      monthlyRevenue: totalPayments,
      totalExpenses,
      netProfit: totalPayments - totalExpenses,
      debtorsCount,
      activeGroups: Array.from(new Set(myStudents.map((s: any) => s.group))).length,
      birthdaysToday: birthdaysToday.map((s: any) => s.name)
    });
  });

  // Telegram Notifications API
  app.post("/api/notify", async (req, res) => {
    const adminId = req.headers["admin-id"];
    const { message, chatId, studentId } = req.body;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return res.status(500).json({ message: "Bot token missing" });

    let targetChatId = chatId;
    if (studentId) {
      const db = readDB();
      const student = db.students.find((s: any) => s.id === studentId);
      if (student?.parentChatId) targetChatId = student.parentChatId;
    }

    if (!targetChatId && !process.env.ADMIN_ID) return res.status(400).json({ message: "No target chat ID" });

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: targetChatId || process.env.ADMIN_ID, text: message, parse_mode: "HTML" })
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Broadcast
  app.post("/api/broadcast", async (req, res) => {
    const adminId = req.headers["admin-id"];
    const { message } = req.body;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return res.status(500).json({ message: "Bot token missing" });

    const db = readDB();
    const myStudents = db.students.filter((s: any) => s.adminId === adminId);
    const activeParents = Array.from(new Set(myStudents.filter((s: any) => s.parentChatId).map((s: any) => s.parentChatId)));
    
    let successCount = 0;
    let failCount = 0;

    for (const chatId of activeParents) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            chat_id: chatId, 
            text: `📢 <b>MA'MURIYAT XABARI</b>\n\n${message}`, 
            parse_mode: "HTML" 
          })
        });
        if (response.ok) successCount++;
        else failCount++;
      } catch (e) {
        failCount++;
      }
    }

    res.json({ success: true, successCount, failCount });
  });

  // --- Telegram Bot Polling ---
  let lastUpdateId = 0;
  const userStates: Record<number, { action: string, studentId?: string, phone?: string, code?: string }> = {};

  async function pollTelegram() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
      const data: any = await res.json();
      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          
          if (update.callback_query) {
            const chatId = update.callback_query.message.chat.id;
            const callbackData = update.callback_query.data;
            const db = readDB();

            if (callbackData === "add_child") {
              userStates[chatId] = { action: "WAITING_NAME" };
              await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: "Yangi farzandingizning <b>Ism Familiyasini</b> yuboring:",
                  parse_mode: "HTML"
                })
              });
            } else if (callbackData === "check_debt") {
              const students = db.students.filter((s: any) => s.parentChatId === chatId);
              for (const s of students) {
                const studentPayments = db.payments.filter((p: any) => p.studentId === s.id);
                const totalPaid = studentPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                const createdAt = new Date(s.createdAt || s.birthDate);
                const months = Math.max(1, (new Date().getFullYear() - createdAt.getFullYear()) * 12 + (new Date().getMonth() - createdAt.getMonth()) + 1);
                const debt = Math.max(0, (Number(s.amount) * months) - totalPaid);

                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: `👤 <b>O'quvchi:</b> ${s.name}\n💰 <b>Oylik to'lov:</b> ${Number(s.amount).toLocaleString()} so'm\n🔴 <b>Umumiy qarzdorlik:</b> ${debt.toLocaleString()} so'm`,
                    parse_mode: "HTML"
                  })
                });
              }
            } else if (callbackData.startsWith("sel_")) {
              const studentId = callbackData.replace("sel_", "");
              const student = db.students.find((s: any) => s.id === studentId);
              if (student) {
                userStates[chatId] = { ...userStates[chatId], action: "WAITING_CONTACT", studentId };
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: `Siz <b>${student.name}</b> ni tanladingiz. Tasdiqlash uchun pastdagi tugmani bosib telefon raqamingizni yuboring (kontakt ulash orqali):`,
                    parse_mode: "HTML",
                    reply_markup: {
                      keyboard: [[{ text: "📱 Telefon raqamni yuborish", contact: true }]],
                      resize_keyboard: true,
                      one_time_keyboard: true
                    }
                  })
                });
              }
            }
            continue;
          }

          const msg = update.message;
          if (!msg) continue;

          const chatId = msg.chat.id;
          const text = msg.text;

          const db = readDB();

          if (text === "/start") {
            const linkedStudents = db.students.filter((s: any) => s.parentChatId === chatId);
            
            if (linkedStudents.length > 0) {
              const studentNames = linkedStudents.map((s: any) => `• <b>${s.name}</b>`).join("\n");
              await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `<b>Sizning farzandlaringiz:</b>\n${studentNames}\n\nYangi bola qo'shish yoki qarzdorlikni tekshirish uchun quyidagilardan foydalaning:`,
                  parse_mode: "HTML",
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "➕ Bola qo'shish", callback_data: "add_child" }],
                      [{ text: "💰 Qarzdorlikni ko'rish", callback_data: "check_debt" }]
                    ]
                  }
                })
              });
            } else {
              userStates[chatId] = { action: "WAITING_NAME" };
              await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: "<b>SmartKids CRM Botiga xush kelibsiz!</b>\n\nFarzandingiz ma'lumotlarini ko'rishni boshlash uchun uning <b>Ism Familiyasini</b> yuboring (masalan: <i>Yusufov Imronbek</i>).",
                  parse_mode: "HTML",
                  reply_markup: { remove_keyboard: true }
                })
              });
            }
          } else if (text === "/qarz") {
            const students = db.students.filter((s: any) => s.parentChatId === chatId);
            if (students.length > 0) {
              for (const s of students) {
                const studentPayments = db.payments.filter((p: any) => p.studentId === s.id);
                const totalPaid = studentPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                const createdAt = new Date(s.createdAt || s.birthDate);
                const months = Math.max(1, (new Date().getFullYear() - createdAt.getFullYear()) * 12 + (new Date().getMonth() - createdAt.getMonth()) + 1);
                const debt = Math.max(0, (Number(s.amount) * months) - totalPaid);

                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: `👤 <b>O'quvchi:</b> ${s.name}\n💰 <b>Oylik to'lov:</b> ${Number(s.amount).toLocaleString()} so'm\n🔴 <b>Umumiy qarzdorlik:</b> ${debt.toLocaleString()} so'm`,
                    parse_mode: "HTML"
                  })
                });
              }
            } else {
              await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: chatId, text: "Siz hali ro'yxatdan o'tmagansiz. Iltimos /start bosing." })
              });
            }
          } else if (msg.contact && userStates[chatId]?.action === "WAITING_CONTACT") {
            const phone = msg.contact.phone_number.replace(/[^0-9]/g, "");
            const verifyCode = Math.floor(1000 + Math.random() * 9000).toString();
            
            userStates[chatId] = { ...userStates[chatId], action: "WAITING_CODE", phone, code: verifyCode };
            
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: `📩 Sizga tasdiqlash kodi yuborildi: <b>${verifyCode}</b>\n\nIltimos, ushbu kodni botga yozib yuboring.`,
                parse_mode: "HTML",
                reply_markup: { remove_keyboard: true }
              })
            });
          } else if (text && userStates[chatId]?.action === "WAITING_CODE") {
            if (text.trim() === userStates[chatId].code) {
              const { studentId, phone } = userStates[chatId];
              const student = db.students.find((s: any) => s.id === studentId);
              
              if (student) {
                student.parentChatId = chatId;
                student.parentPhone = phone;
                
                const siblings = db.students.filter((s: any) => 
                  (s.parentPhone === phone || s.parentChatId === chatId) && s.adminId === student.adminId
                );
                
                if (siblings.length >= 2) {
                  siblings.forEach((s: any) => s.amount = 200000);
                } else {
                  student.amount = 250000;
                }

                writeDB(db);
                delete userStates[chatId];
                
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: `✅ <b>Tasdiqlandi!</b>\n\nSiz <b>${student.name}</b> ning ota-onasi sifatida ulandingiz.\n\nEndi sizga har oy to'lov muddatlari va tadbirlar haqida xabar boradi.\n\n💰 Qarzdorlikni bilish: /qarz\n➕ Yana bola qo'shish: /start`,
                    parse_mode: "HTML"
                  })
                });
              }
            } else {
              await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: chatId, text: "❌ Xato kod kiritildi. Iltimos, qaytadan urinib ko'ring." })
              });
            }
          } else if (text && text.length >= 3 && !text.startsWith("/") && (!userStates[chatId] || userStates[chatId].action === "WAITING_NAME")) {
            // Search for students
            const query = text.toLowerCase();
            const matches = db.students.filter((s: any) => 
              s.name.toLowerCase().includes(query)
            ).slice(0, 8);

            if (matches.length > 0) {
              const inlineKeyboard = matches.map((s: any) => ([{
                text: s.name,
                callback_data: `sel_${s.id}`
              }]));

              await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `Quyidagi o'quvchilardan birini tanlang:`,
                  reply_markup: { inline_keyboard: inlineKeyboard }
                })
              });
            } else {
              await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: "❌ Kechirasiz, bu ismli o'quvchi topilmadi. Iltimos, ismni to'g'ri yozganingizga ishonch hosil qiling."
                })
              });
            }
          }
        }
      }
    } catch (e) {
      console.error("Bot error:", e);
    }
    setTimeout(pollTelegram, 3000);
  }

  if (process.env.TELEGRAM_BOT_TOKEN) {
    pollTelegram();
    console.log("Telegram Bot polling started...");
  }

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
