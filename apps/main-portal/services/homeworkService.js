const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '../../../data/homework.json');

function readHomework() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      writeHomework([]);
      return [];
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    return [];
  }
}

function writeHomework(homework) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(homework, null, 2), 'utf8');
}

function getHomeworkByTeam(teamId) {
  const all = readHomework();
  return all
    .filter(hw => hw.teamId === teamId && (!hw.status || hw.status === 'active'))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getHomeworkById(id) {
  const all = readHomework();
  return all.find(hw => hw.id === id) || null;
}

function createHomework(teamId, data) {
  const all = readHomework();
  const newHw = {
    id: crypto.randomUUID(),
    teamId,
    subject: data.subject,
    title: data.title,
    detail: data.detail || '',
    due: data.due || '',
    createdAt: new Date().toISOString(),
    createdBy: data.createdBy || 'unknown',
    status: data.status || 'active',
    submissions: {},
  };
  all.push(newHw);
  writeHomework(all);
  return newHw;
}

function getAllHomework() {
  return readHomework();
}

function getPendingByTeam(teamId) {
  const all = readHomework();
  return all
    .filter(hw => hw.teamId === teamId && hw.status === 'pending_approval')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function approveHomework(id) {
  const all = readHomework();
  const hw = all.find(h => h.id === id);
  if (!hw || hw.status !== 'pending_approval') return null;
  hw.status = 'active';
  hw.approvedAt = new Date().toISOString();
  writeHomework(all);
  return hw;
}

function rejectHomework(id, reason) {
  const all = readHomework();
  const hw = all.find(h => h.id === id);
  if (!hw || hw.status !== 'pending_approval') return null;
  hw.status = 'rejected';
  hw.rejectedAt = new Date().toISOString();
  hw.rejectReason = reason || '';
  writeHomework(all);
  return hw;
}

function updateHomework(id, data) {
  const all = readHomework();
  const index = all.findIndex(hw => hw.id === id);
  if (index === -1) return null;

  // Don't allow overwriting id, teamId, createdAt
  const { id: _id, teamId: _tid, createdAt: _ca, ...safeData } = data;
  all[index] = { ...all[index], ...safeData };
  writeHomework(all);
  return all[index];
}

function deleteHomework(id) {
  const all = readHomework();
  const index = all.findIndex(hw => hw.id === id);
  if (index === -1) return false;
  all.splice(index, 1);
  writeHomework(all);
  return true;
}

function markSubmission(homeworkId, studentName, submittedBy) {
  const all = readHomework();
  const hw = all.find(h => h.id === homeworkId);
  if (!hw) return null;

  if (!hw.submissions) hw.submissions = {};
  hw.submissions[studentName] = {
    submittedAt: new Date().toISOString(),
    submittedBy: submittedBy || 'unknown',
  };
  writeHomework(all);
  return hw;
}

function unmarkSubmission(homeworkId, studentName) {
  const all = readHomework();
  const hw = all.find(h => h.id === homeworkId);
  if (!hw) return null;

  if (hw.submissions && hw.submissions[studentName]) {
    delete hw.submissions[studentName];
  }
  writeHomework(all);
  return hw;
}

module.exports = {
  getHomeworkByTeam,
  getHomeworkById,
  getAllHomework,
  getPendingByTeam,
  createHomework,
  updateHomework,
  deleteHomework,
  approveHomework,
  rejectHomework,
  markSubmission,
  unmarkSubmission,
};
