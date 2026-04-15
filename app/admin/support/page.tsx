'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { connectSocket } from '@/lib/socket';
import { supportApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, Home, LogOut, MessageSquare, 
  Send, User as UserIcon, Clock, ChevronLeft,
  Search, Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n-context';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { toast } from 'sonner';
import { playNotificationSound } from '@/lib/sounds';

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  message?: string;
  imageUrl?: string;
  createdAt: string;
  sender?: {
    email: string;
    fullName: string | null;
    phone?: string | null;
  };
}

const CANNED_RESPONSES = [
  "Chào bạn, BR có thể giúp gì cho bạn?",
  "Hiện tại hệ thống nạp/rút đang bảo trì trong 30 phút, bạn vui lòng đợi nhé.",
  "Bạn vui lòng cung cấp ảnh chụp màn hình lỗi để Admin hỗ trợ nhanh hơn.",
  "Yêu cầu của bạn đã được xử lý thành công.",
  "Cảm ơn bạn đã tin tưởng BR!"
];

interface Conversation {
  user: {
    id: number;
    email: string | null;
    phone: string | null;
    fullName: string | null;
    role: string;
  };
  lastMessage: Message | null;
}

const isVideo = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
};

export default function AdminSupportPage() {
  const { user, token, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auth guard
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await supportApi.getConversations();
      if (res.data.success) {
        setConversations(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const fetchMessages = useCallback(async (userId: number) => {
    setLoadingMessages(true);
    try {
      const res = await supportApi.getHistory(userId);
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
    if (isAuthenticated && user?.role === 'admin') {
      fetchConversations();
    }
  }, [isAuthenticated, user, fetchConversations]);

  useEffect(() => {
    if (selectedUserId) {
      fetchMessages(selectedUserId);
    }
  }, [selectedUserId, fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Socket setup
  useEffect(() => {
    if (!token || user?.role !== 'admin') return;

    const socket = connectSocket(token);
    console.log('[AdminSupport] Registering socket listeners...');

    socket?.on('support:new-message', (msg: Message) => {
      console.log('[AdminSupport] Received support:new-message:', msg);
      // If the message is from or to the currently selected user, add it to the thread
      if (selectedUserId === msg.senderId || selectedUserId === msg.receiverId) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) {
            console.log('[AdminSupport] Message already exists, skipping sound');
            return prev;
          }
          console.log('[AdminSupport] New message in current thread! Triggering sound...');
          playNotificationSound();
          return [...prev, msg];
        });
      } else {
        // Even if not selected, if it's from a user (not self), play sound
        if (msg.senderId !== user.id) {
           console.log('[AdminSupport] Message from non-selected user! Triggering sound...');
           playNotificationSound();
        }
      }
      
      // Refresh conversation list to update last message
      fetchConversations();
      
      // Toast if not currently chatting with this user
      if (selectedUserId !== msg.senderId && msg.senderId !== user.id) {
        // Fallback: try to find the user info from conversations list if msg.sender is missing
        const senderFromList = conversations.find(c => c.user.id === msg.senderId)?.user;
        
        const name = msg.sender?.fullName || senderFromList?.fullName || 'Người dùng';
        const phone = msg.sender?.phone || senderFromList?.phone || msg.sender?.email || senderFromList?.email || '';
        const displayInfo = phone ? `${name} (${phone})` : name;
        
        console.log('[AdminSupport] New message notification for:', displayInfo, msg);
        toast.info(`${t('support')}: ${displayInfo}`);
      }
    });

    socket?.on('support:message-sent', (msg: Message) => {
      console.log('[AdminSupport] Received support:message-sent (Confirmation):', msg);
      if (selectedUserId === msg.receiverId) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      fetchConversations();
    });

    return () => {
      socket?.off('support:new-message');
      socket?.off('support:message-sent');
    };
  }, [token, user, selectedUserId, fetchConversations, fetchMessages]);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = (content?: string, imageUrl?: string) => {
    const textMsg = content || newMessage.trim();
    if (!textMsg && !imageUrl) return;
    if (!selectedUserId || !token) return;

    const socket = connectSocket(token);
    socket?.emit('support:send-message', {
      receiverId: selectedUserId,
      message: textMsg || undefined,
      imageUrl: imageUrl || undefined
    });

    setNewMessage('');
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
      toast.error(error.response?.data?.message || 'Lỗi upload ảnh');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const sortedConversations = [...conversations].sort((a, b) => {
    const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  const filteredConversations = sortedConversations.filter(c => 
    (c.user.email && c.user.email.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (c.user.phone && c.user.phone.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (c.user.fullName && c.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center text-gray-500">{t('loading')}</div>;

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      <AdminHeader />

      <main className="flex-1 overflow-hidden flex relative">
        {/* Sidebar - Users List */}
        <div className={`${selectedUserId ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-[#1a1a2e] flex-col bg-[#080808]`}>
          <div className="p-4 border-b border-[#1a1a2e]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder={`${t('support')}...`} 
                className="w-full bg-[#111] border border-[#1a1a2e] rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="p-4 text-center text-gray-500 text-sm italic">{t('loading')}</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-600 text-sm">{t('noTrades')}</div>
            ) : (
              filteredConversations.map((conv) => (
                <div 
                  key={conv.user.id}
                  onClick={() => setSelectedUserId(conv.user.id)}
                  className={`p-4 border-b border-[#1a1a2e]/50 cursor-pointer transition-all hover:bg-white/5 ${selectedUserId === conv.user.id ? 'bg-blue-600/10 border-l-4 border-l-blue-500' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                      <UserIcon size={20} className="text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-sm truncate">{conv.user.email || conv.user.phone || 'N/A'}</p>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-gray-500 shrink-0">
                            {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {conv.lastMessage?.message || t('pendingLabel')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`${!selectedUserId ? 'hidden md:flex' : 'flex'} flex-1 min-w-0 flex-col bg-black relative`}>
          {!selectedUserId ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 p-8 text-center">
              <MessageSquare size={64} className="mb-4 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-[10px]">{t('support')}</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="h-14 md:h-16 border-b border-[#1a1a2e] flex items-center px-4 md:px-6 justify-between bg-[#0a0a0a]">
                <div className="flex items-center gap-3 overflow-hidden">
                  <button onClick={() => setSelectedUserId(null)} className="md:hidden p-2 -ml-2 text-gray-500 hover:text-white">
                    <ChevronLeft size={20} />
                  </button>
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                    <UserIcon size={16} className="text-blue-500 md:hidden" />
                    <UserIcon size={20} className="text-blue-500 hidden md:block" />
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-xs md:text-sm truncate">
                      {conversations.find(c => c.user.id === selectedUserId)?.user.email || 
                       conversations.find(c => c.user.id === selectedUserId)?.user.phone || 'N/A'}
                    </h3>
                    <p className="text-[9px] md:text-[10px] text-green-500 uppercase font-black">{t('online')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      playNotificationSound();
                    }}
                    className="bg-blue-600/10 border-blue-500/30 text-blue-500 hover:bg-blue-600 hover:text-white text-[10px] font-black uppercase"
                  >
                    🔔 Test Sound
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => fetchMessages(selectedUserId)} className="hidden md:flex text-gray-500 hover:text-white uppercase font-black text-[10px]">
                    {t('back')}
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-4"
                style={{ backgroundImage: 'radial-gradient(#111 1px, transparent 1px)', backgroundSize: '20px 20px' }}
              >
                {loadingMessages ? (
                  <div className="text-center py-10 text-gray-500 italic">{t('loading')}</div>
                ) : (
                  <>
                    {messages.length === 0 && (
                      <div className="text-center py-4">
                        <span className="text-[10px] bg-gray-900 px-3 py-1 rounded-full text-gray-500 uppercase tracking-widest font-bold">{t('startChat')}</span>
                      </div>
                    )}
                    {messages.map((msg, i) => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div key={msg.id || `msg-${i}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                          <div className={`max-w-[85%] md:max-w-[70%] group`}>
                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-[#1a1a2e] text-gray-200 rounded-bl-none border border-white/5'}`}>
                              {msg.message && <div className="whitespace-pre-wrap break-words">{msg.message}</div>}
                              {msg.imageUrl && (
                                <div className="mt-2">
                                  {isVideo(msg.imageUrl) ? (
                                    <video 
                                      src={`${process.env.NEXT_PUBLIC_API_URL}${msg.imageUrl}`.replace(/(https?:\/\/[^/]+)\/api/, "$1")} 
                                      controls 
                                      className="rounded-lg max-w-[240px] h-auto border border-white/10 shadow-lg"
                                    />
                                  ) : (
                                    <div className="relative group/img">
                                      <img 
                                        src={`${process.env.NEXT_PUBLIC_API_URL}${msg.imageUrl}`.replace(/(https?:\/\/[^/]+)\/api/, "$1")} 
                                        alt="Uploaded" 
                                        className="rounded-lg max-w-[200px] max-h-[200px] object-cover cursor-zoom-in border border-white/10 transition-all hover:opacity-80 shadow-md"
                                        onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}${msg.imageUrl}`.replace(/(https?:\/\/[^/]+)\/api/, "$1"), '_blank')}
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 pointer-events-none transition-opacity">
                                        <span className="bg-black/60 text-[10px] px-2 py-1 rounded text-white">Click to enlarge</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <p className={`text-[10px] mt-1 text-gray-600 uppercase font-bold ${isMe ? 'text-right' : 'text-left'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-[#1a1a2e] bg-[#0a0a0a]">
                {/* Canned Responses */}
                <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar w-full">
                  {CANNED_RESPONSES.map((resp, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(resp)}
                      className="whitespace-nowrap bg-white/5 hover:bg-blue-600/20 border border-white/10 text-[9px] md:text-[10px] font-black py-2 px-4 rounded-xl text-gray-400 hover:text-blue-400 transition-all uppercase tracking-widest"
                    >
                      {resp}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="w-12 h-12 rounded-xl bg-[#111] border border-[#1a1a2e] text-gray-500 hover:text-white"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? <ImageIcon size={20} className="animate-pulse text-blue-500" /> : <ImageIcon size={20} />}
                  </Button>
                  <textarea 
                  placeholder={t('support')} 
                  className="flex-1 bg-[#111] border border-[#1a1a2e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (window.matchMedia('(max-width: 1024px)').matches) return;
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isUploading}
                />
                  <Button 
                    onClick={() => handleSendMessage()}
                    className="bg-blue-600 hover:bg-blue-700 w-12 h-12 rounded-xl flex items-center justify-center p-0 shrink-0"
                    disabled={(!newMessage.trim() && !isUploading) || isUploading}
                  >
                    <Send size={20} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
