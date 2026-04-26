import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Copy, Save, BookOpen, ScanLine, Loader2, Bolt, Trash2, Camera, Eye, Share2, AlertCircle, X, History, Edit2, Send } from 'lucide-react';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 


// --- Exact Historical Data ---
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

// --- AI Service ---
const fetchFromAI = async (prompt, imageFile, schema = null) => {
  // תיקון קריטי: החזרנו למודל ה-preview הנתמך בסביבה זו כדי למנוע שגיאות 403
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result.split(',')[1];
      
      const payload = {
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: imageFile.type, data: base64Data } }
          ]
        }],
        generationConfig: { 
          responseMimeType: "application/json",
          // אם העברנו סכמה קשיחה, אנחנו אוכפים אותה כאן
          ...(schema && { responseSchema: schema })
        }
      };

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errData = await response.text();
          throw new Error(`API Error: ${response.status} - ${errData}`);
        }
        
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        
        try {
          const parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
          resolve(parsed);
        } catch (parseError) {
          // אם ההמרה נכשלת, נזרוק את הטקסט הגולמי כדי שנדע מה קרה
          throw new Error(`שגיאת פענוח. התשובה הגולמית מה-AI הייתה:\n${text}`);
        }
        
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsDataURL(imageFile);
  });
};

// --- Custom UI Components ---
const InputField = ({ label, value, onChange, type = "text", suffix = "", placeholder = "", actionButton = null }) => (
  <div className="mb-6 group">
    <label className="block text-zinc-500 text-[15px] font-black mb-2.5 ml-2 transition-colors group-focus-within:text-zinc-800">{label}</label>
    <div className="relative flex items-center">
      <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder}
        className="w-full px-5 py-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-zinc-200/60 focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 text-2xl transition-all duration-300 font-black text-zinc-800 shadow-[0_2px_10px_rgba(0,0,0,0.02)]" 
        dir="ltr" 
      />
      {suffix && <span className="absolute right-5 text-zinc-300 font-black text-lg pointer-events-none">{suffix}</span>}
      {actionButton && <div className="absolute right-2">{actionButton}</div>}
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('calc');
  const [localHistory, setLocalHistory] = useState([]);
  
  const [period, setPeriod] = useState('');
  const [prevReading, setPrevReading] = useState('');
  const [currReading, setCurrReading] = useState('');
  const [vat, setVat] = useState(18);
  
  const [hasTariffChange, setHasChange] = useState(false);
  const [singleTariff, setSingleTariff] = useState('');
  
  const [parentsUsage1, setParentsUsage1] = useState('');
  const [tariff1, setTariff1] = useState('');
  const [parentsUsage2, setParentsUsage2] = useState('');
  const [tariff2, setTariff2] = useState('');

  const [loadingType, setLoadingType] = useState(null); 
  const [result, setResult] = useState(null);
  const [previewModal, setPreviewModal] = useState({ isOpen: false, text: '' });
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });
  
  const resultRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('electricity_history_db_v3');
    let parsedLocal = [];
    if (saved) {
      parsedLocal = JSON.parse(saved);
      setLocalHistory(parsedLocal);
    }

    const latestEntry = parsedLocal.length > 0 ? parsedLocal[0] : historicalData[0];
    
    if (latestEntry && !prevReading) {
      setPrevReading(latestEntry.currReading.toString());
      const lastTariff = latestEntry.weightedTariff || latestEntry.tariff;
      if (lastTariff) setSingleTariff(lastTariff.toString());
      if (latestEntry.date) {
        setPeriod(predictNextPeriod(latestEntry.date));
      }
    }
  }, []);

  const saveToStorage = (data) => {
    setLocalHistory(data);
    localStorage.setItem('electricity_history_db_v3', JSON.stringify(data));
  };

  const showAlert = (title, message) => setAlertModal({ isOpen: true, title, message });

  // --- Scanners with STRICT UPGRADED PROMPTS & JSON SCHEMA ---
  const handleMeterScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingType('meter');
    try {
      const prompt = `אני עובד עם תמונות של מוני חשמל בישראל או עם קריאות חשמל שנכתבו בכתב יד. בתמונות עשויים להופיע מספרים נוספים, ספרות אדומות, ספרות עשרוניות, פסיקים, נקודות, מדבקות, מספרי מונה או נתונים טכניים שאינם הקריאה עצמה.
המטרה שלי היא לחלץ מתוך התמונה את קריאת החשמל הראשית הנוכחית בלבד, כמספר שלם, כדי שאוכל להשתמש בה לדיווח או לעיבוד נתונים.
פעל כמומחה OCR מדויק במיוחד לזיהוי קריאות ממוני חשמל ישראליים ומקריאות חשמל בכתב יד. עליך לדעת להבחין בין הקריאה הראשית לבין נתונים משניים, ולהתעלם מכל ספרה עשרונית או ספרה אחרונה שאינה חלק מהקריאה השלמה.
נתח את התמונה המצורפת. מצא את תצוגת המספר הראשית של המונה או את הקריאה המרכזית שנכתבה בכתב יד.
פעל לפי הכללים הבאים: חלץ רק את החלק השלם של הקריאה. התעלם לחלוטין מהספרה העשרונית האחרונה. התעלם מספרה אדומה, אם קיימת. התעלם מספרה שמופרדת בפסיק או בנקודה עשרונית. התעלם ממספר מונה, מספר סידורי, תאריך, שעה, קוד, מדבקה או כל נתון טכני אחר. הקריאה הסופית חייבת להיות מספר שלם בלבד. בדרך כלל הקריאה תהיה באורך של 4 עד 6 ספרות. אין להחזיר טקסט חופשי, הסבר, הערכה או כמה אפשרויות.
החזר אך ורק אובייקט JSON תקין במבנה הבא:
{
  "reading": 12345
}`;
      
      // אכיפת מבנה קשיח לקריאת מונה
      const schema = {
        type: "OBJECT",
        properties: { reading: { type: "NUMBER" } },
        required: ["reading"]
      };

      const data = await fetchFromAI(prompt, file, schema);
      
      if (data.reading) {
        let scannedNum = parseInt(data.reading); 
        let previousNum = parseFloat(prevReading);
        
        if (!isNaN(previousNum)) {
          if (scannedNum < previousNum) {
            showAlert("⚠️ שים לב", `הקריאה שזוהתה (${scannedNum}) קטנה מהקריאה הקודמת (${previousNum}).\n\nייתכן שהמונה אופס או שהסריקה שגויה.`);
          } else if (scannedNum - previousNum > 3000) {
            showAlert("⚠️ חריגת צריכה", `הקריאה שזוהתה מצביעה על צריכה עצומה של למעלה מ-3000 קוט"ש.\n\nאנא ודא שהמספר (${scannedNum}) באמת נכון.`);
          } else {
            showAlert("✅ זיהוי מונה", `זוהתה הקריאה: ${scannedNum} בצורה תקינה.`);
          }
        } else {
          showAlert("✅ זיהוי מונה", `זוהתה הקריאה: ${scannedNum}`);
        }
        
        setCurrReading(scannedNum.toString());
      } else throw new Error("לא נמצא מפתח reading בתשובה.");
    } catch (err) {
      showAlert("❌ שגיאה בסריקת מונה", err.message || "לא הצלחתי לזהות את המספר מהמונה. נסה לצלם ברור יותר.");
    }
    setLoadingType(null);
  };

  const handleFocusedTableScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingType('focused');
    try {
      const prompt = `אני עובד עם תמונות חתוכות של חשבונות חשמל ישראליים, ובפרט עם טבלת “פירוט צריכה / חיובים” מתוך חשבון חשמל. בטבלה מופיעות כמה שורות צריכה, כאשר בכל שורה יש נתוני צריכת חשמל בקוט״ש ותעריף באגורות.
חלץ את הנתונים עבור שתי שורות הצריכה בלבד:
הצריכה בשורה הראשונה — p1
התעריף בשורה הראשונה — t1
הצריכה בשורה השנייה — p2
התעריף בשורה השנייה — t2

הקפד על כללי הזיהוי הבאים: צריכה בקוט״ש (p1, p2) היא תמיד מספר שלם וגדול יחסית, ללא נקודה עשרונית, לדוגמה 350, 856, 1400. תעריף באגורות (t1, t2) הוא תמיד מספר קטן עם נקודה עשרונית, בדרך כלל בין 40.00 ל־80.00. לעולם אל תשייך מספר עשרוני לשדה צריכה.`;
      
      // אכיפת המבנה הקשיח: ה-AI חייב להחזיר רק את 4 השדות האלו כמספרים
      const schema = {
        type: "OBJECT",
        properties: {
          p1: { type: "NUMBER", description: "צריכה 1 - מספר שלם וגדול" },
          t1: { type: "NUMBER", description: "תעריף 1 - מספר עשרוני קטן" },
          p2: { type: "NUMBER", description: "צריכה 2 - מספר שלם וגדול" },
          t2: { type: "NUMBER", description: "תעריף 2 - מספר עשרוני קטן" }
        },
        required: ["p1", "t1", "p2", "t2"]
      };

      const data = await fetchFromAI(prompt, file, schema);
      
      if (data.p1 !== undefined && data.t1 !== undefined && data.p2 !== undefined && data.t2 !== undefined) {
        let { p1, t1, p2, t2 } = data;
        
        // Double Sanity Check in Code
        if (parseFloat(t1) > 150 && parseFloat(p1) < 150) { let temp = t1; t1 = p1; p1 = temp; }
        if (parseFloat(t2) > 150 && parseFloat(p2) < 150) { let temp = t2; t2 = p2; p2 = temp; }

        setParentsUsage1(parseFloat(p1).toString());
        setTariff1(parseFloat(t1).toString());
        setParentsUsage2(parseFloat(p2).toString());
        setTariff2(parseFloat(t2).toString());
        showAlert("✅ זיהוי טבלה", "נתוני הצריכה והתעריפים נסרקו ונותחו בהצלחה.");
      } else throw new Error("התשובה לא כללה את כל 4 השדות הנדרשים.");
    } catch (err) {
      // כאן אנחנו מדפיסים את השגיאה המדויקת מה-AI או מהקוד
      showAlert("❌ שגיאת זיהוי", `משהו השתבש:\n${err.message}\n\nאנא נסה לצלם שוב.`);
    }
    setLoadingType(null);
  };

  const calculateBill = () => {
    const pRead = parseFloat(prevReading);
    const cRead = parseFloat(currReading);
    const v = parseFloat(vat);

    if (isNaN(pRead) || isNaN(cRead)) return showAlert("שגיאה", "נא למלא קריאה קודמת ונוכחית.");
    if (cRead < pRead) return showAlert("שגיאה", "קריאה נוכחית אינה יכולה להיות קטנה מקודמת.");

    const tenantTotalUsage = cRead - pRead;
    let weightedTariff = 0;
    let details = {};

    if (!hasTariffChange) {
      const t = parseFloat(singleTariff);
      if (isNaN(t)) return showAlert("שגיאה", "נא למלא תעריף.");
      weightedTariff = t;
      details = { type: 'simple', tariff: t };
    } else {
      const p1 = parseFloat(parentsUsage1);
      const t1 = parseFloat(tariff1);
      const p2 = parseFloat(parentsUsage2);
      const t2 = parseFloat(tariff2);
      
      if (isNaN(p1) || isNaN(t1) || isNaN(p2) || isNaN(t2)) {
        return showAlert("שגיאה", "נא למלא את כל נתוני טבלת הפיצול (או לסרוק אותה).");
      }

      const totalParentsUsage = p1 + p2;
      const ratio1 = p1 / totalParentsUsage;
      const ratio2 = p2 / totalParentsUsage;
      
      weightedTariff = (ratio1 * t1) + (ratio2 * t2);
      
      details = { type: 'split', p1, t1, ratio1, p2, t2, ratio2, weightedTariff };
    }

    const costBeforeVat = tenantTotalUsage * (weightedTariff / 100);
    const vatAmount = costBeforeVat * (v / 100);
    const totalToPay = costBeforeVat + vatAmount;

    setResult({
      id: Date.now().toString(),
      date: period || new Date().toLocaleDateString('he-IL', { month: 'short', year: 'numeric' }),
      prevReading: pRead,
      currReading: cRead,
      tenantUsage: tenantTotalUsage,
      weightedTariff: weightedTariff,
      vatPercent: v,
      vatAmount,
      totalToPay,
      details
    });

    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const generateMessage = (res) => {
    let msg = `*חשבון חשמל - שרון ודקלה* ⚡\n`;
    msg += `תקופה: ${res.date}\n\n`;
    if (res.prevReading !== undefined && res.prevReading !== '') msg += `קריאה קודמת: ${res.prevReading}\n`;
    if (res.currReading !== undefined && res.currReading !== '') msg += `קריאה נוכחית: ${res.currReading}\n`;
    
    const usage = res.tenantUsage !== undefined ? res.tenantUsage : res.usage;
    msg += `סה"כ צריכה שלכם: *${usage ? usage.toFixed(1) : 0} קוט"ש*\n\n`;
    
    if (res.details && res.details.type === 'split') {
        msg += `*(בוצע חישוב לפי תעריף משוקלל בגלל שינוי מחיר)*\n`;
        msg += `יחס הצריכה בשעון הראשי:\n`;
        msg += `• ${res.details.t1} אג' (${(res.details.ratio1 * 100).toFixed(0)}% מהזמן)\n`;
        msg += `• ${res.details.t2} אג' (${(res.details.ratio2 * 100).toFixed(0)}% מהזמן)\n`;
        msg += `👈 תעריף משוקלל לקוט"ש: *${res.weightedTariff.toFixed(2)} אג'*\n\n`;
    } else {
        const trf = res.weightedTariff || res.tariff;
        msg += `תעריף לקוט"ש: ${trf ? trf.toFixed(2) : 0} אג'\n\n`;
    }

    msg += `סכום לתשלום: *₪${res.totalToPay.toFixed(2)}*\n`;
    msg += `(כולל ${res.vatPercent || 18}% מע"מ)\n\n`;
    msg += `תודה! 🙏`;
    return msg;
  };

  const handlePreviewShare = (dataToShare) => {
    setPreviewModal({ isOpen: true, text: generateMessage(dataToShare) });
  };

  const handleNativeShare = async () => {
    const text = previewModal.text;
    if (navigator.share) {
      try { await navigator.share({ title: 'חשבון חשמל', text: text }); } 
      catch (err) { console.log("Share canceled", err); }
    } else {
      navigator.clipboard.writeText(text);
      showAlert("הועתק!", "הטקסט הועתק ללוח כי המכשיר לא תומך בשיתוף ישיר.");
    }
    setPreviewModal({ isOpen: false, text: '' });
  };

  const handleSaveToHistory = () => {
    if (!result) return;
    const exists = localHistory.find(h => h.id === result.id);
    if (!exists) {
      saveToStorage([result, ...localHistory]);
      showAlert("נשמר בהצלחה", "החשבון נוסף לפנקס אמא.");
    }
  };

  const handleLoadToCalc = (item) => {
    setPeriod(item.date);
    
    // תיקון הבאג: שחזור קריאה קודמת אם היא חסרה (כמו בנתונים היסטוריים)
    const itemUsage = item.tenantUsage !== undefined ? item.tenantUsage : item.usage;
    let calculatedPrev = item.prevReading;
    if ((calculatedPrev === undefined || calculatedPrev === '') && item.currReading && itemUsage !== undefined) {
        calculatedPrev = item.currReading - itemUsage;
    }
    
    setPrevReading(calculatedPrev !== undefined && calculatedPrev !== null && calculatedPrev !== '' ? calculatedPrev.toString() : '');
    setCurrReading(item.currReading !== undefined && item.currReading !== null && item.currReading !== '' ? item.currReading.toString() : '');
    setVat(item.vatPercent || 18);
    
    if (item.details && item.details.type === 'split') {
      setHasChange(true);
      setParentsUsage1(item.details.p1.toString());
      setTariff1(item.details.t1.toString());
      setParentsUsage2(item.details.p2.toString());
      setTariff2(item.details.t2.toString());
    } else {
      setHasChange(false);
      const trf = item.weightedTariff || item.tariff;
      if (trf) setSingleTariff(trf.toString());
    }
    
    setResult(item);
    setActiveTab('calc');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderGroupedHistory = () => {
    const combinedHistory = [...localHistory, ...historicalData];
    const grouped = combinedHistory.reduce((acc, item) => {
      const yearMatch = item.date.match(/\d{4}/);
      const year = yearMatch ? yearMatch[0] : 'לא ידוע';
      if (!acc[year]) acc[year] = [];
      acc[year].push(item);
      return acc;
    }, {});

    const sortedYears = Object.keys(grouped).sort((a, b) => b - a);

    return sortedYears.map(year => (
      <div key={year} className="mb-10 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px bg-zinc-300 flex-1"></div>
          <h3 className="text-3xl font-black text-zinc-400 tracking-widest">{year}</h3>
          <div className="h-px bg-zinc-300 flex-1"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {grouped[year].map((item) => {
            const usage = item.tenantUsage !== undefined ? item.tenantUsage : item.usage;
            
            // הפרדת החודשים והשנה
            const dateMatch = item.date.match(/^(.*?)\s*(\d{4})$/);
            const monthStr = dateMatch ? dateMatch[1].trim() : item.date;
            const yearStr = dateMatch ? dateMatch[2] : '';

            return (
              <div key={item.id} className="group flex flex-col p-5 rounded-[1.5rem] shadow-sm border border-zinc-200 transition-all hover:shadow-lg hover:-translate-y-1 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="mb-2 flex items-baseline gap-1.5">
                      <span className="font-black text-zinc-900 text-2xl sm:text-3xl">{monthStr}</span>
                      {yearStr && <span className="font-normal text-zinc-500 text-sm">{yearStr}</span>}
                    </h4>
                    <div className="text-zinc-600 text-lg font-black flex items-center gap-3 flex-wrap">
                      <span className="text-zinc-900 bg-zinc-100/80 px-3 py-1.5 rounded-lg">₪{item.totalToPay.toFixed(2)}</span>
                      <span className="bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-100">{usage ? usage.toFixed(0) : 0} קוט"ש</span>
                      {item.isHistorical && <span className="flex items-center gap-1 text-[13px] bg-zinc-200/50 px-2 py-1 rounded-md text-zinc-600"><History size={14}/></span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-start gap-3 mt-auto pt-4 border-t border-zinc-100">
                  <button onClick={() => handlePreviewShare(item)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-lg text-sm font-bold transition-colors">
                    <Send size={15}/> שלחי
                  </button>
                  <button onClick={() => handleLoadToCalc(item)} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-lg text-sm font-bold transition-colors">
                    <Edit2 size={15}/> ערכי
                  </button>
                  {!item.isHistorical && (
                    <button onClick={() => saveToStorage(localHistory.filter(h => h.id !== item.id))} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto" title="מחקי">
                      <Trash2 size={18}/>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] p-4 sm:p-6 font-sans relative selection:bg-emerald-500 selection:text-white" dir="rtl">
      
      {/* ALERTS MODAL */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-md p-4">
          <div className="bg-zinc-900 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95 border border-zinc-800">
            <div className="mx-auto w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 text-white shadow-inner">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-2xl font-black text-white mb-3 whitespace-pre-wrap">{alertModal.title}</h3>
            <p className="text-zinc-400 mb-8 leading-relaxed whitespace-pre-wrap font-medium text-lg">{alertModal.message}</p>
            <button onClick={() => setAlertModal({isOpen: false})} className="w-full bg-white text-zinc-900 py-4 rounded-xl font-black text-lg hover:bg-zinc-200 transition-colors">הבנתי, סגרי</button>
          </div>
        </div>
      )}

      {/* PREVIEW & SHARE MODAL */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black flex items-center gap-2 text-zinc-900">
                <Eye size={24} className="text-emerald-500"/> תצוגה מקדימה
              </h3>
              <button onClick={() => setPreviewModal({isOpen: false})} className="text-zinc-400 p-2 hover:bg-zinc-100 rounded-full transition-colors"><X size={20}/></button>
            </div>
            
            <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200 whitespace-pre-wrap text-zinc-800 font-medium text-lg overflow-y-auto mb-6 flex-1 shadow-inner leading-relaxed">
              {previewModal.text}
            </div>

            <button onClick={handleNativeShare} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xl py-4 rounded-2xl shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 active:scale-95">
              <Share2 size={24}/> אשרי ושלחי בוואטסאפ
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="max-w-xl mx-auto mb-10 text-center pt-8">
        <h1 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-600 tracking-tighter mb-2">
          מחשבון חשמל
        </h1>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/5 border border-zinc-900/10 text-zinc-600 font-bold text-sm">
          <Bolt size={14} className="text-amber-500 fill-amber-500" />
          גרסת ממוצע משוקלל
        </div>
      </div>

      {/* TABS - הפונטים והאייקונים כאן הוגדלו */}
      <div className="max-w-xl mx-auto flex bg-zinc-200/50 p-1.5 rounded-2xl mb-8 shadow-inner border border-zinc-200">
        <button onClick={() => setActiveTab('calc')} className={`flex-1 py-4 rounded-xl font-black text-xl flex justify-center items-center gap-2 transition-all duration-300 ${activeTab === 'calc' ? 'bg-zinc-900 shadow-lg text-white' : 'text-zinc-500 hover:text-zinc-800'}`}><Calculator size={22} /> חישוב חדש</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-4 rounded-xl font-black text-xl flex justify-center items-center gap-2 transition-all duration-300 ${activeTab === 'history' ? 'bg-zinc-900 shadow-lg text-white' : 'text-zinc-500 hover:text-zinc-800'}`}><BookOpen size={22} /> פנקס אמא</button>
      </div>

      {/* MAIN CALCULATOR TAB */}
      {activeTab === 'calc' && (
        <div className="max-w-xl mx-auto space-y-6 pb-24 animate-in fade-in duration-300">
          
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-zinc-200/50 border border-zinc-100 relative overflow-hidden">
            {/* Auto-fill indicator badge */}
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-black px-4 py-1.5 rounded-bl-2xl shadow-sm">
              הוזן אוטומטית ⚡
            </div>

            <div className="mt-4">
              <InputField label="תקופת החשבון" value={period} onChange={setPeriod} placeholder="למשל: ינו׳-פבר׳ 2026" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <InputField label="קריאה קודמת" value={prevReading} type="number" onChange={setPrevReading} />
              <InputField 
                label="קריאה נוכחית" 
                value={currReading} 
                type="number" 
                onChange={setCurrReading}
                actionButton={
                  <label className="bg-emerald-500 text-white p-3.5 rounded-xl cursor-pointer hover:bg-emerald-600 transition-all shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.4)] flex items-center justify-center hover:-translate-y-0.5 active:translate-y-0" title="צלמי מונה">
                    {loadingType === 'meter' ? <Loader2 size={24} className="animate-spin"/> : <Camera size={24} />}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleMeterScan} disabled={loadingType !== null} />
                  </label>
                }
              />
            </div>

            <div className="h-px bg-zinc-100 my-8"></div>

            {/* Tariff Toggle */}
            <div className="mb-8">
              <div className="flex bg-zinc-100/80 p-1.5 rounded-2xl border border-zinc-200/50">
                <button onClick={() => setHasChange(false)} className={`flex-1 py-3 rounded-xl font-black text-base transition-all ${!hasTariffChange ? 'bg-white shadow-sm text-zinc-900 border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'}`}>תעריף קבוע</button>
                <button onClick={() => setHasChange(true)} className={`flex-1 py-3 rounded-xl font-black text-base transition-all ${hasTariffChange ? 'bg-amber-400 shadow-sm text-amber-950 border border-amber-500/20' : 'text-zinc-500 hover:text-zinc-700'}`}>היה שינוי מחיר</button>
              </div>
            </div>

            {/* Single Tariff Mode */}
            {!hasTariffChange && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <InputField label="תעריף נוכחי (אג')" value={singleTariff} onChange={setSingleTariff} type="number" suffix="אג'" />
              </div>
            )}

            {/* Split Tariff Mode */}
            {hasTariffChange && (
              <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-200 animate-in slide-in-from-left-4 duration-300">
                
                <div className="flex justify-between items-center mb-5">
                  <h4 className="font-black text-zinc-900 text-lg">טבלת פיצול</h4>
                  <label className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-xl text-base font-black cursor-pointer shadow-[0_4px_15px_rgba(245,158,11,0.3)] hover:bg-amber-600 hover:-translate-y-0.5 transition-all">
                    {loadingType === 'focused' ? <Loader2 size={18} className="animate-spin"/> : <ScanLine size={18} />}
                    סרקי טבלה
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFocusedTableScan} disabled={loadingType !== null} />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <InputField label="צריכה 1 (קוט״ש)" value={parentsUsage1} onChange={setParentsUsage1} type="number" />
                  <InputField label="מחיר ישן (אג')" value={tariff1} onChange={setTariff1} type="number" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="צריכה 2 (קוט״ש)" value={parentsUsage2} onChange={setParentsUsage2} type="number" />
                  <InputField label="מחיר חדש (אג')" value={tariff2} onChange={setTariff2} type="number" />
                </div>

                {/* Live Preview of the Weighted Average */}
                {(parentsUsage1 && tariff1 && parentsUsage2 && tariff2) && (
                  <div className="mt-6 bg-white p-4 rounded-2xl border border-zinc-200 flex justify-between items-center font-black shadow-sm text-base">
                    <span className="text-zinc-600">תעריף משוקלל:</span>
                    <span className="bg-amber-100 text-amber-900 px-3 py-1.5 rounded-lg border border-amber-200 text-lg">
                      {(((parseFloat(parentsUsage1)/(parseFloat(parentsUsage1)+parseFloat(parentsUsage2)))*parseFloat(tariff1)) + 
                       ((parseFloat(parentsUsage2)/(parseFloat(parentsUsage1)+parseFloat(parentsUsage2)))*parseFloat(tariff2))).toFixed(2)} אג'
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="h-px bg-zinc-100 my-8"></div>
            <InputField label="מע״מ (%)" value={vat} onChange={setVat} type="number" suffix="%" />

            <button onClick={calculateBill} className="w-full mt-6 bg-zinc-900 text-white font-black text-2xl py-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_35px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all active:scale-[0.98]">
              חשבי סכום לתשלום
            </button>
          </div>

          {/* RESULT SECTION */}
          {result && (
            <div ref={resultRef} className="bg-zinc-900 rounded-[2rem] p-8 border border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
              
              <p className="text-center text-zinc-400 font-bold text-base uppercase tracking-widest mb-3 relative z-10">לתשלום ({result.date})</p>
              <h2 className="text-[5.5rem] leading-none font-black text-center text-white mb-10 relative z-10 tracking-tighter">₪{result.totalToPay.toFixed(2)}</h2>
              
              <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50 space-y-4 mb-8 text-lg font-medium relative z-10">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">סה"כ צריכה:</span>
                  <strong className="text-white bg-zinc-700/50 px-3 py-1.5 rounded-lg border border-zinc-600/50">{result.tenantUsage.toFixed(1)} קוט"ש</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 flex items-center gap-2">
                    תעריף לקוט"ש: {result.details && result.details.type === 'split' && <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded font-black border border-amber-500/20">משוקלל</span>}
                  </span>
                  <strong className="text-white">{result.weightedTariff ? result.weightedTariff.toFixed(2) : 0} אג'</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">מע"מ ({result.vatPercent}%):</span>
                  <strong className="text-white">₪{result.vatAmount ? result.vatAmount.toFixed(2) : 0}</strong>
                </div>
              </div>

              <div className="flex gap-4 relative z-10">
                <button onClick={() => handlePreviewShare(result)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 text-xl">
                  <Share2 size={24}/> שתפי
                </button>
                <button onClick={handleSaveToHistory} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 text-xl">
                  <Save size={24}/> שמרי בפנקס
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="max-w-3xl mx-auto pb-24 animate-in fade-in duration-300">
          {renderGroupedHistory()}
        </div>
      )}
    </div>
  );
}