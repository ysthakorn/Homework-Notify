const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readEnv } = require('./envService'); // fallback to grab old .env config

const DATA_FILE = path.join(__dirname, '../../data/teams.json');

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
    return JSON.parse(raw);
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

function createTeam(name, lineAccessToken = '', lineGroupId = '', googleSheetCsvUrl = '', password = '', ownerEmail = 'dev@localhost') {
  const teams = readTeams();
  const newTeam = {
    id: crypto.randomUUID(),
    name,
    lineAccessToken,
    lineGroupId,
    googleSheetCsvUrl,
    password,
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
  if (index === -1) return null;
  
  teams[index] = { ...teams[index], ...data, id }; // Ensure ID can't be changed
  writeTeams(teams);
  return teams[index];
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
