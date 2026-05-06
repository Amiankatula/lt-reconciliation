// ── SAMPLE DATA ──
var sampleMobile = [
  { id: "TXN001", amount: 5000,  date: "2026-05-07" },
  { id: "TXN002", amount: 1200,  date: "2026-05-07" },
  { id: "TXN003", amount: 8500,  date: "2026-05-07" },
  { id: "TXN004", amount: 3300,  date: "2026-05-07" },
  { id: "TXN005", amount: 750,   date: "2026-05-07" },
  { id: "TXN006", amount: 2200,  date: "2026-05-07" },
  { id: "TXN007", amount: 4100,  date: "2026-05-07" },
  { id: "TXN008", amount: 9800,  date: "2026-05-07" },
  { id: "TXN009", amount: 620,   date: "2026-05-07" },
  { id: "TXN010", amount: 1500,  date: "2026-05-07" },
  { id: "TXN011", amount: 3000,  date: "2026-05-07" },
  { id: "TXN012", amount: 7400,  date: "2026-05-07" },
];

var sampleBank = [
  { id: "TXN001", amount: 5000,  date: "2026-05-07" },
  { id: "TXN002", amount: 1250,  date: "2026-05-07" },
  { id: "TXN003", amount: 8500,  date: "2026-05-07" },
  { id: "TXN004", amount: 3300,  date: "2026-05-07" },
  { id: "TXN005", amount: 750,   date: "2026-05-07" },
  { id: "TXN006", amount: 2200,  date: "2026-05-07" },
  { id: "TXN007", amount: 4000,  date: "2026-05-07" },
  { id: "TXN008", amount: 9800,  date: "2026-05-07" },
  { id: "TXN010", amount: 1500,  date: "2026-05-07" },
  { id: "TXN011", amount: 3000,  date: "2026-05-07" },
  { id: "TXN012", amount: 7400,  date: "2026-05-07" },
];

var mobileData  = sampleMobile;
var bankData    = sampleBank;
var allResults  = [];
var chatHistory = [];

// ── LANDING / APP TOGGLE ──
function launchApp() {
  document.getElementById("landing-page").style.display = "none";
  document.getElementById("main-app").style.display     = "block";
}

function showLanding() {
  document.getElementById("main-app").style.display     = "none";
  document.getElementById("landing-page").style.display = "block";
}

function scrollToFeatures() {
  document.getElementById("features").scrollIntoView({ behavior: "smooth" });
}

// ── TAB SWITCHING ──
function showTab(name) {
  var contents = document.querySelectorAll(".tab-content");
  var buttons  = document.querySelectorAll(".tab-btn");
  for (var i = 0; i < contents.length; i++) contents[i].classList.remove("active");
  for (var j = 0; j < buttons.length;  j++) buttons[j].classList.remove("active");
  document.getElementById("tab-" + name).classList.add("active");
  for (var k = 0; k < buttons.length; k++) {
    if (buttons[k].getAttribute("onclick") === "showTab('" + name + "')") {
      buttons[k].classList.add("active");
    }
  }
}

function filterAndGo(type) {
  showTab("results");
  filterResults(type);
}

// ── INIT ──
function init() {
  fillTable("mobile-table", mobileData);
  fillTable("bank-table", bankData);
  document.getElementById("total-count").textContent = mobileData.length;
  addAudit("Platform loaded — using sample data.", "info");
  renderHistory();
  document.getElementById("empty-results").style.display   = "block";
  document.getElementById("results-content").style.display = "none";
}

// ── FILL TABLE ──
function fillTable(tableId, records) {
  var tbody = document.getElementById(tableId);
  tbody.innerHTML = "";
  for (var i = 0; i < records.length; i++) {
    var row = tbody.insertRow();
    row.insertCell(0).textContent = records[i].id;
    row.insertCell(1).textContent = "KES " + records[i].amount.toLocaleString();
    row.insertCell(2).textContent = records[i].date || "—";
    var cell = row.insertCell(3);
    cell.innerHTML = '<span class="badge badge-pending">Pending</span>';
  }
}

// ── CSV UPLOAD ──
function handleUpload(type, input) {
  if (!input.files || !input.files[0]) return;
  var file   = input.files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    var lines  = e.target.result.trim().split("\n");
    var parsed = [];
    for (var i = 1; i < lines.length; i++) {
      var cols = lines[i].split(",");
      if (cols.length >= 2) {
        parsed.push({
          id:     cols[0].trim(),
          amount: parseFloat(cols[1].trim()) || 0,
          date:   cols[2] ? cols[2].trim() : "—"
        });
      }
    }
    if (type === "mobile") {
      mobileData = parsed;
      document.getElementById("mobile-hint").textContent = file.name + " (" + parsed.length + " rows)";
      fillTable("mobile-table", mobileData);
      addAudit("Mobile CSV: " + file.name + " — " + parsed.length + " transactions loaded.", "success");
    } else {
      bankData = parsed;
      document.getElementById("bank-hint").textContent = file.name + " (" + parsed.length + " rows)";
      fillTable("bank-table", bankData);
      addAudit("Bank CSV: " + file.name + " — " + parsed.length + " transactions loaded.", "success");
    }
    document.getElementById("total-count").textContent = mobileData.length;
  };
  reader.readAsText(file);
}

// ── RECONCILIATION ──
function runReconciliation() {
  var tolerance = parseFloat(document.getElementById("tolerance").value) || 0;
  var timestamp = new Date();

  document.getElementById("status-text").textContent = "Running reconciliation...";
  addAudit("Reconciliation started. Tolerance: KES " + tolerance + ".", "info");

  var bankMap = {};
  for (var i = 0; i < bankData.length; i++) bankMap[bankData[i].id] = bankData[i].amount;

  var matched = 0, withinTol = 0, mismatches = 0, missing = 0, unreconciledAmount = 0;
  allResults = [];

  document.getElementById("mobile-table").innerHTML  = "";
  document.getElementById("results-table").innerHTML = "";

  for (var j = 0; j < mobileData.length; j++) {
    var rec = mobileData[j];
    var bankAmt = bankMap[rec.id];
    var label, badgeClass, type, diff, errorType;

    if (bankAmt === undefined) {
      label = "❌ Missing in Bank"; badgeClass = "badge-missing";
      type = "missing"; errorType = "Data Gap";
      diff = rec.amount; missing++;
      unreconciledAmount += rec.amount;
    } else {
      diff = Math.abs(rec.amount - bankAmt);
      if (diff === 0) {
        label = "✅ Matched"; badgeClass = "badge-matched";
        type = "matched"; errorType = "None"; matched++;
      } else if (tolerance > 0 && diff <= tolerance) {
        label = "〰 Within Tolerance"; badgeClass = "badge-tolerance";
        type = "tolerance"; errorType = "Tolerance"; withinTol++;
        unreconciledAmount += diff;
      } else {
        label = "⚠️ Mismatch"; badgeClass = "badge-mismatch";
        type = "mismatch"; mismatches++;
        unreconciledAmount += diff;
        errorType = diff < 100 ? "Timing Issue" :
                    (diff === rec.amount || diff === bankAmt) ? "Possible Duplicate" : "Data Gap";
      }
    }

    allResults.push({
      id: rec.id, mobileAmount: rec.amount, bankAmount: bankAmt,
      date: rec.date || "—", diff: diff, label: label,
      badgeClass: badgeClass, type: type, errorType: errorType,
    });

    var mRow = document.getElementById("mobile-table").insertRow();
    mRow.insertCell(0).textContent = rec.id;
    mRow.insertCell(1).textContent = "KES " + rec.amount.toLocaleString();
    mRow.insertCell(2).textContent = rec.date || "—";
    var mCell = mRow.insertCell(3);
    mCell.innerHTML = '<span class="badge ' + badgeClass + '">' + label + '</span>';
  }

  fillTable("bank-table", bankData);

  document.getElementById("total-count").textContent         = mobileData.length;
  document.getElementById("matched-count").textContent       = matched;
  document.getElementById("tolerance-count").textContent     = withinTol;
  document.getElementById("mismatch-count").textContent      = mismatches;
  document.getElementById("missing-count").textContent       = missing;
  document.getElementById("unreconciled-amount").textContent = "KES " + unreconciledAmount.toLocaleString();

  var timeStr = timestamp.toLocaleTimeString();
  var dateStr = timestamp.toLocaleDateString();
  document.getElementById("status-text").textContent = "Complete — " + dateStr + " at " + timeStr;
  document.getElementById("audit-pill").textContent  = "Last run: " + dateStr + " " + timeStr;

  addAudit(
    "Complete: " + mobileData.length + " processed. " +
    matched + " matched, " + withinTol + " tolerance, " +
    mismatches + " mismatches, " + missing + " missing. " +
    "Unreconciled: KES " + unreconciledAmount.toLocaleString() + ".",
    mismatches > 0 || missing > 0 ? "warning" : "success"
  );

  saveHistory({
    timestamp: timestamp.toISOString(), dateStr: dateStr + " " + timeStr,
    tolerance: tolerance, total: mobileData.length,
    matched: matched, withinTol: withinTol,
    mismatches: mismatches, missing: missing,
    unreconciled: unreconciledAmount,
    results: JSON.parse(JSON.stringify(allResults)),
  });

  document.getElementById("empty-results").style.display   = "none";
  document.getElementById("results-content").style.display = "block";
  document.getElementById("ai-dashboard-banner").style.display = "block";
  renderResults(allResults, "all");
}

// ── RENDER RESULTS ──
function renderResults(data, type) {
  var tbody = document.getElementById("results-table");
  tbody.innerHTML = "";
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var row = tbody.insertRow();
    row.insertCell(0).textContent = r.id;
    row.insertCell(1).textContent = "KES " + r.mobileAmount.toLocaleString();
    row.insertCell(2).textContent = r.bankAmount !== undefined ? "KES " + r.bankAmount.toLocaleString() : "—";
    var diffCell = row.insertCell(3);
    if (r.diff === 0)
      diffCell.innerHTML = '<span class="diff-zero">—</span>';
    else if (r.type === "tolerance")
      diffCell.innerHTML = '<span class="diff-tolerance">KES ' + r.diff.toLocaleString() + '</span>';
    else
      diffCell.innerHTML = '<span class="diff-positive">KES ' + r.diff.toLocaleString() + '</span>';
    var errClass =
      r.errorType === "Timing Issue"       ? "error-timing" :
      r.errorType === "Possible Duplicate" ? "error-duplicate" :
      r.errorType === "Data Gap"           ? "error-datagap" :
      r.errorType === "Tolerance"          ? "error-tolerance" : "error-none";
    var errCell = row.insertCell(4);
    errCell.innerHTML = '<span class="' + errClass + '">' + r.errorType + '</span>';
    var resCell = row.insertCell(5);
    resCell.innerHTML = '<span class="badge ' + r.badgeClass + '">' + r.label + '</span>';
  }
  var labels = {
    all:       "Showing all " + data.length + " transactions",
    matched:   data.length + " matched transaction(s)",
    tolerance: data.length + " within tolerance",
    mismatch:  data.length + " mismatch(es) — requires investigation",
    missing:   data.length + " missing transaction(s)"
  };
  document.getElementById("filter-status").textContent = labels[type] || "";
}

// ── FILTER ──
function filterResults(type) {
  var buttons = document.querySelectorAll(".filter-btn");
  for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove("active");
  document.getElementById("btn-" + type).classList.add("active");
  var filtered = type === "all" ? allResults : allResults.filter(function(r){ return r.type === type; });
  renderResults(filtered, type);
}

// ── EXPORT CSV ──
function exportCSV() {
  if (allResults.length === 0) { alert("Run reconciliation first."); return; }
  var csv = "Transaction ID,Mobile Amount,Bank Amount,Difference,Error Type,Result,Date\n";
  for (var i = 0; i < allResults.length; i++) {
    var r = allResults[i];
    csv += r.id + "," + r.mobileAmount + "," +
           (r.bankAmount !== undefined ? r.bankAmount : "MISSING") + "," +
           r.diff + "," + r.errorType + "," + r.type.toUpperCase() + "," + r.date + "\n";
  }
  var blob = new Blob([csv], { type: "text/csv" });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement("a");
  a.href = url;
  a.download = "LT-Reconciliation-" + new Date().toISOString().slice(0,10) + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  addAudit("Report exported to CSV.", "success");
}

// ── AUDIT ──
function addAudit(message, level) {
  var log   = document.getElementById("audit-log");
  var entry = document.createElement("div");
  entry.className = "audit-entry " + (level || "info");
  entry.innerHTML =
    '<span class="audit-time">' + new Date().toLocaleTimeString() + '</span>' +
    '<span class="audit-msg">' + message + '</span>';
  log.insertBefore(entry, log.firstChild);
}

// ── HISTORY ──
function saveHistory(run) {
  var history = getHistory();
  history.unshift(run);
  if (history.length > 20) history = history.slice(0, 20);
  try { localStorage.setItem("lt_recon_history", JSON.stringify(history)); } catch(e) {}
  renderHistory();
}

function getHistory() {
  try { var raw = localStorage.getItem("lt_recon_history"); return raw ? JSON.parse(raw) : []; }
  catch(e) { return []; }
}

function clearHistory() {
  if (confirm("Clear all reconciliation history?")) {
    localStorage.removeItem("lt_recon_history");
    renderHistory();
    addAudit("History cleared.", "warning");
  }
}

function renderHistory() {
  var container = document.getElementById("history-list");
  var history   = getHistory();
  var countEl   = document.getElementById("history-count");
  if (history.length === 0) {
    container.innerHTML = '<div class="history-empty">No runs yet. Go to Dashboard and run your first reconciliation.</div>';
    if (countEl) countEl.textContent = "";
    return;
  }
  if (countEl) countEl.textContent = history.length + " run(s) saved";
  container.innerHTML = "";
  for (var i = 0; i < history.length; i++) {
    var run  = history[i];
    var card = document.createElement("div");
    card.className = "history-card";
    var matchRate   = run.total > 0 ? Math.round((run.matched / run.total) * 100) : 0;
    var statusClass = run.mismatches + run.missing > 0 ? "hist-warn" : "hist-ok";
    var statusText  = run.mismatches + run.missing > 0 ? "⚠ Issues Found" : "✅ Clean";
    card.innerHTML =
      '<div class="hist-top"><div class="hist-date">' + run.dateStr + '</div>' +
      '<div class="hist-badge ' + statusClass + '">' + statusText + '</div></div>' +
      '<div class="hist-stats">' +
        '<div class="hist-stat"><span class="hist-num">' + run.total + '</span><span class="hist-lbl">Total</span></div>' +
        '<div class="hist-stat"><span class="hist-num" style="color:#2ecc71">' + run.matched + '</span><span class="hist-lbl">Matched</span></div>' +
        '<div class="hist-stat"><span class="hist-num" style="color:#f39c12">' + run.mismatches + '</span><span class="hist-lbl">Mismatches</span></div>' +
        '<div class="hist-stat"><span class="hist-num" style="color:#e74c3c">' + run.missing + '</span><span class="hist-lbl">Missing</span></div>' +
        '<div class="hist-stat"><span class="hist-num" style="color:#8e44ad">KES ' + run.unreconciled.toLocaleString() + '</span><span class="hist-lbl">Unreconciled</span></div>' +
      '</div>' +
      '<div class="hist-footer">' +
        '<span class="hist-rate">' + matchRate + '% match rate</span>' +
        '<span class="hist-tol">Tolerance: KES ' + run.tolerance + '</span>' +
        '<button class="hist-load-btn" onclick="loadHistoryRun(' + i + ')">Load Results →</button>' +
      '</div>';
    container.appendChild(card);
  }
}

function loadHistoryRun(index) {
  var run = getHistory()[index];
  if (!run) return;
  allResults = run.results;
  document.getElementById("total-count").textContent         = run.total;
  document.getElementById("matched-count").textContent       = run.matched;
  document.getElementById("tolerance-count").textContent     = run.withinTol || 0;
  document.getElementById("mismatch-count").textContent      = run.mismatches;
  document.getElementById("missing-count").textContent       = run.missing;
  document.getElementById("unreconciled-amount").textContent = "KES " + run.unreconciled.toLocaleString();
  document.getElementById("status-text").textContent         = "Viewing historical run — " + run.dateStr;
  document.getElementById("audit-pill").textContent          = "Viewing: " + run.dateStr;
  var buttons = document.querySelectorAll(".filter-btn");
  for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove("active");
  document.getElementById("btn-all").classList.add("active");
  document.getElementById("empty-results").style.display   = "none";
  document.getElementById("results-content").style.display = "block";
  renderResults(allResults, "all");
  addAudit("Loaded historical run from " + run.dateStr + ".", "info");
  showTab("results");
}

// ══════════════════════════════════════
// ── CLAUDE AI ──
// ══════════════════════════════════════

function buildResultsSummary() {
  if (allResults.length === 0) return null;
  var mismatches = allResults.filter(function(r){ return r.type === "mismatch"; });
  var missing    = allResults.filter(function(r){ return r.type === "missing";  });
  var matched    = allResults.filter(function(r){ return r.type === "matched";  }).length;
  var tolerance  = allResults.filter(function(r){ return r.type === "tolerance"; }).length;
  var totalUnrecon = 0;
  for (var i = 0; i < allResults.length; i++) totalUnrecon += allResults[i].diff;
  var details = "";
  for (var j = 0; j < mismatches.length; j++) {
    var r = mismatches[j];
    details += "- " + r.id + ": Mobile KES " + r.mobileAmount + " vs Bank KES " + r.bankAmount + " (diff: KES " + r.diff + ", type: " + r.errorType + ")\n";
  }
  for (var k = 0; k < missing.length; k++) {
    details += "- " + missing[k].id + ": KES " + missing[k].mobileAmount + " — in mobile but missing from bank\n";
  }
  return {
    total: allResults.length, matched: matched,
    mismatches: mismatches.length, missing: missing.length,
    tolerance: tolerance, totalUnrecon: totalUnrecon, details: details
  };
}

async function callClaude(messages, system) {
  var body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: messages
  };
  if (system) body.system = system;
  var response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  var data = await response.json();
  return data.content[0].text;
}

async function runAIAnalysis() {
  var summary = buildResultsSummary();
  if (!summary) { alert("Run reconciliation first."); return; }
  var output = document.getElementById("ai-analysis-output");
  output.style.display = "block";
  output.innerHTML = '<div class="ai-loading">Claude is analysing your results...</div>';
  var prompt =
    "You are a fintech reconciliation analyst. Here are the results:\n\n" +
    "Total: " + summary.total + " | Matched: " + summary.matched +
    " | Mismatches: " + summary.mismatches + " | Missing: " + summary.missing +
    " | Within tolerance: " + summary.tolerance +
    " | Unreconciled: KES " + summary.totalUnrecon + "\n\n" +
    "Problem transactions:\n" + (summary.details || "None") + "\n\n" +
    "Give a clear, plain English analysis. Explain what likely went wrong, how serious the issues are, and what to prioritise. Max 150 words.";
  try {
    output.textContent = await callClaude([{ role: "user", content: prompt }]);
    addAudit("AI Analysis completed.", "success");
  } catch(e) {
    output.textContent = "Could not reach Claude API. Check your connection.";
  }
}

async function runFixSuggestions() {
  var summary = buildResultsSummary();
  if (!summary) { alert("Run reconciliation first."); return; }
  var output = document.getElementById("ai-fixes-output");
  output.style.display = "block";
  if (summary.mismatches === 0 && summary.missing === 0) {
    output.textContent = "✅ No mismatches or missing transactions — nothing to fix!";
    return;
  }
  output.innerHTML = '<div class="ai-loading">Claude is generating fix suggestions...</div>';
  var prompt =
    "You are a fintech reconciliation specialist. For each problem transaction below, give one specific, actionable fix in one sentence. Format: TXN00X: [action]\n\n" +
    "Problem transactions:\n" + summary.details;
  try {
    output.textContent = await callClaude([{ role: "user", content: prompt }]);
    addAudit("AI Fix Suggestions generated.", "success");
  } catch(e) {
    output.textContent = "Could not reach Claude API. Check your connection.";
  }
}

async function sendChatMessage() {
  var input   = document.getElementById("ai-chat-input");
  var message = input.value.trim();
  if (!message) return;
  input.value = "";
  addChatBubble("user", message);
  var summary = buildResultsSummary();
  var context = summary
    ? "Reconciliation context: " + summary.total + " transactions, " + summary.matched + " matched, " +
      summary.mismatches + " mismatches, " + summary.missing + " missing, KES " + summary.totalUnrecon + " unreconciled.\n" +
      "Problems:\n" + summary.details
    : "No reconciliation run yet.";
  chatHistory.push({ role: "user", content: context + "\n\nQuestion: " + message });
  var loadingId = "load-" + Date.now();
  var chatBox   = document.getElementById("ai-chat-messages");
  var loadingEl = document.createElement("div");
  loadingEl.id  = loadingId;
  loadingEl.innerHTML = '<div class="ai-loading">Claude is thinking...</div>';
  chatBox.appendChild(loadingEl);
  chatBox.scrollTop = chatBox.scrollHeight;
  try {
    var reply = await callClaude(
      chatHistory,
      "You are a fintech reconciliation assistant in the LT-Reconciliation platform. Help the user understand their results, explain discrepancies, and suggest next steps. Be concise and practical."
    );
    var el = document.getElementById(loadingId);
    if (el) el.remove();
    addChatBubble("claude", reply);
    chatHistory.push({ role: "assistant", content: reply });
    addAudit("AI Chat: answered.", "info");
  } catch(e) {
    var el2 = document.getElementById(loadingId);
    if (el2) el2.remove();
    addChatBubble("claude", "Sorry, could not reach Claude API. Check your connection.");
  }
}

function addChatBubble(role, text) {
  var chatBox = document.getElementById("ai-chat-messages");
  var msg     = document.createElement("div");
  msg.className = "chat-msg " + role;
  msg.innerHTML =
    '<div class="chat-msg-icon">' + (role === "user" ? "👤" : "🤖") + '</div>' +
    '<div class="chat-bubble">' + text + '</div>';
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ── START ──
init();