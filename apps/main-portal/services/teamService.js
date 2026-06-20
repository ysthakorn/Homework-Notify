const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readEnv } = require('./envService'); // fallback to grab old .env config

const DATA_FILE = path.join(__dirname, '../../../data/teams.json');



function readTeams() {
  if (!fs.existsSync(DATA_FILE)) {
    // Migrate old .env to Default Team if data file doesn't exist
    const oldEnv = readEnv();
    const defaultTeam = {
      id: crypto.randomUUID(),
      name: 'Default Team',
      lineAccessToken: '', // Legacy string
      lineAccessTokens: oldEnv.LINE_ACCESS_TOKEN ? oldEnv.LINE_ACCESS_TOKEN.split(',').map(t => ({ token: t.trim(), remark: 'Migrated from .env' })).filter(x => x.token) : [],
      lineGroupId: oldEnv.LINE_GROUP_ID || '',

      owner: 'dev@localhost',
      members: [],
      students: [],
      googleFormUrl: '',
      googleFormEntryId: '',
      googleFormSubjectEntryId: '',
      googleSheetCsvUrl: '',
      codeRedEnabled: true
    };
    writeTeams([defaultTeam]);
    return [defaultTeam];
  }
  
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    let teams = JSON.parse(raw);
    
    let needsSave = false;
    teams.forEach(t => {
      // Migrate old lineAccessToken string to lineAccessTokens array
      if (typeof t.lineAccessToken === 'string' && !t.lineAccessTokens) {
        t.lineAccessTokens = t.lineAccessToken.split(',').map(tok => ({ token: tok.trim(), remark: '' })).filter(x => x.token);
        needsSave = true;
      }
      if (!t.lineAccessTokens) {
        t.lineAccessTokens = [];
        needsSave = true;
      }

      // Migrate old students array of strings to array of objects
      if (t.students && t.students.length > 0 && typeof t.students[0] === 'string') {
        t.students = t.students.map(name => ({ name, email: '' }));
        needsSave = true;
      }
      // Initialize new form fields if undefined
      if (t.googleFormUrl === undefined) {
        t.googleFormUrl = '';
        t.googleFormEntryId = '';
        t.googleFormSubjectEntryId = '';
        t.googleSheetCsvUrl = '';
        needsSave = true;
      } else if (t.googleFormSubjectEntryId === undefined) {
        t.googleFormSubjectEntryId = '';
        needsSave = true;
      }
      if (t.codeRedEnabled === undefined) {
        t.codeRedEnabled = true;
        needsSave = true;
      }
    });

    if (needsSave) {
      writeTeams(teams);
    }

    return teams;
  } catch (err) {
    return [];
  }
}

function writeTeams(teams) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(teams, null, 2), 'utf8');
}

function getAllTeams() {
  return readTeams();
}

function getTeamById(id) {
  const teams = readTeams();
  return teams.find(t => t.id === id) || null;
}

function createTeam(name, lineAccessTokens = [], lineGroupId = '', apiKey = '', ownerEmail = 'dev@localhost') {
  const teams = readTeams();

  // Backward compatibility: if a string is passed from older code
  if (typeof lineAccessTokens === 'string') {
    lineAccessTokens = lineAccessTokens ? lineAccessTokens.split(',').map(tok => ({ token: tok.trim(), remark: '' })).filter(x => x.token) : [];
  }

  const newTeam = {
    id: crypto.randomUUID(),
    name,
    lineAccessToken: '',
    lineAccessTokens,
    lineGroupId,
    apiKey: apiKey || `hw_${crypto.randomBytes(16).toString('hex')}`,
    owner: ownerEmail,
    members: [],
    students: [],
    googleFormUrl: '',
    googleFormEntryId: '',
    googleFormSubjectEntryId: '',
    googleSheetCsvUrl: '',
    codeRedEnabled: true
  };
  teams.push(newTeam);
  writeTeams(teams);
  return newTeam;
}

function updateTeam(id, data) {
  const teams = readTeams();
  const index = teams.findIndex(t => t.id === id);
  if (index !== -1) {

    teams[index] = { ...teams[index], ...data };
    writeTeams(teams);
    return teams[index];
  }
  return null;
}

function deleteTeam(id) {
  let teams = readTeams();
  if (teams.length <= 1) {
    throw new Error('Cannot delete the last remaining team.');
  }
  const index = teams.findIndex(t => t.id === id);
  if (index !== -1) {
    teams.splice(index, 1);
    writeTeams(teams);
    return true;
  }
  return false;
}

module.exports = {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam
};
