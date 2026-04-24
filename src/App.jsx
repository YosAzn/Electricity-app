import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Copy, Save, BookOpen, CheckCircle2, ArrowLeftRight, ScanLine, Loader2, AlertTriangle, Bolt, Edit2, Trash2, Check, X } from 'lucide-react';


const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 

// --- Exact Historical Data from Provided CSV files ---
const historicalData = [
  // 2025 Data (Full Year)
  { id: 'h2025-6', date: "נוב'- דצמ' 2025", currReading: 86781, totalToPay: 548.0, usage: 856, tariff: 54.25, isHistorical: true },
  { id: 'h2025-5', date: "ספט' - אוק' 2025", currReading: 85925, totalToPay: 994.8, usage: 1554, tariff: 54.25, isHistorical: true },
  { id: 'h2025-4', date: "יולי - אוג' 2025", currReading: 84371, totalToPay: 923.7, usage: 1443, tariff: 54.25, isHistorical: true },
  { id: 'h2025-3', date: "מאי - יוני 2025", currReading: 82928, totalToPay: 777.8, usage: 1215, tariff: 54.25, isHistorical: true },
  { id: 'h2025-2', date: "מרץ - אפר' 2025", currReading: 81713, totalToPay: 576.1, usage: 900, tariff: 54.25, isHistorical: true },
  { id: 'h2025-1', date: "ינו' - פבר' 2025", currReading: 80813, totalToPay: 495.3, usage: 780, tariff: 54.25, isHistorical: true },

  // 2024 Data
  { id: 'h2024-6', date: "נוב'- דצמ' 2024", currReading: 80033, totalToPay: 459.63, usage: 748, tariff: 52.52, isHistorical: true },
  { id: 'h2024-5', date: "ספט' - אוק' 2024", currReading: 79285, totalToPay: 651.35, usage: 1060, tariff: 52.52, isHistorical: true },
  { id: 'h2024-4', date: "יולי - אוג' 2024", currReading: 78225, totalToPay: 893.45, usage: 1454, tariff: 52.52, isHistorical: true },
  { id: 'h2024-3', date: "מאי - יוני 2024", currReading: 76771, totalToPay: 681.46, usage: 1109, tariff: 52.52, isHistorical: true },
  { id: 'h2024-2', date: "מרץ - אפר' 2024", currReading: 75662, totalToPay: 416.62, usage: 678, tariff: 52.52, isHistorical: true },
  { id: 'h2024-1', date: "ינו' - פבר' 2024", currReading: 74984, totalToPay: 397.94, usage: 658, tariff: 51.69, isHistorical: true },
  
  // 2023 Data
  { id: 'h2023-6', date: "נוב'- דצמ' 2023", currReading: 74326, totalToPay: 248.68, usage: 414, tariff: 51.34, isHistorical: true },
  { id: 'h2023-5', date: "ספט' - אוק' 2023", currReading: 73912, totalToPay: 771.87, usage: 1285, tariff: 51.34, isHistorical: true },
  { id: 'h2023-4', date: "יולי - אוג' 2023", currReading: 72627, totalToPay: 739.43, usage: 1231, tariff: 51.34, isHistorical: true },
  { id: 'h2023-3', date: "מאי - יוני 2023", currReading: 71396, totalToPay: 813.91, usage: 1355, tariff: 51.34, isHistorical: true },
  { id: 'h2023-2', date: "מרץ - אפר' 2023", currReading: 70041, totalToPay: 423.84, usage: 698, tariff: 51.90, isHistorical: true },
  { id: 'h2023-1', date: "ינו' - פבר' 2023", currReading: 69343, totalToPay: 471.20, usage: 779, tariff: 51.70, isHistorical: true },
];

// --- Helper: Predict next billing period ---
const predictNextPeriod = (prevDateStr) => {
  if (!prevDateStr) return "";
  let year = parseInt(prevDateStr.match(/\d{4}/)?.[0] || new Date().getFullYear());
  let nextMonthStr = "ינו'-פבר'";

  if (prevDateStr.includes("ינו") || prevDateStr.includes("פבר")) nextMonthStr = "מרץ-אפר'";
  else if (prevDateStr.includes("מרץ") || prevDateStr.includes("אפר")) nextMonthStr = "מאי-יוני";
  else if (prevDateStr.includes("מאי") || prevDateStr.includes("יוני")) nextMonthStr = "יולי-אוג'";
  else if (prevDateStr.includes("יולי") || prevDateStr.includes("אוג")) nextMonthStr = "ספט'-אוק'";
  else if (prevDateStr.includes("ספט") || prevDateStr.includes("אוק")) nextMonthStr = "נוב'-דצמ'";
  else if (prevDateStr.includes("נוב") || prevDateStr.includes("דצמ")) {
      nextMonthStr = "ינו'-פבר'";
      year += 1;
  }
  return `${nextMonthStr} ${year}`;
};

// --- AI Parsing Logic Improved ---
const analyzeBillWithAI = async (imagesDataList) => {
  // השימוש במודל שנתמך בסביבת התצוגה המקדימה
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const prompt = `
    You are an expert at extracting data from Israeli Electricity bills (חברת חשמל).
    Analyze the provided bill images and extract the exact details requested.
    Return ONLY a valid JSON object.
    
    Fields to extract:
    1. "reading": Look for a handwritten number (often in pen) indicating the current meter reading on the first page. If none, return empty string "".
    2. "vat": The VAT percentage (מע"מ) used in the bill (e.g., 17 or 18).
    3. "period": The billing period (תקופת החשבון). Format as Hebrew short months (e.g. "ינו'-פבר'", "מרץ-אפר'", "מאי-יוני", "יולי-אוג'", "ספט'-אוק'", "נוב'-דצמ'").
    4. "hasTariffChange": Boolean true/false. Look at the consumption breakdown table. Is the consumption split into TWO lines with TWO DIFFERENT prices?
    5. "tariff1": The OLD / FIRST price per kWh in Agorot (מחיר לקוט"ש). If no change, put the regular tariff here.
    6. "parentsUsage1": The total kWh consumed under tariff1 (צריכה בקוט"ש).
    7. "tariff2": The NEW / SECOND price per kWh in Agorot (only if hasTariffChange is true).
    8. "parentsUsage2": The total kWh consumed under tariff2 (only if hasTariffChange is true).
    
    Important: If there is no tariff change, set hasTariffChange to false, put the single tariff in tariff1, and leave tariff2, parentsUsage1, parentsUsage2 empty.
    
    Example Output:
    {"reading": "85925", "vat": "17", "period": "ספט'-אוק'", "hasTariffChange": true, "parentsUsage1": "498", "tariff1": "54.25", "parentsUsage2": "1433", "tariff2": "52.52"}
  `;

  const imageParts = imagesDataList.map(img => ({ 
    inlineData: { mimeType: img.mimeType, data: img.data.split(',')[1] } 
  }));

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }, ...imageParts] }],
    // כפיית JSON כדי למנוע שגיאות בפענוח
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  // מנגנון ניסיונות חוזרים (Exponential Backoff) להתמודדות עם ניתוקים או עומס
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < delays.length; i++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
         const errText = await response.text();
         throw new Error(`API returned status ${response.status}: ${errText}`);
      }
      
      const result = await response.json();
      let text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      
      // ניקוי סימני Markdown במידה והמודל התעלם מהבקשה
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      if (i === delays.length - 1) {
        console.error("AI Parsing error:", error);
        throw error;
      }
    }
    // השהיה לפני ניסיון חוזר
    await new Promise(r => setTimeout(r, delays[i]));
  }
};

const InputField = ({ label, value, onChange, type = "text", suffix = "", placeholder="0" }) => (
  <div className="mb-5 group">
    <label className="block text-zinc-600 text-[14px] font-bold mb-2 ml-2 transition-colors duration-300 group-focus-within:text-zinc-900">
      {label}
    </label>
    <div className="relative">
      <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder}
        className="w-full px-5 py-4 rounded-[1.25rem] bg-white/50 backdrop-blur-md border border-white/80 focus:outline-none focus:bg-white/80 focus:border-zinc-300 focus:shadow-[0_0_20px_rgba(0,0,0,0.06)] hover:shadow-[0_0_15px_rgba(255,255,255,0.8)] hover:border-white text-2xl transition-all duration-300 font-bold text-zinc-800" 
        dir="ltr" 
      />
      {suffix && <span className="absolute right-5 top-4 text-zinc-400 font-bold text-lg pointer-events-none">{suffix}</span>}
    </div>
  </div>
);

function App() {
  const [localHistory, setLocalHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('calc');
  
  // App State
  const [prevPeriodLabel, setPrevPeriodLabel] = useState('');
  const [currentPeriodInput, setCurrentPeriodInput] = useState('');
  const [prevReading, setPrevReading] = useState('');
  const [currReading, setCurrReading] = useState('');
  const [tariff, setTariff] = useState(''); 
  const [vat, setVat] = useState(17);
  const [lastKnownTariff, setLastKnownTariff] = useState('');
  
  // Editing & Copying State
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const [hasChange, setHasChange] = useState(false);
  const [parentsUsage1, setParentsUsage1] = useState('');
  const [parentsUsage2, setParentsUsage2] = useState('');
  const [tariff2, setTariff2] = useState(''); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
  const resultRef = useRef(null);

  // --- Custom Modals Methods ---
  const showAlert = (title, message) => setModal({ isOpen: true, type: 'alert', title, message, onConfirm: null });
  const showConfirm = (title, message, onConfirm) => setModal({ isOpen: true, type: 'confirm', title, message, onConfirm });
  const closeModal = () => setModal({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('electricity_history_db');
    if (savedData) {
      try {
        setLocalHistory(JSON.parse(savedData));
      } catch (err) {
        console.error("Failed to parse local history", err);
      }
    }
  }, []);

  const updateLocalStorage = (newHistory) => {
    setLocalHistory(newHistory);
    localStorage.setItem('electricity_history_db', JSON.stringify(newHistory));
  };

  // Merge Local Storage Data and Filter out Overrides
  const validLocalHistory = localHistory.filter(item => !item.isDeleted);
  const overriddenIds = localHistory.map(item => item.overrides).filter(Boolean);
  const filteredHistorical = historicalData.filter(item => !overriddenIds.includes(item.id));
  const combinedHistory = [...validLocalHistory, ...filteredHistorical];

  const getGroupedHistory = () => {
    const grouped = combinedHistory.reduce((acc, item) => {
      const match = item.date?.match(/\d{4}/);
      const year = match ? match[0] : new Date().getFullYear().toString();
      if (!acc[year]) acc[year] = [];
      acc[year].push(item);
      return acc;
    }, {});
    
    const sortedYears = Object.keys(grouped).sort((a, b) => b - a);
    
    sortedYears.forEach(year => {
      grouped[year].sort((a, b) => (b.currReading || 0) - (a.currReading || 0));
    });

    return { grouped, sortedYears };
  };

  const { grouped, sortedYears } = getGroupedHistory();

  // SMART REACTIVE PRE-FILL
  useEffect(() => {
    const sortedAll = [...combinedHistory].sort((a, b) => (b.currReading || 0) - (a.currReading || 0));
    
    if (sortedAll.length > 0) {
      const latestRecord = sortedAll[0];
      
      setPrevReading(latestRecord.currReading?.toString() || '');
      
      const detectedTariff = latestRecord.tariff || latestRecord.tariff2 || 54.25;
      setTariff(detectedTariff.toString());
      setLastKnownTariff(detectedTariff.toString());
      
      if (latestRecord.date) {
        setPrevPeriodLabel(latestRecord.date);
        setCurrentPeriodInput(predictNextPeriod(latestRecord.date));
      }
    }
  }, [localHistory]); 

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    setIsAnalyzing(true);
    try {
      const readPromises = files.map(file => new Promise((res) => {
        const r = new FileReader(); r.onload = () => res({ data: r.result, mimeType: file.type }); r.readAsDataURL(file);
      }));
      const images = await Promise.all(readPromises);
      const data = await analyzeBillWithAI(images);
      
      if (data.reading) setCurrReading(data.reading);
      if (data.vat) setVat(data.vat);
      if (data.period) setCurrentPeriodInput(`${data.period} ${new Date().getFullYear()}`);
      
      if (data.hasTariffChange) {
        setHasChange(true);
        if (lastKnownTariff) setTariff(lastKnownTariff);
        if (data.tariff1) setTariff(data.tariff1.toString());
        if (data.tariff2) setTariff2(data.tariff2.toString());
        setParentsUsage1(data.parentsUsage1?.toString() || '');
        setParentsUsage2(data.parentsUsage2?.toString() || '');
        showAlert("זיהוי אוטומטי", "✅ זוהה שינוי תעריף/מע\"מ. הנתונים מולאו אוטומטית לחישוב יחסי.");
      } else if (data.tariff1) {
        if (lastKnownTariff && parseFloat(data.tariff1) !== parseFloat(lastKnownTariff)) {
          setHasChange(true);
          setTariff(lastKnownTariff);
          setTariff2(data.tariff1.toString());
          showAlert("זיהוי תעריף", `✅ זוהה שינוי תעריף! (מ-${lastKnownTariff} ל-${data.tariff1}). אנא השלם נתונים לחישוב יחסי.`);
        } else {
          setTariff(data.tariff1.toString());
          showAlert("הצלחה", "✅ החשבונית פוענחה בהצלחה!");
        }
      } else {
        showAlert("סיום פענוח", "✅ פוענחו חלק מהנתונים מהחשבונית.");
      }
    } catch (e) { 
        console.error(e);
        showAlert("שגיאה", "❌ נכשל בפענוח החשבונית. ייתכן והתמונה אינה ברורה מספיק או שרת ה-AI עמוס, נסו שוב."); 
    }
    finally { setIsAnalyzing(false); }
  };

  const calculateBill = () => {
    const pRead = parseFloat(prevReading), cRead = parseFloat(currReading), t1 = parseFloat(tariff), currentVat = parseFloat(vat);
    if (isNaN(pRead) || isNaN(cRead) || isNaN(t1)) return showAlert("חסרים נתונים", "נא למלא קריאות ותעריף.");
    
    if (cRead < pRead) {
      showAlert("שגיאה בנתונים", "קריאה נוכחית לא יכולה להיות קטנה מקריאה קודמת.");
      return;
    }

    if (!currentPeriodInput.trim()) {
      showAlert("שגיאה בנתונים", "נא לוודא שתקופת החשבון מלאה (למשל: ינו׳-פבר׳ 2026).");
      return;
    }

    const totalUsage = cRead - pRead;
    let finalCostBeforeVat = 0;
    let details = {};

    if (!hasChange) {
      finalCostBeforeVat = totalUsage * (t1 / 100);
      details = { type: 'simple', usage: totalUsage, costBeforeVat: finalCostBeforeVat, tariffUsed: t1 };
    } else {
      const p1 = parseFloat(parentsUsage1), p2 = parseFloat(parentsUsage2), t2 = parseFloat(tariff2);
      if (isNaN(p1) || isNaN(p2) || isNaN(t2)) {
        showAlert("שגיאה בנתונים", "נא למלא את כל נתוני השינוי (צריכת ההורים ותעריף חדש).");
        return;
      }

      const ratio1 = p1 / (p1 + p2);
      const ratio2 = p2 / (p1 + p2);
      const tenantsUsage1 = totalUsage * ratio1;
      const tenantsUsage2 = totalUsage * ratio2;
      
      const cost1 = tenantsUsage1 * (t1 / 100);
      const cost2 = tenantsUsage2 * (t2 / 100);
      finalCostBeforeVat = cost1 + cost2;
      
      details = { type: 'split', totalUsage, usage1: tenantsUsage1, usage2: tenantsUsage2, ratioPercent1: ratio1*100, ratioPercent2: ratio2*100, tariff1: t1, tariff2: t2, cost1, cost2, costBeforeVat: finalCostBeforeVat };
    }

    const vatAmount = finalCostBeforeVat * (currentVat / 100);
    const totalToPay = finalCostBeforeVat + vatAmount;

    setResult({ id: Date.now().toString(), date: currentPeriodInput, prevReading: pRead, currReading: cRead, totalToPay, details, vatAmount });
    setIsSaved(false);
    setIsCopied(false);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  };

  const generateWhatsAppMessage = () => {
    if (!result) return "";
    let msg = `*חשבון חשמל - שרון ודקלה* ⚡\n`;
    msg += `תקופה: ${result.date}\n\n`;
    msg += `קריאה קודמת: ${result.prevReading}\n`;
    msg += `קריאה נוכחית: ${result.currReading}\n`;
    msg += `סה"כ צריכה: ${result.details.usage || result.details.totalUsage} קוט"ש\n\n`;
    
    if (result.details.type === 'split') {
        msg += `*(בוצע חישוב יחסי בגין שינוי תעריף במהלך התקופה)*\n`;
        msg += `החלוקה היחסית בוצעה לפי אחוזי הצריכה של שעון ההורים הראשי:\n\n`;
        msg += `• ${result.details.ratioPercent1.toFixed(1)}% מהצריכה שלכם (${result.details.usage1.toFixed(1)} קוט"ש) חושבו לפי התעריף הישן - ${result.details.tariff1} אג'\n`;
        msg += `• ${result.details.ratioPercent2.toFixed(1)}% מהצריכה שלכם (${result.details.usage2.toFixed(1)} קוט"ש) חושבו לפי התעריף החדש - ${result.details.tariff2} אג'\n\n`;
    } else {
        msg += `תעריף: ${result.details.tariffUsed} אג' לקוט"ש\n\n`;
    }

    msg += `סכום לתשלום: *₪${result.totalToPay.toFixed(2)}*\n`;
    msg += `(כולל ${vat}% מע"מ)\n\n`;
    msg += `תודה! 🙏`;
    return msg;
  };

  const copyToClipboard = () => {
    const text = generateWhatsAppMessage();
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
    document.body.removeChild(textArea);
  };

  // --- Generate Historical WhatsApp Message ---
  const generateHistoricalWhatsAppMessage = (item) => {
    let msg = `*חשבון חשמל - שרון ודקלה* ⚡\n`;
    msg += `תקופה: ${item.date}\n\n`;
    
    if (item.prevReading) msg += `קריאה קודמת: ${item.prevReading}\n`;
    msg += `קריאה נוכחית: ${item.currReading || '-'}\n`;
    msg += `סה"כ צריכה: ${item.usage || item.details?.totalUsage || '-'} קוט"ש\n\n`;
    
    if (item.details && item.details.type === 'split') {
        msg += `*(בוצע חישוב יחסי בגין שינוי תעריף במהלך התקופה)*\n`;
        msg += `החלוקה היחסית בוצעה לפי אחוזי הצריכה של שעון ההורים הראשי:\n\n`;
        msg += `• ${item.details.ratioPercent1.toFixed(1)}% מהצריכה שלכם (${item.details.usage1.toFixed(1)} קוט"ש) חושבו לפי התעריף הישן - ${item.details.tariff1} אג'\n`;
        msg += `• ${item.details.ratioPercent2.toFixed(1)}% מהצריכה שלכם (${item.details.usage2.toFixed(1)} קוט"ש) חושבו לפי התעריף החדש - ${item.details.tariff2} אג'\n\n`;
    } else if (item.tariff) {
        msg += `תעריף: ${item.tariff} אג' לקוט"ש\n\n`;
    }

    msg += `סכום לתשלום: *₪${item.totalToPay ? parseFloat(item.totalToPay).toFixed(2) : '-'}*\n`;
    if (item.vat || vat) msg += `(כולל ${item.vat || vat}% מע"מ)\n\n`;
    msg += `תודה! 🙏`;
    return msg;
  };

  const handleCopyHistorical = (item) => {
    const text = generateHistoricalWhatsAppMessage(item);
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 3000);
    } catch (err) {
      console.error('Failed to copy historical record', err);
    }
    document.body.removeChild(textArea);
  };

  const saveToHistory = () => {
    if (!result || isSaved) return;
    try {
      const payload = {
        id: result.id,
        date: result.date,
        totalToPay: result.totalToPay,
        usage: result.details.usage || result.details.totalUsage,
        currReading: result.currReading,
        prevReading: result.prevReading, 
        vat: vat, 
        details: result.details, 
        tariff: hasChange ? result.details.tariff2 : result.details.tariffUsed,
        createdAt: new Date().toISOString(),
        isHistorical: false
      };
      
      updateLocalStorage([...localHistory, payload]);
      setLastKnownTariff(payload.tariff.toString());
      setCurrReading(''); 
      setIsSaved(true);
    } catch (error) {
      console.error("Error saving:", error);
      showAlert("שגיאה", "❌ שגיאה בשמירת הנתונים בטלפון.");
    }
  };

  // --- LEDGER EDITING FUNCTIONS ---
  const handleEditClick = (record) => {
    setEditingId(record.id);
    setEditForm({ 
      ...record,
      tariff: record.tariff || '' 
    });
  };

  const handleUpdate = () => {
    try {
      const payload = {
        date: editForm.date,
        currReading: parseFloat(editForm.currReading) || 0,
        totalToPay: parseFloat(editForm.totalToPay) || 0,
        usage: parseFloat(editForm.usage) || 0,
        tariff: parseFloat(editForm.tariff) || 0
      };

      let newHistory;
      if (String(editingId).startsWith('h')) {
        const newRecord = {
          id: Date.now().toString(),
          ...payload,
          overrides: editingId,
          createdAt: new Date().toISOString()
        };
        newHistory = [...localHistory, newRecord];
      } else {
        newHistory = localHistory.map(item => 
          item.id === editingId ? { ...item, ...payload, updatedAt: new Date().toISOString() } : item
        );
      }
      
      updateLocalStorage(newHistory);
      setEditingId(null);
    } catch (err) {
      console.error("Update failed:", err);
      showAlert("שגיאה", "❌ שגיאה בעדכון הנתונים.");
    }
  };

  const handleDelete = (id) => {
    showConfirm(
      "מחיקת רשומה", 
      "האם את בטוחה שברצונך למחוק את החשבון הזה מהפנקס? המחשבון יתעדכן אוטומטית בהתאם.",
      () => {
        try {
          let newHistory;
          if (String(id).startsWith('h')) {
            const overrideRecord = {
              id: Date.now().toString(),
              overrides: id,
              isDeleted: true,
              createdAt: new Date().toISOString()
            };
            newHistory = [...localHistory, overrideRecord];
          } else {
            const recordToDelete = localHistory.find(item => item.id === id);
            if (recordToDelete && recordToDelete.overrides) {
               newHistory = localHistory.map(item => 
                 item.id === id ? { ...item, isDeleted: true, updatedAt: new Date().toISOString() } : item
               );
            } else {
               newHistory = localHistory.filter(item => item.id !== id);
            }
          }
          updateLocalStorage(newHistory);
        } catch (err) {
          console.error("Delete failed:", err);
          showAlert("שגיאה", "❌ שגיאה במחיקת הנתונים: " + err.message);
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-4 sm:p-6 font-sans relative overflow-hidden" dir="rtl">
      
      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Elegant Monochrome Glowing Orbs in the Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[0%] left-[-10%] w-[600px] h-[600px] bg-slate-300/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-zinc-300/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-60"></div>
      </div>

      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 max-w-sm w-full shadow-[0_20px_40px_rgba(0,0,0,0.15)] border border-white/80 animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-zinc-900 mb-3">{modal.title}</h3>
            <p className="text-zinc-600 font-medium mb-8 leading-relaxed">{modal.message}</p>
            <div className="flex gap-3">
              {modal.type === 'confirm' && (
                <button
                  onClick={() => { if(modal.onConfirm) modal.onConfirm(); closeModal(); }}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl transition-all shadow-sm"
                >
                  כן, למחוק
                </button>
              )}
              <button
                onClick={closeModal}
                className="flex-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold py-3 rounded-xl transition-all"
              >
                {modal.type === 'confirm' ? 'ביטול' : 'סגור'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto space-y-6 pb-20 pt-4 relative z-10">
        <div className="text-center mb-10 group">
          <div className="inline-flex items-center justify-center bg-white/60 backdrop-blur-md text-zinc-800 p-4 rounded-full mb-4 shadow-[0_0_20px_rgba(255,255,255,1)] border border-white transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(0,0,0,0.08)] group-hover:scale-105">
             <Bolt size={36} className="drop-shadow-sm text-amber-500 fill-amber-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-zinc-900 tracking-tight mb-2 drop-shadow-sm transition-colors duration-300">
            חשבון חשמל
          </h1>
          <p className="text-zinc-500 font-bold text-lg tracking-wide">שרון ודקלה</p>
        </div>

        <div className="flex bg-white/40 backdrop-blur-xl p-1.5 rounded-full mb-8 mx-auto shadow-inner border border-white/80 max-w-sm hover:shadow-[0_0_25px_rgba(255,255,255,0.9)] transition-all duration-300">
          <button 
            onClick={() => setActiveTab('calc')}
            className={`flex-1 py-3 px-4 rounded-full font-bold text-[15px] sm:text-base flex justify-center items-center gap-2 transition-all duration-300 ${activeTab === 'calc' ? 'bg-white/90 shadow-[0_4px_10px_rgba(0,0,0,0.04)] text-zinc-900' : 'text-zinc-500 hover:text-zinc-800 hover:bg-white/40'}`}
          >
            <Calculator size={20} /> המחשבון
          </button>
          <button 
            onClick={() => setActiveTab('ledger')}
            className={`flex-1 py-3 px-4 rounded-full font-bold text-[15px] sm:text-base flex justify-center items-center gap-2 transition-all duration-300 ${activeTab === 'ledger' ? 'bg-white/90 shadow-[0_4px_10px_rgba(0,0,0,0.04)] text-zinc-900' : 'text-zinc-500 hover:text-zinc-800 hover:bg-white/40'}`}
          >
            <BookOpen size={20} /> פנקס אמא
          </button>
        </div>

        {activeTab === 'calc' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="group bg-white/60 backdrop-blur-3xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-white relative overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,0,0,0.08)] hover:border-zinc-200/60">
              
              <div className="mb-8 relative">
                <label className={`flex items-center justify-center gap-3 cursor-pointer ${isAnalyzing ? 'bg-zinc-100 text-zinc-400 border-zinc-200' : 'bg-zinc-900/90 backdrop-blur-md hover:bg-zinc-800 text-white shadow-[0_8px_20px_rgba(0,0,0,0.12)] hover:shadow-[0_0_30px_rgba(0,0,0,0.2)]'} font-bold py-4 px-4 rounded-[1.5rem] transition-all duration-300 active:scale-[0.98] border border-transparent`}>
                  {isAnalyzing ? <Loader2 className="animate-spin" size={24} /> : <ScanLine size={24} />}
                  {isAnalyzing ? 'מפענח חשבוניות...' : 'העלי או צלמי חשבוניות (AI)'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple
                    className="hidden" 
                    onChange={handleImageUpload} 
                    disabled={isAnalyzing}
                  />
                </label>
                <p className="text-[13px] text-center text-zinc-500 mt-3 px-4 font-medium transition-colors group-hover:text-zinc-600">
                  אפשר לבחור מספר דפים יחד. המערכת תזהה לבד.
                </p>
              </div>
              
              <InputField 
                label={`קריאה קודמת ${prevPeriodLabel ? `(${prevPeriodLabel})` : ''}:`} 
                value={prevReading} 
                type="number"
                onChange={setPrevReading} 
              />

              <InputField 
                label="תקופת החשבון הנוכחי:" 
                value={currentPeriodInput} 
                type="text"
                onChange={setCurrentPeriodInput} 
                placeholder="למשל: ינו'-פבר' 2026"
              />

              <InputField 
                label="קריאה נוכחית:" 
                value={currReading} 
                type="number"
                onChange={setCurrReading} 
                placeholder="הקלידי מספר או צלמי..." 
              />
              
              <div className="bg-white/40 backdrop-blur-md rounded-[1.5rem] p-5 mt-8 border border-white shadow-inner transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.9)]">
                <div className="flex justify-between items-center mb-5 px-1">
                   <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">תעריף ומע"מ</h3>
                   {lastKnownTariff && !hasChange && (
                      <span className="text-[10px] bg-white/80 text-zinc-700 border border-zinc-200/50 shadow-sm px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                        לפי תעריף קודם
                      </span>
                   )}
                </div>
                <InputField label="תעריף חשמל (אגורות):" value={tariff} onChange={setTariff} type="number" suffix="אג'" />
                <InputField label="מע״מ (%):" value={vat} onChange={setVat} type="number" suffix="%" />
              </div>

              <div className="mt-8 pt-2">
                <button 
                  onClick={() => setHasChange(!hasChange)}
                  className={`w-full p-4 rounded-[1.5rem] font-bold text-base sm:text-lg flex items-center justify-center gap-2 transition-all duration-300 border ${hasChange ? 'bg-amber-50/80 backdrop-blur-md text-amber-800 border-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'bg-white/60 backdrop-blur-md text-zinc-700 border-white hover:bg-white/80 shadow-sm hover:shadow-[0_0_20px_rgba(255,255,255,0.9)]'}`}
                >
                  {hasChange ? '✅ שינוי תעריף פעיל (לביטול)' : 'האם היה שינוי תעריף באמצע?'}
                </button>

                {hasChange && (
                  <div className="mt-4 p-5 sm:p-6 bg-white/40 backdrop-blur-xl border border-white shadow-inner rounded-[1.5rem] space-y-4 animate-in fade-in slide-in-from-top-2 hover:shadow-[0_0_25px_rgba(255,255,255,0.7)] transition-all duration-300">
                    <div className="flex items-start gap-3 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-zinc-100 mb-4 shadow-sm hover:shadow-md transition-shadow">
                      <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5 drop-shadow-sm" size={20} />
                      <p className="text-zinc-700 text-sm font-medium leading-relaxed">
                        <strong className="block mb-1 text-zinc-900 font-bold">חישוב יחסי הופעל</strong>
                        המערכת תחשב את האחוזים מתוך צריכת ההורים, ותחיל אותם במדויק על צריכת הדיירים.
                      </p>
                    </div>

                    <InputField label={`קוט״ש הורים - תעריף ראשון (${tariff || '?'} אג'):`} type="number" value={parentsUsage1} onChange={setParentsUsage1} />
                    <InputField label="קוט״ש הורים - תעריף שני/חדש:" type="number" value={parentsUsage2} onChange={setParentsUsage2} />
                    <InputField label="התעריף החדש (באגורות):" type="number" value={tariff2} onChange={setTariff2} suffix="אג'" />
                  </div>
                )}
              </div>

              <button 
                onClick={calculateBill}
                className="w-full mt-10 bg-zinc-900/90 backdrop-blur-lg hover:bg-zinc-900 text-white font-black text-xl py-5 rounded-[1.5rem] shadow-[0_8px_20px_rgba(0,0,0,0.12)] hover:shadow-[0_0_30px_rgba(0,0,0,0.2)] border border-zinc-800 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3 hover:border-zinc-700"
              >
                <Calculator size={24} />
                חשבי עכשיו
              </button>
            </div>

            {result && (
              <div ref={resultRef} className="mt-8 group bg-white/60 backdrop-blur-3xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-white transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,0,0,0.08)] hover:border-zinc-200 animate-in zoom-in-95">
                <p className="text-center text-zinc-500 font-bold mb-2 uppercase tracking-widest text-sm transition-colors group-hover:text-zinc-600">סה״כ לתשלום לדיירים</p>
                <h2 className="text-6xl font-black text-center text-zinc-900 mb-8 tracking-tight drop-shadow-sm">₪{result.totalToPay.toFixed(2)}</h2>
                
                <div className="space-y-4 mb-8 bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-white shadow-inner text-zinc-800 transition-all hover:shadow-[0_0_25px_rgba(255,255,255,0.9)]">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold uppercase text-zinc-500">סה"כ צריכה</span> 
                    <strong className="text-3xl text-zinc-900 leading-none">{result.details.usage || result.details.totalUsage} <span className="text-base font-semibold text-zinc-500">קוט"ש</span></strong>
                  </div>
                  
                  <div className="h-px bg-zinc-200/50 w-full my-4 shadow-sm"></div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold uppercase text-zinc-500">מע"מ ({vat}%)</span> 
                    <strong className="text-xl text-zinc-900">₪{result.vatAmount ? result.vatAmount.toFixed(2) : '0.00'}</strong>
                  </div>
                  
                  {result.details.type === 'split' && (
                    <div className="mt-5 bg-amber-50/50 backdrop-blur-sm p-4 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-sm text-amber-900 font-black flex items-center gap-2 mb-3 uppercase tracking-wide">
                        <ArrowLeftRight size={14} /> פירוט חלוקה יחסית
                      </p>
                      <ul className="text-sm text-amber-800 space-y-2 font-medium">
                         <li className="flex justify-between items-center">
                           <span><strong className="font-black text-amber-950">{result.details.ratioPercent1.toFixed(1)}%</strong> <span className="text-[11px]">({result.details.usage1.toFixed(1)} קוט"ש)</span></span>
                           <span className="font-bold bg-amber-100/50 px-2 py-0.5 rounded border border-amber-200/50">{result.details.tariff1} אג'</span>
                         </li>
                         <li className="flex justify-between items-center">
                           <span><strong className="font-black text-amber-950">{result.details.ratioPercent2.toFixed(1)}%</strong> <span className="text-[11px]">({result.details.usage2.toFixed(1)} קוט"ש)</span></span>
                           <span className="font-bold bg-amber-100/50 px-2 py-0.5 rounded border border-amber-200/50">{result.details.tariff2} אג'</span>
                         </li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  <button 
                    onClick={copyToClipboard}
                    className={`w-full py-4 rounded-[1.5rem] font-bold text-[15px] sm:text-lg flex items-center justify-center gap-2 transition-all duration-300 ${isCopied ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-white/80 backdrop-blur-md text-zinc-800 border border-white hover:bg-white shadow-sm hover:shadow-[0_0_25px_rgba(255,255,255,1)]'}`}
                  >
                    {isCopied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                    {isCopied ? 'הפירוט הועתק בהצלחה!' : 'העתק הודעה לוואטסאפ'}
                  </button>

                  <button 
                    onClick={saveToHistory}
                    disabled={isSaved}
                    className={`w-full py-4 rounded-[1.5rem] font-bold text-[15px] sm:text-lg flex items-center justify-center gap-2 transition-all duration-300 shadow-sm ${isSaved ? 'bg-zinc-200/80 text-zinc-500 border border-transparent shadow-inner' : 'bg-zinc-900/90 backdrop-blur-md text-white border border-zinc-800 hover:bg-zinc-900 hover:shadow-[0_0_25px_rgba(0,0,0,0.15)] hover:border-zinc-700'}`}
                  >
                    {isSaved ? <CheckCircle2 size={20} /> : <Save size={20} />}
                    {isSaved ? 'נשמר בהצלחה בפנקס!' : 'שמור חשבון לפנקס אמא'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="bg-white/60 backdrop-blur-3xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-white animate-in fade-in slide-in-from-bottom-4 duration-500 hover:shadow-[0_0_40px_rgba(0,0,0,0.08)] hover:border-zinc-200 transition-all duration-500">
            <h2 className="text-2xl font-black text-zinc-900 mb-2 flex items-center gap-2 drop-shadow-sm">
              <BookOpen className="text-zinc-400 drop-shadow-sm" size={28} /> פנקס אמא
            </h2>
            
            <p className="text-zinc-500 mb-8 text-[15px] leading-relaxed font-semibold">
              היסטוריית החשבונות של הדיירים. הקריאה מהשורה העליונה נשאבת אוטומטית למחשבון. תוכלו לערוך או להפיק הודעת וואטסאפ לכל חשבון.
            </p>

            {sortedYears.length === 0 ? (
              <div className="text-center py-12 bg-white/40 backdrop-blur-md rounded-3xl border border-white/80 shadow-inner hover:shadow-[0_0_25px_rgba(255,255,255,0.8)] transition-all">
                <p className="text-zinc-400 font-bold">אין נתונים להצגה עדיין.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {sortedYears.map(year => (
                  <div key={year} className="mb-4 relative">
                    <div className="flex items-center gap-4 mb-5">
                       <h3 className="text-xl font-black text-zinc-900 drop-shadow-sm">{year}</h3>
                       <div className="h-px bg-zinc-200/50 flex-1 shadow-sm"></div>
                    </div>
                    
                    <div className="overflow-hidden rounded-3xl border border-white bg-white/50 backdrop-blur-xl shadow-sm transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,1)] hover:border-zinc-100">
                      <table className="w-full text-right border-collapse">
                        <thead className="bg-white/60 text-zinc-500 text-[11px] uppercase tracking-widest font-black border-b border-white/80">
                          <tr>
                            <th className="px-3 sm:px-5 py-4 w-2/5">תקופה</th>
                            <th className="px-3 sm:px-5 py-4 w-1/4">קוט"ש</th>
                            <th className="px-3 sm:px-5 py-4 w-1/4">סה"כ ₪</th>
                            <th className="px-3 sm:px-5 py-4 w-10 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/80">
                          {grouped[year].map((item) => (
                            <tr key={item.id} className="hover:bg-white/80 hover:shadow-[inset_0_0_20px_rgba(255,255,255,1)] transition-all duration-300 group">
                              {editingId === item.id ? (
                                <>
                                  <td className="px-3 sm:px-5 py-4 align-top">
                                    <input 
                                      className="w-full bg-white/90 backdrop-blur-sm border border-zinc-200 rounded-xl px-3 py-2 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all"
                                      value={editForm.date}
                                      onChange={e => setEditForm({...editForm, date: e.target.value})}
                                      placeholder="תקופה"
                                    />
                                  </td>
                                  <td className="px-3 sm:px-5 py-4 align-top space-y-2">
                                    <input 
                                      type="number"
                                      className="w-full bg-white/90 backdrop-blur-sm border border-zinc-200 rounded-xl px-3 py-2 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-right transition-all"
                                      value={editForm.currReading}
                                      onChange={e => setEditForm({...editForm, currReading: e.target.value})}
                                      placeholder="קריאה"
                                    />
                                    <div className="flex items-center justify-between gap-2 border-t border-white/60 pt-2 mt-2">
                                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">צריכה</span>
                                      <input 
                                        type="number"
                                        className="w-16 bg-white/60 backdrop-blur-sm border border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-right transition-all"
                                        value={editForm.usage}
                                        onChange={e => setEditForm({...editForm, usage: e.target.value})}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-3 sm:px-5 py-4 align-top space-y-2">
                                    <input 
                                      type="number"
                                      className="w-full bg-white/90 backdrop-blur-sm border border-zinc-200 rounded-xl px-3 py-2 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-right transition-all"
                                      value={editForm.totalToPay}
                                      onChange={e => setEditForm({...editForm, totalToPay: e.target.value})}
                                      placeholder="סה״כ ₪"
                                    />
                                    <div className="flex items-center justify-between gap-2 border-t border-white/60 pt-2 mt-2">
                                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">תעריף</span>
                                      <input 
                                        type="number"
                                        className="w-16 bg-white/60 backdrop-blur-sm border border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-right transition-all"
                                        value={editForm.tariff}
                                        onChange={e => setEditForm({...editForm, tariff: e.target.value})}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-3 sm:px-5 py-4 align-top flex flex-col gap-2">
                                    <button onClick={handleUpdate} className="text-zinc-800 bg-white border border-zinc-200 backdrop-blur-md p-2 rounded-lg hover:bg-zinc-50 transition-all flex justify-center w-full"><Check size={16}/></button>
                                    <button onClick={() => setEditingId(null)} className="text-zinc-400 bg-white/50 border border-transparent p-2 rounded-lg hover:bg-white hover:text-zinc-600 transition-all flex justify-center w-full"><X size={16}/></button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 sm:px-5 py-5 text-zinc-900 font-bold text-[14px] sm:text-[15px]">
                                    {item.date.replace(year, '').trim()}
                                  </td>
                                  <td className="px-3 sm:px-5 py-5">
                                    <div className="text-zinc-800 font-bold group-hover:text-zinc-950 transition-colors">{item.currReading || '-'}</div>
                                    {item.usage && (
                                      <div className="text-[12px] text-zinc-400 font-semibold mt-1">צריכה: {item.usage}</div>
                                    )}
                                  </td>
                                  <td className="px-3 sm:px-5 py-5 font-black text-zinc-900 text-lg group-hover:text-black transition-colors">
                                    {item.totalToPay ? parseFloat(item.totalToPay).toFixed(0) : '-'}
                                  </td>
                                  <td className="px-2 sm:px-5 py-5 text-left opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex flex-col sm:flex-row gap-2 justify-end">
                                      <button 
                                        onClick={() => handleCopyHistorical(item)} 
                                        className="text-zinc-400 hover:text-emerald-600 bg-white/80 backdrop-blur-sm border border-white p-2 rounded-xl transition-all shadow-sm hover:bg-white"
                                        title="העתק הודעת וואטסאפ"
                                      >
                                        {copiedId === item.id ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                      </button>
                                      <button onClick={() => handleEditClick(item)} className="text-zinc-400 hover:text-zinc-800 bg-white/80 backdrop-blur-sm border border-white p-2 rounded-xl transition-all shadow-sm hover:bg-white">
                                        <Edit2 size={14} />
                                      </button>
                                      <button onClick={() => handleDelete(item.id)} className="text-zinc-400 hover:text-rose-600 bg-white/80 backdrop-blur-sm border border-white p-2 rounded-xl transition-all shadow-sm hover:bg-white">
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default App;