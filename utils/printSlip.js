// utils/printSlip.js
// Simple utility to print a fee receipt for a student.
// Usage: printFeeSlip({ student, month, monthTotals, latestPayment })

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

function generateReceiptNo(studentId) {
  const now = new Date();
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const rand = Math.floor(1000 + Math.random() * 9000); // 4 digits
  return `MF${y}${m}${d}-${rand}`;
}

export function printFeeSlip({ student, month, monthTotals, latestPayment }) {
  if (!student) {
    alert("No student data");
    return;
  }

  const w = window.open("", "_blank", "width=720,height=900");
  if (!w) {
    alert("Please allow pop-ups for this site to print receipts.");
    return;
  }

  const receiptNo = generateReceiptNo(student.id);
  const now = new Date();

  const dateStr = latestPayment?.paidDate || `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const timeStr = formatTime(latestPayment?.paidAt || now);

  const fee = monthTotals?.fee ?? 0;
  const paid = monthTotals?.paid ?? 0;
  const pending = monthTotals?.pending ?? 0;
  const amountPaid = latestPayment?.amount ?? paid;
  const status = pending <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID";
  const statusIcon = status === "PAID" ? "✅" : status === "PARTIAL" ? "⚠️" : "❌";

  w.document.write(`
    <html>
      <head>
        <title>Fee Receipt — ${student.name}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            padding: 24px;
            color: #111;
            max-width: 640px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 2px double #333;
            padding-bottom: 10px;
            margin-bottom: 16px;
          }
          .school {
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 1px;
          }
          .title {
            font-size: 14px;
            margin-top: 4px;
            color: #444;
          }
          .meta {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin-bottom: 16px;
          }
          .meta div { line-height: 1.6; }
          .section {
            border-top: 1px dashed #999;
            border-bottom: 1px dashed #999;
            padding: 10px 0;
            margin: 12px 0;
            font-size: 13px;
          }
          .section p {
            margin: 4px 0;
            display: flex;
            justify-content: space-between;
          }
          .big {
            font-size: 15px;
            font-weight: bold;
          }
          .status {
            text-align: center;
            padding: 8px;
            margin: 12px 0;
            border: 2px solid #333;
            font-weight: bold;
            font-size: 14px;
            letter-spacing: 2px;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            font-size: 12px;
          }
          .signatures div {
            width: 45%;
            border-top: 1px solid #333;
            padding-top: 4px;
            text-align: center;
          }
          .footer {
            text-align: center;
            font-size: 11px;
            color: #666;
            margin-top: 20px;
            border-top: 1px dashed #999;
            padding-top: 8px;
          }
          @media print {
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school">GOVT: SUPERIOR SCIENCE COLLEGE PESHAWAR</div>
          <div class="title">— FEE PAYMENT RECEIPT —</div>
        </div>

        <div class="meta">
          <div>
            <b>Receipt No:</b> ${receiptNo}<br/>
            <b>Date:</b> ${dateStr}<br/>
            <b>Time:</b> ${timeStr}
          </div>
          <div style="text-align:right">
            <b>Student ID:</b> ${student.id ?? "—"}<br/>
            <b>Session:</b> ${student.session || "—"}
          </div>
        </div>

        <div class="section">
          <p><span>Student:</span> <b>${student.name || "—"}</b></p>
          <p><span>Father:</span> <b>${student.fatherName || "—"}</b></p>
          <p><span>Class:</span> <b>${student.grade || "—"} ${student.section ? "- " + student.section : ""}</b></p>
          <p><span>Roll No:</span> <b>${student.rollNo ?? "—"}</b></p>
          <p><span>Admission No:</span> <b>${student.admissionNo || "—"}</b></p>
        </div>

        <div class="section">
          <p><span>Month Paid:</span> <b>${month || "—"}</b></p>
          <p><span>Monthly Fee:</span> <b>Rs. ${fee}</b></p>
          <p class="big"><span>Amount Paid:</span> <b>Rs. ${amountPaid}</b></p>
          <p><span>Total Paid (month):</span> <b>Rs. ${paid}</b></p>
          <p><span>Remaining (month):</span> <b>Rs. ${pending}</b></p>
        </div>

        <div class="status">
          ${statusIcon} ${status}
        </div>

        <div class="signatures">
          <div>Operator Signature</div>
          <div>Parent Signature</div>
        </div>

        <div class="footer">
          Thank you — please keep this receipt safe.<br/>
          Computer-generated receipt · Student Academic Performance System
        </div>

        <script>
          window.onload = () => { window.print(); };
        </script>
      </body>
    </html>
  `);
  w.document.close();
}