function parseDateValue(input) {
  if (!input) {
    return null;
  }

  const directDate = new Date(input);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate;
  }

  const trimmed = String(input).trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  const hours = Number(match[4] || 0);
  const minutes = Number(match[5] || 0);

  if (year > 2400) {
    year -= 543;
  }

  const parsed = new Date(year, month - 1, day, hours, minutes);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatDueDate(dateString) {
  const date = parseDateValue(dateString);
  if (!date) {
    return dateString || "-";
  }

  const pad = (value) => String(value).padStart(2, "0");
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());

  return `${day}/${month}/${year} @ ${hour}:${minute}`;
}

function buildHomeworkMessage({ subject, title, detail, due }) {
  return [
    "การบ้านใหม่มาแล้ว!",
    "━━━━━━━━━━━━━━",
    `วิชา: ${subject || "-"}`,
    `หัวข้อ: ${title || "-"}`,
    `รายละเอียด: ${detail || "-"}`,
    `ส่งวันที่: ${formatDueDate(due)}`,
    "━━━━━━━━━━━━━━",
  ].join("\n");
}

function buildHomeworkFlexMessage(homework, submitUrl) {
  return {
    type: "flex",
    altText: `📢 การบ้านใหม่: ${homework.title}`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "📢 การบ้านใหม่!",
            weight: "bold",
            color: "#ffffff",
            size: "lg"
          }
        ],
        backgroundColor: "#22c55e",
        paddingTop: "12px",
        paddingBottom: "12px"
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "วิชา", color: "#aaaaaa", size: "sm", flex: 1 },
              { type: "text", text: homework.subject || "-", color: "#666666", size: "sm", flex: 3, wrap: true }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "หัวข้อ", color: "#aaaaaa", size: "sm", flex: 1 },
              { type: "text", text: homework.title || "-", color: "#111111", size: "sm", flex: 3, wrap: true, weight: "bold" }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "ส่งวันที่", color: "#aaaaaa", size: "sm", flex: 1 },
              { type: "text", text: formatDueDate(homework.due), color: "#eab308", size: "sm", flex: 3, wrap: true, weight: "bold" }
            ]
          },
          ...(homework.detail ? [{
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "รายละเอียด", color: "#aaaaaa", size: "sm", flex: 1 },
              { type: "text", text: homework.detail, color: "#666666", size: "sm", flex: 3, wrap: true }
            ]
          }] : [])
        ]
      },
      footer: submitUrl ? {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#22c55e",
            action: {
              type: "uri",
              label: "📎 ส่งงานที่นี่",
              uri: submitUrl
            }
          }
        ]
      } : undefined
    }
  };
}

function buildSubmissionSummary(homework, students) {
  // Extract student names from array of objects or strings (backward compatibility)
  const studentNames = students.map(s => typeof s === 'string' ? s : s.name);
  
  const submitted = Object.keys(homework.submissions || {});
  const notSubmitted = studentNames.filter(s => !submitted.includes(s));
  const total = studentNames.length;
  const doneCount = submitted.filter(s => studentNames.includes(s)).length;

  const lines = [
    `📊 สรุปการส่งงาน: ${homework.title}`,
    `วิชา: ${homework.subject || '-'}`,
    '━━━━━━━━━━━━━━',
  ];

  if (doneCount > 0) {
    lines.push(`✅ ส่งแล้ว (${doneCount}/${total}):`);
    const submittedInRoster = submitted.filter(s => studentNames.includes(s));
    lines.push(`   • ${submittedInRoster.join(', ')}`);
  } else {
    lines.push(`✅ ส่งแล้ว (0/${total}): -`);
  }

  if (notSubmitted.length > 0) {
    lines.push(`❌ ยังไม่ส่ง (${notSubmitted.length}/${total}):`);
    lines.push(`   • ${notSubmitted.join(', ')}`);
  } else {
    lines.push(`❌ ยังไม่ส่ง (0/${total}): ส่งครบทุกคนแล้ว! 🎉`);
  }

  lines.push(`⏰ กำหนดส่ง: ${formatDueDate(homework.due)}`);
  lines.push('━━━━━━━━━━━━━━');

  return lines.join('\n');
}

module.exports = {
  buildHomeworkMessage,
  buildHomeworkFlexMessage,
  buildSubmissionSummary,
  formatDueDate,
};
