import { CurriculumLesson } from '../types';
import html2pdf from 'html2pdf.js';

const MATERIAL_LABELS: Record<string, string> = {
    paper: 'ورقة',
    stone: 'حجر',
    wood: 'خشب',
    fabric: 'قماش',
    metal: 'معدن',
};

/**
 * Export a curriculum lesson to a beautifully formatted PDF
 */
export const exportLessonToPDF = async (
    lesson: CurriculumLesson,
    bookMetadata?: { subject?: string; grade?: string; part?: string },
    fileName?: string
): Promise<void> => {
    const safeTitle = (lesson.lessonTitle || 'درس').replace(/[/\\?%*:|"<>]/g, '-');
    const pageRange = lesson.pageRange && Array.isArray(lesson.pageRange)
        ? `ص ${lesson.pageRange[0]} - ${lesson.pageRange[1]}`
        : '';

    const content = `
        <div id="lesson-pdf-export" dir="rtl" style="
            font-family: 'Segoe UI', 'Arial', sans-serif;
            padding: 24px;
            background: #f8fafc;
            color: #1e293b;
            max-width: 210mm;
            box-sizing: border-box;
        ">
            <!-- Header -->
            <div style="
                background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
                color: white;
                padding: 20px 24px;
                border-radius: 12px;
                margin-bottom: 24px;
                box-shadow: 0 4px 12px rgba(6, 182, 212, 0.25);
            ">
                <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700;">${escapeHtml(lesson.lessonTitle)}</h1>
                <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; opacity: 0.95;">
                    ${bookMetadata?.subject ? `<span>المادة: ${escapeHtml(bookMetadata.subject)}</span>` : ''}
                    ${bookMetadata?.grade ? `<span>الصف: ${escapeHtml(bookMetadata.grade)}</span>` : ''}
                    ${bookMetadata?.part ? `<span>الجزء: ${escapeHtml(bookMetadata.part)}</span>` : ''}
                    ${pageRange ? `<span>${pageRange}</span>` : ''}
                    <span>${lesson.objectives?.length ?? 0} أهداف</span>
                    <span>${lesson.activities?.length ?? 0} أنشطة</span>
                </div>
            </div>

            <!-- Objectives -->
            ${(lesson.objectives?.length ?? 0) > 0 ? `
            <div style="margin-bottom: 20px;">
                <h2 style="color: #2563eb; font-size: 16px; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #93c5fd;">الأهداف التعليمية</h2>
                <ul style="margin: 0; padding-right: 20px; line-height: 1.8; color: #334155;">
                    ${(lesson.objectives || []).map(o => `<li>${escapeHtml(o)}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            <!-- Key Visuals -->
            ${(lesson.keyVisuals?.length ?? 0) > 0 ? `
            <div style="margin-bottom: 20px;">
                <h2 style="color: #d97706; font-size: 16px; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #fcd34d;">العناصر البصرية</h2>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${(lesson.keyVisuals || []).map(kv => {
                        const bg: Record<string, string> = { paper: '#fffbeb', stone: '#f5f5f4', wood: '#fff7ed', fabric: '#fdf2f8', metal: '#f1f5f9' };
                        const bc: Record<string, string> = { paper: '#fde68a', stone: '#d6d3d1', wood: '#fed7aa', fabric: '#f9a8d4', metal: '#94a3b8' };
                        const b = bg[kv.material] || '#f8fafc';
                        const c = bc[kv.material] || '#e2e8f0';
                        return `
                        <div style="padding: 14px; border-radius: 10px; background: ${b}; border: 1px solid ${c};">
                            <span style="font-size: 11px; color: #64748b; font-weight: 600;">${MATERIAL_LABELS[kv.material] || 'عنصر'} — ${escapeHtml(kv.calligraphyStyle || '')}</span>
                            <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 1.7; font-weight: 500; font-style: italic;">« ${escapeHtml(kv.text)} »</p>
                        </div>
                    `;
                    }).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Activities -->
            ${(lesson.activities?.length ?? 0) > 0 ? `
            <div style="margin-bottom: 20px;">
                <h2 style="color: #059669; font-size: 16px; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #6ee7b7;">الأنشطة والتجارب</h2>
                <ul style="margin: 0; padding-right: 20px; line-height: 1.8; color: #334155;">
                    ${(lesson.activities || []).map(a => `<li>${escapeHtml(a)}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            <!-- Assessment -->
            ${(lesson.assessmentQuestions?.length ?? 0) > 0 ? `
            <div style="margin-bottom: 20px;">
                <h2 style="color: #7c3aed; font-size: 16px; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #c4b5fd;">أسئلة التقويم</h2>
                <ol style="margin: 0; padding-right: 20px; line-height: 1.8; color: #334155;">
                    ${(lesson.assessmentQuestions || []).map((q, i) => `<li>${escapeHtml(q)}</li>`).join('')}
                </ol>
            </div>
            ` : ''}

            <!-- Footer -->
            <div style="margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
                المعلم الذكي — Smart Teacher Platform
            </div>
        </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = content;
    container.style.cssText = 'position:absolute;left:-9999px;top:0;width:210mm;';
    document.body.appendChild(container);

    const element = document.getElementById('lesson-pdf-export');
    if (!element) {
        document.body.removeChild(container);
        throw new Error('Could not create PDF content');
    }

    try {
        await html2pdf().set({
            margin: 10,
            filename: fileName || `${safeTitle}.pdf`,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#f8fafc' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        }).from(element).save();
    } finally {
        document.body.removeChild(container);
    }
};

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
