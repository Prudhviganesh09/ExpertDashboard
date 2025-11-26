import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { API_ENDPOINTS } from '@/config/api';

interface ChatbotProps {
  clientId: string;
  sidebarOpen?: boolean;
  isFullPanel?: boolean;
  onClose?: () => void;
  onToggleChat?: (open: boolean) => void;
  chatOpen?: boolean;
}

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
}

const LOCALSTORAGE_PREFIX = 'client_chat_';
const SESSION_ID_KEY = 'chat_session_id_';

const Chatbot: React.FC<ChatbotProps> = ({ 
  clientId, 
  sidebarOpen = true, 
  isFullPanel = false,
  onClose,
  onToggleChat,
  chatOpen: externalChatOpen
}) => {
  const [internalChatOpen, setInternalChatOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Use external state if provided, otherwise use internal state
  const chatOpen = externalChatOpen !== undefined ? externalChatOpen : internalChatOpen;
  const setChatOpen = (open: boolean) => {
    if (onToggleChat) {
      onToggleChat(open);
    } else {
      setInternalChatOpen(open);
    }
  };

  // Generate or load sessionId
  useEffect(() => {
    const sessionKey = SESSION_ID_KEY + clientId;
    let existingSessionId = localStorage.getItem(sessionKey);
    
    if (!existingSessionId) {
      // Generate a new sessionId if none exists (numbers only)
      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 1000000); // 6-digit random number
      existingSessionId = timestamp.toString() + randomNum.toString().padStart(6, '0');
      localStorage.setItem(sessionKey, existingSessionId);
    }
    
    setSessionId(existingSessionId);
  }, [clientId]);

  // Load messages from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(LOCALSTORAGE_PREFIX + clientId);
    if (stored) {
      setMessages(JSON.parse(stored));
    }
  }, [clientId]);

  // Save messages to localStorage
  useEffect(() => {
    localStorage.setItem(LOCALSTORAGE_PREFIX + clientId, JSON.stringify(messages));
  }, [messages, clientId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    const newMsg: Message = {
      text: userMessage,
      sender: 'user',
      timestamp: Date.now(),
    };
    
    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    
    // Show typing indicator
    const typingMsg: Message = {
      text: 'Typing...',
      sender: 'bot',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, typingMsg]);
    
         try {
               // Send message to n8n webhook
        console.log('Sending message to webhook:', {
          message: userMessage,
          clientId: clientId,
          sessionId: sessionId,
          timestamp: Date.now(),
        });
        
                // Use the backend proxy to avoid CORS issues
         const response = await fetch(`${API_ENDPOINTS.WEBHOOK_PROXY}?message=${encodeURIComponent(userMessage)}&clientId=${encodeURIComponent(clientId)}&sessionId=${encodeURIComponent(sessionId)}&timestamp=${Date.now()}`, {
           method: 'GET',
           headers: {
             'Accept': 'application/json',
           },
         });
       
       console.log('Webhook response status:', response.status);
       
       if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
       }
       
       const data = await response.json();
       console.log('Webhook response data:', data);
       
               // Remove typing indicator and add bot response
        setMessages((prev) => {
          const withoutTyping = prev.filter(msg => msg.text !== 'Typing...');
          return [
            ...withoutTyping,
            {
              text: data.output || data.response || data.message || data.text || 'Thank you for your message!',
              sender: 'bot',
              timestamp: Date.now(),
            },
          ];
        });
     } catch (error) {
       console.error('Error sending message to webhook:', error);
       
       // Remove typing indicator and add error message
       setMessages((prev) => {
         const withoutTyping = prev.filter(msg => msg.text !== 'Typing...');
         return [
           ...withoutTyping,
           {
             text: `I'm having trouble connecting right now. Please try again in a moment, or contact support if the issue persists.`,
             sender: 'bot',
             timestamp: Date.now(),
           },
         ];
       });
     }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setChatOpen(false);
    }
  };

  const testWebhook = async () => {
    try {
      console.log('Testing webhook connection via proxy...');
      
             const response = await fetch(`http://localhost:3000/api/webhook-proxy?message=Test%20message&clientId=test-client&sessionId=${(Date.now() + Math.floor(Math.random() * 1000000)).toString()}&timestamp=${Date.now()}`, {
         method: 'GET',
         headers: {
           'Accept': 'application/json',
         },
       });
      
      console.log('Test response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Test response data:', data);
        alert('Webhook test successful! Check console for details.');
      } else {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Webhook test failed:', error);
      alert(`Webhook test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // If in full panel mode, render as full left panel
  if (isFullPanel && chatOpen) {
    return (
      <div className="flex h-screen w-72 flex-col bg-white border-r border-border shadow-card">
                 {/* Header */}
         <div className="flex items-center justify-between px-6 py-4 border-b border-border">
           <h2 className="text-lg font-bold text-foreground">Chatbot</h2>
           <div className="flex gap-2">
             <button
               onClick={handleClose}
               className="p-2 rounded hover:bg-accent focus:outline-none"
               aria-label="Close chatbot"
             >
               <X className="h-5 w-5" />
             </button>
           </div>
         </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground mt-8">
              No messages yet.
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`mb-3 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
              <span
                className={`inline-block px-3 py-2 rounded-lg max-w-[80%] break-words ${
                  msg.sender === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-foreground'
                }`}
              >
                {msg.text}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="border-t border-border p-4 bg-white"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Floating button positioning - left when sidebar closed, right when sidebar open
  const buttonStyle = {
    position: 'fixed' as const,
    bottom: 24,
    right: sidebarOpen ? 24 : 'auto',
    left: sidebarOpen ? 'auto' : 24,
    zIndex: 1000,
    background: '#2563eb',
    color: 'white',
    borderRadius: '50%',
    width: 56,
    height: 56,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // Chat window style - floating overlay
  const chatWindowStyle = {
    position: 'fixed' as const,
    bottom: 90,
    right: sidebarOpen ? 24 : 'auto',
    left: sidebarOpen ? 'auto' : 24,
    width: 320,
    maxHeight: 420,
    background: 'white',
    borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
    zIndex: 1001,
    display: 'flex',
    flexDirection: 'column' as const,
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        style={buttonStyle}
        aria-label="Open chatbot"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
      
      {/* Chat Window - floating overlay */}
      {chatOpen && (
        <div style={chatWindowStyle}>
                     <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', fontWeight: 600, background: '#2563eb', color: 'white', borderTopLeftRadius: 12, borderTopRightRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span>Chatbot</span>
             <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
               <button
                 onClick={testWebhook}
                 style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}
                 title="Test webhook connection"
               >
                 Test
               </button>
               <button
                 onClick={() => setChatOpen(false)}
                 style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                 aria-label="Close chatbot"
               >
                 <X className="h-5 w-5" />
               </button>
             </div>
           </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, background: '#f9f9f9' }}>
            {messages.length === 0 && <div style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>No messages yet.</div>}
            {messages.map((msg, idx) => (
              <div key={idx} style={{ marginBottom: 10, textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                <span
                  style={{
                    display: 'inline-block',
                    background: msg.sender === 'user' ? '#2563eb' : '#e5e7eb',
                    color: msg.sender === 'user' ? 'white' : '#222',
                    borderRadius: 16,
                    padding: '8px 14px',
                    maxWidth: '80%',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.text}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: 'flex', borderTop: '1px solid #eee', padding: 8, background: '#fff', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              style={{ flex: 1, border: 'none', outline: 'none', padding: 8, borderRadius: 8, fontSize: 15, background: '#f3f4f6' }}
            />
            <button
              type="submit"
              style={{ marginLeft: 8, background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default Chatbot; 