const SPREADSHEET_ID = "";
const SPREADSHEET_NAME = "八角星集點資料庫";

const SHEETS = {
  participants: "participants",
  stamps: "stamps",
  meta: "meta"
};

const HEADERS = {
  participants: ["code", "name", "group", "created_at", "updated_at"],
  stamps: ["code", "station_id", "station_title", "host", "created_at"],
  meta: ["key", "value"]
};

const STATIONS = [
  { id: "s1", title: "問卷完成", host: "表單自動", pin: "", canAward: false },
  { id: "s2", title: "完成報名", host: "系統自動", pin: "", canAward: false },
  { id: "s3", title: "cengel", host: "cengel 關主", pin: "212", canAward: true },
  { id: "s4", title: "Ilisin", host: "Ilisin 關主", pin: "323", canAward: true },
  { id: "s5", title: "Dateng", host: "Dateng 關主", pin: "434", canAward: true },
  { id: "s6", title: "Asa’", host: "Asa’ 關主", pin: "545", canAward: true },
  { id: "s7", title: "Mipacing", host: "Mipacing 關主", pin: "656", canAward: true },
  { id: "s8", title: "noka", host: "noka 關主", pin: "767", canAward: true }
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
  return new Date().toISOString();
}

function toIso_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") return value.toISOString();
  return String(value);
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
    participantSheet.getRange(existing.rowNumber, 2, 1, 3).setValues([[name, group, toIso_(existing.created_at) || now]]);
    participantSheet.getRange(existing.rowNumber, 5).setValue(now);
    return Object.assign({}, existing, { code: normalizedCode, name: name, group: group, updated_at: now });
  }
  participantSheet.appendRow([normalizedCode, name, group, now, now]);
  return { code: normalizedCode, name: name, group: group, created_at: now, updated_at: now };
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

function state_() {
  const participants = rows_("participants").map(function (participant) {
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
    const stationId = stamp.station_id;
    const host = stamp.host || (stationById_(stationId) || {}).host || "";
    const time = toIso_(stamp.created_at);
    if (participantMap[code]) {
      participantMap[code].stamps[stationId] = { stationId: stationId, host: host, time: time };
    }
    return { code: code, stationId: stationId, host: host, time: time };
  }).sort(function (a, b) {
    return new Date(b.time) - new Date(a.time);
  });
  participants.sort(function (a, b) {
    return a.code.localeCompare(b.code, "en", { numeric: true });
  });
  return { selectedStationId: "s3", activeCode: "", participants: participants, logs: logs };
}

function register_(params) {
  const name = String(params.name || "").trim();
  const group = String(params.group || "學生").trim() || "學生";
  if (!name) return { ok: false, error: "請先填寫姓名。" };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const requestedCode = normalizeCode_(params.code);
    const existing = requestedCode ? participantByCode_(requestedCode) : null;
    const code = existing ? requestedCode : nextCode_();
    const participant = upsertParticipant_(code, name, group);
    if (truthy_(params.formDone) || truthy_(params.form) || truthy_(params.formCompleted)) {
      addStampIfMissing_(code, stationById_(FORM_STATION_ID), "表單自動");
    }
    addStampIfMissing_(code, stationById_(DEFAULT_STATION_ID), "系統自動");
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
    addStampIfMissing_(code, stationById_(FORM_STATION_ID), "表單自動");
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
    const currentState = state_();
    const updatedParticipant = currentState.participants.find(function (item) {
      return item.code === code;
    });
    return { ok: true, already: !added, participant: updatedParticipant, state: currentState };
  } finally {
    lock.releaseLock();
  }
}
