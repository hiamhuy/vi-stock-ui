'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { connectSocket } from '@/lib/socket';
import { supportApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, Home, LogOut, MessageSquare, 
  Send, User as UserIcon, Loader2, ChevronLeft,
  ImageIcon, LayoutDashboard
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useTranslation } from '@/lib/i18n-context';
import { DashboardGuard } from '@/components/DashboardGuard';
import { playNotificationSound } from '@/lib/sounds';

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  message?: string;
  imageUrl?: string;
  createdAt: string;
}

const isVideo = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
};

export default function UserSupportPage() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const ADMIN_ID = 1;

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchMessages = useCallback(async () => {
    setLoadingMessages(true);
    try {
      const res = await supportApi.getHistory(ADMIN_ID);
      if (res.data.success) {
        setMessages(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMessages();
    }
  }, [isAuthenticated, fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Socket setup
  useEffect(() => {
    if (!token || !isAuthenticated) return;

    console.log('[UserSupport] Registering socket listeners...');

    const socket = connectSocket(token);

    socket?.on('support:new-message', (msg: Message) => {
      console.log('[UserSupport] Received support:new-message:', msg);
      
      // Nếu tin nhắn không phải do mình gửi -> Phát tiếng chuông
      if (msg.senderId !== user?.id) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) {
            console.log('[UserSupport] Message already exists, skipping sound');
            return prev;
          }
          console.log('[UserSupport] New message from support! Triggering sound...');
          playNotificationSound();
          return [...prev, msg];
        });
      }
    });

    socket?.on('support:message-sent', (msg: Message) => {
      console.log('[UserSupport] Received support:message-sent (Confirmation)', msg);
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket?.off('support:new-message');
      socket?.off('support:message-sent');
    };
  }, [token, isAuthenticated, user]);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = (content?: string, imageUrl?: string) => {
    const textMsg = content || newMessage.trim();
    if (!textMsg && !imageUrl) return;
    if (!token) return;

    const socket = connectSocket(token);
    socket?.emit('support:send-message', {
      receiverId: ADMIN_ID,
      message: textMsg || undefined,
      imageUrl: imageUrl || undefined
    });

    if (!content) setNewMessage('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await supportApi.uploadImage(formData);
      if (res.data.success) {
        handleSendMessage(undefined, res.data.imageUrl);
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <DashboardGuard>
      <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-hidden flex flex-col p-0 md:p-6 lg:p-8 bg-[#050505]">
          <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full bg-[#0a0a0a] border border-[#1a1a2e] rounded-2xl overflow-hidden shadow-2xl">
              {/* Support Info */}
              <div className="p-4 md:p-6 border-b border-[#1a1a2e] bg-gradient-to-r from-blue-900/10 to-transparent flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-blue-600/20 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 md:w-7 md:h-7 text-blue-500" />
                </div>
                <div className="overflow-hidden">
                  <h2 className="text-sm md:text-lg font-bold truncate">{t('helpCenter')}</h2>
                  <p className="text-[10px] md:text-sm text-gray-500 truncate">{t('helpSubtitle')}</p>
                </div>
                <div className="ml-auto flex flex-col items-end shrink-0">
                  <span className="flex items-center gap-1.5 text-[9px] md:text-xs font-bold text-green-500 uppercase">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span>Online</span>
                  </span>
                  <p className="text-[9px] text-gray-600 mt-0.5 uppercase font-black tracking-widest leading-none">~2 mins</p>
                </div>
              </div>

              {/* Messages Area */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 md:p-10 space-y-4 md:space-y-6 bg-black/40"
                style={{ backgroundImage: 'radial-gradient(#1a1a1a 1px, transparent 1px)', backgroundSize: '30px 30px' }}
              >
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Loader2 className="animate-spin text-blue-500" size={24} />
                    <p className="text-gray-600 italic text-xs tracking-widest">{t('loadingHistory')}</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40 p-10">
                    <MessageSquare size={60} className="text-gray-700" />
                    <div className="space-y-1">
                      <p className="text-lg font-bold">{t('startChatting')}</p>
                      <p className="text-xs max-w-[200px] mx-auto">{t('firstMessage')}</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-2 max-w-[90%] md:max-w-[80%] ${isMe ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${isMe ? 'bg-blue-600' : 'bg-gray-800/80 shadow-md'}`}>
                            <UserIcon className="w-4 h-4 text-white" />
                          </div>
                          <div className="space-y-1">
                            <div className={`px-4 py-3 rounded-2xl text-[13px] md:text-sm leading-relaxed shadow-sm ${
                              isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-[#1a1a2e] text-gray-200 rounded-tl-none border border-[#2a2a3e]'
                            }`}>
                              {msg.message && <div>{msg.message}</div>}
                              {msg.imageUrl && (
                                <div className="mt-2">
                                  {isVideo(msg.imageUrl) ? (
                                    <video 
                                      src={`${process.env.NEXT_PUBLIC_API_URL}${msg.imageUrl}`.replace('/api', '')} 
                                      controls 
                                      className="rounded-xl w-full max-w-[280px] h-auto border border-white/10 shadow-lg"
                                    />
                                  ) : (
                                    <img 
                                      src={`${process.env.NEXT_PUBLIC_API_URL}${msg.imageUrl}`.replace('/api', '')} 
                                      alt="Uploaded" 
                                      className="rounded-xl w-full max-w-[280px] max-h-[400px] object-cover cursor-zoom-in border border-white/10 hover:opacity-90 transition-opacity"
                                      onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}${msg.imageUrl}`.replace('/api', ''), '_blank')}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                            <p className={`text-[9px] text-gray-600 font-bold uppercase tracking-widest ${isMe ? 'text-right mr-1' : 'text-left ml-1'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 md:p-6 bg-[#080808] border-t border-[#1a1a2e] shrink-0">
                <div className="flex gap-2 md:gap-3">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <Button 
                    variant="outline"
                    className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-[#111] border-[#1a1a2e] text-gray-500 hover:text-white shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="animate-spin" size={18} /> : <ImageIcon size={20} />}
                  </Button>
                  <input 
                    type="text" 
                    placeholder={t('supportPlaceholder')} 
                    className="flex-1 bg-[#111] border border-[#1a1a2e] rounded-xl px-4 md:px-6 py-3 md:py-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all text-white shadow-inner placeholder:text-gray-800"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    disabled={isUploading}
                  />
                  <Button 
                    onClick={() => handleSendMessage()}
                    disabled={(!newMessage.trim() && !isUploading) || isUploading}
                    className="bg-blue-600 hover:bg-blue-700 h-12 md:h-14 px-6 rounded-xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
                <p className="mt-3 text-[9px] text-gray-800 text-center uppercase tracking-[0.4em] font-black">{t('securePrivate')}</p>
              </div>
          </div>
        </main>
      </div>
    </DashboardGuard>
  );
}
