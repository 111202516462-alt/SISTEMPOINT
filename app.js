
const placementPoints = {
1:20, 2:17, 3:15, 4:13, 5:12, 6:10,
7:6, 8:4, 9:3, 10:2, 11:1, 12:0
};

const storageKey = "arpa_udinus_5_match";
let teams = [];
let serverAvailable = false;
let saveTimer;

const matchBodies = [1,2,3,4,5].map(n =>
document.getElementById("match" + n + "Body")
);

const totalBody = document.getElementById("totalBody");
const leaderboardBody = document.getElementById("leaderboardBody");
const saveStatus = document.getElementById("saveStatus");

function escapeHtml(value) {
return String(value)
.replaceAll("&","&amp;")
.replaceAll("<","&lt;")
.replaceAll(">","&gt;")
.replaceAll('"',"&quot;")
.replaceAll("'","&#039;");
}

function createTeam(name) {
return {
id:Date.now() + Math.random(),
name:name,
matches:Array.from({length:5},() => ({
placement:12,
kills:0
}))
};
}

function normalizeTeams(data) {
return data.map((team,index) => ({
id:team.id || Date.now() + Math.random() + index,
name:String(team.name || "TEAM " + (index+1)),
matches:Array.from({length:5},(_,i) => ({
placement:Math.min(12,Math.max(1,Number(team.matches?.[i]?.placement) || 12)),
kills:Math.max(0,Number(team.matches?.[i]?.kills) || 0)
}))
}));
}

function score(match) {
const placement = Math.min(12,Math.max(1,Number(match.placement) || 12));
const kills = Math.max(0,Number(match.kills) || 0);
const placementPoint = placementPoints[placement];
const killPoint = kills * 2;

return {
placement,
kills,
placementPoint,
killPoint,
total:placementPoint + killPoint
};
}

function calculatedTeams() {
return teams.map(team => {
const matches = team.matches.map(score);
const totalPlacement = matches.reduce((sum,m) => sum + m.placementPoint,0);
const totalKills = matches.reduce((sum,m) => sum + m.kills,0);
const totalPoint = matches.reduce((sum,m) => sum + m.total,0);

return {...team,calculatedMatches:matches,totalPlacement,totalKills,totalPoint};
}).sort((a,b) => b.totalPoint-a.totalPoint || b.totalKills-a.totalKills);
}

async function loadTeams() {
try {
const response = await fetch("/api/teams");
if (!response.ok) throw new Error("Server error");

const data = await response.json();
teams = Array.isArray(data) ? normalizeTeams(data) : [];

if (!teams.length) {
teams = Array.from({length:12},(_,i) => createTeam("TEAM " + (i+1)));
}

serverAvailable = true;
saveStatus.textContent = "Terhubung ke server.";
render(false);

if (!data.length) await saveTeams();
} catch(error) {
serverAvailable = false;

try {
const saved = localStorage.getItem(storageKey);
teams = saved ? normalizeTeams(JSON.parse(saved)) : [];
} catch(e) {
teams = [];
}

if (!teams.length) {
teams = Array.from({length:12},(_,i) => createTeam("TEAM " + (i+1)));
}

saveStatus.textContent = "Server tidak tersambung. Menggunakan penyimpanan browser.";
render(false);
}
}

async function saveTeams() {
try {
localStorage.setItem(storageKey,JSON.stringify(teams));
} catch(error) {}

if (!serverAvailable) return;

saveStatus.textContent = "Menyimpan data...";

try {
const response = await fetch("/api/teams",{
method:"PUT",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(teams)
});

if (!response.ok) throw new Error("Gagal menyimpan");
saveStatus.textContent = "Data berhasil disimpan di server.";
} catch(error) {
serverAvailable = false;
saveStatus.textContent = "Server terputus. Data sementara tersimpan di browser.";
}
}

function scheduleSave() {
clearTimeout(saveTimer);
saveTimer = setTimeout(saveTeams,300);
}

function render(save = true) {
renderMatches();
renderTotal();
if (save) scheduleSave();
}

function renderMatches() {
matchBodies.forEach((body,matchIndex) => {
body.innerHTML = "";

teams.forEach((team,teamIndex) => {
const result = score(team.matches[matchIndex]);
const row = document.createElement("tr");

row.innerHTML = `
<td>${teamIndex+1}</td>
<td><input class="team-name" value="${escapeHtml(team.name)}" data-team="${team.id}"></td>
<td><input class="number-input placement-input" type="number" min="1" max="12" value="${result.placement}" data-team="${team.id}" data-match="${matchIndex}"></td>
<td><input class="number-input kill-input" type="number" min="0" value="${result.kills}" data-team="${team.id}" data-match="${matchIndex}"></td>
<td class="point-value">${result.placementPoint}</td>
<td class="point-value">${result.killPoint}</td>
<td class="total-value">${result.total}</td>
<td><button class="remove-team" data-remove="${team.id}">×</button></td>
`;

body.appendChild(row);
});
});

attachEvents();
}

function renderTotal() {
totalBody.innerHTML = "";

calculatedTeams().forEach((team,index) => {
const row = document.createElement("tr");

row.innerHTML = `
<td class="rank-number">${index+1}</td>
<td>${escapeHtml(team.name)}</td>
${team.calculatedMatches.map(match => `<td>${match.total}</td>`).join("")}
<td>${team.totalPlacement}</td>
<td>${team.totalKills*2}</td>
<td class="grand-total">${team.totalPoint}</td>
`;

totalBody.appendChild(row);
});
}

function attachEvents() {
document.querySelectorAll(".team-name").forEach(input => {
input.addEventListener("input",() => {
const team = teams.find(item => String(item.id) === input.dataset.team);
if (!team) return;
team.name = input.value;
renderTotal();
scheduleSave();
});
});

document.querySelectorAll(".placement-input").forEach(input => {
input.addEventListener("change",() => {
const team = teams.find(item => String(item.id) === input.dataset.team);
if (!team) return;

let value = Number(input.value);
if (!value || value < 1) value = 1;
if (value > 12) value = 12;

team.matches[Number(input.dataset.match)].placement = value;
render();
});
});

document.querySelectorAll(".kill-input").forEach(input => {
input.addEventListener("change",() => {
const team = teams.find(item => String(item.id) === input.dataset.team);
if (!team) return;

team.matches[Number(input.dataset.match)].kills = Math.max(0,Number(input.value) || 0);
render();
});
});

document.querySelectorAll(".remove-team").forEach(button => {
button.addEventListener("click",() => {
teams = teams.filter(team => String(team.id) !== button.dataset.remove);
render();
});
});
}

function renderLeaderboard(result) {
leaderboardBody.innerHTML = "";

if (!result.length) {
leaderboardBody.innerHTML = '<div class="empty">Belum ada data tim.</div>';
return;
}

result.forEach((team,index) => {
const row = document.createElement("div");
row.className = "leaderboard-row";

row.innerHTML = `
<div class="leaderboard-rank">${index+1}</div>
<div class="leaderboard-team">${escapeHtml(team.name)}</div>
<div class="leaderboard-kills">${team.totalKills} KILLS</div>
<div class="leaderboard-points">${team.totalPoint} PTS</div>
`;

leaderboardBody.appendChild(row);
});
}

function switchTab(id) {
document.querySelectorAll(".tab").forEach(tab =>
tab.classList.toggle("active",tab.dataset.tab === id)
);

document.querySelectorAll(".match-panel").forEach(panel =>
panel.classList.toggle("active",panel.id === id)
);
}

document.querySelectorAll(".tab").forEach(tab => {
tab.addEventListener("click",() => switchTab(tab.dataset.tab));
});

document.getElementById("addTeamBtn").addEventListener("click",() => {
teams.push(createTeam("TEAM " + (teams.length+1)));
render();
});

document.getElementById("calculateBtn").addEventListener("click",() => {
renderTotal();
renderLeaderboard(calculatedTeams());
switchTab("total");
});

document.getElementById("resetBtn").addEventListener("click",async() => {
if (!confirm("Reset semua hasil dan kembalikan 12 tim awal?")) return;

teams = Array.from({length:12},(_,i) => createTeam("TEAM " + (i+1)));
render();
renderLeaderboard([]);
switchTab("match1");
await saveTeams();
});

document.getElementById("exportBtn").addEventListener("click",() => {
const rows = [["Rank","Team","Match 1","Match 2","Match 3","Match 4","Match 5","Placement Point","Kill Point","Total Point"]];

calculatedTeams().forEach((team,index) => {
rows.push([
index+1,
team.name,
...team.calculatedMatches.map(match => match.total),
team.totalPlacement,
team.totalKills*2,
team.totalPoint
]);
});

const csv = rows.map(row =>
row.map(value => '"' + String(value).replaceAll('"','""') + '"').join(",")
).join("\r\n");

const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
const url = URL.createObjectURL(blob);
const link = document.createElement("a");

link.href = url;
link.download = "arpa-udinus-5-match.csv";
link.click();
URL.revokeObjectURL(url);
});

loadTeams();
