'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, User as UserIcon, Loader2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n-context';
import { connectSocket } from '@/lib/socket';
import { supportApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { playNotificationSound } from '@/lib/sounds';

interface Message {
  id?: number;
  senderId: number;
  receiverId: number;
  message?: string;
  imageUrl?: string;
  createdAt: string;
}

const USER_CANNED_RESPONSES = [
  "Làm sao để nạp tiền vào tài khoản?",
  "Tôi gặp lỗi khi rút tiền, vui lòng kiểm tra giúp.",
  "Tôi muốn nâng cấp tài khoản VIP.",
  "Lệnh của tôi bị kẹt, hãy hỗ trợ tôi.",
  "Cho tôi hỏi về các chương trình khuyến mãi hiện có."
];

const isVideo = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
};

export default function ChatWidget() {
  const { user, token, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const CANNED_KEYS = ['canned1', 'canned2', 'canned3', 'canned4', 'canned5'] as const;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Default Admin ID (assuming Admin is ID 1 or we can find an admin)
  // In a real system, we might need a way to find an active admin
  const ADMIN_ID = 1; 

  useEffect(() => {
    if (isOpen && isAuthenticated && user && user.role !== 'admin') {
      fetchHistory();
    }
  }, [isOpen, isAuthenticated, user]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await supportApi.getHistory(ADMIN_ID);
      if (res.data.success) {
        setMessages(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Socket setup
  useEffect(() => {
    if (!token || !isAuthenticated || user?.role === 'admin') return;

    const socket = connectSocket(token);

    socket?.on('support:new-message', (msg: Message) => {
      console.log('[ChatWidget] Received support:new-message:', msg);
      
      // Nếu tin nhắn không phải do mình gửi -> Phát tiếng chuông
      if (msg.senderId !== user?.id) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) {
            console.log('[ChatWidget] Message already exists, skipping sound');
            return prev;
          }
          console.log('[ChatWidget] New message from support! Triggering sound...');
          playNotificationSound();
          return [...prev, msg];
        });
      }
    });

    socket?.on('support:message-sent', (msg: Message) => {
      console.log('[ChatWidget] Received support:message-sent (Confirmation)', msg);
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket?.off('support:new-message');
      socket?.off('support:message-sent');
    };
  }, [token, isAuthenticated, user, isOpen]);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  interface Message {
    id?: number;
    senderId: number;
    receiverId: number;
    message?: string;
    imageUrl?: string;
    createdAt: string;
  }

  const handleSendMessage = (content?: string, imageUrl?: string) => {
    const textMsg = content || newMessage.trim();
    if (!textMsg && !imageUrl) return;
    if (!token || !user) return;

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
      alert(error.response?.data?.message || 'Lỗi upload ảnh');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isAuthenticated || user?.role === 'admin') return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-80 md:w-96 h-[500px] bg-[#0a0a0a] border border-[#1a1a2e] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-blue-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <UserIcon size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{t('onlineSupport')}</h3>
                  <p className="text-[10px] text-blue-100 uppercase font-black">{t('adminOnline')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/support" title="Mở trang đầy đủ">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10">
                    <Send size={14} className="-rotate-45" />
                  </Button>
                </Link>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/50"
              style={{ backgroundImage: 'radial-gradient(#111 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="animate-spin text-blue-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <MessageSquare size={40} className="text-gray-800 mb-2" />
                  <p className="text-xs text-gray-500">{t('chatWelcome')}</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                        isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-[#1a1a2e] text-gray-200 rounded-bl-none'
                      }`}>
                        {msg.message && (
                          <div className="whitespace-pre-wrap break-words">{msg.message}</div>
                        )}
                        {msg.imageUrl && (
                          <div className="mt-1">
                            {isVideo(msg.imageUrl) ? (
                              <video 
                                src={`${process.env.NEXT_PUBLIC_API_URL}${msg.imageUrl}`.replace(/(https?:\/\/[^/]+)\/api/, "$1")} 
                                controls 
                                className="rounded-lg max-w-[200px] h-auto border border-white/10 shadow-sm"
                              />
                            ) : (
                              <img 
                                src={`${process.env.NEXT_PUBLIC_API_URL}${msg.imageUrl}`.replace(/(https?:\/\/[^/]+)\/api/, "$1")} 
                                alt="Uploaded" 
                                className="rounded-lg max-w-[180px] max-h-[180px] object-cover cursor-zoom-in border border-white/10 hover:brightness-110 transition-all shadow-sm"
                                onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}${msg.imageUrl}`.replace(/(https?:\/\/[^/]+)\/api/, "$1"), '_blank')}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-[#1a1a2e] bg-[#0a0a0a]">
              {/* User Canned Responses */}
              <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar mb-2 border-b border-[#1a1a2e]/30">
                {CANNED_KEYS.map((key, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(t(key as any))}
                    className="whitespace-nowrap bg-[#111] hover:bg-blue-600/20 border border-[#1a1a2e] text-[9px] font-black py-1 px-2.5 rounded-full text-gray-500 hover:text-blue-400 transition-all uppercase tracking-wider"
                  >
                    {t(key as any)}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 items-center">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />
                <Button 
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-gray-400 hover:text-white hover:bg-white/5"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon size={18} />}
                </Button>
                <textarea 
                  placeholder={t('supportPlaceholder')} 
                  className="flex-1 bg-[#111] border border-[#1a1a2e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white resize-none"
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
                    size="icon"
                    onClick={() => handleSendMessage()}
                    disabled={(!newMessage.trim() && !isUploading) || isUploading}
                    className="bg-blue-600 hover:bg-blue-700 h-9 w-9 rounded-lg"
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl hover:bg-blue-700 transition-colors"
        >
          <MessageSquare size={24} />
        </motion.button>
      )}
    </div>
  );
}
