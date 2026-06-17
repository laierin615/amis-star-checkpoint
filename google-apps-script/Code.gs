const SPREADSHEET_ID = "1uaU1pF7ybSVMT5tZ6KKB3hayY5XEz2k01Z4qA_SzBs0";
const SPREADSHEET_NAME = "八角星集點資料庫";
const TIMEZONE = "Asia/Taipei";
const TIMESTAMP_FORMAT = "yyyy/MM/dd HH:mm:ss";

const SHEETS = {
  participants: "participants",
  stamps: "stamps",
  completions: "completions",
  meta: "meta"
};

const HEADERS = {
  participants: ["code", "name", "group", "created_at", "updated_at", "報名時間", "集點數", "完成集點時間", "完成名次", "禮物資格", "領取狀態"],
  stamps: ["code", "station_id", "station_title", "host", "created_at"],
  completions: ["code", "name", "group", "completed_at"],
  meta: ["key", "value"]
};

const STATIONS = [
  { id: "s1", title: "問卷通關", host: "自動點亮", pin: "", canAward: false },
  { id: "s2", title: "真名報到", host: "自動點亮", pin: "", canAward: false },
  { id: "s3", title: "cengel", host: "密語 212", pin: "212", canAward: true },
  { id: "s4", title: "Ilisin", host: "密語 323", pin: "323", canAward: true },
  { id: "s5", title: "Dateng", host: "密語 434", pin: "434", canAward: true },
  { id: "s6", title: "Asa’", host: "密語 545", pin: "545", canAward: true },
  { id: "s7", title: "Mipacing", host: "密語 656", pin: "656", canAward: true },
  { id: "s8", title: "noka", host: "密語 767", pin: "767", canAward: true }
];

const DEFAULT_STATION_ID = "s2";
const FORM_STATION_ID = "s1";
const CODE_DIGITS = 3;
const NEXT_CODE_KEY = "next_code";

function doGet(e) {
  return handleRequest_(e);
}

function doPost(e) {
  return handleRequest_(e);
}

function setup() {
  setup_();
  return state_();
}

function handleRequest_(e) {
  const params = requestParams_(e);
  try {
    setup_();
    const action = params.action || "state";
    if (action === "setup") return output_({ ok: true, state: state_() }, params.callback);
    if (action === "state") return output_({ ok: true, state: state_() }, params.callback);
    if (action === "register") return output_(register_(params), params.callback);
    if (action === "formComplete") return output_(formComplete_(params), params.callback);
    if (action === "award") return output_(award_(params), params.callback);
    if (action === "complete") return output_(complete_(params), params.callback);
    if (action === "repairSummaries") return output_(repairSummaries_(params), params.callback);
    return output_({ ok: false, error: "未知的 action: " + action }, params.callback);
  } catch (error) {
    return output_({ ok: false, error: error.message || String(error) }, params.callback);
  }
}

function requestParams_(e) {
  const params = Object.assign({}, e && e.parameter ? e.parameter : {});
  if (e && e.postData && e.postData.contents) {
    try {
      Object.assign(params, JSON.parse(e.postData.contents));
    } catch (error) {
      // Keep GET params when POST body is not JSON.
    }
  }
  return params;
}

function output_(payload, callback) {
  const json = JSON.stringify(payload);
  const safeCallback = String(callback || "").match(/^[A-Za-z_$][0-9A-Za-z_$]*$/) ? callback : "";
  if (safeCallback) {
    return ContentService
      .createTextOutput(safeCallback + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function spreadsheet_() {
  const explicitId = String(SPREADSHEET_ID || "").trim();
  if (explicitId) return SpreadsheetApp.openById(explicitId);
  const props = PropertiesService.getScriptProperties();
  const storedId = props.getProperty("SPREADSHEET_ID");
  if (storedId) return SpreadsheetApp.openById(storedId);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    props.setProperty("SPREADSHEET_ID", active.getId());
    return active;
  }
  const created = SpreadsheetApp.create(SPREADSHEET_NAME);
  props.setProperty("SPREADSHEET_ID", created.getId());
  return created;
}

function setup_() {
  const spreadsheet = spreadsheet_();
  Object.keys(SHEETS).forEach(function (key) {
    let sheet = spreadsheet.getSheetByName(SHEETS[key]);
    if (!sheet) sheet = spreadsheet.insertSheet(SHEETS[key]);
    const headers = HEADERS[key];
    const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const needsHeader = headers.some(function (header, index) {
      return current[index] !== header;
    });
    if (needsHeader) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  });
}

function sheet_(key) {
  return spreadsheet_().getSheetByName(SHEETS[key]);
}

function rows_(key) {
  const sheet = sheet_(key);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  return values.slice(1).filter(function (row) {
    return row.some(function (cell) {
      return cell !== "";
    });
  }).map(function (row, index) {
    const item = { rowNumber: index + 2 };
    headers.forEach(function (header, cellIndex) {
      item[header] = row[cellIndex];
    });
    return item;
  });
}

function headerMap_(key) {
  const sheet = sheet_(key);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.reduce(function (map, header, index) {
    if (header) map[header] = index + 1;
    return map;
  }, {});
}

function setParticipantValues_(rowNumber, values) {
  const participantSheet = sheet_("participants");
  const columns = headerMap_("participants");
  Object.keys(values).forEach(function (header) {
    if (!columns[header]) return;
    participantSheet.getRange(rowNumber, columns[header]).setValue(values[header]);
  });
}

function normalizeCode_(value) {
  const cleaned = String(value || "").trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
  const legacy = cleaned.match(/^NP115(\d{1,4})$/);
  if (legacy) return padCode_(Number(legacy[1]));
  if (/^\d{1,3}$/.test(cleaned)) return padCode_(Number(cleaned));
  return cleaned;
}

function normalizePin_(value) {
  return String(value || "").replace(/\D/g, "");
}

function truthy_(value) {
  return ["1", "true", "yes", "done", "completed", "complete"].indexOf(String(value || "").trim().toLowerCase()) !== -1;
}

function padCode_(value) {
  return String(value).padStart(CODE_DIGITS, "0");
}

function nowIso_() {
  return Utilities.formatDate(new Date(), TIMEZONE, TIMESTAMP_FORMAT);
}

function toIso_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, TIMEZONE, TIMESTAMP_FORMAT);
  }
  return String(value);
}

function timeValue_(value) {
  if (!value) return 0;
  if (Object.prototype.toString.call(value) === "[object Date]") return value.getTime();
  const parsed = new Date(String(value).replace(/-/g, "/"));
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function stationById_(id) {
  return STATIONS.find(function (station) {
    return station.id === id;
  });
}

function participantByCode_(code) {
  const normalized = normalizeCode_(code);
  return rows_("participants").find(function (participant) {
    return normalizeCode_(participant.code) === normalized;
  });
}

function nextCode_() {
  const meta = rows_("meta");
  const metaSheet = sheet_("meta");
  const nextRow = meta.find(function (item) {
    return item.key === NEXT_CODE_KEY;
  });
  const participants = rows_("participants");
  const used = participants.map(function (participant) {
    const code = normalizeCode_(participant.code);
    return /^\d+$/.test(code) ? Number(code) : 0;
  });
  let next = Math.max(1, Number(nextRow && nextRow.value) || 1, Math.max.apply(null, used.concat([0])) + 1);
  while (participantByCode_(padCode_(next))) next += 1;
  if (nextRow) {
    metaSheet.getRange(nextRow.rowNumber, 2).setValue(next + 1);
  } else {
    metaSheet.appendRow([NEXT_CODE_KEY, next + 1]);
  }
  return padCode_(next);
}

function upsertParticipant_(code, name, group) {
  const participantSheet = sheet_("participants");
  const normalizedCode = normalizeCode_(code);
  const existing = participantByCode_(normalizedCode);
  const now = nowIso_();
  if (existing) {
    setParticipantValues_(existing.rowNumber, {
      name: name,
      group: group,
      created_at: toIso_(existing.created_at) || now,
      updated_at: now,
      "報名時間": toIso_(existing["報名時間"]) || toIso_(existing.created_at) || now
    });
    return Object.assign({}, existing, {
      code: normalizedCode,
      name: name,
      group: group,
      updated_at: now,
      "報名時間": toIso_(existing["報名時間"]) || toIso_(existing.created_at) || now
    });
  }
  participantSheet.appendRow([normalizedCode, name, group, now, now, now, 0, "", "", "未取得", ""]);
  return { code: normalizedCode, name: name, group: group, created_at: now, updated_at: now, "報名時間": now, "集點數": 0, "禮物資格": "未取得", "領取狀態": "" };
}

function stampExists_(code, stationId) {
  const normalizedCode = normalizeCode_(code);
  return rows_("stamps").some(function (stamp) {
    return normalizeCode_(stamp.code) === normalizedCode && stamp.station_id === stationId;
  });
}

function addStampIfMissing_(code, station, host) {
  const normalizedCode = normalizeCode_(code);
  if (stampExists_(normalizedCode, station.id)) return false;
  sheet_("stamps").appendRow([normalizedCode, station.id, station.title, host || station.host, nowIso_()]);
  return true;
}

function completionByCode_(code) {
  const normalizedCode = normalizeCode_(code);
  return rows_("completions").find(function (completion) {
    return normalizeCode_(completion.code) === normalizedCode;
  });
}

function participantHasAllStamps_(code) {
  const normalizedCode = normalizeCode_(code);
  const stationIds = new Set(rows_("stamps")
    .filter(function (stamp) {
      return normalizeCode_(stamp.code) === normalizedCode;
    })
    .map(function (stamp) {
      return stamp.station_id;
    }));
  return STATIONS.every(function (station) {
    return stationIds.has(station.id);
  });
}

function stampCount_(code) {
  const normalizedCode = normalizeCode_(code);
  const stationIds = new Set(rows_("stamps")
    .filter(function (stamp) {
      return normalizeCode_(stamp.code) === normalizedCode;
    })
    .map(function (stamp) {
      return stamp.station_id;
    }));
  return STATIONS.filter(function (station) {
    return stationIds.has(station.id);
  }).length;
}

function completionRank_(code) {
  const normalizedCode = normalizeCode_(code);
  const completions = rows_("completions")
    .filter(function (completion) {
      return normalizeCode_(completion.code);
    })
    .sort(function (a, b) {
      return timeValue_(a.completed_at) - timeValue_(b.completed_at);
    });
  const index = completions.findIndex(function (completion) {
    return normalizeCode_(completion.code) === normalizedCode;
  });
  return index >= 0 ? index + 1 : "";
}

function syncParticipantSummary_(code) {
  const normalizedCode = normalizeCode_(code);
  if (!normalizedCode) return null;
  const participant = participantByCode_(normalizedCode);
  if (!participant) return null;
  const count = stampCount_(normalizedCode);
  const completion = completionByCode_(normalizedCode);
  const completedAt = completion ? toIso_(completion.completed_at) : "";
  const giftEligible = count === STATIONS.length;
  const existingClaimStatus = String(participant["領取狀態"] || "").trim();
  setParticipantValues_(participant.rowNumber, {
    updated_at: nowIso_(),
    "報名時間": toIso_(participant["報名時間"]) || toIso_(participant.created_at),
    "集點數": count,
    "完成集點時間": completedAt,
    "完成名次": completedAt ? completionRank_(normalizedCode) : "",
    "禮物資格": giftEligible ? "可領取" : "未取得",
    "領取狀態": existingClaimStatus || (giftEligible ? "未領取" : "")
  });
  return participantByCode_(normalizedCode);
}

function addCompletionIfEligible_(code) {
  const normalizedCode = normalizeCode_(code);
  const participant = participantByCode_(normalizedCode);
  if (!participant) return false;
  if (!participantHasAllStamps_(normalizedCode)) return false;
  const existing = completionByCode_(normalizedCode);
  if (!existing) {
    sheet_("completions").appendRow([
      normalizedCode,
      participant.name || "",
      participant.group || "學生",
      nowIso_()
    ]);
  }
  syncParticipantSummary_(normalizedCode);
  return !existing;
}

function state_() {
  const participants = rows_("participants").filter(function (participant) {
    return normalizeCode_(participant.code);
  }).map(function (participant) {
    return {
      code: normalizeCode_(participant.code),
      name: participant.name || "",
      group: participant.group || "學生",
      createdAt: toIso_(participant.created_at),
      updatedAt: toIso_(participant.updated_at),
      stamps: {}
    };
  });
  const participantMap = {};
  participants.forEach(function (participant) {
    participantMap[participant.code] = participant;
  });
  const logs = rows_("stamps").map(function (stamp) {
    const code = normalizeCode_(stamp.code);
    if (!code) return null;
    const stationId = stamp.station_id;
    const host = stamp.host || (stationById_(stationId) || {}).host || "";
    const time = toIso_(stamp.created_at);
    if (participantMap[code]) {
      participantMap[code].stamps[stationId] = { stationId: stationId, host: host, time: time };
    }
    return { code: code, stationId: stationId, host: host, time: time };
  }).filter(function (log) {
    return log;
  }).sort(function (a, b) {
    return timeValue_(b.time) - timeValue_(a.time);
  });
  rows_("completions").forEach(function (completion) {
    const code = normalizeCode_(completion.code);
    if (participantMap[code]) {
      participantMap[code].completedAt = toIso_(completion.completed_at);
    }
  });
  participants.sort(function (a, b) {
    return a.code.localeCompare(b.code, "en", { numeric: true });
  });
  return { selectedStationId: "s3", activeCode: "", participants: participants, logs: logs };
}

function register_(params) {
  const name = String(params.name || "").trim();
  const group = String(params.group || "學生").trim() || "學生";
  if (!name) return { ok: false, error: "請填寫真實姓名，抽獎領獎時會用來核對身份。" };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const requestedCode = normalizeCode_(params.code);
    const existing = requestedCode ? participantByCode_(requestedCode) : null;
    const code = existing ? requestedCode : nextCode_();
    const participant = upsertParticipant_(code, name, group);
    if (truthy_(params.formDone) || truthy_(params.form) || truthy_(params.formCompleted)) {
      addStampIfMissing_(code, stationById_(FORM_STATION_ID), "自動點亮");
    }
    addStampIfMissing_(code, stationById_(DEFAULT_STATION_ID), "自動點亮");
    syncParticipantSummary_(code);
    const currentState = state_();
    const updatedParticipant = currentState.participants.find(function (item) {
      return item.code === code;
    });
    return { ok: true, participant: updatedParticipant || participant, state: currentState };
  } finally {
    lock.releaseLock();
  }
}

function formComplete_(params) {
  const code = normalizeCode_(params.code);
  if (!code) return { ok: false, error: "請先完成報名，系統才能把問卷菱形寫到你的代碼。" };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const participant = participantByCode_(code);
    if (!participant) return { ok: false, error: "找不到這個參加者代碼，請先完成報名。" };
    addStampIfMissing_(code, stationById_(FORM_STATION_ID), "自動點亮");
    syncParticipantSummary_(code);
    const currentState = state_();
    const updatedParticipant = currentState.participants.find(function (item) {
      return item.code === code;
    });
    return { ok: true, participant: updatedParticipant, state: currentState };
  } finally {
    lock.releaseLock();
  }
}

function award_(params) {
  const code = normalizeCode_(params.code);
  const station = stationById_(params.stationId);
  const pin = normalizePin_(params.pin);
  if (!code) return { ok: false, error: "請輸入參加者代碼。" };
  if (!station || !station.canAward) return { ok: false, error: "這個關卡不需要關主核發。" };
  if (pin !== station.pin) return { ok: false, error: station.title + " 的給點密碼不正確。" };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const participant = participantByCode_(code);
    if (!participant) return { ok: false, error: "找不到這個參加者代碼，請先完成報名。" };
    const added = addStampIfMissing_(code, station, station.host);
    const completed = addCompletionIfEligible_(code);
    if (!completed) syncParticipantSummary_(code);
    const currentState = state_();
    const updatedParticipant = currentState.participants.find(function (item) {
      return item.code === code;
    });
    return { ok: true, already: !added, completed: completed, participant: updatedParticipant, state: currentState };
  } finally {
    lock.releaseLock();
  }
}

function complete_(params) {
  const code = normalizeCode_(params.code);
  if (!code) return { ok: false, error: "請先完成真名報到。" };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const participant = participantByCode_(code);
    if (!participant) return { ok: false, error: "找不到這個參加者代碼，請先完成報名。" };
    if (!participantHasAllStamps_(code)) return { ok: false, error: "八枚星芒尚未集滿。" };
    const added = addCompletionIfEligible_(code);
    if (!added) syncParticipantSummary_(code);
    const currentState = state_();
    const updatedParticipant = currentState.participants.find(function (item) {
      return item.code === code;
    });
    return { ok: true, already: !added, participant: updatedParticipant, state: currentState };
  } finally {
    lock.releaseLock();
  }
}

function repairSummaries_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    setup_();
    const codes = rows_("participants")
      .map(function (participant) {
        return normalizeCode_(participant.code);
      })
      .filter(function (code, index, allCodes) {
        return code && allCodes.indexOf(code) === index;
      });
    const repaired = codes.map(function (code) {
      const participant = syncParticipantSummary_(code);
      return {
        code: code,
        count: stampCount_(code),
        completed: participantHasAllStamps_(code),
        participant: participant ? participant.name || "" : ""
      };
    });
    return { ok: true, repaired: repaired.length, summaries: repaired, state: state_() };
  } finally {
    lock.releaseLock();
  }
}
