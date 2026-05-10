import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  deleteDoc,
  limit
} from 'firebase/firestore';
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase config safely
const configPath = path.join(__dirname, 'firebase-applet-config.json');
let firebaseConfig: any = {};
try {
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } else {
    console.error("Critical: firebase-applet-config.json not found");
  }
} catch (error) {
  console.error("Critical: Could not read firebase-applet-config.json", error);
}

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check for debugging
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", firebase: !!firebaseConfig.projectId });
  });

  // --- API ROUTES ---

  // Register
  app.post("/api/register", async (req, res) => {
    const { phone, password, name } = req.body;
    const pathName = "admins";
    try {
      const q = query(collection(db, pathName), where("phone", "==", phone), limit(1));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return res.status(400).json({ success: false, message: "Ushbu telefon raqam allaqachon mavjud" });
      }

      const id = Date.now().toString();
      const newAdmin = { phone, password, name, id };
      await setDoc(doc(db, pathName, id), newAdmin);
      res.json({ success: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, pathName);
    }
  });

  // Auth
  app.post("/api/login", async (req, res) => {
    const phone = req.body.phone?.toString().trim();
    const password = req.body.password?.toString().trim();
    const pathName = "admins";
    
    try {
      const q = query(collection(db, pathName), where("phone", "==", phone), where("password", "==", password), limit(1));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const admin = snapshot.docs[0].data();
        res.json({ success: true, token: "fake-jwt-token", admin });
      } else {
        res.status(401).json({ success: false, message: "Xato telefon yoki parol" });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, pathName);
    }
  });

  // Students
  app.get("/api/students", async (req, res) => {
    const adminId = req.headers["admin-id"] as string;
    const pathName = "students";
    try {
      const q = query(collection(db, pathName), where("adminId", "==", adminId));
      const snapshot = await getDocs(q);
      const students = snapshot.docs.map(doc => doc.data());

      // We need payments for debt calculation
      const pSnapshot = await getDocs(query(collection(db, "payments"), where("adminId", "==", adminId)));
      const payments = pSnapshot.docs.map(doc => doc.data());

      const studentsWithDebt = students.map((s: any) => {
        const studentPayments = payments.filter((p: any) => p.studentId === s.id);
        const totalPaid = studentPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
        
        const startDate = new Date(s.createdAt || new Date().toISOString());
        const now = new Date();
        const monthsSinceJoin = Math.max(1, (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()) + 1);
        
        const expectedTotal = Number(s.amount) * monthsSinceJoin;
        return { ...s, debt: Math.max(0, expectedTotal - totalPaid), totalPaid };
      });
      res.json(studentsWithDebt);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, pathName);
    }
  });

  app.post("/api/students", async (req, res) => {
    const adminId = req.headers["admin-id"] as string;
    if (!adminId) return res.status(401).json({ message: "Admin ID missing" });
    
    const pathName = "students";
    try {
      const id = Date.now().toString();
      const newStudent = {
        id,
        adminId,
        ...req.body,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, pathName, id), newStudent);
      res.json(newStudent);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, pathName);
    }
  });

  app.put("/api/students/:id", async (req, res) => {
    const adminId = req.headers["admin-id"] as string;
    const pathName = "students";
    try {
      const studentDoc = doc(db, pathName, req.params.id);
      const snapshot = await getDoc(studentDoc);
      
      if (snapshot.exists() && snapshot.data().adminId === adminId) {
        await updateDoc(studentDoc, req.body);
        res.json({ ...snapshot.data(), ...req.body });
      } else {
        res.status(404).json({ message: "Student not found or access denied" });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, pathName);
    }
  });

  app.delete("/api/students/:id", async (req, res) => {
    const adminId = req.headers["admin-id"] as string;
    const pathName = "students";
    try {
      const studentDoc = doc(db, pathName, req.params.id);
      const snapshot = await getDoc(studentDoc);
      
      if (snapshot.exists() && snapshot.data().adminId === adminId) {
        await deleteDoc(studentDoc);
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Student not found or access denied" });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, pathName);
    }
  });

  app.get("/api/payments", async (req, res) => {
    const adminId = req.headers["admin-id"] as string;
    const pathName = "payments";
    try {
      const q = query(collection(db, pathName), where("adminId", "==", adminId));
      const snapshot = await getDocs(q);
      res.json(snapshot.docs.map(doc => doc.data()));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, pathName);
    }
  });

  app.post("/api/payments", async (req, res) => {
    const adminId = req.headers["admin-id"] as string;
    const pathName = "payments";
    try {
      const id = `CH-${Date.now()}`;
      const newPayment = {
        id,
        adminId,
        ...req.body,
        date: new Date().toISOString()
      };
      await setDoc(doc(db, pathName, id), newPayment);
      res.json(newPayment);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, pathName);
    }
  });

  app.get("/api/expenses", async (req, res) => {
    const adminId = req.headers["admin-id"] as string;
    const pathName = "expenses";
    try {
      const q = query(collection(db, pathName), where("adminId", "==", adminId));
      const snapshot = await getDocs(q);
      res.json(snapshot.docs.map(doc => doc.data()));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, pathName);
    }
  });

  app.post("/api/expenses", async (req, res) => {
    const adminId = req.headers["admin-id"] as string;
    const pathName = "expenses";
    try {
      const id = Date.now().toString();
      const newExpense = {
        id,
        adminId,
        ...req.body,
        date: new Date().toISOString()
      };
      await setDoc(doc(db, pathName, id), newExpense);
      res.json(newExpense);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, pathName);
    }
  });

  app.get("/api/stats", async (req, res) => {
    const adminId = req.headers["admin-id"] as string;
    
    try {
      const sQ = query(collection(db, "students"), where("adminId", "==", adminId));
      const pQ = query(collection(db, "payments"), where("adminId", "==", adminId));
      const eQ = query(collection(db, "expenses"), where("adminId", "==", adminId));

      const [sSnap, pSnap, eSnap] = await Promise.all([getDocs(sQ), getDocs(pQ), getDocs(eQ)]);
      
      const myStudents = sSnap.docs.map(doc => doc.data());
      const myPayments = pSnap.docs.map(doc => doc.data());
      const myExpenses = eSnap.docs.map(doc => doc.data());

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
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Telegram Notifications API
  app.post("/api/notify", async (req, res) => {
    const { message, chatId, studentId } = req.body;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return res.status(500).json({ message: "Bot token missing" });

    let targetChatId = chatId;
    if (studentId) {
      try {
        const studentDoc = doc(db, "students", studentId);
        const snapshot = await getDoc(studentDoc);
        if (snapshot.exists() && snapshot.data().parentChatId) {
          targetChatId = snapshot.data().parentChatId;
        }
      } catch (e) {
        console.error("Error finding student for notification:", e);
      }
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
    const adminId = req.headers["admin-id"] as string;
    const { message } = req.body;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return res.status(500).json({ message: "Bot token missing" });

    try {
      const q = query(collection(db, "students"), where("adminId", "==", adminId));
      const snapshot = await getDocs(q);
      const myStudents = snapshot.docs.map(doc => doc.data());
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
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // --- Telegram Bot Polling ---
  let lastUpdateId = 0;
  let isPolling = false;
  const userStates: Record<number, { action: string, studentId?: string, phone?: string, code?: string }> = {};

  async function pollTelegram() {
    if (isPolling) return;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    isPolling = true;
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
      const data: any = await res.json();
      
      if (data.ok && data.result && data.result.length > 0) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          
          if (update.callback_query) {
            const chatId = update.callback_query.message.chat.id;
            const callbackData = update.callback_query.data;

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
              const q = query(collection(db, "students"), where("parentChatId", "==", chatId));
              const sSnap = await getDocs(q);
              const students = sSnap.docs.map(doc => doc.data());

              if (students.length === 0) {
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ chat_id: chatId, text: "Sizga biriktirilgan o'quvchilar topilmadi." })
                });
              }
              for (const s of students) {
                const pSnap = await getDocs(query(collection(db, "payments"), where("studentId", "==", s.id)));
                const studentPayments = pSnap.docs.map(doc => doc.data());
                
                const totalPaid = studentPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                const startDate = new Date(s.createdAt || new Date().toISOString());
                const now = new Date();
                const months = Math.max(1, (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()) + 1);
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
              const sDoc = await getDoc(doc(db, "students", studentId));
              
              if (sDoc.exists()) {
                const student = sDoc.data();
                const parentSnap = await getDocs(query(collection(db, "students"), where("parentChatId", "==", chatId)));
                const existingChild = parentSnap.empty ? null : parentSnap.docs[0].data();
                
                if (existingChild) {
                  await updateDoc(doc(db, "students", studentId), {
                    parentChatId: chatId,
                    parentPhone: existingChild.parentPhone
                  });
                  
                  const allChildrenSnap = await getDocs(query(collection(db, "students"), where("parentChatId", "==", chatId)));
                  const allChildren = allChildrenSnap.docs.map(doc => doc.data());
                  
                  if (allChildren.length >= 2) {
                    for (const child of allChildren) {
                      await updateDoc(doc(db, "students", child.id), { amount: 200000 });
                    }
                  } else {
                    await updateDoc(doc(db, "students", studentId), { amount: 250000 });
                  }
                  
                  delete userStates[chatId];
                  
                  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      chat_id: chatId,
                      text: `✅ <b>Muvaffaqiyatli!</b>\n\n<b>${student.name}</b> ham ro'yxatingizga qo'shildi.\n\nSizda jami ${allChildren.length} ta farzand ulangan. Sibling chegirmasi avtomatik qo'llanildi.`,
                      parse_mode: "HTML",
                      reply_markup: {
                        inline_keyboard: [[{ text: "💰 To'lovlarni ko'rish", callback_data: "check_debt" }]]
                      }
                    })
                  });
                } else {
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
            }
            continue;
          }

          const msg = update.message;
          if (!msg) continue;

          const chatId = msg.chat.id;
          const text = msg.text;

          if (text === "/start") {
            const q = query(collection(db, "students"), where("parentChatId", "==", chatId));
            const snapshot = await getDocs(q);
            const linkedStudents = snapshot.docs.map(doc => doc.data());
            
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
            const q = query(collection(db, "students"), where("parentChatId", "==", chatId));
            const snapshot = await getDocs(q);
            const students = snapshot.docs.map(doc => doc.data());

            if (students.length > 0) {
              for (const s of students) {
                const pSnap = await getDocs(query(collection(db, "payments"), where("studentId", "==", s.id)));
                const studentPayments = pSnap.docs.map(doc => doc.data());
                
                const totalPaid = studentPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                const startDate = new Date(s.createdAt || new Date().toISOString());
                const now = new Date();
                const months = Math.max(1, (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()) + 1);
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
              
              await updateDoc(doc(db, "students", studentId!), {
                parentChatId: chatId,
                parentPhone: phone
              });
              
              const siblingsSnap = await getDocs(query(collection(db, "students"), where("parentChatId", "==", chatId)));
              const siblings = siblingsSnap.docs.map(doc => doc.data());
              
              if (siblings.length >= 2) {
                for (const s of siblings) {
                  await updateDoc(doc(db, "students", s.id), { amount: 200000 });
                }
              } else {
                await updateDoc(doc(db, "students", studentId!), { amount: 250000 });
              }

              delete userStates[chatId];
              
              await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `✅ <b>Tasdiqlandi!</b>\n\nSiz ro'yxatdan o'tdingiz.\n\n💰 Qarzdorlik: /qarz\n➕ Yana bola qo'shish: /start`,
                  parse_mode: "HTML"
                })
              });
            } else {
              await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: chatId, text: "❌ Xato kod kiritildi. Iltimos, qaytadan urinib ko'ring." })
              });
            }
          } else if (text && text.length >= 3 && !text.startsWith("/") && (!userStates[chatId] || userStates[chatId].action === "WAITING_NAME")) {
            const queryText = text.toLowerCase();
            const sSnap = await getDocs(collection(db, "students"));
            const matches = sSnap.docs
              .map(doc => doc.data())
              .filter((s: any) => s.name.toLowerCase().includes(queryText))
              .slice(0, 8);

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
                  text: "❌ Kechirasiz, bu ismli o'quvchi topilmadi."
                })
              });
            }
          }
        }
      }
    } catch (e) {
      console.error("Bot polling error:", e);
    } finally {
      isPolling = false;
      setTimeout(pollTelegram, 2000);
    }
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

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global Server Error:", err);
    res.status(500).json({ success: false, message: "Serverda ichki xatolik yuz berdi", detail: err.message });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
