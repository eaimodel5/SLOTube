import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function createFallbackAdmin() {
  await setDoc(doc(db, "system_config", "admin_credentials"), {
    username: "eaimodelserie5@gmail.com",
    password: "AdminPassword123!"
  });
  console.log("Admin fallback created successfully.");
}
createFallbackAdmin().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
