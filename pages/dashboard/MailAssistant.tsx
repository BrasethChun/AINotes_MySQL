import React, { useState, useEffect } from 'react';
import { 
  Inbox, Send, Star, Trash2, Mail, RefreshCw, Settings, PenSquare, 
  Search, CheckCircle2, AlertCircle, Sparkles, CornerDownLeft, 
  ArrowLeft, Clock, ShieldCheck, X, ChevronRight, Server, MessageSquare,
  FileText, ExternalLink, Loader2, Layout, AlignLeft
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { MailMessage, MailAccount } from '../../types';
import { apiClient } from '../../src/apiClient';

export const MailAssistant: React.FC = () => {
  // Folder & list state
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'starred' | 'trash' | 'drafts'>('inbox');
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MailMessage | null>(null);
  const [counts, setCounts] = useState({
    inbox_total: 0,
    inbox_unread: 0,
    sent_total: 0,
    starred_total: 0,
    trash_total: 0,
    drafts_total: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnread, setFilterUnread] = useState(false);
  const [bodyViewMode, setBodyViewMode] = useState<'html' | 'text'>('html');

  // Accounts & Bluehost sync state
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Modals state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);

  // Bluehost settings form
  const [settingsForm, setSettingsForm] = useState({
    email: '',
    provider: 'bluehost',
    imap_host: '',
    imap_port: 993,
    smtp_host: '',
    smtp_port: 465,
    username: '',
    password: '',
    auto_sync_interval: 15
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; diagnostics: string[] } | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Compose / Reply form
  const [composeForm, setComposeForm] = useState({
    to: '',
    cc: '',
    subject: '',
    body: '',
    replyToId: ''
  });
  const [sendingEmail, setSendingEmail] = useState(false);

  // AI Assistant state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState<'Professional' | 'Concise' | 'Direct' | 'Urgent' | 'Friendly'>('Professional');
  const [generatingAiDraft, setGeneratingAiDraft] = useState(false);
  
  // Smart Quick Replies state for selected email
  const [smartReplies, setSmartReplies] = useState<{ options: string[]; suggestedDraft: string } | null>(null);
  const [loadingSmartReplies, setLoadingSmartReplies] = useState(false);

  // Thread summarizer state
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  // In-app Toast notification state (avoiding window.alert)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch accounts and messages
  const fetchAccounts = async () => {
    try {
      const data = await apiClient.fetch('/mail/accounts');
      if (Array.isArray(data) && data.length > 0) {
        setAccounts(data);
        const primary = data[0];
        setSettingsForm({
          email: primary.email || '',
          provider: 'bluehost',
          imap_host: primary.imap_host || '',
          imap_port: primary.imap_port || 993,
          smtp_host: primary.smtp_host || '',
          smtp_port: primary.smtp_port || 465,
          username: primary.username || primary.email || '',
          password: '',
          auto_sync_interval: primary.auto_sync_interval || 15
        });
      }
    } catch (err) {
      console.error('Failed to fetch mail accounts', err);
    }
  };

  const fetchMessages = async (folder = activeFolder, search = searchQuery) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ folder });
      if (search) queryParams.set('search', search);

      const res = await apiClient.fetch(`/mail/messages?${queryParams.toString()}`);
      if (res && res.messages) {
        setMessages(res.messages);
        if (res.counts) setCounts(res.counts);

        // If currently selected message is no longer in list, update or keep
        if (selectedMessage) {
          const found = res.messages.find((m: MailMessage) => m.id === selectedMessage.id);
          if (found) setSelectedMessage(found);
        } else if (res.messages.length > 0 && window.innerWidth >= 1024) {
          // Auto select first message on desktop
          setSelectedMessage(res.messages[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch mail messages', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchMessages();
  }, [activeFolder]);

  // When selected email changes, reset AI smart reply and summary
  useEffect(() => {
    setSummary(null);
    setSmartReplies(null);
    if (selectedMessage) {
      loadSmartReplies(selectedMessage);
    }
  }, [selectedMessage?.id]);

  // Trigger manual sync
  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('Connecting to Bluehost mail servers...');
    try {
      const res = await apiClient.fetch('/mail/sync', { method: 'POST' });
      setSyncStatusMsg(res.message || 'Synchronization complete');
      await fetchMessages();
      await fetchAccounts();
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (err: any) {
      setSyncStatusMsg(err.message || 'Sync encountered a problem');
      setTimeout(() => setSyncStatusMsg(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle star
  const handleToggleStar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await apiClient.fetch(`/mail/messages/${id}/star`, { method: 'PUT' });
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_starred: res.is_starred === 1 } : m));
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, is_starred: res.is_starred === 1 } : null);
      }
    } catch (err) {
      console.error('Star toggle failed', err);
    }
  };

  // Delete / move to trash
  const handleDeleteMessage = async (id: string) => {
    try {
      await apiClient.fetch(`/mail/messages/${id}`, { method: 'DELETE' });
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage(null);
      }
      fetchMessages();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  // Select message
  const handleSelectMessage = async (msg: MailMessage) => {
    setSelectedMessage(msg);
    if (!msg.is_read) {
      try {
        await apiClient.fetch(`/mail/messages/${msg.id}/read`, { 
          method: 'PUT', 
          body: JSON.stringify({ is_read: 1 }) 
        });
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
        setCounts(prev => ({ ...prev, inbox_unread: Math.max(0, prev.inbox_unread - 1) }));
      } catch (err) {
        console.error('Read update error', err);
      }
    }
  };

  // AI: Load Smart Quick Replies
  const loadSmartReplies = async (msg: MailMessage) => {
    setLoadingSmartReplies(true);
    try {
      const res = await apiClient.fetch('/mail/ai/reply', {
        method: 'POST',
        body: JSON.stringify({
          emailSubject: msg.subject,
          emailBody: msg.body_text,
          senderName: msg.from_name
        })
      });
      if (res && res.options) {
        setSmartReplies(res);
      }
    } catch (err) {
      console.warn('Smart replies unavailable:', err);
    } finally {
      setLoadingSmartReplies(false);
    }
  };

  // AI: Summarize Email
  const handleSummarizeThread = async () => {
    if (!selectedMessage) return;
    setSummarizing(true);
    try {
      const res = await apiClient.fetch('/mail/ai/summarize', {
        method: 'POST',
        body: JSON.stringify({
          emailSubject: selectedMessage.subject,
          emailBody: selectedMessage.body_text
        })
      });
      if (res && res.summary) {
        setSummary(res.summary);
      }
    } catch (err: any) {
      showToast('Could not summarize email: ' + err.message, 'error');
    } finally {
      setSummarizing(false);
    }
  };

  // AI: Generate Draft in Compose modal
  const handleGenerateAiDraft = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAiDraft(true);
    try {
      const res = await apiClient.fetch('/mail/ai/draft', {
        method: 'POST',
        body: JSON.stringify({
          prompt: aiPrompt,
          recipient: composeForm.to,
          subject: composeForm.subject,
          tone: aiTone
        })
      });
      if (res && res.draft) {
        setComposeForm(prev => ({ ...prev, body: res.draft }));
        setAiPrompt('');
      }
    } catch (err: any) {
      showToast('Failed to generate draft: ' + err.message, 'error');
    } finally {
      setGeneratingAiDraft(false);
    }
  };

  // Send Email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeForm.to.trim() || !composeForm.subject.trim()) {
      showToast('Please specify recipient and subject.', 'error');
      return;
    }

    setSendingEmail(true);
    try {
      await apiClient.fetch('/mail/send', {
        method: 'POST',
        body: JSON.stringify(composeForm)
      });
      setShowComposeModal(false);
      setComposeForm({ to: '', cc: '', subject: '', body: '', replyToId: '' });
      fetchMessages();
      showToast('Email sent and recorded in Sent folder.', 'success');
    } catch (err: any) {
      showToast('Error sending email: ' + err.message, 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  // Test Bluehost Connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await apiClient.fetch('/mail/accounts/test', {
        method: 'POST',
        body: JSON.stringify(settingsForm)
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        diagnostics: [err.message || 'Connection attempt timed out.']
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Save Bluehost Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      await apiClient.fetch('/mail/accounts', {
        method: 'POST',
        body: JSON.stringify(settingsForm)
      });
      setShowSettingsModal(false);
      await fetchAccounts();
      handleSyncNow();
      showToast('Bluehost settings saved successfully.', 'success');
    } catch (err: any) {
      showToast('Failed to save settings: ' + err.message, 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Open Reply Modal
  const handleOpenReply = (customDraft?: string) => {
    if (!selectedMessage) return;
    setComposeForm({
      to: selectedMessage.from_address,
      cc: '',
      subject: selectedMessage.subject.startsWith('Re:') ? selectedMessage.subject : `Re: ${selectedMessage.subject}`,
      body: customDraft || `\n\n--- On ${new Date(selectedMessage.received_at).toLocaleString()}, ${selectedMessage.from_name} wrote:\n> ${selectedMessage.body_text.slice(0, 300)}...`,
      replyToId: selectedMessage.id
    });
    setShowComposeModal(true);
  };

  const filteredMessages = messages.filter(m => {
    if (filterUnread && m.is_read) return false;
    return true;
  });

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col bg-[#F8FAFC] rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-300">
      
      {/* Top Header Bar */}
      <header className="h-16 px-6 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
            <Mail size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">Mail Assistant</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100 flex items-center gap-1">
                <Server size={11} /> Bluehost Mail
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {accounts.length > 0 ? accounts[0].email : 'Configured for Bluehost IMAP & SMTP'} · Syncing Inbox & Sent
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {syncStatusMsg && (
            <span className="text-xs font-medium text-indigo-600 animate-in fade-in slide-in-from-right-1 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
              {syncStatusMsg}
            </span>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="h-9 px-3 text-xs bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-none gap-1.5"
            title="Synchronize Inbox and Sent folders from Bluehost"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin text-indigo-600' : 'text-slate-500'} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSettingsModal(true)}
            className="h-9 px-3 text-xs bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-none gap-1.5"
            title="Configure Bluehost IMAP and SMTP settings"
          >
            <Settings size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Settings</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setComposeForm({ to: '', cc: '', subject: '', body: '', replyToId: '' });
              setShowComposeModal(true);
            }}
            className="h-9 px-3.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm gap-1.5"
          >
            <PenSquare size={14} />
            <span>Compose</span>
          </Button>
        </div>
      </header>

      {/* 3-Column Body View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COLUMN 1: Folders & System Status */}
        <aside className="w-56 border-r border-slate-200/80 bg-white/70 p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 px-3">
                Mailboxes
              </span>
              <nav className="mt-2 space-y-1">
                <button
                  onClick={() => { setActiveFolder('inbox'); setSelectedMessage(null); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeFolder === 'inbox' 
                      ? 'bg-indigo-50/90 text-indigo-700 shadow-sm border border-indigo-100 font-semibold' 
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Inbox size={16} className={activeFolder === 'inbox' ? 'text-indigo-600' : 'text-slate-400'} />
                    <span>Inbox</span>
                  </div>
                  {counts.inbox_unread > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                      {counts.inbox_unread}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveFolder('sent'); setSelectedMessage(null); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeFolder === 'sent' 
                      ? 'bg-indigo-50/90 text-indigo-700 shadow-sm border border-indigo-100 font-semibold' 
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Send size={16} className={activeFolder === 'sent' ? 'text-indigo-600' : 'text-slate-400'} />
                    <span>Sent</span>
                  </div>
                  {counts.sent_total > 0 && (
                    <span className="text-xs font-medium text-slate-400">
                      {counts.sent_total}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveFolder('starred'); setSelectedMessage(null); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeFolder === 'starred' 
                      ? 'bg-indigo-50/90 text-indigo-700 shadow-sm border border-indigo-100 font-semibold' 
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Star size={16} className={activeFolder === 'starred' ? 'text-amber-500 fill-amber-500' : 'text-slate-400'} />
                    <span>Starred</span>
                  </div>
                  {counts.starred_total > 0 && (
                    <span className="text-xs font-medium text-slate-400">
                      {counts.starred_total}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveFolder('trash'); setSelectedMessage(null); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeFolder === 'trash' 
                      ? 'bg-indigo-50/90 text-indigo-700 shadow-sm border border-indigo-100 font-semibold' 
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Trash2 size={16} className={activeFolder === 'trash' ? 'text-rose-600' : 'text-slate-400'} />
                    <span>Trash</span>
                  </div>
                </button>
              </nav>
            </div>

            {/* Bluehost Server Info Card */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-700 font-semibold">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Bluehost IMAP</span>
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono">
                  SSL: 993
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Host: {accounts[0]?.imap_host || 'mail.domain.com'}
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Auto-sync</span>
                <span className="font-semibold text-slate-700">Every {accounts[0]?.auto_sync_interval || 15}m</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 space-y-1 px-1">
            <p>Last synced:</p>
            <p className="font-mono text-slate-600">
              {accounts[0]?.last_synced_at ? new Date(accounts[0].last_synced_at).toLocaleTimeString() : 'Just now'}
            </p>
          </div>
        </aside>

        {/* COLUMN 2: Message List & Search */}
        <section className="w-80 sm:w-96 border-r border-slate-200/80 bg-white flex flex-col shrink-0">
          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-slate-200/80 space-y-2.5">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject, sender, body..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchMessages(activeFolder, searchQuery)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="font-semibold text-slate-700 capitalize">
                {activeFolder} ({filteredMessages.length})
              </span>
              <button
                onClick={() => setFilterUnread(!filterUnread)}
                className={`text-[11px] font-medium transition-colors ${filterUnread ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-700'}`}
              >
                {filterUnread ? 'Show All' : 'Unread Only'}
              </button>
            </div>
          </div>

          {/* Email Card Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <Loader2 size={18} className="animate-spin text-indigo-500" />
                <span>Loading mailbox messages...</span>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <Mail size={24} className="mx-auto text-slate-300" />
                <p className="font-medium text-slate-600">No emails found in {activeFolder}</p>
                <p className="text-[11px] text-slate-400">Click Sync Now to pull fresh messages from Bluehost.</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`p-3.5 cursor-pointer transition-all flex flex-col gap-1 relative ${
                      isSelected 
                        ? 'bg-indigo-50/70 border-l-4 border-l-indigo-600' 
                        : msg.is_read 
                          ? 'hover:bg-slate-50/80 bg-white' 
                          : 'bg-slate-50/40 hover:bg-indigo-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        {!msg.is_read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" title="Unread" />
                        )}
                        <span className={`text-xs truncate ${!msg.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {msg.from_name || msg.from_address}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(msg.received_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <h4 className={`text-xs truncate ${!msg.is_read ? 'font-semibold text-slate-900' : 'text-slate-800'}`}>
                      {msg.subject || '(No Subject)'}
                    </h4>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {msg.snippet || msg.body_text}
                    </p>

                    <div className="mt-1 flex items-center justify-between">
                      <button
                        onClick={(e) => handleToggleStar(e, msg.id)}
                        className="text-slate-300 hover:text-amber-500 transition-colors p-0.5"
                      >
                        <Star size={13} className={msg.is_starred ? 'text-amber-500 fill-amber-500' : ''} />
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(msg.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* COLUMN 3: Reading Pane & Embedded AI Assistant */}
        <main className="flex-1 bg-white flex flex-col overflow-y-auto">
          {selectedMessage ? (
            <div className="flex-1 flex flex-col p-6 space-y-6">
              
              {/* Message Header */}
              <div className="pb-5 border-b border-slate-200/80 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                    {selectedMessage.subject || '(No Subject)'}
                  </h2>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => handleToggleStar(e, selectedMessage.id)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-500 transition-colors"
                      title={selectedMessage.is_starred ? 'Unstar' : 'Star'}
                    >
                      <Star size={16} className={selectedMessage.is_starred ? 'text-amber-500 fill-amber-500' : ''} />
                    </button>
                    <button
                      onClick={() => handleOpenReply()}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                      title="Reply"
                    >
                      <CornerDownLeft size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(selectedMessage.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-indigo-700 text-sm">
                      {(selectedMessage.from_name || selectedMessage.from_address).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{selectedMessage.from_name}</span>
                        <span className="text-slate-400 text-[11px]">&lt;{selectedMessage.from_address}&gt;</span>
                      </div>
                      <p className="text-[11px] text-slate-500">To: {selectedMessage.to_address}</p>
                    </div>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {new Date(selectedMessage.received_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              </div>

              {/* AI Quick Actions Bar */}
              <div className="p-4 rounded-xl border border-indigo-100/80 bg-gradient-to-r from-indigo-50/60 to-violet-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-950">
                    <Sparkles size={15} className="text-indigo-600" />
                    <span>AI Assistant for this Email</span>
                  </div>
                  <button
                    onClick={handleSummarizeThread}
                    disabled={summarizing}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    {summarizing ? <Loader2 size={12} className="animate-spin" /> : null}
                    <span>{summarizing ? 'Summarizing...' : 'Summarize Thread'}</span>
                  </button>
                </div>

                {/* AI Summary View */}
                {summary && (
                  <div className="p-3 rounded-lg bg-white border border-indigo-200/70 text-xs text-slate-700 leading-relaxed animate-in fade-in slide-in-from-top-1 whitespace-pre-line">
                    <div className="font-semibold text-indigo-900 mb-1 flex items-center justify-between">
                      <span>Executive Summary</span>
                      <button onClick={() => setSummary(null)} className="text-slate-400 hover:text-slate-600"><X size={12}/></button>
                    </div>
                    {summary}
                  </div>
                )}

                {/* AI Smart Quick Reply Buttons */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-slate-600">Smart Quick Replies (1-Click Draft):</span>
                  {loadingSmartReplies ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                      <Loader2 size={12} className="animate-spin text-indigo-500" />
                      <span>Generating tailored response options with Gemini...</span>
                    </div>
                  ) : smartReplies?.options && smartReplies.options.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {smartReplies.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleOpenReply(smartReplies.suggestedDraft)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-medium text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm flex items-center gap-1"
                        >
                          <span>{opt}</span>
                          <ChevronRight size={12} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenReply(`Hi ${selectedMessage.from_name},\n\nThank you for reaching out. We have logged this request and are investigating. We will update you shortly.\n\nBest regards,\nIT Operations`)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-all shadow-sm"
                      >
                        Acknowledge Request
                      </button>
                      <button
                        onClick={() => handleOpenReply(`Hi ${selectedMessage.from_name},\n\nCould you please provide the system logs and asset tag so we can troubleshoot further?\n\nThank you,\nIT Support`)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-all shadow-sm"
                      >
                        Ask for Diagnostic Info
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Content Header & View Switcher */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Message Content
                </span>
                {selectedMessage.body_html && (
                  <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-[11px] font-medium text-slate-600">
                    <button
                      type="button"
                      onClick={() => setBodyViewMode('html')}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                        bodyViewMode === 'html'
                          ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Layout size={12} />
                      <span>Formatted (HTML)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBodyViewMode('text')}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                        bodyViewMode === 'text'
                          ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <AlignLeft size={12} />
                      <span>Plain Text</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Message Body Content (HTML / Text) */}
              {bodyViewMode === 'html' && selectedMessage.body_html ? (
                <div 
                  className="flex-1 text-sm text-slate-800 leading-relaxed font-sans overflow-x-auto p-4 rounded-xl bg-white border border-slate-100 selection:bg-indigo-500/20 max-w-full email-body-view"
                  dangerouslySetInnerHTML={{ __html: selectedMessage.body_html }}
                />
              ) : (
                <div className="flex-1 text-sm text-slate-800 leading-relaxed whitespace-pre-line font-sans selection:bg-indigo-500/20 p-4 rounded-xl bg-white border border-slate-100">
                  {selectedMessage.body_text}
                </div>
              )}

              {/* Quick Reply Trigger Box at Bottom */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Button
                  onClick={() => handleOpenReply()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium gap-2 shadow-sm"
                >
                  <CornerDownLeft size={14} />
                  <span>Reply to {selectedMessage.from_name}</span>
                </Button>
                <span className="text-xs text-slate-400">
                  Outgoing server: {accounts[0]?.smtp_host || 'mail.bluehost.com'}:465
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                <Mail size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-700">No Email Selected</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Select an email from the list on the left to read, summarize, or generate AI smart replies.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowComposeModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                >
                  <PenSquare size={14} />
                  <span>Write New Email</span>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSyncNow}
                  className="bg-white border-slate-200 text-slate-700 text-xs gap-1.5"
                >
                  <RefreshCw size={14} />
                  <span>Check Bluehost Mailbox</span>
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: Bluehost Configuration Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Server size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Bluehost Mail Settings</h3>
                  <p className="text-xs text-slate-500">Configure IMAP & SMTP credentials for auto-sync</p>
                </div>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. it-support@yourdomain.com"
                  value={settingsForm.email}
                  onChange={(e) => {
                    const email = e.target.value;
                    const domain = email.includes('@') ? email.split('@')[1] : '';
                    setSettingsForm({
                      ...settingsForm,
                      email,
                      imap_host: settingsForm.imap_host || (domain ? `mail.${domain}` : ''),
                      smtp_host: settingsForm.smtp_host || (domain ? `mail.${domain}` : ''),
                      username: settingsForm.username || email
                    });
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Incoming Host (IMAP)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="mail.yourdomain.com"
                    value={settingsForm.imap_host}
                    onChange={(e) => setSettingsForm({ ...settingsForm, imap_host: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    IMAP Port (SSL)
                  </label>
                  <input
                    type="number"
                    value={settingsForm.imap_port}
                    onChange={(e) => setSettingsForm({ ...settingsForm, imap_port: parseInt(e.target.value) || 993 })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Outgoing Host (SMTP)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="mail.yourdomain.com"
                    value={settingsForm.smtp_host}
                    onChange={(e) => setSettingsForm({ ...settingsForm, smtp_host: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SMTP Port (SSL)
                  </label>
                  <input
                    type="number"
                    value={settingsForm.smtp_port}
                    onChange={(e) => setSettingsForm({ ...settingsForm, smtp_port: parseInt(e.target.value) || 465 })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username / Account
                  </label>
                  <input
                    type="text"
                    placeholder="Same as email address"
                    value={settingsForm.username}
                    onChange={(e) => setSettingsForm({ ...settingsForm, username: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password / App Key
                  </label>
                  <input
                    type="password"
                    placeholder="Bluehost password"
                    value={settingsForm.password}
                    onChange={(e) => setSettingsForm({ ...settingsForm, password: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Auto-Sync Frequency (Background Polling)
                </label>
                <select
                  value={settingsForm.auto_sync_interval}
                  onChange={(e) => setSettingsForm({ ...settingsForm, auto_sync_interval: parseInt(e.target.value) || 15 })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value={5}>Every 5 minutes</option>
                  <option value={15}>Every 15 minutes (Recommended)</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every 1 hour</option>
                  <option value={0}>Manual Sync Only</option>
                </select>
              </div>

              {/* Connection Diagnostics Banner */}
              {testResult && (
                <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                  testResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <div className="font-semibold flex items-center gap-1.5">
                    {testResult.success ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertCircle size={14} className="text-amber-600" />}
                    <span>{testResult.success ? 'Connection Test Passed' : 'Connection Test Results'}</span>
                  </div>
                  {testResult.diagnostics.map((d, i) => (
                    <p key={i} className="text-[11px] leading-relaxed opacity-90">{d}</p>
                  ))}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !settingsForm.email}
                  className="text-xs bg-slate-50 border-slate-200"
                >
                  {testingConnection ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                  <span>{testingConnection ? 'Probing Servers...' : 'Test Connection'}</span>
                </Button>

                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowSettingsModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={settingsSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {settingsSaving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                    <span>Save Configuration</span>
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Compose & AI Drafter Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <PenSquare size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {composeForm.replyToId ? 'Reply to Email' : 'New Email Message'}
                  </h3>
                  <p className="text-xs text-slate-500">Dispatching via Bluehost SMTP: {accounts[0]?.email}</p>
                </div>
              </div>
              <button onClick={() => setShowComposeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-6 space-y-4 overflow-y-auto flex-1 flex flex-col">
              
              {/* Recipient & Subject fields */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                  <span className="w-16 text-xs font-semibold text-slate-500">To:</span>
                  <input
                    type="email"
                    required
                    placeholder="recipient@example.com"
                    value={composeForm.to}
                    onChange={(e) => setComposeForm({ ...composeForm, to: e.target.value })}
                    className="flex-1 text-xs outline-none bg-transparent"
                  />
                </div>

                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                  <span className="w-16 text-xs font-semibold text-slate-500">Subject:</span>
                  <input
                    type="text"
                    required
                    placeholder="Enter email subject"
                    value={composeForm.subject}
                    onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                    className="flex-1 text-xs outline-none bg-transparent font-medium"
                  />
                </div>
              </div>

              {/* AI Draft Generator Card */}
              <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-600" />
                    <span>AI Mail Assistant (Gemini 3.8 Flash)</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">Tone:</span>
                    <select
                      value={aiTone}
                      onChange={(e: any) => setAiTone(e.target.value)}
                      className="text-[11px] border border-indigo-200 rounded-md bg-white px-2 py-0.5 outline-none font-medium text-indigo-800"
                    >
                      <option value="Professional">Professional</option>
                      <option value="Concise">Concise</option>
                      <option value="Direct">Direct</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Friendly">Friendly</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter key bullet points (e.g. Server maintenance delayed to 3am, reboot required)..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleGenerateAiDraft())}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleGenerateAiDraft}
                    disabled={generatingAiDraft || !aiPrompt.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 shadow-none shrink-0"
                  >
                    {generatingAiDraft ? <Loader2 size={13} className="animate-spin mr-1" /> : <Sparkles size={13} className="mr-1" />}
                    <span>{generatingAiDraft ? 'Drafting...' : 'Write Draft'}</span>
                  </Button>
                </div>
              </div>

              {/* Email Body Textarea */}
              <div className="flex-1 min-h-[180px] flex flex-col">
                <textarea
                  required
                  placeholder="Compose your email here, or use the AI Mail Assistant above to draft it..."
                  value={composeForm.body}
                  onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                  className="w-full flex-1 p-3.5 border border-slate-200 rounded-xl text-xs leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-sans"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Sending as {accounts[0]?.email || 'Bluehost User'}
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowComposeModal(false)}>
                    Discard
                  </Button>
                  <Button type="submit" size="sm" disabled={sendingEmail} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                    {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    <span>{sendingEmail ? 'Sending...' : 'Send Message'}</span>
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium animate-in slide-in-from-bottom-3 duration-200 ${
          toast.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-slate-900 border-slate-800 text-white'
        }`}>
          {toast.type === 'error' ? (
            <AlertCircle size={15} className="text-rose-600 shrink-0" />
          ) : toast.type === 'success' ? (
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          ) : (
            <Info size={15} className="text-slate-300 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
