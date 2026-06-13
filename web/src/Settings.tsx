import React, { useState, useEffect } from 'react';
import { theme } from './theme';
import api from './api';

const Settings: React.FC = () => {
  const [telegramChatId, setTelegramChatId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [botInfo, setBotInfo] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadSettings();
    loadBotInfo();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await api.getSettings();
      setTelegramChatId(settings.telegramChatId || '');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadBotInfo = async () => {
    try {
      const result = await api.getTelegramBotInfo();
      if (result.success) {
        setBotInfo(result.bot);
      }
    } catch (error) {
      console.error('Error loading bot info:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      await api.updateSettings({ telegramChatId });
      setSaveMessage('✅ Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error: any) {
      setSaveMessage('❌ Failed to save settings: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!telegramChatId) {
      alert('Please enter your Telegram chat ID first');
      return;
    }

    setIsTesting(true);
    try {
      const result = await api.sendTestTelegram(telegramChatId);
      if (result.success) {
        alert('✅ Test message sent! Check your Telegram.');
      } else {
        alert('❌ Failed to send test message: ' + result.error);
      }
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleGetChatId = async () => {
    try {
      const result = await api.getTelegramUpdates();
      if (result.success && result.updates && result.updates.length > 0) {
        const latestUpdate = result.updates[result.updates.length - 1];
        const chatId = latestUpdate.message?.chat?.id;
        
        if (chatId) {
          setTelegramChatId(chatId.toString());
          alert(`✅ Found your chat ID: ${chatId}\n\nMake sure you sent /start to your bot first!`);
        } else {
          alert('❌ No chat ID found. Please send /start to your bot on Telegram first.');
        }
      } else {
        alert('❌ No messages found. Send /start to your bot on Telegram, then try again.');
      }
    } catch (error: any) {
      alert('❌ Error getting chat ID: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#4F46E5', marginBottom: '24px', fontSize: '2rem' }}>
        ⚙️ Settings
      </h1>

      {/* Telegram Bot Status */}
      {botInfo && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#e8f5e9', 
          borderRadius: theme.borderRadius.md,
          marginBottom: '24px',
          border: '1px solid #81c784'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#2e7d32' }}>
            ✅ Telegram Bot Connected
          </h3>
          <div style={{ fontSize: '0.9rem', color: '#1b5e20' }}>
            <strong>Bot Name:</strong> {botInfo.first_name} (@{botInfo.username})
          </div>
        </div>
      )}

      {!botInfo && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#fff3cd', 
          borderRadius: theme.borderRadius.md,
          marginBottom: '24px',
          border: '1px solid #ffc107'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#856404' }}>
            ⚠️ Telegram Bot Not Configured
          </h3>
          <div style={{ fontSize: '0.9rem', color: '#856404', marginBottom: '12px' }}>
            Set <code>PW_NOTIFY_KEY</code> (or <code>TELEGRAM_BOT_TOKEN</code>) and restart the server.
          </div>
          <a 
            href="/TELEGRAM_SETUP.md" 
            target="_blank"
            style={{ color: '#0d47a1', textDecoration: 'underline' }}
          >
            📖 Read Setup Guide
          </a>
        </div>
      )}

      {/* Telegram Configuration */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '24px', 
        borderRadius: theme.borderRadius.lg,
        border: `1px solid ${theme.ui.border}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: '#333', fontSize: '1.3rem' }}>
          📱 Telegram Notifications
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
            Telegram Chat ID
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="e.g., -100123..., -100456..."
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '1rem',
                border: `1px solid ${theme.ui.border}`,
                borderRadius: theme.borderRadius.md
              }}
            />
            <button
              onClick={handleGetChatId}
              style={{
                padding: '12px 16px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: theme.borderRadius.md,
                fontSize: '0.9rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Get My Chat ID
            </button>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '6px' }}>
            For multiple groups, enter comma-separated chat IDs. Add bot to each group and send one message first.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: isSaving ? '#ccc' : '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: theme.borderRadius.md,
              fontSize: '1rem',
              fontWeight: '600',
              cursor: isSaving ? 'not-allowed' : 'pointer'
            }}
          >
            {isSaving ? 'Saving...' : '💾 Save Settings'}
          </button>
          <button
            onClick={handleTest}
            disabled={isTesting || !telegramChatId}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: isTesting || !telegramChatId ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: theme.borderRadius.md,
              fontSize: '1rem',
              fontWeight: '600',
              cursor: isTesting || !telegramChatId ? 'not-allowed' : 'pointer'
            }}
          >
            {isTesting ? 'Sending...' : '📤 Test Telegram'}
          </button>
        </div>

        {saveMessage && (
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            backgroundColor: saveMessage.startsWith('✅') ? '#d4edda' : '#f8d7da',
            color: saveMessage.startsWith('✅') ? '#155724' : '#721c24',
            borderRadius: theme.borderRadius.md,
            fontSize: '0.9rem'
          }}>
            {saveMessage}
          </div>
        )}
      </div>

      {/* Setup Instructions */}
      <div style={{ 
        marginTop: '24px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: theme.borderRadius.md,
        border: `1px solid ${theme.ui.border}`
      }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>📖 Quick Setup Guide</h3>
        <ol style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.8', paddingLeft: '20px' }}>
          <li>Create a bot with <strong>@BotFather</strong> on Telegram</li>
          <li>Copy your bot token and set <code>PW_NOTIFY_KEY</code> environment variable (fallback: <code>TELEGRAM_BOT_TOKEN</code>)</li>
          <li>Restart the API server</li>
          <li>Search for your bot on Telegram and send <code>/start</code></li>
          <li>Click "Get My Chat ID" button above</li>
          <li>Save settings and test!</li>
        </ol>
        <a 
          href="https://github.com/seepananikhil/PennyWhales/blob/dev/TELEGRAM_SETUP.md"
          target="_blank"
          style={{ 
            display: 'inline-block',
            marginTop: '12px',
            color: '#4F46E5',
            textDecoration: 'none',
            fontWeight: '600'
          }}
        >
          📚 Read Full Setup Guide →
        </a>
      </div>
    </div>
  );
};

export default Settings;
