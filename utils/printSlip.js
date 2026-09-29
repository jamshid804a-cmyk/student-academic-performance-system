// utils/printSlip.js
// Simple utility to print a fee receipt for a student.
// Usage: printFeeSlip({ student, month, monthTotals, previousMonths, latestPayment })

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatTime(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  let h = d.getHours();
  const m = pad(d.getMinutes());
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${pad(h)}:${m} ${ampm}`;
}

function generateReceiptNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MF${y}${m}${d}-${rand}`;
}

export function printFeeSlip({ student, month, monthTotals, previousMonths, latestPayment }) {
  if (!student) {
    alert("No student data");
    return;
  }

  const w = window.open("", "_blank", "width=420,height=900");
  if (!w) {
    alert("Please allow pop-ups for this site to print receipts.");
    return;
  }

  const receiptNo = generateReceiptNo();
  const now = new Date();

  const dateStr = latestPayment?.paidDate || `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const timeStr = formatTime(latestPayment?.paidAt || now);

  const fee = monthTotals?.fee ?? 0;
  const paid = monthTotals?.paid ?? 0;
  const pending = monthTotals?.pending ?? 0;
  const amountPaid = latestPayment?.amount ?? paid;

  const status = pending <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID";
  const statusIcon = status === "PAID" ? "✅" : status === "PARTIAL" ? "⚠️" : "❌";

  const prevList = Array.isArray(previousMonths) ? previousMonths : [];
  const prevTotalShort = prevList.reduce((sum, m) => sum + (Number(m.short) || 0), 0);
  const grandRemaining = prevTotalShort + pending;

  const prevHtml = prevList.length === 0
    ? `<div class="none-row">Previous Balance: <b style="color:#16a34a">None ✅</b></div>`
    : `
      <div class="prev-title">Previous Balance:</div>
      ${prevList.map((m) => `
        <div class="prev-row">
          <span class="prev-month">${m.label}</span>
          <span class="prev-detail">Paid Rs. ${m.paid} · Short <b style="color:#b91c1c">Rs. ${m.short}</b></span>
        </div>
      `).join("")}
      <div class="prev-total">
        Previous Total Short: <b style="color:#b91c1c">Rs. ${prevTotalShort}</b>
      </div>
    `;

  w.document.write(`
    <html>
      <head>
        <title>Fee Receipt — ${student.name}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: #111;
            max-width: 320px;
            margin: 0 auto;
            padding: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #333;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .school {
            font-size: 12px;
            font-weight: bold;
            letter-spacing: 0.5px;
          }
          .title {
            font-size: 10px;
            margin-top: 2px;
            color: #555;
            letter-spacing: 1px;
          }
          .meta {
            font-size: 10px;
            line-height: 1.5;
            margin-bottom: 8px;
          }
          .meta span {
            display: flex;
            justify-content: space-between;
          }
          .section {
            border-top: 1px dashed #999;
            border-bottom: 1px dashed #999;
            padding: 6px 0;
            margin: 6px 0;
            font-size: 11px;
          }
          .section span {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
          }
          .big {
            font-weight: bold;
            font-size: 12px;
          }
          .prev-section {
            border-top: 1px dashed #999;
            border-bottom: 1px dashed #999;
            padding: 6px 0;
            margin: 6px 0;
            font-size: 10px;
          }
          .prev-title {
            font-weight: bold;
            margin-bottom: 4px;
            color: #92400e;
          }
          .prev-row {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
            font-size: 10px;
          }
          .prev-month {
            font-weight: bold;
            color: #444;
            width: 40%;
          }
          .prev-detail {
            width: 60%;
            text-align: right;
          }
          .prev-total {
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px dotted #999;
            font-weight: bold;
            text-align: right;
            font-size: 10.5px;
          }
          .none-row {
            font-size: 10.5px;
            padding: 2px 0;
          }
          .status {
            text-align: center;
            padding: 5px;
            margin: 8px 0;
            border: 1.5px solid #333;
            font-weight: bold;
            font-size: 11px;
            letter-spacing: 2px;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            font-size: 9px;
          }
          .signatures div {
            width: 45%;
            border-top: 1px solid #333;
            padding-top: 3px;
            text-align: center;
          }
          .footer {
            text-align: center;
            font-size: 9px;
            color: #666;
            margin-top: 12px;
            border-top: 1px dashed #999;
            padding-top: 6px;
          }
          @media print {
            body { padding: 5px; }
            @page { margin: 8mm; size: 80mm auto; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school">SUPERIOR SCIENCE COLLEGE</div>
          <div class="school">PESHAWAR</div>
          <div class="title">— FEE RECEIPT —</div>
        </div>

        <div class="meta">
          <span><b>Receipt No:</b> ${receiptNo}</span>
          <span><b>Date:</b> ${dateStr}</span>
          <span><b>Time:</b> ${timeStr}</span>
        </div>

        <div class="section">
          <span>Student: <b>${student.name || "—"}</b></span>
          <span>Father: <b>${student.fatherName || "—"}</b></span>
          <span>Class: <b>${student.grade || "—"}${student.section ? " - " + student.section : ""}</b></span>
          <span>Roll No: <b>${student.rollNo ?? "—"}</b></span>
          <span>Session: <b>${student.session || "—"}</b></span>
        </div>

        <div class="section">
          <span>Month: <b>${month || "—"}</b></span>
          <span>Monthly Fee: <b>Rs. ${fee}</b></span>
          <span class="big">Amount Paid: <b>Rs. ${amountPaid}</b></span>
          <span>This Month Pending: <b style="color:#b91c1c">Rs. ${pending}</b></span>
        </div>

        <div class="prev-section">
          ${prevHtml}
        </div>

        ${prevTotalShort > 0 ? `
        <div class="prev-total" style="font-size:11.5px; margin: 6px 0;">
          <span style="display:flex; justify-content:space-between;">
            <span>Total Outstanding:</span>
            <b style="color:#b91c1c">Rs. ${grandRemaining}</b>
          </span>
        </div>` : ""}

        <div class="status">
          ${statusIcon} ${status}
        </div>

        <div class="signatures">
          <div>Operator</div>
          <div>Parent</div>
        </div>

        <div class="footer">
          Thank you — please keep this receipt.
        </div>

        <script>
          window.onload = () => { window.print(); };
        </script>
      </body>
    </html>
  `);
  w.document.close();
}