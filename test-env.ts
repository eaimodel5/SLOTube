import "dotenv/config";
console.log(JSON.stringify({
  HAS_YOUTUBE_KEY: !!process.env.YOUTUBE_API_KEY,
  HAS_GEMINI_KEY: !!process.env.GEMINI_API_KEY
}));
