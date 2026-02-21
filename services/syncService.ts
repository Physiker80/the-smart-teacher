
import { supabase } from './supabaseClient';
import { 
  LearningUnit, StudentGroup, LessonPlan, CurriculumBook, 
  Resource, CalendarEvent, JournalEntry, StudentWork, Worksheet 
} from '../types';

// --- LEARNING UNITS ---
export const fetchLearningUnits = async (classId?: string) => {
  let query = supabase.from('learning_units').select('*');
  if (classId) query = query.eq('class_id', classId);
  
  const { data, error } = await query;
  if (error) throw error;
  
  return data.map(u => ({
    id: u.id,
    title: u.title,
    objectives: u.objectives || [],
    classId: u.class_id,
    relatedLessonIds: u.related_lesson_ids || [],
    resourceIds: [] // Can be joined if needed
  } as LearningUnit));
};

export const deleteLearningUnit = async (id: string) => {
    const { error } = await supabase.from('learning_units').delete().eq('id', id);
    if (error) throw error;
};

export const createLearningUnit = async (unit: Partial<LearningUnit>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('learning_units')
    .insert({
      user_id: user.id,
      title: unit.title,
      objectives: unit.objectives,
      class_id: unit.classId,
      related_lesson_ids: unit.relatedLessonIds
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// --- STUDENT GROUPS ---
export const fetchStudentGroups = async () => {
  const { data, error } = await supabase.from('student_groups').select('*');
  if (error) throw error;
  return data.map(g => ({
    id: g.id,
    name: g.name,
    gradeLevel: g.grade_level,
    students: g.students || []
  } as StudentGroup));
};

export const updateStudentGroup = async (id: string, updates: Partial<StudentGroup>) => {
    const { error } = await supabase.from('student_groups').update({
        name: updates.name,
        grade_level: updates.gradeLevel,
        students: updates.students
    }).eq('id', id);
    if (error) throw error;
};

export const deleteStudentGroup = async (id: string) => {
    const { error } = await supabase.from('student_groups').delete().eq('id', id);
    if (error) throw error;
};

export const createStudentGroup = async (group: Partial<StudentGroup>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('student_groups')
    .insert({
      user_id: user.id,
      name: group.name,
      grade_level: group.gradeLevel,
      students: group.students
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// --- RESOURCES (Songs, Stories, Games, Sims) ---
export const fetchResourcesByType = async (type?: string) => {
  let query = supabase.from('resources').select('*');
  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) throw error;
  
  return data.map(r => ({
    id: r.id,
    title: r.title,
    type: r.type,
    url: r.url,
    tags: r.tags || [],
    data: r.content,
    classId: r.class_id,
    createdAt: r.created_at
  } as Resource));
};

export const deleteResource = async (id: string) => {
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) throw error;
};

export const createResource = async (res: Partial<Resource>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('resources')
    .insert({
      user_id: user.id,
      title: res.title,
      type: res.type,
      url: res.url,
      tags: res.tags,
      content: res.data,
      class_id: res.classId
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// --- WORKSHEETS & CERTIFICATES (مزامنة مع قاعدة البيانات) ---
export const saveWorksheet = async (worksheet: Worksheet, lessonId?: string, lessonTopic?: string) => {
  const res = await createResource({
    title: worksheet.title,
    type: 'worksheet',
    tags: [worksheet.grade, worksheet.topic, ...(lessonId ? [lessonId] : [])],
    data: { ...worksheet, lessonId, lessonTopic }
  });
  return res;
};

export const saveCertificate = async (opts: { studentName: string; lessonTopic: string; imageUrl: string; style?: string }) => {
  const res = await createResource({
    title: `شهادة إبداع - ${opts.studentName}`,
    type: 'certificate',
    tags: [opts.studentName, opts.lessonTopic, 'شهادة إبداع'],
    url: opts.imageUrl.startsWith('data:') ? undefined : opts.imageUrl,
    data: opts
  });
  return res;
};

export const fetchWorksheets = async (lessonId?: string) => {
  const res = await fetchResourcesByType('worksheet');
  if (lessonId) return res.filter((r: Resource) => (r.data as any)?.lessonId === lessonId);
  return res;
};

export const fetchCertificates = async () => fetchResourcesByType('certificate');

export const updateResource = async (id: string, updates: Partial<Pick<Resource, 'title' | 'type' | 'url' | 'tags' | 'classId'>> & { data?: any }) => {
  const { error } = await supabase
    .from('resources')
    .update({
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.type !== undefined && { type: updates.type }),
      ...(updates.url !== undefined && { url: updates.url }),
      ...(updates.tags !== undefined && { tags: updates.tags }),
      ...(updates.classId !== undefined && { class_id: updates.classId }),
      ...(updates.data !== undefined && { content: updates.data })
    })
    .eq('id', id);
  if (error) throw error;
};

// --- CURRICULUM BOOKS (Minhaji) ---
export const fetchCurriculumBooks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('curriculum_books')
      .select('*')
      .eq('user_id', user.id);
      
    if (error) {
        console.error("Error fetching curriculum books:", error);
        return [];
    }
    
    return data.map(b => ({
        id: b.id,
        analyzedAt: b.created_at,
        fileName: b.file_name,
        bookMetadata: b.book_metadata,
        curriculumStructure: b.curriculum_structure,
        linkedClassId: b.linked_class_id,
        liveThoughts: []
    } as CurriculumBook));
};

export const saveCurriculumBook = async (book: Partial<CurriculumBook>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    // Check if exists
    const { data: existing } = await supabase.from('curriculum_books').select('id').eq('id', book.id).single();

    const linkedClassIdVal = (book.linkedClassId && book.linkedClassId.trim()) ? book.linkedClassId : null;

    if (existing) {
        const { data, error } = await supabase.from('curriculum_books').update({
            linked_class_id: linkedClassIdVal,
            curriculum_structure: book.curriculumStructure
            // usually metadata doesn't change after analysis
        }).eq('id', book.id).select().single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase.from('curriculum_books').insert({
            // id: book.id, // Let DB generate ID or use provided if UUID?
            // If the local ID is not a UUID, we might have issues if the DB column expects UUID.
            // The schema says `id uuid default uuid_generate_v4()`.
            // So if `book.id` is not a valid UUID, we should probably ignore it and let DB generate one,
            // OR ensure the frontend generates valid UUIDs.
            // For now, let's assume we let DB generate if it's new, OR we pass it if it's valid.
            // The frontend seemingly generates IDs like `curr-${Date.now()}` which is NOT a UUID.
            // So we should NOT pass `id` if it's not a UUID.
            user_id: user.id,
            file_name: book.fileName,
            book_metadata: book.bookMetadata,
            curriculum_structure: book.curriculumStructure,
            linked_class_id: linkedClassIdVal
        }).select().single();
        if (error) throw error;
        return data;
    }
};

export const deleteCurriculumBook = async (id: string) => {
    const { error } = await supabase.from('curriculum_books').delete().eq('id', id);
    if (error) throw error;
};

// --- CALENDAR EVENTS ---
export const fetchCalendarEvents = async () => {
    const { data, error } = await supabase.from('calendar_events').select('*');
    if (error) throw error;
    
    return data.map(e => ({
        id: e.id,
        title: e.title,
        date: e.date,
        time: e.time,
        type: e.type,
        relatedClassId: e.related_class_id, // ensure snake_case match
        notes: e.details?.notes,
        subject: e.details?.subject,
        grade: e.details?.grade
    } as CalendarEvent));
};

export const createCalendarEvent = async (evt: Partial<CalendarEvent>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase.from('calendar_events').insert({
        user_id: user.id,
        title: evt.title,
        date: evt.date,
        time: evt.time,
        type: evt.type,
        related_class_id: evt.relatedClassId,
        details: {
            notes: evt.notes,
            subject: evt.subject,
            grade: evt.grade
        }
    }).select().single();
    
    if (error) throw error;
    return data;
};

export const deleteCalendarEvent = async (id: string) => {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) throw error;
};

// --- PRIVATE VAULT ---
export const fetchVaultEntries = async () => {
    const { data, error } = await supabase.from('private_vault_entries').select('*');
    if (error) throw error;
    return data;
};

export const saveVaultEntry = async (entry: any, type: 'journal' | 'student_work') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const payload: any = {
        user_id: user.id,
        type: type,
        tags: entry.tags || [],
        created_at: entry.date
    };

    if (type === 'journal') {
        payload.content = entry.content;
        payload.mood = entry.mood;
    } else {
        payload.title = entry.title;
        payload.media_url = entry.url;
        // Pack student name and notes into content for storage
        payload.content = JSON.stringify({ studentName: entry.studentName, notes: entry.notes, subType: entry.subType });
    }

    const { data, error } = await supabase.from('private_vault_entries').insert(payload).select().single();
    if (error) throw error;
    return data;
};

// --- LESSON PLANS ---
export const fetchLessonPlans = async (classId?: string) => {
    let query = supabase.from('lesson_plans').select('*');
    if (classId) query = query.eq('class_id', classId);
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    
    return data.map(l => {
        const plan = l.content as LessonPlan;
        return {
            ...plan,
            id: l.id,
            classId: l.class_id,
            createdAt: l.created_at
        } as LessonPlan & { classId?: string; createdAt?: string };
    });
};

export const saveLessonPlan = async (plan: LessonPlan, classId?: string, isPublic: boolean = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Determine if updating or inserting
    // Only treat as update if ID is a valid UUID (assuming DB generates UUIDs)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plan.id);
    
    if (isUuid) {
        // Try update
        const { data, error } = await supabase
            .from('lesson_plans')
            .update({
                topic: plan.topic,
                subject: plan.subject,
                grade: plan.grade,
                content: plan,
                class_id: classId
            })
            .eq('id', plan.id)
            .select()
            .single();
            
        if (error) throw error;
        return { ...data.content, id: data.id };
    } else {
        // Insert new
        const { data, error } = await supabase
            .from('lesson_plans')
            .insert({
                user_id: user.id,
                topic: plan.topic,
                subject: plan.subject,
                grade: plan.grade,
                content: plan,
                class_id: classId
            })
            .select()
            .single();
            
        if (error) throw error;
        return { ...data.content, id: data.id };
    }
};

export const deleteLessonPlan = async (id: string) => {
    const { error } = await supabase.from('lesson_plans').delete().eq('id', id);
    if (error) throw error;
};

