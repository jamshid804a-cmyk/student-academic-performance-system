// utils/academyPrintSlip.js
function pad(n) { return String(n).padStart(2, "0"); }

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
  return `AF${y}${m}${d}-${rand}`;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function printAcademyFeeSlip({
  student,
  month,
  monthTotals,
  previousMonths,
  latestPayment,
  schoolInfo,
}) {
  if (!student) { alert("No student data"); return; }

  const w = window.open("", "_blank", "width=420,height=900");
  if (!w) { alert("Please allow pop-ups."); return; }

  const schoolName = escapeHtml(schoolInfo?.name || "ACADEMY NAME");
  const schoolAddress = escapeHtml(schoolInfo?.address || "");

  const receiptNo = generateReceiptNo();
  const now = new Date();
  const dateStr = latestPayment?.paidDate || `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const timeStr = formatTime(latestPayment?.paidAt || now);

  const fee = monthTotals?.fee ?? 0;
  const paid = monthTotals?.paid ?? 0;
  const pending = monthTotals?.pending ?? 0;
  const amountPaid = latestPayment?.amount ?? paid;

  const status = pending <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID";
  const statusIcon = status === "PAID" ? "✓" : status === "PARTIAL" ? "⏳" : "✗";

  const prevRows = (previousMonths || []).map((m) => `
    <tr>
      <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(m.label)}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">Rs. ${m.paid}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#dc2626;font-weight:600;">Rs. ${m.short}</td>
    </tr>
  `).join("")

  w.document.write(`
    <html>
    <head>
      <title>Academy Fee Receipt — ${escapeHtml(student.name)}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #111; background: #fff; }
        .receipt { max-width: 380px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #9333ea, #c026d3); color: white; padding: 20px; text-align: center; }
        .header h1 { font-size: 18px; margin-bottom: 4px; }
        .header p { font-size: 11px; opacity: 0.9; }
        .receipt-no { background: #faf5ff; padding: 8px 16px; font-size: 11px; display: flex; justify-content: space-between; border-bottom: 1px dashed #e9d5ff; }
        .body { padding: 16px; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
        .row .label { color: #64748b; }
        .row .value { font-weight: 600; color: #1e293b; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9333ea; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #e9d5ff; }
        .amount-box { background: linear-gradient(135deg, #faf5ff, #fdf4ff); padding: 14px; border-radius: 8px; margin: 12px 0; border: 1px solid #e9d5ff; }
        .amount-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
        .amount-row.total { border-top: 1px solid #d8b4fe; margin-top: 6px; padding-top: 8px; font-weight: 700; font-size: 15px; }
        .status { text-align: center; padding: 10px; border-radius: 8px; font-weight: 700; font-size: 13px; margin: 12px 0; }
        .status.paid { background: #dcfce7; color: #166534; }
        .status.partial { background: #fef3c7; color: #92400e; }
        .status.unpaid { background: #fee2e2; color: #991b1b; }
        table.prev { width: 100%; border-collapse: collapse; font-size: 11px; }
        table.prev th { text-align: left; padding: 6px 8px; background: #faf5ff; color: #7e22ce; font-size: 10px; text-transform: uppercase; }
        .footer { text-align: center; font-size: 10px; color: #94a3b8; padding: 12px; border-top: 1px dashed #e5e7eb; margin-top: 12px; }
        @media print { body { padding: 0; } .receipt { border: none; } }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <h1>${schoolName}</h1>
          ${schoolAddress ? `<p>${schoolAddress}</p>` : ""}
          <p style="margin-top:6px;">ACADEMY FEE RECEIPT</p>
        </div>

        <div class="receipt-no">
          <span>Receipt: <b>${receiptNo}</b></span>
          <span>${dateStr} · ${timeStr}</span>
        </div>

        <div class="body">
          <div class="row"><span class="label">Student</span><span class="value">${escapeHtml(student.name)}</span></div>
          ${student.rollNo ? `<div class="row"><span class="label">Roll No</span><span class="value">${escapeHtml(student.rollNo)}</span></div>` : ""}
          ${student.subject ? `<div class="row"><span class="label">Course</span><span class="value">${escapeHtml(student.subject)}</span></div>` : ""}
          ${student.section ? `<div class="row"><span class="label">Section</span><span class="value">${escapeHtml(student.section)}</span></div>` : ""}
          ${student.year ? `<div class="row"><span class="label">Year</span><span class="value">${escapeHtml(student.year)}</span></div>` : ""}
          <div class="row"><span class="label">Month</span><span class="value">${escapeHtml(month || "")}</span></div>

          <div class="amount-box">
            <div class="amount-row"><span class="label">Monthly Fee</span><span class="value">Rs. ${fee}</span></div>
            <div class="amount-row"><span class="label">Paid this month</span><span class="value" style="color:#059669;">Rs. ${paid}</span></div>
            <div class="amount-row total"><span>Pending</span><span style="color:${pending > 0 ? '#dc2626' : '#059669'};">Rs. ${pending}</span></div>
          </div>

          <div class="status ${status.toLowerCase()}">
            ${statusIcon} ${status}
          </div>

          ${prevRows ? `
            <div class="section-title">Previous Dues</div>
            <table class="prev">
              <thead>
                <tr><th>Month</th><th style="text-align:right;">Paid</th><th style="text-align:right;">Pending</th></tr>
              </thead>
              <tbody>${prevRows}</tbody>
            </table>
          ` : ""}

          <div class="footer">
            This is a computer-generated receipt.<br/>
            Thank you for your payment.
          </div>
        </div>
      </div>
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `)
  w.document.close()
}