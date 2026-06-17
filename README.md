# 八角星線上集點頁面與流程規劃

## 檔案

- `index.html`：可直接開啟的單頁任務卡，包含真名報到、八角星集點、關卡密語核發、抽獎資格提示。
- `embed-snippet.html`：可貼到網站或課程頁面的 iframe 範例。
- `google-apps-script/Code.gs`：Google Sheet 後端腳本，負責跨裝置報名發號、核點、防重複。

正式活動建議接 Google Sheet。若 `index.html` 尚未填入 Apps Script Web App URL，會自動退回瀏覽器本機 `localStorage` 模式，只適合確認流程，不能跨裝置共用資料。

公開網址：https://laierin615.github.io/amis-star-checkpoint/

Google Sheet Web App URL：
`https://script.google.com/macros/s/AKfycbx5kZOqyM8Vxd5GisPf_pXkJ5PwaD9zJNs1erPmi4HMXoBTinA6-_iNEIY05K1QLYcW/exec`

目標 Google Sheet：
`https://docs.google.com/spreadsheets/d/1uaU1pF7ybSVMT5tZ6KKB3hayY5XEz2k01Z4qA_SzBs0/edit?gid=988575064#gid=988575064`

現場簡化版：

- 現場入口 QR code：請放 Google 表單 QR code。
- 表單最後一頁連結：Google 表單送出後的確認訊息放集點卡入口 `https://laierin615.github.io/amis-star-checkpoint/?v=20260617-formfirst&form=done`。
- 第 1 關問卷通關：進入集點卡後預設點亮。
- 第 2 關真名報到：填真實姓名與身分別後自動寫入 Google Sheet，並點亮第二枚星芒。
- 第 3 到第 8 關：參加者直接點任務卡上的關卡，輸入該站密語，正確後點亮星芒。
- 集滿八枚星芒：畫面出現「恭喜取得抽獎資格」，並將姓名與完成時間寫入 Google Sheet 的 `completions` 工作表。
- 參加者代碼：系統內部用三碼數字，例如 `001`、`002`、`003`。
- 舊版參加者代碼 `NP115001` 仍可掃描或輸入，系統會自動轉成 `001`。

八個關卡：

1. 問卷通關：進入任務卡後自動點亮
2. 真名報到：系統自動點亮
3. cengel：給點密碼 `212`
4. Ilisin：給點密碼 `323`
5. Dateng：給點密碼 `434`
6. Asa’：給點密碼 `545`
7. Mipacing：給點密碼 `656`
8. noka：給點密碼 `767`

注意：多台手機同時報名時，必須填入 Google Sheet Apps Script URL，才會全場共用同一份資料並保證代碼不重複。

## 推薦流程

### 1. 活動前

1. 建立 Google Sheet，並部署 `google-apps-script/Code.gs`。
2. Google 表單 QR code 放在現場入口，讓參加者先完成問卷。
3. 在 Google 表單「送出後確認訊息」放入集點卡入口：`https://laierin615.github.io/amis-star-checkpoint/?v=20260617-formfirst&form=done`。
4. 參加者從表單完成頁進入任務卡後，第 1 枚「問卷通關」星芒預設點亮。
5. 參加者填真實姓名與身分別完成報到；系統自動寫入 Google Sheet 並點亮第 2 枚「真名報到」星芒。
6. 關主只需要提供該站密語，不需要另外開關主頁。

### 2. 闖關中

1. 參加者先掃 Google 表單 QR，送出問卷。
2. 在表單完成頁點集點卡連結，進入後登記姓名與身分別。
3. 報到完成後，第 1 枚「問卷通關」與第 2 枚「真名報到」星芒亮起。
4. 參加者完成第 3 到第 8 關任務後，直接點任務卡上的該關。
5. 輸入該站關主提供的三位數密語。
6. 密語正確後該星芒亮起，畫面回到任務卡。
7. 八枚星芒集滿後，畫面顯示抽獎資格，系統自動寫入姓名與完成時間。

### 3. 收尾

1. 查看 Google Sheet 的 `participants`、`stamps`、`completions` 工作表。
2. `completions` 會列出已取得抽獎資格者的姓名與完成時間。
3. 若網路中斷，關主可先紙本記錄，活動後再補登。

## 關主如何給點

新版採用「參加者點任務卡，關主提供密語」：

1. 參加者完成該站任務後，點自己的任務卡關卡。
2. 關主確認通過後，提供該站三位數密語。
3. 參加者輸入密語，正確後該星芒亮起。
4. 系統寫入 `participant_id + station_id + host + timestamp`。

## 資料表設計

### participants

| 欄位 | 說明 |
| --- | --- |
| `participant_id` | 參加者唯一代碼，例如 `001` |
| `name` | 真實姓名 |
| `group_name` | 身分別：學生、來賓、家長、師長 |
| `created_at` | 建立時間，格式為台北時間 `yyyy/MM/dd HH:mm:ss` |
| `updated_at` | 更新時間，格式為台北時間 `yyyy/MM/dd HH:mm:ss` |
| `報名時間` | 報到完成時間，預設同 `created_at` |
| `集點數` | 已取得的星芒數，依 `stamps` 工作表自動回算 |
| `完成集點時間` | 集滿八枚星芒時間，來自 `completions.completed_at` |
| `完成名次` | 依完成時間排序的名次 |
| `禮物資格` | 集滿八枚時顯示 `可領取`，未集滿顯示 `未取得` |
| `領取狀態` | 集滿後預設 `未領取`；若手動改成 `已領取`，後端回算不會覆蓋 |

### stations

| 欄位 | 說明 |
| --- | --- |
| `station_id` | 關卡代碼，例如 `s1` 問卷通關、`s2` 真名報到、`s3` 到 `s8` 為密語關卡 |
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
| `host_id` | 關卡註記 |
| `created_at` | 核點時間，格式為台北時間 `yyyy/MM/dd HH:mm:ss` |

`stamps` 需要維持同一個 `participant_id + station_id` 只能存在一筆，這樣可以阻擋同一關重複核發菱形。抽獎名單由完成八個關卡的參加者自動產生。

### completions

| 欄位 | 說明 |
| --- | --- |
| `code` | 參加者代碼 |
| `name` | 真實姓名 |
| `group` | 身分別 |
| `completed_at` | 完成八角星時間，格式為台北時間 `yyyy/MM/dd HH:mm:ss` |

注意：若 Google Sheet 仍出現 UTC/ISO 時間，代表 Apps Script Web App 尚未重新部署到新版 `Code.gs`。

## 快速上線方案

### 方案 A：Google Sheet + Apps Script

適合學校活動快速使用。資料存在 Google Sheet，Apps Script 提供讀寫 API。優點是容易維護、可直接匯出表格；缺點是多人同時大量操作時需要測試效能與權限。

設定步驟：

1. 使用指定 Google Sheet，或將 `SPREADSHEET_ID` 改成新的 Sheet ID。
2. 在 Google Sheet 內開啟「擴充功能」→「Apps Script」。
3. 把 `google-apps-script/Code.gs` 全部貼上並儲存。
4. 先執行一次 `setup` 或 `doGet`，依畫面完成授權。
5. 點「部署」→「新增部署作業」→ 類型選「網路應用程式」。
6. 執行身分選「我」，存取權選「知道連結的任何人」。
7. 複製 Web App URL，填入 `index.html` 內的 `GOOGLE_SHEET_API_URL`。
8. 重新部署 GitHub Pages。部署後請用 Cmd+Shift+R 硬重整瀏覽器快取。

若既有資料是在舊版 Apps Script 下完成，部署新版後可以開這個網址回補 `participants` 右側統計欄位：

```text
https://script.google.com/macros/s/你的WebAppID/exec?action=repairSummaries
```

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
- 參加者若手機斷線，請先記下真實姓名與已通過關卡，活動後由主控端補登。

## 嵌入方式

上傳整個資料夾後，可用 iframe 嵌入：

```html
<iframe
  src="/online_checkpoint_stamp/index.html"
  title="Salimpo 八角星任務卡"
  style="width:100%;height:860px;border:0;"
  loading="lazy"></iframe>
```
