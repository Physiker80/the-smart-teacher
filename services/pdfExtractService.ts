/**
 * Extract text from PDF for search and lesson generation.
 * Uses PDF.js for text extraction, with Gemini Vision fallback for scanned PDFs.
 */
import * as pdfjsLib from 'pdfjs-dist';
import { extractTextFromImage } from './geminiService';

// Configure worker - use unpkg CDN (matches pdfjs-dist version in package.json)
if (typeof window !== 'undefined') {
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs';
}

const MIN_TEXT_LENGTH_FOR_OCR = 15; // If page has less than this, try Gemini Vision

async function ocrFromCanvas(canvas: HTMLCanvasElement): Promise<string> {
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const result = await extractTextFromImage({ mimeType: 'image/png', data: base64 });
  return (result || '').trim();
}

async function renderPageToCanvas(page: any, scale: number = 2): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('لا يمكن إنشاء Canvas');
  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;
  return canvas;
}

export interface PdfPageInfo {
  pageNum: number;
  text: string;
  firstLines: string[]; // First few lines as potential titles
  usedOcr?: boolean; // True if text was extracted via OCR
}

export type ExtractProgressCallback = (page: number, total: number, status: string) => void;

async function imageUrlToBase64(imageUrl: string): Promise<{ mimeType: string; data: string }> {
  if (imageUrl.startsWith('data:')) {
    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) return { mimeType: match[1], data: match[2] };
  }
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error('فشل تحميل الصورة');
  const blob = await res.blob();
  const mimeType = blob.type || 'image/png';
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = (r.result as string) || '';
      const base64 = result.replace(/^data:[^;]+;base64,/, '');
      resolve(base64);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  return { mimeType, data };
}

export async function extractFromImage(imageUrl: string): Promise<PdfPageInfo[]> {
  const { mimeType, data } = await imageUrlToBase64(imageUrl);
  const trimmed = (await extractTextFromImage({ mimeType, data })).trim();
  const lines = trimmed.split(/\n+/).filter(Boolean).slice(0, 8);
  return [{
    pageNum: 1,
    text: trimmed,
    firstLines: lines.length > 0 ? lines : (trimmed ? [trimmed.slice(0, 120)] : []),
    usedOcr: true,
  }];
}

export async function extractPdfText(
  pdfUrl: string,
  onProgress?: ExtractProgressCallback
): Promise<PdfPageInfo[]> {
  const response = await fetch(pdfUrl, { mode: 'cors' });
  if (!response.ok) throw new Error('فشل تحميل الملف');
  const arrayBuffer = await response.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pages: PdfPageInfo[] = [];

  for (let i = 1; i <= numPages; i++) {
    onProgress?.(i, numPages, 'جاري استخراج النص...');
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = (textContent.items || []) as { str?: string; hasEOL?: boolean; transform?: number[] }[];
    const text = items.map(item => (item && typeof item.str === 'string' ? item.str : '')).join(' ').replace(/\s+/g, ' ').trim();
    // Build lines using hasEOL, or group by Y-position when hasEOL is unreliable
    const lines: string[] = [];
    let line = '';
    let lastY = -9999;
    const Y_THRESHOLD = 8;
    for (const item of items) {
      const str = item && typeof item.str === 'string' ? item.str : '';
      if (!str) continue;
      const y = item.transform?.[5] ?? 0;
      const sameLine = Math.abs(y - lastY) < Y_THRESHOLD;
      lastY = y;
      if (line && !sameLine && !item.hasEOL) {
        const trimmed = line.replace(/\s+/g, ' ').trim();
        if (trimmed) lines.push(trimmed);
        line = '';
      }
      line += (line && !/[\s\u200B-\u200D]$/.test(line) ? ' ' : '') + str;
      if (item.hasEOL) {
        const trimmed = line.replace(/\s+/g, ' ').trim();
        if (trimmed) lines.push(trimmed);
        line = '';
      }
    }
    if (line.trim()) lines.push(line.replace(/\s+/g, ' ').trim());
    let firstLines = lines.length > 0 ? lines.slice(0, 8) : text.split(/\s{2,}|\n+/).filter(Boolean).slice(0, 8);
    if (firstLines.length === 0 && text.length > 0) {
      for (let j = 0; j < Math.min(8, Math.ceil(text.length / 50)); j++) {
        const chunk = text.slice(j * 50, (j + 1) * 50).trim();
        if (chunk) firstLines.push(chunk);
      }
    }
    if (firstLines.length === 0 && text.length > 0) firstLines = [text.slice(0, 120)];

    let finalText = text;
    let usedOcr = false;
    if (text.length < MIN_TEXT_LENGTH_FOR_OCR) {
      onProgress?.(i, numPages, `جاري قراءة الصفحة ${i} بالذكاء الاصطناعي...`);
      try {
        const canvas = await renderPageToCanvas(page);
        const ocrText = await ocrFromCanvas(canvas);
        if (ocrText.length > text.length) {
          finalText = ocrText;
          usedOcr = true;
          const ocrLines = ocrText.split(/\n+/).filter(Boolean).slice(0, 8);
          if (ocrLines.length > 0) firstLines = ocrLines;
          else firstLines = finalText.length > 0 ? [finalText.slice(0, 120)] : [];
        }
      } catch (_) {
        // OCR failed, keep original text
      }
    }

    pages.push({ pageNum: i, text: finalText, firstLines, usedOcr });
  }

  return pages;
}

export function searchInPages(pages: PdfPageInfo[], query: string): { pageNum: number; text: string; excerpt: string }[] {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  const results: { pageNum: number; text: string; excerpt: string }[] = [];

  for (const p of pages) {
    const idx = p.text.toLowerCase().indexOf(q);
    if (idx === -1) continue;
    const start = Math.max(0, idx - 40);
    const end = Math.min(p.text.length, idx + q.length + 80);
    const excerpt = (start > 0 ? '...' : '') + p.text.slice(start, end) + (end < p.text.length ? '...' : '');
    results.push({ pageNum: p.pageNum, text: p.text, excerpt });
  }

  return results;
}
