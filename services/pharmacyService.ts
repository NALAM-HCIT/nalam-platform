import { api } from './api';

export interface Medicine {
    id: string;
    name: string;
    genericName: string | null;
    category: string;
    dosageForm: string;
    strength: string | null;
    manufacturer: string | null;
    price: number;
    packSize: string | null;
    stockQuantity: number;
    requiresPrescription: boolean;
}

export interface MedicineListResponse {
    total: number;
    page: number;
    pageSize: number;
    medicines: Medicine[];
}

export const pharmacyService = {
    /**
     * GET /api/medicines — list medicines with optional search/category filter
     */
    getMedicines: async (params?: {
        search?: string;
        category?: string;
        page?: number;
        pageSize?: number;
    }): Promise<MedicineListResponse> => {
        const res = await api.get('/medicines', { params });
        return res.data;
    },

    /**
     * GET /api/medicines/categories — distinct categories for the hospital
     */
    getCategories: async (): Promise<string[]> => {
        const res = await api.get('/medicines/categories');
        return res.data;
    },
};
