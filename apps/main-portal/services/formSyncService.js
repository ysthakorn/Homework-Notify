const axios = require('axios');
const { parse } = require('csv-parse/sync');
const teamService = require('./teamService');
const homeworkService = require('./homeworkService');

async function syncTeamHomeworks(teamId) {
  const team = teamService.getTeamById(teamId);
  if (!team || !team.googleSheetCsvUrl) {
    throw new Error('Google Sheet CSV URL is not configured for this team.');
  }

  let response;
  try {
    response = await axios.get(team.googleSheetCsvUrl);
  } catch (err) {
    throw new Error('Failed to fetch CSV from Google Sheet. Please check the URL and ensure it is Published to web.');
  }

  const csvData = response.data;
  let records;
  try {
    records = parse(csvData, { columns: true, skip_empty_lines: true });
  } catch (err) {
    throw new Error('Failed to parse CSV data.');
  }
  
  const allHw = homeworkService.getHomeworkByTeam(teamId);
  const students = team.students || [];

  let syncedCount = 0;

  for (const record of records) {
    const values = Object.values(record).map(v => String(v).trim());
    
    // Find email in values
    const emailValue = values.find(v => v.includes('@'));
    if (!emailValue) continue;

    // Match student by email
    const student = students.find(s => s.email && s.email.toLowerCase() === emailValue.toLowerCase());
    if (!student) continue;

    // Find if any value matches a homework title
    const hwMatch = allHw.find(hw => values.includes(hw.title));
    if (!hwMatch) continue;

    // We have a match!
    if (!hwMatch.submissions) hwMatch.submissions = {};
    
    // Extract timestamp from record if possible, else now
    const timestampVal = values.find(v => v.match(/\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/));
    
    const currentSub = hwMatch.submissions[student.name];
    if (!currentSub) {
      let parsedTime = new Date();
      if (timestampVal) {
        const d = new Date(timestampVal);
        if (!isNaN(d.getTime())) parsedTime = d;
      }

      hwMatch.submissions[student.name] = {
        submittedAt: parsedTime.toISOString(),
        submittedBy: 'auto-sync'
      };
      
      // Update this homework
      homeworkService.updateHomework(hwMatch.id, { submissions: hwMatch.submissions });
      syncedCount++;
    }
  }

  return syncedCount;
}

module.exports = {
  syncTeamHomeworks
};
