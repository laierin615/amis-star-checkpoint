# 八角星線上集點頁面與流程規劃

## 檔案

- `index.html`：可直接開啟的互動頁，包含報名集點卡、每位參加者專屬 QR、關主核發菱形、後台表格、抽獎名單、流程規劃。
- `embed-snippet.html`：可貼到網站或課程頁面的 iframe 範例。
- `google-apps-script/Code.gs`：Google Sheet 後端腳本，負責跨裝置報名發號、核點、防重複。

正式活動建議接 Google Sheet。若 `index.html` 尚未填入 Apps Script Web App URL，會自動退回瀏覽器本機 `localStorage` 模式，只適合確認流程，不能跨裝置共用資料。

公開網址：https://laierin615.github.io/amis-star-checkpoint/

主控台密碼：`8888`

Google Sheet Web App URL：
`https://script.google.com/macros/s/AKfycbx5kZOqyM8Vxd5GisPf_pXkJ5PwaD9zJNs1erPmi4HMXoBTinA6-_iNEIY05K1QLYcW/exec`

現場簡化版：

- 現場入口 QR code：請先放 Google 表單 QR code。
- 表單完成頁連結：Google 表單送出後的確認訊息放集點卡入口 `https://laierin615.github.io/amis-star-checkpoint/?v=20260617-formfirst&form=done`。
- 第 1 關問卷完成：參加者從表單完成頁點進集點卡後，報名時會自動收集第一個菱形。
- 第 2 關完成報名：填姓名與身分別後取得參加者代碼，並收集第二個菱形。
- 給點密碼：第 3 到第 8 關由關主輸入指定密碼核發菱形。
- 參加者代碼：三碼數字，例如 `001`、`002`、`003`；手動輸入時只打 `1` 也會自動對到 `001`。
- 舊版參加者代碼 `NP115001` 仍可掃描或輸入，系統會自動轉成 `001`。

八個關卡：

1. 問卷完成：表單完成頁進入後，報名時自動核發
2. 完成報名：系統自動核發
3. cengel：給點密碼 `212`
4. Ilisin：給點密碼 `323`
5. Dateng：給點密碼 `434`
6. Asa’：給點密碼 `545`
7. Mipacing：給點密碼 `656`
8. noka：給點密碼 `767`

注意：多台手機同時報名、關主使用不同裝置給點時，必須填入 Google Sheet Apps Script URL，才會全場共用同一份資料並保證代碼不重複。

## 推薦流程

### 1. 活動前

1. 建立 Google Sheet，並部署 `google-apps-script/Code.gs`。
2. Google 表單 QR code 放在現場入口，讓參加者先完成問卷。
3. 在 Google 表單「送出後確認訊息」放入集點卡入口：`https://laierin615.github.io/amis-star-checkpoint/?v=20260617-formfirst&form=done`。
4. 參加者從表單完成頁進入集點卡後，登記姓名與身分別；系統自動產生參加者代碼與 QR code，並核發第 1 關「問卷完成」與第 2 關「完成報名」菱形。
5. 產生第 3 到第 8 關的關主給點流程；參加者代碼由 QR 自動帶入，關主只輸入給點密碼。
6. 印出或發送參加者 QR 卡，關主手機先測試掃碼與核發菱形。

### 2. 闖關中

1. 參加者先掃 Google 表單 QR，送出問卷。
2. 在表單完成頁點集點卡連結，進入後登記姓名與身分別。
3. 報名完成後，第 1 關「問卷完成」與第 2 關「完成報名」菱形亮起。
4. 參加者完成第 3 到第 8 關任務後，出示自己的專屬 QR 或參加者代碼。
5. 關主用自己的手機開啟「關主給點」頁。
6. 關主掃參加者 QR 後，系統自動帶入參加者代碼。
7. 關主確認任務通過後，只輸入給點密碼並按「核發菱形」。
8. 系統檢查：給點密碼是否正確、參加者是否存在、該關是否已經給過點。
9. 成功後該菱形亮起，八關集滿後組成阿美族八角星圖騰。

### 3. 收尾

1. 主控台查看完成八個菱形、缺少關卡、重複或異常紀錄。
2. 匯出完整後台表格，或只匯出完成八角星的抽獎名單。
3. 關閉關主給點權限，避免活動後繼續被修改。

## 關主如何給點

推薦採用「關主掃參加者 QR」：

1. 關主選擇自己的關卡，輸入該關卡給點密碼。
2. 參加者完成任務後，關主掃參加者專屬 QR。
3. 畫面顯示參加者姓名、身分別、目前完成關卡。
4. 關主按「核發本關菱形」。
5. 系統寫入 `participant_id + station_id + host_id + timestamp`。

這個模式比「參加者掃關卡 QR」可靠，因為參加者不能自己觸發核發菱形。若現場希望參加者掃關卡 QR，建議加一道關主當場告知的一次性口令，或每 10 到 15 分鐘更換一次關卡口令。

## 資料表設計

### participants

| 欄位 | 說明 |
| --- | --- |
| `participant_id` | 參加者唯一代碼，例如 `001` |
| `name` | 姓名 |
| `group_name` | 身分別：學生、來賓、家長、師長 |
| `qr_url` | 參加者專屬 QR 對應網址 |
| `created_at` | 建立時間 |
| `raffle_eligible` | 是否完成八個菱形，可由系統依紀錄自動計算 |

### stations

| 欄位 | 說明 |
| --- | --- |
| `station_id` | 關卡代碼，例如 `s1` 問卷完成、`s2` 完成報名、`s3` 到 `s8` 為關主核發關卡 |
| `station_name` | 關卡名稱 |
| `host_name` | 關主姓名 |
| `host_pin` | 給點密碼，正式版應雜湊或放在後端 |
| `enabled` | 是否開放給點 |

### stamps

| 欄位 | 說明 |
| --- | --- |
| `stamp_id` | 單筆核點紀錄 |
| `participant_id` | 參加者代碼 |
| `station_id` | 關卡代碼 |
| `host_id` | 關主代碼 |
| `created_at` | 核點時間 |
| `device_note` | 裝置或備註，方便查核 |

`stamps` 需要維持同一個 `participant_id + station_id` 只能存在一筆，這樣可以阻擋同一關重複核發菱形。抽獎名單由完成八個關卡的參加者自動產生。

## 快速上線方案

### 方案 A：Google Sheet + Apps Script

適合學校活動快速使用。資料存在 Google Sheet，Apps Script 提供讀寫 API。優點是容易維護、可直接匯出表格；缺點是多人同時大量操作時需要測試效能與權限。

設定步驟：

1. 新增一份 Google Sheet。
2. 在 Google Sheet 內開啟「擴充功能」→「Apps Script」。
3. 把 `google-apps-script/Code.gs` 全部貼上並儲存。
4. 先執行一次 `setup` 或 `doGet`，依畫面完成授權。
5. 點「部署」→「新增部署作業」→ 類型選「網路應用程式」。
6. 執行身分選「我」，存取權選「知道連結的任何人」。
7. 複製 Web App URL，填入 `index.html` 內的 `GOOGLE_SHEET_API_URL`。
8. 重新部署 GitHub Pages。部署後請用 Cmd+Shift+R 硬重整瀏覽器快取。

測試時也可以先把 Web App URL 用網址參數帶入：

```text
https://laierin615.github.io/amis-star-checkpoint/?api=貼上URL編碼後的WebAppURL
```

正式活動建議直接寫入 `GOOGLE_SHEET_API_URL`，避免 QR code 因網址太長而不穩。

若還沒要改程式，也可以先把 Web App URL 貼給 Codex，Codex 會幫你寫進 `GOOGLE_SHEET_API_URL` 並重新部署。

### 方案 B：Supabase / Firebase

適合活動人數多、需要即時同步與登入權限。優點是資料同步穩、可設定權限；缺點是需要較完整的後端設定。

### 方案 C：純靜態展示

只適合展示或試流程。每台手機資料不會互通，不能作為正式活動核點系統。

## 現場備援

- 每位關主準備一張紙本補登表：參加者代碼、時間、是否通過。
- 主控端準備一支可分享網路的手機或行動網路。
- 若網路中斷，關主先紙本記錄，活動後由主控端批次補登。
- 參加者 QR 卡建議同時印出代碼，掃碼失敗時可手動輸入。

## 嵌入方式

上傳整個資料夾後，可用 iframe 嵌入：

```html
<iframe
  src="/online_checkpoint_stamp/index.html"
  title="八角星線上集點"
  style="width:100%;height:860px;border:0;"
  loading="lazy"></iframe>
```
