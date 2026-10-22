import React, { useState, useEffect } from 'react';

// 岳野登山社 - 最新海外出團列表
const TOUR_OPTIONS = [
  "【富士山三日】[S1] 7/8(四)~7/10(六)",
  "【富士山三日】[S2] 7/15(四)~7/17(六)",
  "【富士山三日】[S3] 7/22(四)~7/24(六)",
  "【富士山三日】[S4] 7/29(四)~7/31(六)",
  "【富士山三日】[S5] 8/2(一)~8/4(三) 河口湖湖上祭",
  "【富士山三日】[S6] 8/5(四)~8/7(六)",
  "【富士山三日】[S7] 8/22(日)~8/24(二)",
  "【富士山三日】[S8] 8/26(四)~8/28(六)",
  "【富士山三日】[S9] 8/29(日)~8/31(二)",
  "【富士山三日】[S10] 9/2(四)~9/4(六)",
  "【富士山五日】[G1] 7/11(日)~7/15(四) 河口湖",
  "【富士山五日】[G2] 7/25(日)~7/29(四) 御殿場",
  "【富士山五日】[G3] 8/18(三)~8/22(日) 河口湖",
  "【富士山五日】[G4] 9/1(三)~9/5(日) 河口湖",
  "【表銀座縱走】[H1] 7/30(五)~8/4(三)",
  "【白馬三山】[H2] 9/9(四)~9/14(二)",
  "【白馬三山】[H3] 9/14(二)~9/19(日)",
  "【秋季立山三山】[T1] 9/26(日)~9/30(四)",
  "【秋季立山三山】[T2] 10/1(五)~10/5(二)",
  "【秋季立山三山】[T3] 10/7(四)~10/11(一)",
  "【日本百名山】[F1] 10/15~10/19 秋季安達太良&磐梯山",
  "【西藏聖母峰】[TB] 6/4(五)~6/15(二)",
  "【南疆塔莎古道】[XS] 4/2(五)~4/11(日)"
];

export default function App() {
  const [formData, setFormData] = useState({ tour: '', name: '' });
  const [orderId, setOrderId] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // 📝 專屬設定代碼
  const CLOUD_NAME = 'dzzvhoo2d'; 
  const UPLOAD_PRESET = 'z2ln6ju0'; 
  const PASSPORT_SHEETDB_URL = 'https://sheetdb.io/api/v1/0r2rfy0cdm7yk?sheet=護照'; 

  // 自動解析主系統傳入的參數
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlName = params.get('name');
      const urlOrderId = params.get('orderId');
      
      if (urlName) {
        setFormData(prev => ({ ...prev, name: urlName }));
      }
      if (urlOrderId) {
        setOrderId(urlOrderId);
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('請先選擇或拍攝護照照片！');
      return;
    }

    setIsUploading(true);

    try {
      // 1. 上傳圖片至 Cloudinary
      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append('file', file);
      cloudinaryFormData.append('upload_preset', UPLOAD_PRESET);

      const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: cloudinaryFormData
      });

      if (!cloudinaryRes.ok) throw new Error('圖片上傳雲端失敗，請檢查 Cloudinary 設定');
      
      const cloudinaryData = await cloudinaryRes.json();
      const imageUrl = cloudinaryData.secure_url; 

      // 2. 存入護照 SheetDB
      const sheetPayload = {
        data: [{
          "團名與日期": formData.tour,
          "姓名": formData.name,
          "護照圖片": imageUrl,
          "上傳時間": new Date().toLocaleString()
        }]
      };

      const sheetRes = await fetch(PASSPORT_SHEETDB_URL, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(sheetPayload)
      });

      if (!sheetRes.ok) throw new Error('護照資料庫儲存失敗，請檢查資料庫連線');

      // 3. 同步回主報名系統，將狀態改為「已上傳」
      if (orderId) {
        try {
          await fetch(`https://sheetdb.io/api/v1/rzyq1bdriv1u0/報名編號/${encodeURIComponent(orderId)}?sheet=Registration`, {
            method: 'PATCH',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              data: {
                護照上傳狀態: '已上傳'
              }
            })
          });
        } catch (patchErr) {
          console.error('主系統狀態更新失敗:', patchErr);
        }
      }

      setIsSuccess(true);

    } catch (error) {
      console.error('上傳流程發生錯誤:', error);
      alert('上傳失敗：' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl text-center border-t-4 border-green-600 space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-2xl font-bold text-gray-800">護照上傳成功！</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            您的護照資料已成功送出並同步至岳野報名系統。<br />
            行政團隊將為您進行入山審查與海外高額保險投保。
          </p>
          <button 
            onClick={() => window.close()} 
            className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-colors shadow-sm"
          >
            關閉此分頁
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-lg mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-200">
        
        {/* 系統標題 */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">岳野登山社</h2>
          <p className="text-slate-500 text-sm mt-1">海外登山行程 · 護照影本證件上傳</p>
          {orderId && (
            <span className="inline-block mt-3 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">
              ✓ 已連動報名編號：{orderId}
            </span>
          )}
        </div>

        {/* 護照拍照規範與範例圖卡片 */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 mb-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm border-b border-amber-200/80 pb-2">
            <span>📷</span>
            <span>護照拍照規範與標準範例</span>
          </div>

          {/* 標準範例圖 (內建 SVG 圖解) */}
          <div className="flex justify-center py-2">
            <div className="relative bg-white border-2 border-emerald-500 rounded-lg p-3 shadow-sm w-full max-w-[320px]">
              {/* 正確徽章 */}
              <div className="absolute -top-3 -right-2 bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow">
                ✓ 合格範例
              </div>

              {/* 護照頁面線條圖解 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-1.5">
                  <span className="text-[10px] font-bold text-slate-500">PASSPORT 護照個人資料頁</span>
                  <span className="text-[9px] text-emerald-600 font-bold">水平正面俯拍</span>
                </div>

                <div className="flex gap-3 items-center">
                  {/* 大頭照示意 */}
                  <div className="w-16 h-20 bg-slate-100 border border-slate-300 rounded flex flex-col items-center justify-center text-slate-400">
                    <span className="text-xs">👤</span>
                    <span className="text-[8px] mt-1 text-slate-500">清晰無反光</span>
                  </div>
                  {/* 個人文字欄位示意 */}
                  <div className="flex-1 space-y-1.5 text-[9px] text-slate-600">
                    <div className="bg-slate-200 h-2 rounded w-3/4"></div>
                    <div className="bg-slate-200 h-2 rounded w-1/2"></div>
                    <div className="bg-slate-200 h-2 rounded w-2/3"></div>
                    <div className="bg-slate-200 h-2 rounded w-4/5"></div>
                  </div>
                </div>

                {/* 條碼區域示意 (MRZ 機器可讀區) */}
                <div className="bg-slate-100 p-1.5 rounded border border-slate-200 space-y-1">
                  <div className="font-mono text-[8px] text-slate-500 tracking-wider">
                    P&lt;TWNCHEN&lt;&lt;DA&lt;WEI&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                  </div>
                  <div className="font-mono text-[8px] text-slate-500 tracking-wider">
                    3123456789TWN8501018M3201012&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;02
                  </div>
                </div>
              </div>

              {/* 四個邊角完整提示 */}
              <div className="mt-2 text-center text-[10px] text-emerald-700 font-bold bg-emerald-50 rounded py-0.5 border border-emerald-200">
                四角完整保留 · 不切邊不遮擋
              </div>
            </div>
          </div>

          {/* 拍照檢核要點 */}
          <ul className="text-xs text-slate-700 space-y-1.5 pt-1 pl-1">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>平面垂直俯拍</strong>：請將護照水平攤平，鏡頭由上往下正對拍攝，避免傾斜反光。</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>保留完整四邊與四角</strong>：整頁護照需完全入鏡，切勿切到邊緣或截角。</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>避開強光與反光</strong>：避免閃光燈或頂光直射造成白色反光遮擋文字或照片。</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>下方條碼區需清晰</strong>：護照下方兩行英數條碼（MRZ 機器碼）必須完整清晰、不可手指遮擋。</span>
            </li>
          </ul>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* 選擇團名 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">跟團資訊 *</label>
            <select 
              name="tour" 
              required
              value={formData.tour} 
              onChange={handleInputChange}
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white text-sm"
            >
              <option value="" disabled>請選擇您參加的行程梯次...</option>
              {TOUR_OPTIONS.map((tour, idx) => (
                <option key={idx} value={tour}>{tour}</option>
              ))}
            </select>
          </div>

          {/* 填寫姓名 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">真實姓名 *</label>
            <input 
              type="text" 
              name="name" 
              required 
              value={formData.name} 
              onChange={handleInputChange}
              className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm ${
                orderId ? 'bg-slate-50 border-slate-200 font-bold text-slate-800' : 'bg-white border-slate-300'
              }`}
              placeholder="請輸入與報名表相同之中文全名"
            />
          </div>

          {/* 檔案上傳與拍照區塊 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">護照照片面拍攝/上傳 *</label>
            <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition-colors ${
              previewUrl ? 'border-sky-300 bg-sky-50/50' : 'border-slate-300 hover:border-sky-400 bg-slate-50'
            }`}>
              <div className="space-y-2 text-center w-full">
                {previewUrl ? (
                  <div className="mb-2">
                    <img 
                      src={previewUrl} 
                      alt="護照預覽" 
                      className="mx-auto max-h-56 object-contain rounded-lg shadow-md border border-slate-200" 
                    />
                    <p className="text-xs text-sky-700 mt-2 font-bold flex items-center justify-center gap-1">
                      <span>✓ 圖片已載入，請確認四角與文字清晰無遮蔽</span>
                    </p>
                  </div>
                ) : (
                  <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                
                <div className="flex text-sm text-slate-600 justify-center w-full pt-1">
                  <label className="relative cursor-pointer rounded-xl font-bold text-sky-600 hover:text-sky-500 p-2 w-full">
                    <span className="bg-white border border-sky-300 px-5 py-2.5 rounded-full shadow-sm hover:bg-sky-50 transition-colors inline-block">
                      {previewUrl ? '📷 更換/重拍照片' : '📷 點此開啟相機拍照或選擇相簿檔案'}
                    </span>
                    <input 
                      type="file" 
                      className="sr-only" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={handleFileChange} 
                    />
                  </label>
                </div>
                {!previewUrl && (
                  <p className="text-xs text-slate-400">支援 JPG、PNG 圖片檔案</p>
                )}
              </div>
            </div>
          </div>

          {/* 送出按鈕 */}
          <button 
            type="submit" 
            disabled={isUploading || !file}
            className={`w-full py-4 rounded-xl font-bold text-base text-white transition-all shadow-md mt-2 ${
              (isUploading || !file) 
                ? 'bg-slate-300 cursor-not-allowed' 
                : 'bg-sky-600 hover:bg-sky-700 active:scale-[0.99]'
            }`}
          >
            {isUploading ? '護照上傳與資料同步中，請稍候...' : '確認照片清晰完整，送出資料'}
          </button>
        </form>
      </div>
    </div>
  );
}
