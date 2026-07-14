const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot is alive'));
app.listen(process.env.PORT || 3000, () => console.log('Health check server running'));

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const userLastCode = {}; // simple in-memory store, keyed by chatId

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  bot.sendMessage(chatId, "Analyzing...");

  const isFollowUp = userLastCode[chatId] && text.length < 100 && !text.includes('(') && !text.includes(';');

  let messages;
  if (isFollowUp) {
    messages = [
      {
        role: 'system',
        content: 'You are a DSA interview coach chatting on Telegram. The user is asking a follow-up question about code they already submitted. Answer in 3-5 sentences max, conversational tone. Only include a code snippet if the user explicitly asks you to rewrite or fix code — otherwise explain in words only, no code blocks.'
      },
      { role: 'user', content: `Code:\n${userLastCode[chatId]}\n\nFollow-up question: ${text}` }
    ];
} else {
    userLastCode[chatId] = text; // save this as their latest code
    messages = [
      {
        role: 'system',
        content: `You are a strict but helpful DSA interview coach for Indian placement prep students (TCS NQT, Wipro, Accenture, campus placements). 
When given code, reply in this exact format:

Time Complexity: <state it>
Space Complexity: <state it>
Why: <2-3 sentences explaining the reasoning simply, no jargon overload>
Follow-up: <one realistic follow-up question an interviewer would ask about this exact solution>

Keep it short and direct. No preamble, no "great job", no extra commentary.`
      },
      { role: 'user', content: text }
    ];
  }

  const completion = await groq.chat.completions.create({
    messages,
    model: 'llama-3.3-70b-versatile',
  });

  bot.sendMessage(chatId, completion.choices[0].message.content);
});

console.log('Bot is running...');