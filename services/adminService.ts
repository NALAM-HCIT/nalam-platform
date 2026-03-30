import { api } from './api';

// ─── Types ──────────────────────────────────────────

export interface AuditLogItem {
    id: string;
    action: string;
    user: string;         // "System" if no user
    category: string;     // admin | appointment | reception | pharmacy | auth
    severity: string;     // info | warning | error
    details: string | null;
    createdAt: string;    // ISO 8601
}

export interface ActivityResponse {
    total: number;
    page: number;
    pageSize: number;
    items: AuditLogItem[];
}

// ─── Service ────────────────────────────────────────

export const adminService = {
    /**
     * GET /api/admin/activity — paginated audit log
     */
    getActivity: async (
        page = 1,
        pageSize = 20,
        category?: string,
    ): Promise<ActivityResponse> => {
        const params: Record<string, string | number> = { page, pageSize };
        if (category) params.category = category;
        const res = await api.get('/admin/activity', { params });
        return res.data;
    },

    /**
     * GET /api/admin/users — returns users array; used for count
     */
    getUserCount: async (): Promise<number> => {
        const res = await api.get('/admin/users');
        return Array.isArray(res.data) ? res.data.length : 0;
    },
};
