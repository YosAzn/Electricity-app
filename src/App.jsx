import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Copy, Save, BookOpen, CheckCircle2, ArrowLeftRight, ScanLine, Loader2, Bolt, Trash2 } from 'lucide-react';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 

const InputField = ({ label, value, onChange, type = "text", suffix = "", placeholder="0" }) => (
  <div className="mb-5 group">
    <label className="block text-zinc-600 text-[14px] font-bold mb-2 ml-2">{label}</label>
    <div className="relative">
      <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder}
        className="w-full px-5 py-4 rounded-[1.25rem] bg-white/50 backdrop-blur-md border border-white/80 focus:outline-none focus:bg-white/80 text-2xl font-bold text-zinc-800 transition-all" 
        dir="ltr" 
      />
      {suffix && <span className="absolute right-5 top-4 text-zinc-400 font-bold text-lg">{suffix}</span>}
    </div>
  </div>
);

const analyzeBillWithAI = async (imagesDataList) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const prompt = `
    Analyze the Israeli electricity bill images. Return ONLY a raw JSON object. 
    1. 'reading': Extract handwritten ink number on page 1.
    2. 'vat': Extract VAT percentage (e.g. 18).
    3. 'period': Extract Hebrew months (e.g. "ינו'-פבר'"). 
    4. 'hasTariffChange': true if multiple rows in consumption table.
    5. 'parentsUsage1': "צריכה בקוט"ש" column, row 1 (the 498 value).
    6. 'tariff1': "מחיר לקוט"ש" column, row 1.
    7. 'parentsUsage2': "צריכה בקוט"ש" column, row 2 (the 1433 value).
    8. 'tariff2': "מחיר לקוט"ש" column, row 2.
    Format: {"reading": "", "vat": "", "period": "", "hasTariffChange": true, "parentsUsage1": "", "tariff1": "", "parentsUsage2": "", "tariff2": ""}
  `;
  const imageParts = imagesDataList.map(img => ({ 
    inlineData: { mimeType: img.mimeType, data: img.data.split(',')[1] } 
  }));
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }, ...imageParts] }] })
  });
  const result = await response.json();
  let text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(text);
};

function App() {
  const [localHistory, setLocalHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('calc');
  const [currentPeriodInput, setCurrentPeriodInput] = useState('');
  const [prevReading, setPrevReading] = useState('');
  const [currReading, setCurrReading] = useState('');
  const [tariff, setTariff] = useState(''); 
  const [vat, setVat] = useState(18);
  const [hasChange, setHasChange] = useState(false);
  const [parentsUsage1, setParentsUsage1] = useState('');
  const [parentsUsage2, setParentsUsage2] = useState('');
  const [tariff2, setTariff2] = useState(''); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '' });
  const resultRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('electricity_history_db');
    if (saved) setLocalHistory(JSON.parse(saved));
  }, []);

  const showAlert = (title, message) => setModal({ isOpen: true, title, message });

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
        setParentsUsage1(data.parentsUsage1?.toString() || '');
        setParentsUsage2(data.parentsUsage2?.toString() || '');
        setTariff(data.tariff1?.toString() || '');
        setTariff2(data.tariff2?.toString() || '');
        showAlert("זיהוי אוטומטי", "✅ זוהה שינוי תעריף/מע\"מ. הנתונים עודכנו.");
      } else if (data.tariff1) {
        setTariff(data.tariff1.toString());
      }
    } catch (e) { showAlert("שגיאה", "נכשל בפענוח החשבונית."); }
    finally { setIsAnalyzing(false); }
  };

  const calculateBill = () => {
    const pRead = parseFloat(prevReading), cRead = parseFloat(currReading), t1 = parseFloat(tariff), v = parseFloat(vat);
    if (isNaN(pRead) || isNaN(cRead) || isNaN(t1)) return showAlert("חסרים נתונים", "נא למלא קריאות ותעריף.");
    
    const totalUsage = cRead - pRead;
    let costBeforeVat = 0;
    let details = { totalUsage, prevReading: pRead, currReading: cRead };

    if (!hasChange) {
      costBeforeVat = totalUsage * (t1 / 100);
      details = { ...details, type: 'simple', tariffUsed: t1 };
    } else {
      const p1 = parseFloat(parentsUsage1), p2 = parseFloat(parentsUsage2), t2 = parseFloat(tariff2);
      const ratio1 = p1 / (p1 + p2);
      const ratio2 = p2 / (p1 + p2);
      const usage1 = totalUsage * ratio1;
      const usage2 = totalUsage * ratio2;
      costBeforeVat = (usage1 * (t1 / 100)) + (usage2 * (t2 / 100));
      details = { ...details, type: 'split', usage1, usage2, t1, t2, ratio1: ratio1*100, ratio2: ratio2*100 };
    }

    const vatAmount = costBeforeVat * (v / 100);
    const totalToPay = costBeforeVat + vatAmount;

    setResult({ id: Date.now(), date: currentPeriodInput, totalToPay, details, vat: v, vatAmount });
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const saveToHistory = () => {
    const updated = [result, ...localHistory];
    setLocalHistory(updated);
    localStorage.setItem('electricity_history_db', JSON.stringify(updated));
    showAlert("נשמר!", "החשבון נשמר בפנקס בהצלחה.");
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-4 pb-24 font-sans text-right" dir="rtl">
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center">
            <h3 className="text-xl font-black mb-2">{modal.title}</h3>
            <p className="text-zinc-600 mb-6">{modal.message}</p>
            <button onClick={() => setModal({ ...modal, isOpen: false })} className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold">סגור</button>
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto">
        <div className="flex bg-zinc-200/50 p-1.5 rounded-2xl mb-8 shadow-inner">
          <button onClick={() => setActiveTab('calc')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'calc' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}><Calculator size={20}/>מחשבון</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'history' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}><BookOpen size={20}/>פנקס</button>
        </div>

        {activeTab === 'calc' ? (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-sm border border-white">
              <label className="flex items-center justify-center gap-3 cursor-pointer bg-zinc-900 text-white font-bold py-5 rounded-[1.5rem] mb-8 hover:bg-zinc-800 transition-all shadow-lg active:scale-95">
                {isAnalyzing ? <Loader2 className="animate-spin" /> : <ScanLine />}
                {isAnalyzing ? 'מנתח חשבונית...' : 'צלמי חשבונית'}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              </label>

              <InputField label="תקופת החשבון" value={currentPeriodInput} onChange={setCurrentPeriodInput} placeholder="למשל: ינו'-פבר' 2026" />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="קריאה קודמת" value={prevReading} type="number" onChange={setPrevReading} />
                <InputField label="קריאה נוכחית" value={currReading} type="number" onChange={setCurrReading} />
              </div>
              
              <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-4 rounded-[1.5rem] border border-zinc-100">
                <InputField label="תעריף (אג')" value={tariff} onChange={setTariff} type="number" suffix="אג'" />
                <InputField label="מע״מ (%)" value={vat} onChange={setVat} type="number" suffix="%" />
              </div>

              <button onClick={() => setHasChange(!hasChange)} className={`w-full mt-4 p-4 rounded-[1.5rem] font-bold border transition-all ${hasChange ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-zinc-400 border-zinc-100'}`}>
                {hasChange ? '✅ שינוי תעריף פעיל' : 'היה שינוי תעריף באמצע?'}
              </button>

              {hasChange && (
                <div className="mt-4 p-5 bg-amber-50/30 rounded-[1.5rem] border border-amber-100 space-y-4 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="צריכת הורים 1" value={parentsUsage1} onChange={setParentsUsage1} type="number" />
                    <InputField label="צריכת הורים 2" value={parentsUsage2} onChange={setParentsUsage2} type="number" />
                  </div>
                  <InputField label="תעריף חדש (אג')" value={tariff2} onChange={setTariff2} type="number" suffix="אג'" />
                </div>
              )}

              <button onClick={calculateBill} className="w-full mt-8 bg-zinc-900 text-white text-xl font-black py-6 rounded-[1.5rem] shadow-xl hover:shadow-2xl transition-all active:scale-[0.98]">חשב סכום סופי</button>
            </div>

            {result && (
              <div ref={resultRef} className="bg-white rounded-[2.5rem] p-8 border-2 border-zinc-900 shadow-2xl animate-in zoom-in-95">
                <div className="text-center mb-8">
                  <p className="text-zinc-400 font-bold text-sm mb-1 uppercase tracking-widest">סה"כ לתשלום - {result.date}</p>
                  <h2 className="text-7xl font-black text-zinc-900">₪{result.totalToPay.toFixed(2)}</h2>
                </div>
                
                <div className="space-y-4 border-t border-zinc-100 pt-6">
                  <div className="flex justify-between items-center text-lg"><span className="text-zinc-500">צריכה שלכם:</span><span className="font-black text-zinc-900">{result.details.totalUsage.toFixed(1)} קוט"ש</span></div>
                  
                  {result.details.type === 'split' && (
                    <div className="bg-zinc-50 p-4 rounded-2xl text-sm space-y-2 border border-zinc-100">
                      <div className="flex justify-between"><span>חלק 1 ({result.details.ratio1.toFixed(0)}%):</span><span>{result.details.usage1.toFixed(1)} קוט"ש ב-{result.details.t1} אג'</span></div>
                      <div className="flex justify-between"><span>חלק 2 ({result.details.ratio2.toFixed(0)}%):</span><span>{result.details.usage2.toFixed(1)} קוט"ש ב-{result.details.t2} אג'</span></div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center"><span className="text-zinc-500">מע"מ ({result.vat}%):</span><span className="font-bold">₪{result.vatAmount.toFixed(2)}</span></div>
                </div>

                <button onClick={saveToHistory} className="w-full mt-8 flex items-center justify-center gap-2 bg-zinc-100 text-zinc-900 py-4 rounded-2xl font-black hover:bg-zinc-200 transition-colors"><Save size={20}/>שמירה לפנקס</button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {localHistory.length === 0 ? (
              <div className="text-center py-20 bg-white/50 rounded-[2.5rem] border-2 border-dashed border-zinc-200">
                <p className="text-zinc-400 font-bold text-lg">אין חשבונות שמורים</p>
              </div>
            ) : (
              localHistory.map((item) => (
                <div key={item.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-zinc-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-zinc-900 text-xl">{item.date}</h4>
                    <p className="text-zinc-500 font-bold">₪{item.totalToPay.toFixed(2)} | {item.details.totalUsage.toFixed(0)} קוט"ש</p>
                  </div>
                  <button onClick={() => {
                    const updated = localHistory.filter(h => h.id !== item.id);
                    setLocalHistory(updated);
                    localStorage.setItem('electricity_history_db', JSON.stringify(updated));
                  }} className="p-3 text-zinc-300 hover:text-red-500 transition-colors"><Trash2 size={22}/></button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;