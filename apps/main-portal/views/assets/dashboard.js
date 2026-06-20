let teamStudents = [];
let teamName = '';
let currentPeriod = 'daily';
let chartInstance = null;

async function requestJson(url, options = {}) {
  const res = await (window.teamFetch ? window.teamFetch(url, options) : fetch(url, options));
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'request_failed');
  }
  return body;
}

async function loadDashboardData() {
  const teamId = localStorage.getItem('activeTeamId');
  if (!teamId) return;

  try {
    // 1. Fetch homework
    const hwData = await requestJson(`/api/homework?teamId=${teamId}`);
    allHomework = hwData.homework || [];

    // 2. Fetch students
    const teamData = await requestJson(`/api/teams/${teamId}`);
    teamStudents = teamData.team.students || [];
    teamName = teamData.team.name || 'Team';

    renderDashboard();
  } catch (err) {
    console.error('Failed to load dashboard data', err);
  }
}

function filterHomeworkByPeriod(hwList, period) {
  const now = new Date();

  return hwList.filter(hw => {
    const d = new Date(hw.createdAt);
    if (isNaN(d.getTime())) return false;

    if (period === 'daily') {
      return d.toDateString() === now.toDateString();
    }
    if (period === 'weekly') {
      const diffTime = Math.abs(now - d);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }
    if (period === 'monthly') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (period === 'yearly') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

function renderDashboard() {
  const filteredHw = filterHomeworkByPeriod(allHomework, currentPeriod);

  const studentNames = teamStudents.map(s => typeof s === 'string' ? s : s.name);
  const totalStudents = studentNames.length;

  // 1. Top Stats
  const totalHomework = filteredHw.length;
  let totalExpectedSubmissions = totalHomework * totalStudents;
  let actualSubmissions = 0;

  // Track stats by student
  const studentStats = {};
  studentNames.forEach(s => {
    studentStats[s] = { submitted: 0, missing: 0 };
  });

  // Track stats for the chart
  const chartLabels = [];
  const chartSubmitted = [];
  const chartMissing = [];

  filteredHw.forEach(hw => {
    const submissions = hw.submissions || {};
    let hwSubCount = 0;

    studentNames.forEach(student => {
      if (submissions[student]) {
        actualSubmissions++;
        hwSubCount++;
        studentStats[student].submitted++;
      } else {
        studentStats[student].missing++;
      }
    });

    chartLabels.push(hw.title || 'Untitled');
    chartSubmitted.push(hwSubCount);
    chartMissing.push(totalStudents - hwSubCount);
  });

  const totalMissing = totalExpectedSubmissions - actualSubmissions;
  const subRate = totalExpectedSubmissions > 0
    ? Math.round((actualSubmissions / totalExpectedSubmissions) * 100)
    : 0;

  document.getElementById('statAssigned').textContent = totalHomework;
  document.getElementById('statSubmissionRate').textContent = `${subRate}%`;
  document.getElementById('statMissing').textContent = totalMissing;

  // 2. Render Chart
  renderChart(chartLabels, chartSubmitted, chartMissing);

  // 3. Render Student Table
  renderStudentTable(studentStats, totalHomework);
}

function renderChart(labels, submittedData, missingData) {
  const ctx = document.getElementById('hwChart').getContext('2d');

  if (chartInstance) {
    chartInstance.destroy();
  }

  if (labels.length === 0) {
    // Show empty state placeholder if no homework
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: { labels: ['ไม่มีการบ้าน'], datasets: [{ label: 'Empty', data: [0] }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
    return;
  }

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'ส่งแล้ว (Submitted)',
          data: submittedData,
          backgroundColor: '#22c55e', // Green
        },
        {
          label: 'ยังไม่ส่ง (Missing)',
          data: missingData,
          backgroundColor: '#ef4444', // Red
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
      },
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function renderStudentTable(studentStats, totalHomework) {
  const tbody = document.getElementById('studentTableBody');
  const students = Object.keys(studentStats);

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="muted" style="padding:12px;">ไม่มีรายชื่อนักเรียนในทีม</td></tr>';
    return;
  }

  // Sort by missing descending, then name ascending
  const sortedStudents = students.sort((a, b) => {
    if (studentStats[b].missing !== studentStats[a].missing) {
      return studentStats[b].missing - studentStats[a].missing;
    }
    return a.localeCompare(b);
  });

  tbody.innerHTML = sortedStudents.map((s, idx) => {
    const st = studentStats[s];
    const isPerfect = st.missing === 0 && totalHomework > 0;
    const isCritical = st.missing === totalHomework && totalHomework > 0;

    let statusHtml = '-';
    if (totalHomework === 0) {
      statusHtml = '<span class="tag muted">N/A</span>';
    } else if (isPerfect) {
      statusHtml = '<span class="tag" style="background:#dcfce7; color:#166534;">ส่งครบ 🎉</span>';
    } else if (isCritical) {
      statusHtml = '<span class="tag" style="background:#fee2e2; color:#991b1b;">ค้างทุกงาน 🚨</span>';
    } else {
      statusHtml = '<span class="tag" style="background:#fef3c7; color:#92400e;">ต้องตามงาน</span>';
    }

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding:12px;">${idx + 1}</td>
        <td style="padding:12px; font-weight:500;">${s}</td>
        <td style="padding:12px; color:var(--success); font-weight:600;">${st.submitted}</td>
        <td style="padding:12px; color:var(--danger); font-weight:600;">${st.missing}</td>
        <td style="padding:12px;">${statusHtml}</td>
      </tr>
    `;
  }).join('');
}

// Formal Report Generation


// Event Listeners for Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('is-active'));
    e.target.classList.add('is-active');
    currentPeriod = e.target.dataset.period;
    renderDashboard();
  });
});

window.addEventListener('teamChanged', loadDashboardData);
document.addEventListener('DOMContentLoaded', loadDashboardData);
