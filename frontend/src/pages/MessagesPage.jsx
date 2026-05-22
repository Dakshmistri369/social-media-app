import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RiSendPlane2Fill, RiImageLine, RiCloseLine } from 'react-icons/ri';
import API from '../utils/api';
import useAuthStore from '../store/authStore';
import { socket } from '../utils/socket';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { getSharedKey, encryptMessage, decryptMessage } from '../utils/crypto';
import { hasAbusiveLanguage } from '../utils/badWordsFilter';
import './MessagesPage.css';

export default function MessagesPage() {
  const { user: currentUser } = useAuthStore();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('user');

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  
  // Media states
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // 1. Fetch conversations
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const { data } = await API.get('/chats/conversations');
      if (data.success) {
        setConversations(data.conversations);
        
        // If targetUserId is provided in query, find or initialize the chat
        if (targetUserId) {
          const existing = data.conversations.find((c) =>
            c.participants.some((p) => p._id === targetUserId)
          );
          if (existing) {
            setActiveConversation(existing);
          } else {
            // Fetch target user's details to show a draft conversation
            const userRes = await API.get(`/users/${targetUserId}`);
            if (userRes.data?.success) {
              const draftChat = {
                _id: 'draft',
                participants: [currentUser, userRes.data.user],
                messages: []
              };
              setActiveConversation(draftChat);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  // 2. Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation && activeConversation._id !== 'draft') {
      fetchMessages(activeConversation._id);
    } else {
      setMessages([]);
    }
  }, [activeConversation]);

  const fetchMessages = async (conversationId) => {
    try {
      const { data } = await API.get(`/chats/conversations/${conversationId}/messages`);
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  // 3. Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Socket listeners for real-time events
  useEffect(() => {
    // Listen for online users
    socket.on('onlineUsers', (userIds) => {
      setOnlineUserIds(userIds);
    });

    // Request current online users on mount
    socket.emit('getOnlineUsers');

    // Listen for incoming messages
    socket.on('newMessage', (message) => {
      if (activeConversation && message.conversation === activeConversation._id) {
        setMessages((prev) => [...prev, message]);
      }
    });

    // Listen for conversation updates (updates snippet list)
    socket.on('conversationUpdated', () => {
      fetchConversations();
    });

    return () => {
      socket.off('onlineUsers');
      socket.off('newMessage');
      socket.off('conversationUpdated');
    };
  }, [activeConversation]);

  // 5. Media attachments
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    const reader = new FileReader();
    reader.onload = () => setMediaPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  // 6. Send message handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !mediaFile) return;

    // Block messages containing abusive language
    if (hasAbusiveLanguage(text)) {
      toast.error('Message contains abusive, profane, or inappropriate language.');
      return;
    }

    const recipient = activeConversation.participants.find((p) => p._id !== currentUser._id);
    if (!recipient) return;

    let mediaUrl = '';
    let mediaType = 'none';

    setIsUploading(true);

    try {
      // Upload media if present
      if (mediaFile) {
        const formData = new FormData();
        formData.append('media', mediaFile);
        const { data } = await API.post('/upload/media', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (data?.media?.length > 0) {
          mediaUrl = data.media[0].url;
          mediaType = data.media[0].type;
        }
      }

      // E2EE Encryption
      const secretKey = getSharedKey(currentUser._id || currentUser.id, recipient._id);
      const encryptedText = encryptMessage(text.trim(), secretKey);

      const { data } = await API.post('/chats/messages', {
        recipientId: recipient._id,
        text: encryptedText,
        mediaUrl,
        mediaType
      });

      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        setText('');
        removeMedia();
        
        // If it was a draft conversation, update active state to the real ID
        if (activeConversation._id === 'draft') {
          fetchConversations();
          setActiveConversation({
            ...activeConversation,
            _id: data.conversationId
          });
        } else {
          // Refresh snippet
          fetchConversations();
        }
      }
    } catch (err) {
      toast.error('Message failed to send');
    } finally {
      setIsUploading(false);
    }
  };

  const getChatPartner = (chat) => {
    return chat.participants.find((p) => p._id !== currentUser._id) || {};
  };

  const isPartnerOnline = (partnerId) => {
    return onlineUserIds.includes(partnerId);
  };

  return (
    <div className="messages-page-layout">
      {/* Conversations Left Panel */}
      <div className="conversations-panel">
        <div className="panel-header">
          <h2>Direct Messages</h2>
        </div>
        <div className="conversations-list">
          {conversations.length === 0 && (
            <div className="empty-conversations">
              <p>No conversations yet</p>
            </div>
          )}
          {conversations.map((chat) => {
            const partner = getChatPartner(chat);
            const isOnline = isPartnerOnline(partner._id);
            const isActive = activeConversation && activeConversation._id === chat._id;
            
            const secretKey = getSharedKey(currentUser._id || currentUser.id, partner._id);
            const decryptedSnippet = chat.lastMessage?.text 
              ? decryptMessage(chat.lastMessage.text, secretKey)
              : '';
            
            return (
              <div
                key={chat._id}
                className={`conversation-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveConversation(chat)}
              >
                <div className="conversation-avatar-wrap">
                  {partner.avatar ? (
                    <img src={partner.avatar} alt="" className="avatar avatar-md" />
                  ) : (
                    <div className="avatar-placeholder avatar-md">
                      {partner.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isOnline && <span className="online-indicator-dot" />}
                </div>
                <div className="conversation-details">
                  <div className="conversation-top-row">
                    <span className="partner-name">{partner.name}</span>
                    {chat.lastMessage && (
                      <span className="snippet-time">
                        {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <div className="conversation-bottom-row">
                    <span className="snippet-text">
                      {chat.lastMessage?.sender?._id === currentUser._id ? 'You: ' : ''}
                      {decryptedSnippet || (chat.lastMessage?.mediaUrl ? 'Shared an attachment' : 'Start chatting...')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Messages Viewer Right Panel */}
      <div className="chat-viewport-panel">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="chat-header">
              <div className="chat-header-user">
                <div className="conversation-avatar-wrap">
                  {getChatPartner(activeConversation).avatar ? (
                    <img src={getChatPartner(activeConversation).avatar} alt="" className="avatar avatar-md" />
                  ) : (
                    <div className="avatar-placeholder avatar-md">
                      {getChatPartner(activeConversation).name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isPartnerOnline(getChatPartner(activeConversation)._id) && (
                    <span className="online-indicator-dot" />
                  )}
                </div>
                <div className="chat-header-info">
                  <span className="chat-header-name">{getChatPartner(activeConversation).name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="chat-header-status">
                      {isPartnerOnline(getChatPartner(activeConversation)._id) ? 'Online' : 'Offline'}
                    </span>
                    <span className="e2ee-badge" title="End-to-End Encrypted" style={{ fontSize: '11px', color: 'var(--accent)', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '2px' }}>
                      • 🔒 E2EE
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scroller */}
            <div className="chat-scroller">
              {messages.map((msg) => {
                const isMine = msg.sender?._id === currentUser._id || msg.sender === currentUser._id;
                const partner = getChatPartner(activeConversation);
                const secretKey = getSharedKey(currentUser._id || currentUser.id, partner._id);
                const decryptedText = decryptMessage(msg.text, secretKey);

                return (
                  <div key={msg._id} className={`message-bubble-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                    <div className="message-bubble">
                      {msg.mediaUrl && (
                        <div className="message-media-attachment">
                          {msg.mediaType === 'video' ? (
                            <video src={msg.mediaUrl} controls className="message-attached-media" />
                          ) : (
                            <img src={msg.mediaUrl} alt="" className="message-attached-media" />
                          )}
                        </div>
                      )}
                      {msg.text && <p className="message-text">{decryptedText}</p>}
                    </div>
                    <span className="message-time">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Media Preview Drawer */}
            {mediaPreview && (
              <div className="chat-media-preview-drawer">
                {mediaFile?.type.startsWith('video/') ? (
                  <video src={mediaPreview} className="preview-media" />
                ) : (
                  <img src={mediaPreview} alt="" className="preview-media" />
                )}
                <button className="remove-preview-btn" onClick={removeMedia}>
                  <RiCloseLine />
                </button>
              </div>
            )}

            {/* Input form */}
            <form className="chat-input-bar" onSubmit={handleSendMessage}>
              <button
                type="button"
                className="chat-attach-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <RiImageLine />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept="image/*,video/*"
              />
              <input
                type="text"
                className="chat-text-input"
                placeholder="Secure connection established. Start sync..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button type="submit" className="chat-submit-btn" disabled={isUploading}>
                <RiSendPlane2Fill />
              </button>
            </form>
          </>
        ) : (
          <div className="chat-placeholder">
            <span className="chat-placeholder-icon">💬</span>
            <h3>Select a Conversation</h3>
            <p>Connect instantly in real-time. Direct messages are encrypted and secure.</p>
          </div>
        )}
      </div>
    </div>
  );
}
