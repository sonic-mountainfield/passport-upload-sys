import React, { useState, useEffect } from 'react';

// 岳野登山社 - 2027 最新出團列表
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
  const [orderId, setOrderId] = useState(''); // 用來接收主系統傳來的報名編號
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // 📝 專屬代碼
  const CLOUD_NAME = 'dzzvhoo2d'; 
  const UPLOAD_PRESET = 'z2ln6ju0'; 
  const PASSPORT_SHEETDB_URL = 'https://sheetdb.io/api/v1/0r2rfy0cdm7yk?sheet=護照'; 
  const MAIN_SYSTEM_SHEETDB_URL = 'https://sheetdb.io/api/v1/rzyq1bdriv1u0?sheet=Registration'; 

  // 自動解析主系統跳轉過來的網址參數
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

  // 處理文字輸入
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 處理照片選擇與預覽
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
    }
  };

  // 處理表單送出 (上傳圖片 -> 存入資料庫 -> 同步主系統)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('請先選擇護照照片！');
      return;
    }

    setIsUploading(true);

    try {
      // 1. 上傳圖片到 Cloudinary
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

      // 2. 將資料存入護照備份資料庫 (SheetDB 護照)
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

      if (!sheetRes.ok) throw new Error('護照資料庫儲存失敗，請檢查 SheetDB');

      // 3. 【強大功能】若網址有報名編號，同步將主報名系統的「護照上傳狀態」改為「已上傳」
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
          // 不中斷流程，僅印出警告
        }
      }

      setIsSuccess(true);

    } catch (error) {
      console.error('上傳流程發生錯誤:', error);
      alert('抱歉，上傳失敗：' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // 成功畫面
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg text-center border-t-4 border-blue-500">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">護照上傳成功！</h2>
          <p className="text-gray-600 mb-6">您的護照資料已成功送出並同步至報名系統，感謝您的配合。</p>
          <button 
            onClick={() => window.close()} 
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
          >
            關閉此視窗
          </button>
        </div>
      </div>
    );
  }

  // 填寫表單畫面
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">岳野登山社</h2>
          <p className="text-gray-500 mt-2">海外行程護照資料上傳</p>
          {orderId && (
            <span className="inline-block mt-3 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded border border-green-200">
              已連動報名編號：{orderId}
            </span>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 選擇團名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">跟團資訊 *</label>
            <select 
              name="tour" 
              required
              value={formData.tour} 
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="" disabled>請選擇您參加的行程梯次...</option>
              {TOUR_OPTIONS.map((tour, idx) => (
                <option key={idx} value={tour}>{tour}</option>
              ))}
            </select>
          </div>

          {/* 填寫姓名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">真實姓名 *</label>
            <input 
              type="text" name="name" required value={formData.name} onChange={handleInputChange}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${orderId ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'}`}
              placeholder="請輸入與報名表相同的姓名"
            />
          </div>

          {/* 檔案上傳區塊 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">護照照片面 *</label>
            <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${previewUrl ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400 bg-gray-50'}`}>
              <div className="space-y-1 text-center w-full">
                {previewUrl ? (
                  <div className="mb-4">
                    <img src={previewUrl} alt="護照預覽" className="mx-auto max-h-48 object-contain rounded shadow-sm" />
                    <p className="text-sm text-blue-600 mt-3 font-semibold">圖片已準備就緒</p>
                  </div>
                ) : (
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <div className="flex text-sm text-gray-600 justify-center w-full">
                  <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 p-2 w-full">
                    <span className="bg-white border border-blue-200 px-4 py-2 rounded-full shadow-sm">
                      {previewUrl ? '更換照片' : '點擊拍照或選擇檔案'}
                    </span>
                    {/* 🚀 加入 capture="environment" 讓手機優先開啟主相機 */}
                    <input type="file" className="sr-only" accept="image/*" capture="environment" onChange={handleFileChange} />
                  </label>
                </div>
                {!previewUrl && <p className="text-xs text-gray-500 mt-4">請確保燈光充足，反光不遮擋字體</p>}
              </div>
            </div>
          </div>

          {/* 送出按鈕 */}
          <button 
            type="submit" 
            disabled={isUploading || !file}
            className={`w-full py-4 rounded-lg font-bold text-lg text-white transition-all shadow-md mt-4
              ${(isUploading || !file) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isUploading ? '圖片上傳與資料同步中...' : '確認無誤，送出資料'}
          </button>
        </form>
      </div>
    </div>
  );
}
