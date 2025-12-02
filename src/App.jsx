import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  LayoutDashboard, TrendingUp, AlertTriangle, PackageX, 
  LogOut, RefreshCw, Truck, FileText, Upload, 
  Calculator, Camera, Download, ChevronRight, CheckCircle, Search,
  Menu, X, Mail, FileBarChart
} from 'lucide-react';

// --- YARDIMCI: Dosyayı Base64'e Çevir ---
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result); 
    reader.onerror = error => reject(error);
  });
};

// --- YARDIMCI: Para Formatı (TL ve USD Yan Yana) ---
const formatDualCurrency = (tlValue, usdValue) => {
  const tl = Number(tlValue || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
  const usd = usdValue ? Number(usdValue).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '-';
  return (
    <div className="flex flex-col">
      <span className="font-bold text-gray-800">{tl}</span>
      <span className="text-xs text-gray-500">{usd}</span>
    </div>
  );
};

const formatCurrency = (value, currency = 'TRY') => {
  if (value === undefined || value === null) return '-';
  return Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
};

// --- GİRİŞ EKRANI ---
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Hata: ' + error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">SaaS Analiz</h1>
          <p className="text-indigo-100">Yönetim Paneli</p>
        </div>
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="email" required className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" required className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50">
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- ANA DASHBOARD ---
const Dashboard = ({ session }) => {
  const [activeTab, setActiveTab] = useState('cost');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // CFO Raporu & Mail State
  const [cfoReport, setCfoReport] = useState(null);
  const [cfoLoading, setCfoLoading] = useState(false);
  const [mailSending, setMailSending] = useState(false);
  
  // Inputlar
  const [selectedFile, setSelectedFile] = useState(null); 
  const [devredenKDV, setDevredenKDV] = useState(0); 
  const [cargoFilter, setCargoFilter] = useState('');

  const CONFIG = {
    cost: { title: 'Maliyet Analizi', desc: 'Ürün bazlı karlılık ve gider analizi.', url: 'https://n8n.lolie.com.tr/webhook/maliyet-analizi', color: 'blue' },
    dead: { title: 'Ölü Stok ve CFO', desc: 'Satılmayan ürünler ve Gider Raporu.', url: 'https://n8n.lolie.com.tr/webhook/deadstock', color: 'red' },
    stockout: { title: 'Stok Tükenme Riski', desc: 'Kritik seviyedeki ürünler.', url: 'https://n8n.lolie.com.tr/webhook/stockout-api', color: 'amber' },
    cargo: { title: 'Kargo Kaçağı', desc: 'Sistemsel kargo tutarsızlıkları.', url: 'https://n8n.lolie.com.tr/webhook/analiz-baslat', color: 'purple' },
    ocr: { title: 'Fatura OCR', desc: 'Fatura görselinden veri ayıklama.', url: 'https://n8n.lolie.com.tr/webhook/fatura-analiz', color: 'indigo' },
    bulk: { title: 'Toplu Excel Yükle', desc: 'Geçmiş faturaları sisteme aktar.', url: 'https://n8n.lolie.com.tr/webhook/bulk-invoice-upload', color: 'green' },
    tax: { title: 'Akıllı Vergi', desc: 'KDV ve nakit akışı projeksiyonu.', url: 'https://n8n.lolie.com.tr/webhook/vergi-durumu', color: 'cyan' },
    creative: { title: 'Görsel Puanlama', desc: 'AI ile reklam görseli analizi.', url: 'https://n8n.lolie.com.tr/webhook/creative-scorer-analyze', color: 'pink' }
  };

  useEffect(() => {
    setData(null);
    setCfoReport(null);
    setSelectedFile(null);
    setLoading(false);
    setCargoFilter('');
    setMobileMenuOpen(false);
  }, [activeTab]);

  const cargoData = useMemo(() => {
    if (activeTab !== 'cargo' || !data?.my_results) return { filtered: [], totalLoss: 0 };
    const filtered = data.my_results.filter(item => 
      item.cargo_firm.toLowerCase().includes(cargoFilter.toLowerCase()) ||
      item.order_id.toLowerCase().includes(cargoFilter.toLowerCase())
    );
    const totalLoss = filtered.reduce((acc, item) => acc + (Number(item.price_diff) || 0), 0);
    return { filtered, totalLoss };
  }, [data, cargoFilter, activeTab]);

  const creativeScore = useMemo(() => {
    if (activeTab !== 'creative' || !data) return 0;
    if (data.score) return parseInt(data.score);
    const text = data.text || JSON.stringify(data);
    const match = text.match(/(\d+)\s*\/\s*10/) || text.match(/Puan:\s*(\d+)/i);
    return match ? parseInt(match[1]) : 0;
  }, [data, activeTab]);

  const handleTrigger = async () => {
    setLoading(true);
    setData(null);
    try {
      let bodyData = {
        targetUrl: CONFIG[activeTab].url,
        user_id: session.user.id,
        email: session.user.email
      };
      if (activeTab === 'tax') bodyData.devreden_kdv = devredenKDV;
      if (['ocr', 'bulk', 'creative'].includes(activeTab)) {
        if (!selectedFile) { alert('Lütfen bir dosya seçin!'); setLoading(false); return; }
        const base64File = await fileToBase64(selectedFile);
        bodyData.file_data = base64File;
        bodyData.file_name = selectedFile.name;
        if(activeTab === 'creative') bodyData.image = base64File;
      }
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      if (!response.ok) throw new Error('Sunucu hatası');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error(error);
      alert('İşlem başarısız.');
    } finally {
      setLoading(false);
    }
  };

  // CFO Raporu Çekme
  const fetchCfoReport = async () => {
    setCfoLoading(true);
    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: 'https://n8n.lolie.com.tr/webhook/cfo-rapor',
          user_id: session.user.id,
          email: session.user.email
        })
      });
      const result = await response.json();
      setCfoReport(Array.isArray(result) ? result : [result]);
    } catch (e) { alert("CFO raporu alınamadı."); }
    finally { setCfoLoading(false); }
  };

  // Günlük Mail Gönderme
  const sendDailyMail = async () => {
    setMailSending(true);
    try {
      await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: 'https://n8n.lolie.com.tr/webhook/send-daily-report', // Manuel webhook ID'si
          user_id: session.user.id
        })
      });
      alert("Günlük rapor mail olarak kuyruğa alındı.");
    } catch (e) { alert("Mail gönderilemedi."); }
    finally { setMailSending(false); }
  };

  // Menü
  const renderMenuItems = () => (
    <>
      <p className="px-4 text-xs font-semibold text-gray-400 uppercase mb-2">Analizler</p>
      <MenuButton id="cost" icon={<TrendingUp size={18} />} label="Maliyet Analizi" activeTab={activeTab} setActiveTab={setActiveTab} />
      <MenuButton id="dead" icon={<PackageX size={18} />} label="Ölü Stoklar" activeTab={activeTab} setActiveTab={setActiveTab} />
      <MenuButton id="stockout" icon={<AlertTriangle size={18} />} label="Kritik Stoklar" activeTab={activeTab} setActiveTab={setActiveTab} />
      <MenuButton id="cargo" icon={<Truck size={18} />} label="Kargo Kaçağı" activeTab={activeTab} setActiveTab={setActiveTab} />
      <p className="px-4 text-xs font-semibold text-gray-400 uppercase mt-6 mb-2">İşlemler</p>
      <MenuButton id="ocr" icon={<FileText size={18} />} label="Fatura OCR" activeTab={activeTab} setActiveTab={setActiveTab} />
      <MenuButton id="bulk" icon={<Upload size={18} />} label="Toplu Excel" activeTab={activeTab} setActiveTab={setActiveTab} />
      <MenuButton id="tax" icon={<Calculator size={18} />} label="Akıllı Vergi" activeTab={activeTab} setActiveTab={setActiveTab} />
      <MenuButton id="creative" icon={<Camera size={18} />} label="Görsel Puanlama" activeTab={activeTab} setActiveTab={setActiveTab} />
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="bg-indigo-600 p-2 rounded-lg text-white hidden md:block"><LayoutDashboard size={24} /></div>
          <h1 className="text-lg md:text-xl font-bold text-gray-800">SaaS Panel</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={sendDailyMail} disabled={mailSending} className="hidden md:flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-100 transition">
            <Mail size={16} /> {mailSending ? '...' : 'Günlük Rapor Gönder'}
          </button>
          <button onClick={() => supabase.auth.signOut()} className="text-gray-400 hover:text-red-600"><LogOut size={20} /></button>
        </div>
      </header>

      {mobileMenuOpen && ( <div className="md:hidden bg-white border-b p-4 absolute w-full z-20 shadow-lg">{renderMenuItems()}</div> )}

      <div className="flex flex-1 overflow-hidden relative">
        <aside className="w-64 bg-white border-r overflow-y-auto hidden md:block"><div className="p-4 space-y-1">{renderMenuItems()}</div></aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">{CONFIG[activeTab].title}</h2>
                  <p className="text-sm md:text-base text-gray-500 mt-1">{CONFIG[activeTab].desc}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {activeTab === 'tax' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 font-semibold whitespace-nowrap">Devr. KDV:</label>
                      <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-24 focus:ring-2 focus:ring-cyan-500 outline-none" value={devredenKDV} onChange={(e) => setDevredenKDV(e.target.value)} />
                    </div>
                  )}
                  {['ocr', 'bulk', 'creative'].includes(activeTab) && (
                    <div className="relative">
                      <input type="file" id="fileInput" className="hidden" accept={activeTab === 'bulk' ? ".xlsx,.xls" : "image/*,.pdf"} onChange={(e) => setSelectedFile(e.target.files[0])} />
                      <label htmlFor="fileInput" className={`cursor-pointer flex justify-center items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-gray-300 hover:border-${CONFIG[activeTab].color}-500 hover:bg-gray-50 transition w-full`}>
                        {selectedFile ? <span className="text-green-600 font-medium text-sm flex items-center gap-1"><CheckCircle size={14} /> Seçildi</span> : <span className="text-gray-500 text-sm flex items-center gap-1"><Upload size={14} /> Seç</span>}
                      </label>
                    </div>
                  )}
                  <button onClick={handleTrigger} disabled={loading} className={`flex justify-center items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium shadow-md transition transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed bg-${CONFIG[activeTab].color}-600 hover:bg-${CONFIG[activeTab].color}-700 w-full sm:w-auto`}>
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'İşleniyor' : 'Başlat'}
                  </button>
                </div>
              </div>
            </div>

            {!data && !loading && (
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                <div className={`inline-flex p-4 rounded-full bg-${CONFIG[activeTab].color}-50 text-${CONFIG[activeTab].color}-500 mb-4`}>
                   {activeTab === 'creative' ? <Camera size={32}/> : <RefreshCw size={32}/>}
                </div>
                <h3 className="text-lg font-semibold text-gray-700">Analiz Sonucu Bekleniyor</h3>
                <p className="text-sm text-gray-400 max-w-xs mx-auto mt-1">Verileri veya dosyayı seçip "Başlat" butonuna basın.</p>
              </div>
            )}

            {data && (
              <div className="animate-fade-in-up space-y-6">
                
                {/* 1. MALİYET (Çift Para Birimi) */}
                {activeTab === 'cost' && data.stats && (
                   <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                         <StatCard label="Oran" value={`%${(data.stats.ratio*100).toFixed(1)}`} color="blue" />
                         <StatCard label="Gider" value={`₺${formatCurrency(data.stats.totalExp)}`} />
                         <StatCard label="Ciro" value={`₺${formatCurrency(data.stats.totalRev)}`} />
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[500px]">
                          <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                            <tr><th className="p-4">SKU</th><th className="p-4">Ürün</th><th className="p-4">Ham Mal.</th><th className="p-4">Yüklü Mal.</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-sm">
                            {data.rows?.map((row, i) => (
                              <tr key={i} className="hover:bg-gray-50/50">
                                <td className="p-4 font-medium">{row.sku}</td>
                                <td className="p-4">{row.name}</td>
                                <td className="p-4">{formatDualCurrency(row.cost, row.usd_cost)}</td>
                                <td className="p-4">{formatDualCurrency(row.loaded_cost, row.usd_loaded_cost)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                   </div>
                )}
                
                {/* 2. ÖLÜ STOK ve CFO RAPORU */}
                {activeTab === 'dead' && (
                   <div className="space-y-6">
                     <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
                        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex flex-col sm:flex-row justify-between items-center border border-red-100 text-center sm:text-left">
                           <span className="font-semibold">Toplam Bağlı Sermaye</span>
                           <div className="flex flex-col items-end">
                              <span className="text-2xl font-bold">₺{formatCurrency(data.totalCapital)}</span>
                              <span className="text-sm opacity-75">${formatCurrency(data.totalCapitalUSD, 'USD')}</span>
                           </div>
                        </div>
                        <SimpleTable headers={['Kod', 'Ürün', 'Adet', 'Tutar']} rows={data.list} keys={['kod', 'urun_adi', 'adet', 'bagli_para']} />
                     </div>

                     {/* CFO Raporu Bölümü */}
                     <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
                       <div className="flex justify-between items-center mb-4">
                         <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FileBarChart size={20}/> CFO Gider Raporu</h3>
                         <button onClick={fetchCfoReport} disabled={cfoLoading} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200">
                           {cfoLoading ? 'Yükleniyor...' : 'Raporu Getir'}
                         </button>
                       </div>
                       {cfoReport ? (
                         <div className="space-y-4">
                           <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap font-mono">
                             {cfoReport[0]?.data_summary || "Özet bulunamadı."}
                           </div>
                           <SimpleTable headers={['Kategori', 'İşlem', 'Tutar', 'KDV']} rows={cfoReport} keys={['Kategori', 'İşlem Adedi', 'Toplam Tutar', 'KDV Tutarı']} />
                         </div>
                       ) : <p className="text-sm text-gray-400">Detaylı gider analizi için butona basın.</p>}
                     </div>
                   </div>
                )}

                {/* 3. STOCKOUT (Detaylı HTML) */}
                {activeTab === 'stockout' && (
                  <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
                     <div dangerouslySetInnerHTML={{ __html: data.advice }} className="mb-6 text-sm" />
                     <SimpleTable headers={['SKU', 'Ürün', 'Gün', 'Acil']} rows={data.stockoutList} keys={['kod', 'urun_adi', 'gun', 'aciliyet']} />
                  </div>
                )}

                {/* 4. KARGO */}
                {activeTab === 'cargo' && (
                   <div className="space-y-6">
                      <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-red-100 text-red-600 rounded-full"><AlertTriangle size={24}/></div>
                              <div><p className="text-xs text-gray-500 uppercase font-bold">Toplam Zarar</p><h3 className="text-2xl font-bold text-red-600">₺{formatCurrency(cargoData.totalLoss)}</h3></div>
                          </div>
                          <div className="relative w-full md:w-64">
                              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                              <input type="text" placeholder="Filtrele..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={cargoFilter} onChange={(e) => setCargoFilter(e.target.value)} />
                          </div>
                      </div>
                      <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
                          <h3 className="font-bold text-gray-800 mb-4 text-sm md:text-base">Kargo Tutarsızlıkları ({cargoData.filtered.length})</h3>
                          <SimpleTable headers={['Sipariş', 'Firma', 'Desi', 'Fark']} rows={cargoData.filtered} keys={['order_id', 'cargo_firm', 'desi', 'price_diff']} />
                       </div>
                   </div>
                )}

                {/* 5. OCR, 6. BULK, 7. TAX, 8. CREATIVE (Standart Gösterim) */}
                {activeTab === 'ocr' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                       <h3 className="font-bold text-gray-700 border-b pb-2 mb-4">Veriler</h3>
                       <div className="space-y-3"><DetailRow label="Satıcı" value={data['Satıcı Adı']} /><DetailRow label="Tarih" value={data['Tarih']} /><DetailRow label="Fatura No" value={data['Fatura No']} /><DetailRow label="Tutar" value={data['Toplam Tutar']} highlight /></div>
                    </div>
                    <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100"><h3 className="font-bold text-indigo-800 mb-2">Vergi Analizi</h3><p className="text-sm text-indigo-600 mb-4">{data['Aciklama']}</p><div className="bg-white p-4 rounded-lg shadow-sm"><div className="flex justify-between mb-2"><span>Matrah:</span> <b>{data['Mal Hizmet Tutarı']}</b></div><div className="flex justify-between"><span>KDV:</span> <b>{data['KDV Tutarı']}</b></div></div></div>
                  </div>
                )}
                {activeTab === 'bulk' && data.stats && (
                  <div className="bg-white rounded-xl shadow-sm border p-8 text-center"><div className="inline-block p-4 rounded-full bg-green-100 text-green-600 mb-4"><CheckCircle size={48} /></div><h2 className="text-2xl font-bold text-gray-800 mb-2">Tamamlandı</h2><p className="text-gray-500 mb-8">Veriler aktarıldı.</p><div className="grid grid-cols-3 gap-4 max-w-lg mx-auto"><StatCard label="Toplam" value={data.stats.total} /><StatCard label="Eklenen" value={data.stats.added} color="green" /><StatCard label="Mükerrer" value={data.stats.duplicates} color="red" /></div></div>
                )}
                {activeTab === 'tax' && data.tahminiAySonuCiro !== undefined && (
                  <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
                     <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-gray-800 text-lg">Vergi Projeksiyonu</h3><a href={`data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data.fileBase64 || ''}`} download={`${data.fileName || 'Rapor'}.xlsx`} className="flex gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"><Download size={16} /> İndir</a></div>
                     <div className="grid grid-cols-2 md:grid-cols-5 gap-4"><StatCard label="Tahmini Ciro" value={`₺${formatCurrency(data.tahminiAySonuCiro)}`} /><StatCard label="Hesaplanan KDV" value={`₺${formatCurrency(data.tahminiHesaplananKDV)}`} color="red" /><StatCard label="(-) Devr. KDV" value={`₺${formatCurrency(data.devredenKDV)}`} color="blue" /><StatCard label="Ödenecek KDV" value={`₺${formatCurrency(data.odenecekKDV)}`} color="orange" /><StatCard label="Güvenli Liman" value={`₺${formatCurrency(data.guvenliLiman)}`} color="green" /></div>
                  </div>
                )}
                {activeTab === 'creative' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8"><div className="md:col-span-1">{selectedFile && <div className="rounded-xl overflow-hidden border mb-4"><img src={URL.createObjectURL(selectedFile)} alt="Preview" className="w-full" /></div>}<div className={`text-center p-4 rounded-xl border ${creativeScore >= 7 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}><div className="text-4xl font-bold">{creativeScore}/10</div><div className="text-xs font-bold">PUAN</div></div></div><div className="md:col-span-2 bg-white rounded-xl shadow-sm border p-6 prose max-w-none"><h3 className="text-xl font-bold mb-4">Rapor</h3><div className="text-gray-600 text-sm whitespace-pre-line">{(data.text || JSON.stringify(data)).replace(/\*\*/g, '').replace(/###/g, '')}</div></div></div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const MenuButton = ({ id, icon, label, activeTab, setActiveTab }) => (<button onClick={() => setActiveTab(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${activeTab === id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>{icon} {label} {activeTab === id && <ChevronRight size={16} className="ml-auto" />}</button>);
const StatCard = ({ label, value, color = 'gray' }) => (<div className={`bg-white p-4 rounded-lg shadow-sm border border-${color}-100`}><p className="text-xs text-gray-500 uppercase">{label}</p><p className={`text-lg font-bold text-${color}-600 mt-1`}>{value}</p></div>);
const DetailRow = ({ label, value, highlight }) => (<div className={`flex justify-between border-b border-gray-100 pb-2 ${highlight ? 'font-bold text-indigo-600' : 'text-sm text-gray-600'}`}><span>{label}:</span><span>{value}</span></div>);
const SimpleTable = ({ headers, rows, keys }) => (<div className="overflow-x-auto"><table className="w-full text-left min-w-[500px]"><thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold"><tr>{headers.map((h, i) => <th key={i} className="p-4">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 text-sm">{rows?.map((row, i) => (<tr key={i} className="hover:bg-gray-50/50">{keys.map((k, j) => <td key={j} className="p-4">{typeof row[k] === 'number' ? formatCurrency(row[k]) : row[k]}</td>)}</tr>))}</tbody></table></div>);

function App() {
  const [session, setSession] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);
  if (!session) return <Login />;
  return <Dashboard session={session} />;
}

export default App;
