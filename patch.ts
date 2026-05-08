import fs from "fs";

let content = fs.readFileSync("server.ts", "utf8");

// For YouTube
content = content.replace(
    /status: "pending",[\s\n\r]*matchScore: 0, \/\/ Will be overridden if goal is provided/g,
    'status: "pending",\n                   origin: "youtube_search",\n                   matchScore: 0, // Will be overridden if goal is provided'
);

// For Wikipedia
content = content.replace(
    /status: "pending",[\s\n\r]*matchScore: 0,/g,
    'status: "pending",\n                           origin: "web_search",\n                           matchScore: 0,'
);

fs.writeFileSync("server.ts", content);
console.log("Patched server.ts 5");
