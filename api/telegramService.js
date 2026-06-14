const axios = require('axios');

// Telegram Bot credentials - set these as environment variables
// Get your bot token from @BotFather on Telegram
const TELEGRAM_BOT_TOKEN = process.env.PW_NOTIFY_KEY || process.env.TELEGRAM_BOT_TOKEN;

class TelegramService {
  constructor() {
    this.baseUrl = TELEGRAM_BOT_TOKEN 
      ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}` 
      : null;
    this.initialized = false;
  }

  normalizeChatIds(chatIdInput) {
    if (Array.isArray(chatIdInput)) {
      return [...new Set(chatIdInput.map(id => String(id).trim()).filter(Boolean))];
    }

    if (chatIdInput === null || chatIdInput === undefined) {
      return [];
    }

    return [
      ...new Set(
        String(chatIdInput)
          .split(/[\s,]+/)
          .map(id => id.trim())
          .filter(Boolean)
      )
    ];
  }

  formatTelegramError(error) {
    const telegramError = error.response?.data;
    const code = telegramError?.error_code;
    const description = telegramError?.description || error.message;

    if (code === 403 && typeof description === 'string' && description.includes("can't initiate conversation")) {
      return 'Telegram 403: bot cannot initiate conversation. Open the bot in Telegram, send /start, and verify telegramChatId.';
    }

    return description;
  }

  init() {
    if (this.initialized) return;

    if (!TELEGRAM_BOT_TOKEN) {
      console.warn('⚠️ Telegram bot token not configured. Alerts will not work.');
      console.warn('Set PW_NOTIFY_KEY environment variable (or TELEGRAM_BOT_TOKEN fallback).');
      console.warn('Get your token from @BotFather on Telegram.');
      return;
    }

    this.initialized = true;
    console.log('✅ Telegram service initialized');
  }

  async sendPriceAlert(chatId, ticker, currentPrice, targetPrice, condition) {
    this.init();

    if (!this.baseUrl) {
      console.error('❌ Telegram service not initialized. Cannot send alert.');
      return { success: false, error: 'Service not configured' };
    }

    const chatIds = this.normalizeChatIds(chatId);
    if (chatIds.length === 0) {
      return { success: false, error: 'No Telegram chat ID configured' };
    }

    try {
      const emoji = condition === 'above' ? '⬆️' : '⬇️';
      const direction = condition === 'above' ? 'risen above' : 'dropped below';
      const message = `
🔔 *PennyWhales Price Alert*

${emoji} *${ticker}* has ${direction} your target!

💵 Current Price: $${currentPrice.toFixed(2)}
🎯 Target Price: $${targetPrice.toFixed(2)}

[View on TradingView](https://www.tradingview.com/chart/?symbol=${ticker})
      `.trim();

      const results = await Promise.all(
        chatIds.map(async (singleChatId) => {
          try {
            const response = await axios.post(`${this.baseUrl}/sendMessage`, {
              chat_id: singleChatId,
              text: message,
              parse_mode: 'Markdown',
              disable_web_page_preview: true
            });

            console.log(`✅ Telegram alert sent to ${singleChatId}: ${response.data.result.message_id}`);
            return {
              chatId: singleChatId,
              success: true,
              messageId: response.data.result.message_id
            };
          } catch (sendError) {
            console.error(`❌ Failed to send Telegram alert to ${singleChatId}:`, sendError.response?.data || sendError.message);
            return {
              chatId: singleChatId,
              success: false,
              error: this.formatTelegramError(sendError)
            };
          }
        })
      );

      const sent = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (failed.length === 0) {
        return {
          success: true,
          messageId: sent[0]?.messageId,
          sent: sent.length,
          failed: 0,
          results
        };
      }

      return {
        success: sent.length > 0,
        error: failed[0]?.error || 'Failed to send one or more Telegram alerts',
        sent: sent.length,
        failed: failed.length,
        results
      };
    } catch (error) {
      console.error(`❌ Failed to send Telegram alert:`, error.response?.data || error.message);
      return { success: false, error: this.formatTelegramError(error) };
    }
  }

  // Generic send message function
  async sendMessage(chatId, message, parseMode = 'Markdown') {
    this.init();

    if (!this.baseUrl) {
      console.error('❌ Telegram service not initialized. Cannot send message.');
      return { success: false, error: 'Service not configured' };
    }

    const chatIds = this.normalizeChatIds(chatId);
    if (chatIds.length === 0) {
      return { success: false, error: 'No Telegram chat ID configured' };
    }

    try {
      const results = await Promise.all(
        chatIds.map(async (singleChatId) => {
          try {
            const payload = {
              chat_id: singleChatId,
              text: message,
              disable_web_page_preview: true
            };

            if (parseMode) {
              payload.parse_mode = parseMode;
            }

            const response = await axios.post(`${this.baseUrl}/sendMessage`, payload);

            console.log(`✅ Telegram message sent to ${singleChatId}: ${response.data.result.message_id}`);
            return {
              chatId: singleChatId,
              success: true,
              messageId: response.data.result.message_id
            };
          } catch (sendError) {
            console.error(`❌ Failed to send Telegram message to ${singleChatId}:`, sendError.response?.data || sendError.message);
            return {
              chatId: singleChatId,
              success: false,
              error: this.formatTelegramError(sendError)
            };
          }
        })
      );

      const sent = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (failed.length === 0) {
        return {
          success: true,
          messageId: sent[0]?.messageId,
          sent: sent.length,
          failed: 0,
          results
        };
      }

      return {
        success: sent.length > 0,
        error: failed[0]?.error || 'Failed to send one or more Telegram messages',
        sent: sent.length,
        failed: failed.length,
        results
      };
    } catch (error) {
      console.error(`❌ Failed to send Telegram message:`, error.response?.data || error.message);
      return { success: false, error: this.formatTelegramError(error) };
    }
  }

  async sendTestMessage(chatId) {
    this.init();

    if (!this.baseUrl) {
      return { success: false, error: 'Telegram service not configured' };
    }

    const chatIds = this.normalizeChatIds(chatId);
    if (chatIds.length === 0) {
      return { success: false, error: 'No Telegram chat ID configured' };
    }

    try {
      const message = `
🎉 *Test Message from PennyWhales*

Your price alerts are now configured!
You'll receive notifications when your stocks hit target prices.

This bot will send you alerts here automatically.
      `.trim();

      return await this.sendMessage(chatIds, message, 'Markdown');
    } catch (error) {
      console.error(`❌ Failed to send test message:`, error.response?.data || error.message);
      return { success: false, error: this.formatTelegramError(error) };
    }
  }

  // Get updates to find user's chat ID
  async getUpdates() {
    this.init();

    if (!this.baseUrl) {
      return { success: false, error: 'Telegram service not configured' };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/getUpdates`);
      return { success: true, updates: response.data.result };
    } catch (error) {
      console.error(`❌ Failed to get updates:`, error.response?.data || error.message);
      return { success: false, error: this.formatTelegramError(error) };
    }
  }

  // Get bot info
  async getBotInfo() {
    this.init();

    if (!this.baseUrl) {
      return { success: false, error: 'Telegram service not configured' };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/getMe`);
      return { success: true, bot: response.data.result };
    } catch (error) {
      console.error(`❌ Failed to get bot info:`, error.response?.data || error.message);
      return { success: false, error: this.formatTelegramError(error) };
    }
  }
}

// Export singleton instance
const telegramService = new TelegramService();
module.exports = telegramService;
