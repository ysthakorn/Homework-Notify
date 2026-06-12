const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readEnv } = require('./envService'); // fallback to grab old .env config

const DATA_FILE = path.join(__dirname, '../../data/teams.json');

function extractSheetId(input) {
  if (!input) return '';
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return input.trim();
}

function readTeams() {
  if (!fs.existsSync(DATA_FILE)) {
    // Migrate old .env to Default Team if data file doesn't exist
    const oldEnv = readEnv();
    const defaultTeam = {
      id: crypto.randomUUID(),
      name: 'Default Team',
      lineAccessToken: oldEnv.LINE_ACCESS_TOKEN || '',
      lineGroupId: oldEnv.LINE_GROUP_ID || '',
      googleSheetCsvUrl: oldEnv.GOOGLE_SHEET_CSV_URL || '',
      owner: 'dev@localhost',
      members: []
    };
    writeTeams([defaultTeam]);
    return [defaultTeam];
  }
  
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    let teams = JSON.parse(raw);
    let migrated = false;
    teams = teams.map(t => {
      if (t.googleSheetCsvUrl !== undefined) {
        t.googleSheetId = extractSheetId(t.googleSheetCsvUrl);
        delete t.googleSheetCsvUrl;
        migrated = true;
      }
      return t;
    });
    if (migrated) writeTeams(teams);
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

function createTeam(name, lineAccessToken = '', lineGroupId = '', googleSheetId = '', apiKey = '', ownerEmail = 'dev@localhost') {
  const teams = readTeams();
  const newTeam = {
    id: crypto.randomUUID(),
    name,
    lineAccessToken,
    lineGroupId,
    googleSheetId: extractSheetId(googleSheetId),
    apiKey: apiKey || `hw_${crypto.randomBytes(16).toString('hex')}`,
    owner: ownerEmail,
    members: []
  };
  teams.push(newTeam);
  writeTeams(teams);
  return newTeam;
}

function updateTeam(id, data) {
  const teams = readTeams();
  const index = teams.findIndex(t => t.id === id);
  if (index !== -1) {
    if (data.googleSheetId !== undefined) {
      data.googleSheetId = extractSheetId(data.googleSheetId);
    }
    // Also handle if frontend still sends googleSheetCsvUrl
    if (data.googleSheetCsvUrl !== undefined) {
      data.googleSheetId = extractSheetId(data.googleSheetCsvUrl);
      delete data.googleSheetCsvUrl;
    }
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
