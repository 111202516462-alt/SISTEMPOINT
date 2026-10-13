
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname,"data");
const DATA_FILE = path.join(DATA_DIR,"teams.json");

app.use(express.json({limit:"1mb"}));
app.use(express.static(__dirname));

function ensureData() {
if (!fs.existsSync(DATA_DIR)) {
fs.mkdirSync(DATA_DIR,{recursive:true});
}

if (!fs.existsSync(DATA_FILE)) {
const teams = Array.from({length:12},(_,index) => ({
id:Date.now()+index,
name:"TEAM "+(index+1),
matches:Array.from({length:5},() => ({
placement:12,
kills:0
}))
}));

fs.writeFileSync(DATA_FILE,JSON.stringify(teams,null,2));
}
}

function readTeams() {
ensureData();
return JSON.parse(fs.readFileSync(DATA_FILE,"utf8"));
}

function writeTeams(teams) {
ensureData();
fs.writeFileSync(DATA_FILE,JSON.stringify(teams,null,2));
}

app.get("/api/teams",(req,res) => {
try {
res.json(readTeams());
} catch(error) {
res.status(500).json({error:"Gagal membaca data tim."});
}
});

app.put("/api/teams",(req,res) => {
if (!Array.isArray(req.body)) {
return res.status(400).json({error:"Data tim tidak valid."});
}

const teams = req.body.map((team,index) => ({
id:String(team.id || Date.now()+index),
name:String(team.name || "TEAM "+(index+1)).slice(0,80),
matches:Array.from({length:5},(_,matchIndex) => {
const match = team.matches?.[matchIndex] || {};

return {
placement:Math.max(1,Math.min(12,Number(match.placement)||12)),
kills:Math.max(0,Math.min(999,Number(match.kills)||0))
};
})
}));

try {
writeTeams(teams);
res.json({success:true,count:teams.length});
} catch(error) {
res.status(500).json({error:"Gagal menyimpan data tim."});
}
});

app.get("/api/health",(req,res) => {
res.json({status:"ok"});
});

app.listen(PORT,() => {
ensureData();
console.log("ARPA UDINUS berjalan di http://localhost:"+PORT);
});
