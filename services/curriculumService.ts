import { CurriculumBook } from '../types';

const CURRICULUM_KEY = 'st_curriculum_books';

export const saveCurriculum = (book: CurriculumBook): void => {
    const all = getAllCurricula();
    // Replace if same id exists, otherwise prepend
    const idx = all.findIndex(b => b.id === book.id);
    if (idx >= 0) {
        all[idx] = book;
    } else {
        all.unshift(book);
    }
    localStorage.setItem(CURRICULUM_KEY, JSON.stringify(all));
};

export const getAllCurricula = (): CurriculumBook[] => {
    try {
        const stored = localStorage.getItem(CURRICULUM_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const getCurriculumById = (id: string): CurriculumBook | null => {
    const all = getAllCurricula();
    return all.find(b => b.id === id) || null;
};

export const deleteCurriculum = (id: string): void => {
    const all = getAllCurricula().filter(b => b.id !== id);
    localStorage.setItem(CURRICULUM_KEY, JSON.stringify(all));
};
