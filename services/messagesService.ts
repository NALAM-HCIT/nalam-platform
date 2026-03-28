import { api } from './api';

// ─── Types ──────────────────────────────────────────

export interface MessageThread {
    userId: string;
    name: string;
    initials: string;
    role: string;
    department: string | null;
    lastMessage: string | null;
    lastMessageAt: string | null;    // ISO 8601
    isSentByMe: boolean;
    unreadCount: number;
}

export interface MessageContact {
    userId: string;
    name: string;
    initials: string;
    role: string;
    department: string | null;
    lastMessage: null;
    lastMessageAt: null;
    isSentByMe: false;
    unreadCount: 0;
}

export interface ThreadsResponse {
    threads: MessageThread[];
    contacts: MessageContact[];
}

export interface MessageItem {
    id: string;
    body: string;
    isSentByMe: boolean;
    isRead: boolean;
    createdAt: string;   // ISO 8601
}

export interface ThreadResponse {
    recipient: {
        id: string;
        name: string;
        initials: string;
        role: string;
        department: string | null;
    };
    messages: MessageItem[];
}

// ─── Service ────────────────────────────────────────

export const messagesService = {
    /**
     * GET /api/messages/threads — all threads + contactable staff (no messages yet)
     */
    getThreads: async (): Promise<ThreadsResponse> => {
        const res = await api.get('/messages/threads');
        return res.data;
    },

    /**
     * GET /api/messages/thread/{recipientId} — full message history + marks unread as read
     */
    getThread: async (recipientId: string): Promise<ThreadResponse> => {
        const res = await api.get(`/messages/thread/${recipientId}`);
        return res.data;
    },

    /**
     * POST /api/messages/send — send a message to another staff member
     */
    sendMessage: async (recipientId: string, body: string): Promise<MessageItem> => {
        const res = await api.post('/messages/send', { recipientId, body });
        return res.data;
    },

    /**
     * PUT /api/messages/thread/{recipientId}/read — mark thread as read
     */
    markThreadRead: async (recipientId: string): Promise<void> => {
        await api.put(`/messages/thread/${recipientId}/read`);
    },
};
