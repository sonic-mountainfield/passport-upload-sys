import React, { useState } from 'react';

// 岳野登山公司 - 2026 富士山出團列表
const TOUR_OPTIONS = [
  "[G1] 7/11～7/15 富士山五日",
  "[G2] 7/12～7/16 富士山五日",
  "[G3] 7/26～7/30 富士山五日",
  "[G4] 8/19～8/23 富士山五日",
  "[S1] 7/9～7/11 富士山三日",
  "[S2] 7/16～7/18 富士山三日",
  "[S3] 7/23～7/25 富士山三日",
  "[S4] 7/30～8/1 富士山三日",
  "[S5] 8/3～8/5 富士山三日",
  "[S6] 8/23～8/25 富士山三日",
  "[S7] 8/27～8/29 富士山三日",
  "[SS] 9/3～9/5 富士山三日",
  "[S8] 9/6～9/8 富士山三日",
  
];

export default function App() {
  const [formData, setFormData] = useState({ tour: '', name: '' });
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // 📝 請在這裡填入你的專屬代碼！
  const CLOUD_NAME = 'dzsvhoo2d'; // 你的 Cloudinary 名稱
  const UPLOAD_PRESET = 'z2ln6ju0'; // 你的 Cloudinary 無簽名上傳憑證
  const SHEETDB_URL = 'https://sheetdb.io/api/v1/0r2rfy0cdm7yk?sheet=護照'; // 你的 SheetDB 網址

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

  // 處理表單送出 (上傳圖片 -> 存入資料庫)
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

      // 2. 將資料存入 SheetDB (只傳送團名、姓名、圖片網址、上傳時間)
      const sheetPayload = {
        data: [{
          "團名與日期": formData.tour,
          "姓名": formData.name,
          "護照圖片": imageUrl,
          "上傳時間": new Date().toLocaleString()
        }]
      };

      const sheetRes = await fetch(SHEETDB_URL, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(sheetPayload)
      });

      if (!sheetRes.ok) throw new Error('資料庫儲存失敗，請檢查 SheetDB 與 Google 表單欄位');

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg text-center border-t-4 border-blue-500">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">上傳成功！</h2>
          <p className="text-gray-600">您的護照資料已成功送出，感謝您的配合。您可以關閉此視窗。</p>
        </div>
      </div>
    );
  }

  // 填寫表單畫面
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">岳野登山公司</h2>
          <p className="text-gray-500 mt-2">出國行程護照資料上傳</p>
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
              <option value="" disabled>請選擇您參加的行程...</option>
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
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <p className="text-sm text-blue-600 mt-3 font-semibold">圖片已選擇</p>
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
                    {/* 🚀 這裡加入了 capture="environment" 讓手機優先開相機！ */}
                    <input type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
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
            {isUploading ? '圖片上傳中 (請稍候)...' : '確認無誤，送出資料'}
          </button>
        </form>
      </div>
    </div>
  );
}
