
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { fetchTeacherClasses, createClass, updateClassDetails, updateStudentEnrollment, deleteClass, removeStudentFromClass, addStudentToClass, enrollExistingStudentInClass } from '../services/classService';
import { 
    fetchLearningUnits, createLearningUnit, deleteLearningUnit,
    fetchStudentGroups, createStudentGroup, updateStudentGroup, deleteStudentGroup,
    fetchResourcesByType, createResource, updateResource, deleteResource,
    fetchCalendarEvents, createCalendarEvent,
    fetchCurriculumBooks, saveCurriculumBook,
    fetchLessonPlans, deleteLessonPlan
} from '../services/syncService';
import { exportLessonToPDF } from '../services/curriculumPdfService';
import { uploadResourceFile, getResourceFileAccept, deleteStorageFileByUrl } from '../services/storageService';
import { ResourceExplorerModal } from './ResourceExplorerModal';
import { CertificateCreator } from './CertificateCreator';
import { ClassRoom, Student, StudentGrade, Announcement, LearningUnit, Resource, CalendarEvent, ClassAssessment, LessonPlan, CurriculumBook, CurriculumLesson, KeyVisual, StudentGroup, getCurriculumBookDisplayName } from '../types';
import { read, utils, writeFile } from 'xlsx';
import {
    ArrowLeft, Plus, X, Save, Trash2, Users, BookOpen, GraduationCap,
    BarChart3, Bell, Eye, Pencil, Search, ChevronLeft, ChevronRight,
    Megaphone, PartyPopper, AlertTriangle, Info, UserPlus, FolderOpen,
    Target, FileText, Image as ImageIcon, Video, Link2, Tag, Layers,
    Brain, Ear, Move, Sparkles, TrendingUp, Award, MessageSquare, Star,
    Download, Upload, Copy, CalendarDays, Book, Briefcase, PenTool,
    FlaskConical, HelpCircle, CheckCircle2, ChevronDown, ChevronUp, MapPin,
    ExternalLink, Printer
} from 'lucide-react';

interface ClassManagerProps {
    onBack: () => void;
    onNewLesson?: (classId?: string) => void;
    onViewLesson?: (plan: LessonPlan) => void;
    onViewCurricula?: () => void;
    onGenerateLesson?: (topic: string, grade: string, activities?: string[], subject?: string, part?: string) => void;
}

const CLASSES_KEY = 'st_classes';
const UNITS_KEY = 'st_learning_units';
const RESOURCES_KEY = 'st_resources';
const CALENDAR_KEY = 'st_calendar_events';
const STUDENT_GROUPS_KEY = 'st_student_groups';

type ManagerView = 'class-list' | 'class-dashboard' | 'roster' | 'student-profile' | 'resources' | 'assessments' | 'curriculum-books' | 'group-manager';

const CLASS_COLORS = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-red-500',
    'from-indigo-500 to-violet-500',
];

const LEARNING_STYLES: { value: Student['learningStyle']; label: string; icon: React.ReactNode }[] = [
    { value: 'visual', label: 'بصري', icon: <Eye size={14} /> },
    { value: 'auditory', label: 'سمعي', icon: <Ear size={14} /> },
    { value: 'kinesthetic', label: 'حركي', icon: <Move size={14} /> },
];

/** قائمة افتراضية من 25 اسم طالب للاستخدام السريع */
const DEFAULT_STUDENT_NAMES = [
    'محمد', 'أحمد', 'علي', 'حسن', 'خالد', 'عمر', 'يوسف', 'إبراهيم', 'عبدالله', 'حسين',
    'طارق', 'باسل', 'كريم', 'سامر', 'وائل', 'نور', 'سارة', 'فاطمة', 'مريم', 'هدى',
    'رنا', 'لينا', 'ياسمين', 'دانا', 'روان',
];

const GRADE_TYPES: { value: StudentGrade['type']; label: string }[] = [
    { value: 'exam', label: 'اختبار' },
    { value: 'midterm', label: 'اختبار شهري' },
    { value: 'final', label: 'اختبار فصلي' },
    { value: 'homework', label: 'واجب' },
    { value: 'participation', label: 'مشاركة' },
    { value: 'game', label: 'لعبة تعليمية' },
];

const MATERIAL_CONFIG: Record<string, { label: string; bg: string; border: string; textColor: string; emoji: string }> = {
    paper: { label: 'ورقة', bg: 'bg-amber-500/10', border: 'border-amber-500/20', textColor: 'text-amber-200', emoji: '📜' },
    stone: { label: 'حجر', bg: 'bg-stone-500/10', border: 'border-stone-500/20', textColor: 'text-stone-300', emoji: '🪨' },
    wood: { label: 'خشب', bg: 'bg-orange-800/20', border: 'border-orange-700/30', textColor: 'text-orange-200', emoji: '🪵' },
    fabric: { label: 'قماش', bg: 'bg-pink-500/10', border: 'border-pink-500/20', textColor: 'text-pink-200', emoji: '🧵' },
    metal: { label: 'معدن', bg: 'bg-slate-600/20', border: 'border-slate-500/30', textColor: 'text-slate-300', emoji: '⚙️' },
};

export const ClassManager: React.FC<ClassManagerProps> = ({ onBack, onNewLesson, onViewLesson, onGenerateLesson }) => {
    // --- STATE ---
    const [view, setView] = useState<ManagerView>('class-list');
    const [classes, setClasses] = useState<ClassRoom[]>([]);
    const [units, setUnits] = useState<LearningUnit[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [showAddClass, setShowAddClass] = useState(false);
    const [showAddStudent, setShowAddStudent] = useState(false);
    const [showAddGrade, setShowAddGrade] = useState(false);
    const [showAddUnit, setShowAddUnit] = useState(false);
    const [showAddResource, setShowAddResource] = useState(false);
    const [showAnnouncement, setShowAnnouncement] = useState(false);
    const [showCopyRoster, setShowCopyRoster] = useState(false);
    const [showAddAssessment, setShowAddAssessment] = useState(false);
    const [showCertificateModal, setShowCertificateModal] = useState(false);
    const [importStatus, setImportStatus] = useState<string | null>(null);
    const [addingDefaultStudents, setAddingDefaultStudents] = useState(false);
    
    // Group Management States
    const [showAddGroup, setShowAddGroup] = useState(false);
    const [formGroupName, setFormGroupName] = useState('');
    const [formGroupGrade, setFormGroupGrade] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [formSelectedGroupForClass, setFormSelectedGroupForClass] = useState<string>(''); // For "Add Class" modal

    // Form states
    const [formClassName, setFormClassName] = useState('');
    const [formClassGrade, setFormClassGrade] = useState('');
    const [formClassSubject, setFormClassSubject] = useState('');
    const [formStudentName, setFormStudentName] = useState('');
    const [formStudentRegistrationCode, setFormStudentRegistrationCode] = useState('');
    const [formStudentDob, setFormStudentDob] = useState('');
    const [formStudentStyle, setFormStudentStyle] = useState<Student['learningStyle']>('');
    const [formStudentParent, setFormStudentParent] = useState('');
    const [formStudentNotes, setFormStudentNotes] = useState('');
    const [formGradeTitle, setFormGradeTitle] = useState('');
    const [formGradeScore, setFormGradeScore] = useState('');
    const [formGradeMax, setFormGradeMax] = useState('100');
    const [formGradeType, setFormGradeType] = useState<StudentGrade['type']>('exam');
    const [formUnitTitle, setFormUnitTitle] = useState('');
    const [formUnitObjectives, setFormUnitObjectives] = useState('');
    const [formResourceTitle, setFormResourceTitle] = useState('');
    const [formResourceType, setFormResourceType] = useState<Resource['type']>('link');
    const [formResourceUrl, setFormResourceUrl] = useState('');
    const [formResourceTags, setFormResourceTags] = useState('');
    const [formResourceFile, setFormResourceFile] = useState<File | null>(null);
    const [formResourceUploading, setFormResourceUploading] = useState(false);
    const [formAnnouncementText, setFormAnnouncementText] = useState('');
    const [formAnnouncementType, setFormAnnouncementType] = useState<Announcement['type']>('info');
    const [formGradeDate, setFormGradeDate] = useState(new Date().toISOString().split('T')[0]);
    const [formAddToCalendar, setFormAddToCalendar] = useState(true);
    const [calendarSyncToast, setCalendarSyncToast] = useState<string | null>(null);

    // Assessment form states
    const [formAssessmentTitle, setFormAssessmentTitle] = useState('');
    const [formAssessmentDate, setFormAssessmentDate] = useState(new Date().toISOString().split('T')[0]);
    const [formAssessmentType, setFormAssessmentType] = useState<ClassAssessment['type']>('exam');
    const [formAssessmentMax, setFormAssessmentMax] = useState('100');
    const [formAssessmentCalendar, setFormAssessmentCalendar] = useState(true);
    const [expandedAssessmentId, setExpandedAssessmentId] = useState<string | null>(null);
    const [gradingScores, setGradingScores] = useState<Record<string, string>>({});

    const [lessonPlans, setLessonPlans] = useState<(LessonPlan & { classId?: string; createdAt?: string })[]>([]);
    const [curricula, setCurricula] = useState<CurriculumBook[]>([]);
    const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
    const [expandedLessonKey, setExpandedLessonKey] = useState<string | null>(null);
    const [selectedCurriculumActivities, setSelectedCurriculumActivities] = useState<Record<string, string[]>>({});
    const [showGenerateFromResource, setShowGenerateFromResource] = useState(false);
    const [selectedResourceForGenerate, setSelectedResourceForGenerate] = useState<Resource | null>(null);
    const [showResourceExplorer, setShowResourceExplorer] = useState(false);
    const [resourceForExplorer, setResourceForExplorer] = useState<Resource | null>(null);
    const [formGenTopic, setFormGenTopic] = useState('');
    const [formGenGrade, setFormGenGrade] = useState('الصف الثالث الابتدائي');
    const [formGenPagesTitles, setFormGenPagesTitles] = useState('');
    const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
    const [editingResourceTitle, setEditingResourceTitle] = useState('');

    // --- PERSISTENCE ---
    useEffect(() => {
        // Load Classes from Supabase
        const fetchRemoteData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Classes
            const { data: classesData, error } = await supabase
                .from('classes')
                .select('*')
                .eq('teacher_id', user.id);
            
            if (error) {
                console.error('Error fetching classes:', error);
            } else if (classesData) {
                const loadedClasses = await Promise.all(classesData.map(async (c) => {
                    const { data: enrolls } = await supabase
                        .from('class_enrollments')
                        .select('*, profiles:student_id(*)')
                        .eq('class_id', c.id);
                    
                    const students: Student[] = (enrolls || []).map((e: any) => ({
                        id: e.profiles?.id || 'unknown',
                        name: e.profiles?.full_name || 'طالب مجهول',
                        registrationCode: e.profiles?.registration_code,
                        dob: e.profiles?.dob,
                        learningStyle: e.profiles?.learning_style,
                        parentContact: e.profiles?.parent_contact,
                        grades: e.grades || [],
                        participationCount: e.participation_count || 0,
                        behaviorNotes: e.behavior_notes
                    }));

                    return {
                        id: c.id,
                        name: c.name || `Class ${c.grade}`,
                        gradeLevel: c.grade,
                        subject: c.subject,
                        classCode: c.class_code,
                        students: students,
                        studentGroupId: undefined,
                        announcements: c.announcements || [],
                        assessments: c.assessments || [],
                        color: c.color || 'from-blue-500 to-cyan-500'
                    } as ClassRoom;
                }));
                setClasses(loadedClasses);
            }

            // 2. Fetch Other Data via SyncService
            try {
                const [
                    loadedUnits,
                    loadedGroups,
                    loadedResources,
                    loadedBooks,
                    loadedPlans
                ] = await Promise.all([
                    fetchLearningUnits(), // Fetch all units (RLS handles user filter)
                    fetchStudentGroups(),
                    fetchResourcesByType(), // Fetch all resources
                    fetchCurriculumBooks(),
                    fetchLessonPlans()
                ]);

                if (loadedUnits) setUnits(loadedUnits);
                if (loadedGroups) setStudentGroups(loadedGroups);
                if (loadedResources) setResources(loadedResources);
                if (loadedBooks) setCurricula(loadedBooks);
                if (loadedPlans) setLessonPlans(loadedPlans);
                
            } catch (err) {
                console.error("Error fetching sync data:", err);
            }

            // 3. Fallback/Hybrid: Load local for offline safety? 
            // For now, we rely on Supabase as primary.
        };

        fetchRemoteData();
    }, []);

    // Helper to refresh data after updates
    const refreshData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;
        const [u, g, r, b, p] = await Promise.all([
             fetchLearningUnits(),
             fetchStudentGroups(),
             fetchResourcesByType(),
             fetchCurriculumBooks(),
             fetchLessonPlans()
        ]);
        if(u) setUnits(u);
        if(g) setStudentGroups(g);
        if(r) setResources(r);
        if(b) setCurricula(b);
        if(p) setLessonPlans(p);
    };

    // Update Local State Helpers
    const saveClasses = useCallback((data: ClassRoom[]) => {
        setClasses(data);
    }, []);

    const saveUnits = useCallback((data: LearningUnit[]) => {
        setUnits(data);
    }, []);

    const saveResources = useCallback((data: Resource[]) => {
        setResources(data);
    }, []);
    
    const saveStudentGroups = useCallback((data: StudentGroup[]) => {
        setStudentGroups(data);
    }, []);

    // --- DERIVED DATA ---
    const selectedClass = classes.find(c => c.id === selectedClassId) || null;
    const selectedStudent = selectedClass?.students.find(s => s.id === selectedStudentId) || null;
    const classUnits = units.filter(u => u.classId === selectedClassId);
    // Lesson plans: filter by class AND subject — show only plans for the selected class's subject
    const classLessonPlans = lessonPlans.filter(p => {
        const planClassId = (p as { classId?: string }).classId;
        if (!selectedClassId || !selectedClass) return true;
        // Linked to class: must match
        if (planClassId) return planClassId === selectedClassId;
        // Unlinked: filter by subject match (المادة المختصة)
        const planSubject = (p.subject || '').trim();
        const classSubject = (selectedClass.subject || '').trim();
        if (!classSubject || classSubject === 'فصل عام') return true; // General class: show all
        if (!planSubject) return false;
        const subjectMatch = planSubject.includes(classSubject) || classSubject.includes(planSubject);
        const gradeMatch = !selectedClass.gradeLevel || !p.grade ||
            p.grade.includes(selectedClass.gradeLevel) || selectedClass.gradeLevel.includes(p.grade);
        return subjectMatch && gradeMatch;
    });
    
    // Filter resources: 
    // 1. Explicit class link
    // 2. Unlinked (Global) -> Check if subject/grade matches (if data exists)
    const classResources = resources.filter(r => {
        if (!selectedClass) return false;
        if (r.classId) return r.classId === selectedClassId;
        
        // Unlinked resource logic:
        
        // If it's a Lesson Plan, we have strict metadata to check
        if (r.type === 'lesson-plan' && r.data) {
            const subjectMatch = !selectedClass.subject || 
                               r.data.subject.includes(selectedClass.subject) || 
                               selectedClass.subject.includes(r.data.subject) ||
                               selectedClass.subject === 'فصل عام';
            
            const gradeMatch = !selectedClass.gradeLevel || 
                               r.data.grade.includes(selectedClass.gradeLevel) || 
                               selectedClass.gradeLevel.includes(r.data.grade);

            return subjectMatch && gradeMatch;
        }

        // For other raw resources, check metadata
        // If resource has tags, use them for filtering against Subject AND Grade
        if (r.tags && r.tags.length > 0) {
            let matches = false;
            
            // 1. Check Subject Match (if class has subject)
            if (selectedClass.subject) {
                const subjectTags = r.tags.some(t => selectedClass.subject!.includes(t) || t.includes(selectedClass.subject!));
                if (subjectTags) matches = true;
            } else {
                // If class has no subject (General), we don't filter by subject tags unless they are explicitly for another subject?
                // For now, treat as match.
                matches = true;
            }

            // 2. Check Grade Match (if class has grade)
            if (selectedClass.gradeLevel) {
                const gradeTags = r.tags.some(t => selectedClass.gradeLevel.includes(t) || t.includes(selectedClass.gradeLevel));
                if (gradeTags) matches = true;
            }

            // Stricter Rule: If tags imply a specific subject that IS NOT this class's subject, hide it.
            // But we don't have a list of all subjects. 
            // So we rely on "Show if match found".
            // If tags exist, we require at least one relevant tag (Subject OR Grade).
            return matches;
        }

        return true; 
    });

    // --- HANDLERS ---

    // --- EXCEL IMPORT ---
    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>, target: 'class' | 'group', targetId?: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData: any[] = utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length < 2) { setImportStatus('الملف فارغ أو لا يحتوي على بيانات'); return; }

                // Determine column indices based on header (row 0)
                const header = jsonData[0] as string[];
                const nameIdx = header.findIndex(h => h && (h.includes('اسم') || h.includes('Name')));
                const dobIdx = header.findIndex(h => h && (h.includes('مواليد') || h.includes('تاريخ') || h.includes('DOB')));
                const contactIdx = header.findIndex(h => h && (h.includes('ولي') || h.includes('هاتف') || h.includes('Contact')));
                
                const finalNameIdx = nameIdx >= 0 ? nameIdx : 0;
                const finalDobIdx = dobIdx >= 0 ? dobIdx : 1;
                const finalContactIdx = contactIdx >= 0 ? contactIdx : 2;

                const newStudents: Student[] = [];
                setImportStatus('جاري معالجة البيانات...');

                // For Groups, we just create local objects (or JSON items)
                // For Classes, we MUST sync with DB
                
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || !row[finalNameIdx]) continue;
                    
                    const rawName = String(row[finalNameIdx]).trim();
                    const rawDob = row[finalDobIdx] ? String(row[finalDobIdx]) : undefined;
                    const rawContact = row[finalContactIdx] ? String(row[finalContactIdx]) : undefined;

                    if (target === 'class' && targetId) {
                         try {
                             const res = await addStudentToClass(targetId, {
                                 name: rawName,
                                 dob: rawDob,
                                 parentContact: rawContact
                             });
                             newStudents.push({
                                 id: res.id,
                                 name: res.name!,
                                 dob: res.dob,
                                 grades: [],
                                 participationCount: 0,
                                 learningStyle: undefined,
                                 parentContact: res.parentContact
                             });
                         } catch (err) {
                             console.error(`Error adding student ${rawName}:`, err);
                         }
                    } else {
                        // Group logic (Local / JSON based)
                        newStudents.push({
                            id: `stu-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
                            name: rawName,
                            dob: rawDob,
                            learningStyle: undefined, 
                            parentContact: rawContact,
                            grades: [],
                            participationCount: 0,
                        });
                    }
                }

                if (newStudents.length === 0) { setImportStatus('لم يتم استيراد أي طالب بنجاح'); return; }

                if (target === 'class' && targetId) {
                    const updatedClasses = classes.map(c =>
                        c.id === targetId ? { ...c, students: [...c.students, ...newStudents] } : c
                    );
                    saveClasses(updatedClasses); // Local update
                    setImportStatus(`تم استيراد ${newStudents.length} طالب للفصل بنجاح ✅`);
                } else if (target === 'group' && targetId) {
                    const targetGroup = studentGroups.find(g => g.id === targetId);
                    if (targetGroup) {
                        const updatedStudents = [...targetGroup.students, ...newStudents];
                        try {
                            await updateStudentGroup(targetId, { students: updatedStudents });
                            
                            const updatedGroups = studentGroups.map(g => 
                                g.id === targetId ? { ...g, students: updatedStudents } : g
                            );
                            saveStudentGroups(updatedGroups);
                            setImportStatus(`تم استيراد ${newStudents.length} طالب للمجموعة بنجاح ✅`);
                        } catch (err) {
                            console.error("Failed to update group:", err);
                        }
                    }
                }
                
                setTimeout(() => setImportStatus(null), 3000);
            } catch (err) {
                console.error(err);
                setImportStatus('حدث خطأ أثناء قراءة ملف Excel');
            }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    };

    // --- GROUP MANAGEMENT ---
    const handleAddGroup = async () => {
        if (!formGroupName.trim()) return;
        
        await createStudentGroup({
            name: formGroupName.trim(),
            gradeLevel: formGroupGrade.trim(),
            students: [],
        });
        
        const refreshed = await fetchStudentGroups();
        if(refreshed) setStudentGroups(refreshed);

        setShowAddGroup(false);
        setFormGroupName('');
        setFormGroupGrade('');
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه المجموعة؟ لن تتأثر الفصول التي أنشئت منها.')) return;
        try {
            await deleteStudentGroup(groupId);
            const refreshed = await fetchStudentGroups();
            if(refreshed) setStudentGroups(refreshed);
        } catch (e: any) {
            alert('فشل الحذف: ' + (e?.message || 'خطأ غير متوقع'));
        }
    };

    // Update handleAddClass to support creating from group
    const handleAddClass = async () => {
        if (!formClassName.trim()) return;

        // 1. Create Class in Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: newClassData, error } = await supabase
            .from('classes')
            .insert({
                teacher_id: user.id,
                name: formClassName.trim(),
                grade: formClassGrade.trim(),
                subject: formClassSubject.trim() || null,
                section: 'General', // Default
                class_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
                color: CLASS_COLORS[classes.length % CLASS_COLORS.length]
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating class:', error);
            alert('فشل إنشاء الفصل. حاول مرة أخرى.');
            return;
        }

        const newClass: ClassRoom = {
            id: newClassData.id,
            name: newClassData.name,
            gradeLevel: newClassData.grade,
            subject: newClassData.subject,
            students: [],
            studentGroupId: undefined,
            announcements: [],
            assessments: [],
            color: newClassData.color,
        };
        
        // If a group is selected, copy students from it (Enrollment Logic)
        if (formSelectedGroupForClass) {
            const group = studentGroups.find(g => g.id === formSelectedGroupForClass);
            if (group) {
                // Loop and enroll each student implicitly? 
                // Wait, group.students are local objects. Do they have profiles in Supabase?
                // If the "Group" feature is local-only, we can't easily link to real Supabase profiles unless we force registration.
                // For now, let's just create placeholder profiles or ignore group copying for DB sync until Groups are also in DB.
                alert('تنبيه: نسخ الطلاب من المجموعات المحلية إلى قاعدة البيانات غير مدعوم حالياً. يرجى إضافة الطلاب يدوياً أو عبر كود الفصل.');
            }
        }

        saveClasses([...classes, newClass]);
        setShowAddClass(false);
        setFormClassName('');
        setFormClassGrade('');
        setFormClassSubject('');
        setFormSelectedGroupForClass('');
    };

    const handleDeleteClass = async (classId: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الفصل وجميع بياناته؟')) return;
        try {
            await deleteClass(classId);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: classesData, error } = await supabase.from('classes').select('*').eq('teacher_id', user.id);
                if (!error && classesData) {
                    const loaded = await Promise.all(classesData.map(async (c: any) => {
                        const { data: enrolls } = await supabase.from('class_enrollments').select('*, profiles:student_id(*)').eq('class_id', c.id);
                        const students = (enrolls || []).map((e: any) => ({ id: e.profiles?.id || 'unknown', name: e.profiles?.full_name || 'طالب مجهول', registrationCode: e.profiles?.registration_code, dob: e.profiles?.dob, learningStyle: e.profiles?.learning_style, parentContact: e.profiles?.parent_contact, grades: e.grades || [], participationCount: e.participation_count || 0, behaviorNotes: e.behavior_notes }));
                        return { id: c.id, name: c.name || c.grade, gradeLevel: c.grade, subject: c.subject, classCode: c.class_code, students, studentGroupId: undefined, announcements: c.announcements || [], assessments: c.assessments || [], color: c.color || 'from-blue-500 to-cyan-500' } as ClassRoom;
                    }));
                    saveClasses(loaded);
                } else saveClasses(classes.filter(c => c.id !== classId));
            } else saveClasses(classes.filter(c => c.id !== classId));
            if (selectedClassId === classId) { setSelectedClassId(null); setView('class-list'); }
        } catch (e: any) {
            alert('فشل الحذف: ' + (e?.message || 'قد يكون الفصل مرتبطاً ببيانات أخرى.'));
        }
    };

    const handleAddStudent = async () => {
        if (!formStudentName.trim() || !selectedClassId) return;

        const selectedClass = classes.find(c => c.id === selectedClassId);
        if (!selectedClass) return;

        // فصول ذات الاسم نفسه = نفس الفصل بمختلف المواد (ضم الطالب لجميع المواد)
        const siblingClasses = classes.filter(c => c.name === selectedClass.name && c.id !== selectedClassId);
        const targetClassIds = [selectedClassId, ...siblingClasses.map(c => c.id)];

        try {
            const newStudentBase: Partial<Student> = {
                name: formStudentName.trim(),
                registrationCode: formStudentRegistrationCode.trim() || undefined,
                dob: formStudentDob || undefined,
                learningStyle: formStudentStyle || undefined,
                parentContact: formStudentParent || undefined,
                behaviorNotes: formStudentNotes.trim() || undefined,
            };

            const result = await addStudentToClass(selectedClassId, newStudentBase);

            for (const classId of siblingClasses.map(c => c.id)) {
                await enrollExistingStudentInClass(classId, result.id, formStudentNotes.trim() || undefined);
            }

            const newStudent: Student = {
                id: result.id,
                name: result.name!,
                registrationCode: result.registrationCode,
                dob: result.dob,
                learningStyle: result.learningStyle,
                parentContact: result.parentContact,
                grades: [],
                participationCount: 0,
                behaviorNotes: formStudentNotes.trim() || undefined
            };

            const updatedClasses = classes.map(c =>
                targetClassIds.includes(c.id) ? { ...c, students: [...c.students, newStudent] } : c
            );
            saveClasses(updatedClasses);

            setShowAddStudent(false);
            setFormStudentName('');
            setFormStudentRegistrationCode('');
            setFormStudentDob('');
            setFormStudentStyle('');
            setFormStudentParent('');
            setFormStudentNotes('');

            const subjectCount = targetClassIds.length;
            if (result.registrationCode) {
                navigator.clipboard.writeText(result.registrationCode);
                alert(`تم إضافة الطالب بنجاح إلى ${subjectCount} مادة! رقم التسجيل: ${result.registrationCode}\n\nتم نسخ الرقم للحافظة. شاركه مع الطالب لإدخاله عند التسجيل.`);
            } else {
                alert(`تم إضافة الطالب بنجاح إلى ${subjectCount} مادة!`);
            }
        } catch (error: any) {
            console.error("Failed to add student:", error);
            const msg = error?.message || '';
            if (msg.includes("registration_code") || msg.includes("PGRST204")) {
                alert("خطأ في قاعدة البيانات: عمود رقم التسجيل غير موجود.\n\nافتح Supabase → SQL Editor ونفّذ محتويات ملف supabase_add_registration_code.sql ثم أعد المحاولة.");
            } else {
                alert("فشل إضافة الطالب. يرجى التأكد من عدم تكرار رقم التسجيل أو المحاولة مرة أخرى.");
            }
        }
    };

    const handleAddDefaultStudents = async () => {
        if (!selectedClassId) return;
        const selectedClass = classes.find(c => c.id === selectedClassId);
        if (!selectedClass) return;
        if (!window.confirm(`هل تريد إضافة ${DEFAULT_STUDENT_NAMES.length} طالب افتراضي إلى "${selectedClass.name}" وجميع المواد المرتبطة؟`)) return;

        const siblingClasses = classes.filter(c => c.name === selectedClass.name && c.id !== selectedClassId);
        const targetClassIds = [selectedClassId, ...siblingClasses.map(c => c.id)];

        setAddingDefaultStudents(true);
        try {
            let updatedClasses = classes;
            for (const name of DEFAULT_STUDENT_NAMES) {
                const newStudentBase: Partial<Student> = { name };
                const result = await addStudentToClass(selectedClassId, newStudentBase);
                for (const classId of siblingClasses.map(c => c.id)) {
                    await enrollExistingStudentInClass(classId, result.id);
                }
                const newStudent: Student = {
                    id: result.id,
                    name: result.name!,
                    registrationCode: result.registrationCode,
                    grades: [],
                    participationCount: 0,
                };
                updatedClasses = updatedClasses.map(c =>
                    targetClassIds.includes(c.id) ? { ...c, students: [...c.students, newStudent] } : c
                );
            }
            saveClasses(updatedClasses);
            const subjectCount = targetClassIds.length;
            alert(`تم إضافة ${DEFAULT_STUDENT_NAMES.length} طالب بنجاح إلى ${subjectCount} مادة!`);
        } catch (error: any) {
            console.error("Failed to add default students:", error);
            const msg = error?.message || '';
            const isSchemaError = msg.includes("registration_code") || msg.includes("PGRST204");
            if (isSchemaError) {
                alert("خطأ في قاعدة البيانات: عمود رقم التسجيل غير موجود.\n\nافتح Supabase → SQL Editor ونفّذ محتويات ملف supabase_add_registration_code.sql ثم أعد المحاولة.");
            } else {
                alert("فشل إضافة الطلاب. حاول مرة أخرى.");
            }
        } finally {
            setAddingDefaultStudents(false);
        }
    };

    const handleDeleteStudent = async (studentId: string) => {
        if (!selectedClassId) return;
        if (!window.confirm('هل أنت متأكد من إزالة هذا الطالب من الفصل؟')) return;

        await removeStudentFromClass(selectedClassId, studentId);

        const updatedClasses = classes.map(c =>
            c.id === selectedClassId ? { ...c, students: c.students.filter(s => s.id !== studentId) } : c
        );
        saveClasses(updatedClasses);
        if (selectedStudentId === studentId) { setSelectedStudentId(null); setView('roster'); }
    };

    // --- CALENDAR SYNC HELPER ---
    const addEventToCalendar = async (event: CalendarEvent) => {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;
        
        try {
           await createCalendarEvent({
               title: event.title,
               date: event.date,
               time: event.time,
               type: event.type,
               subject: event.subject,
               grade: event.grade,
               relatedClassId: event.relatedClassId,
               notes: event.notes
           });
           // We don't need to refresh calendar state here since ClassManager doesn't display it directly
           // But if we did, we would fetchCalendarEvents(user.id)
        } catch (e) {
            console.error('Failed to sync with calendar:', e);
        }
    };

    const handleAddGrade = async () => {
        if (!formGradeTitle.trim() || !selectedClassId || !selectedStudentId) return;
        const gradeDate = formGradeDate || new Date().toISOString().split('T')[0];
        const newGrade: StudentGrade = {
            id: `grd-${Date.now()}`,
            title: formGradeTitle.trim(),
            score: parseFloat(formGradeScore) || 0,
            maxScore: parseFloat(formGradeMax) || 100,
            date: gradeDate,
            type: formGradeType,
        };
        
        let targetStudent: Student | undefined;

        const updatedClasses = classes.map(c =>
            c.id === selectedClassId ? {
                ...c,
                students: c.students.map(s => {
                    if (s.id === selectedStudentId) {
                        targetStudent = { ...s, grades: [...s.grades, newGrade] };
                        return targetStudent;
                    }
                    return s;
                })
            } : c
        );

        if (targetStudent) {
            await updateStudentEnrollment(selectedClassId, selectedStudentId, { grades: targetStudent.grades });
        }

        saveClasses(updatedClasses);
        setShowAddGrade(false);
        setFormGradeTitle('');
        setFormGradeScore('');
        setFormGradeMax('100');
        setFormGradeDate(new Date().toISOString().split('T')[0]);
    };

    // --- CLASS-LEVEL ASSESSMENT HANDLERS ---
    const handleAddAssessment = async () => {
        if (!formAssessmentTitle.trim() || !selectedClassId) return;
        const assessmentId = `asmt-${Date.now()}`;
        let calendarEventId: string | undefined;

        // Sync to calendar (ONE event for the whole class)
        if (formAssessmentCalendar) {
            const calEventId = `evt-${Date.now()}`;
            const calEvent: CalendarEvent = {
                id: calEventId,
                title: `${formAssessmentTitle.trim()} — ${selectedClass?.name || ''}`,
                date: formAssessmentDate,
                time: '08:00',
                type: formAssessmentType === 'exam' ? 'exam' : 'event',
                subject: selectedClass?.subject || undefined,
                grade: selectedClass?.gradeLevel || undefined,
                relatedClassId: selectedClassId,
                notes: `${GRADE_TYPES.find(gt => gt.value === formAssessmentType)?.label || ''} — الدرجة العظمى: ${formAssessmentMax}`,
            };
            await addEventToCalendar(calEvent);
            calendarEventId = calEventId;
            setCalendarSyncToast('تمت إضافة الحدث للتقويم المدرسي ✅');
            setTimeout(() => setCalendarSyncToast(null), 3000);
        }

        const newAssessment: ClassAssessment = {
            id: assessmentId,
            title: formAssessmentTitle.trim(),
            date: formAssessmentDate,
            type: formAssessmentType,
            maxScore: parseFloat(formAssessmentMax) || 100,
            relatedCalendarEventId: calendarEventId,
        };

        // Update Local State
        const updatedClasses = classes.map(c =>
            c.id === selectedClassId ? { ...c, assessments: [...(c.assessments || []), newAssessment] } : c
        );
        saveClasses(updatedClasses); // Local update

        // Sync to Supabase
        const currentClass = classes.find(c => c.id === selectedClassId);
        if (currentClass) {
            const updatedAssessments = [...(currentClass.assessments || []), newAssessment];
            await supabase.from('classes').update({ assessments: updatedAssessments }).eq('id', selectedClassId);
        }

        setShowAddAssessment(false);
        setFormAssessmentTitle('');
        setFormAssessmentDate(new Date().toISOString().split('T')[0]);
        setFormAssessmentMax('100');
        setFormAssessmentCalendar(true);
    };

    const handleDeleteAssessment = async (assessmentId: string) => {
        if (!selectedClassId || !selectedClass) return;
        if (!window.confirm('هل أنت متأكد من حذف هذا التقييم؟')) return;
        
        const newAssessments = (selectedClass.assessments || []).filter(a => a.id !== assessmentId);
        
        await updateClassDetails(selectedClassId, { assessments: newAssessments });

        // Note: We also need to remove grades linked to this assessment from students
        // This is tricky with JSONB. We'd need to iterate all students and clean their JSONB grades.
        // For now, we update local state, but the orphan grades will remain in the DB enrollments JSON until strictly cleaned.
        // To do it properly:
        /*
        await Promise.all(selectedClass.students.map(s => {
            const newGrades = s.grades.filter(g => g.assessmentId !== assessmentId);
            return updateStudentEnrollment(selectedClassId, s.id, { grades: newGrades });
        }));
        */
        // Let's implement the clean up!
        const studentUpdates = selectedClass.students.map(s => {
             const newGrades = s.grades.filter(g => g.assessmentId !== assessmentId);
             if (newGrades.length === s.grades.length) return null; // No change
             return { studentId: s.id, newGrades };
        }).filter(u => u !== null);

        await Promise.all(studentUpdates.map(u => 
             updateStudentEnrollment(selectedClassId, u!.studentId, { grades: u!.newGrades })
        ));

        const updatedClasses = classes.map(c =>
            c.id === selectedClassId ? {
                ...c,
                assessments: newAssessments,
                students: c.students.map(s => ({
                    ...s,
                    grades: s.grades.filter(g => g.assessmentId !== assessmentId)
                }))
            } : c
        );
        saveClasses(updatedClasses);
    };

    const handleSaveAssessmentGrades = async (assessment: ClassAssessment) => {
        if (!selectedClassId || !selectedClass) return;
        
        // 1. Prepare updates
        const updates: { studentId: string, newGrades: StudentGrade[] }[] = [];

        const updatedClasses = classes.map(c => {
            if (c.id !== selectedClassId) return c;
            return {
                ...c,
                students: c.students.map(s => {
                    const scoreStr = gradingScores[s.id];
                    if (scoreStr === undefined || scoreStr === '') return s; // skip empty
                    const score = parseFloat(scoreStr);
                    if (isNaN(score)) return s;

                    // Check if student already has a grade for this assessment
                    const existingIdx = s.grades.findIndex(g => g.assessmentId === assessment.id);
                    let newGrades = [...s.grades];

                    if (existingIdx >= 0) {
                        // Update existing grade
                        newGrades[existingIdx] = { ...newGrades[existingIdx], score };
                    } else {
                        // Add new grade
                        const newGrade: StudentGrade = {
                            id: `grd-${Date.now()}-${s.id}`,
                            title: assessment.title,
                            score,
                            maxScore: assessment.maxScore,
                            date: assessment.date,
                            type: assessment.type,
                            assessmentId: assessment.id,
                        };
                        newGrades = [...s.grades, newGrade];
                    }

                    // Queue for DB update
                    updates.push({ studentId: s.id, newGrades });

                    return { ...s, grades: newGrades };
                })
            };
        });

        // 2. Perform DB Updates (Parallel)
        await Promise.all(updates.map(update => 
            updateStudentEnrollment(selectedClassId, update.studentId, { grades: update.newGrades })
        ));

        // 3. Update Local State
        saveClasses(updatedClasses); // Local update
        
        setCalendarSyncToast('تم حفظ درجات الطلاب بنجاح ✅');
        setTimeout(() => setCalendarSyncToast(null), 3000);
    };

    const openAssessmentGrading = (assessment: ClassAssessment) => {
        setExpandedAssessmentId(expandedAssessmentId === assessment.id ? null : assessment.id);
        if (expandedAssessmentId !== assessment.id && selectedClass) {
            // Pre-fill existing grades
            const scores: Record<string, string> = {};
            selectedClass.students.forEach(s => {
                const existing = s.grades.find(g => g.assessmentId === assessment.id);
                scores[s.id] = existing ? String(existing.score) : '';
            });
            setGradingScores(scores);
        }
    };

    const handleUpdateBehaviorNotes = async (notes: string) => {
        if (!selectedClassId || !selectedStudentId) return;
        
        // Optimistic UI Update first (for responsiveness while typing)
        const updatedClasses = classes.map(c =>
            c.id === selectedClassId ? {
                ...c,
                students: c.students.map(s =>
                    s.id === selectedStudentId ? { ...s, behaviorNotes: notes } : s
                )
            } : c
        );
        saveClasses(updatedClasses); // Update local state immediately

        // Debounce actual DB save? Or just save on blur?
        // For simplicity, we just save. If too many requests, we should add debounce.
        // But since this is onChange, we MUST debounce or move to onBlur.
        // Let's modify the UI to use onBlur for saving to avoid DB spam.
    };

    const saveBehaviorNotesToDB = async () => {
        if (!selectedClassId || !selectedStudentId || !selectedStudent) return;
        await updateStudentEnrollment(selectedClassId, selectedStudentId, { behaviorNotes: selectedStudent.behaviorNotes });
    };

    const handleAddAnnouncement = async () => {
        if (!formAnnouncementText.trim() || !selectedClassId || !selectedClass) return;
        const ann: Announcement = {
            id: `ann-${Date.now()}`,
            text: formAnnouncementText.trim(),
            date: new Date().toISOString().split('T')[0],
            type: formAnnouncementType,
        };
        const newAnnouncements = [ann, ...selectedClass.announcements];
        
        await updateClassDetails(selectedClassId, { announcements: newAnnouncements });
        
        const updatedClasses = classes.map(c =>
            c.id === selectedClassId ? { ...c, announcements: newAnnouncements } : c
        );
        saveClasses(updatedClasses);
        setShowAnnouncement(false);
        setFormAnnouncementText('');
    };

    const handleAddUnit = async () => {
        if (!formUnitTitle.trim() || !selectedClassId) return;
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;
        
        await createLearningUnit({
            title: formUnitTitle.trim(),
            classId: selectedClassId,
            objectives: formUnitObjectives.split('\n').filter(o => o.trim()),
            relatedLessonIds: [],
            resourceIds: [],
        });
        
        // Refresh
        const refreshed = await fetchLearningUnits();
        if(refreshed) setUnits(refreshed);

        setShowAddUnit(false);
        setFormUnitTitle('');
        setFormUnitObjectives('');
    };

    const handleAddResource = async () => {
        if (!formResourceTitle.trim()) return;
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;

        let url = formResourceUrl || undefined;

        // Upload file if selected (for pdf, image, video)
        if (formResourceFile && ['pdf', 'image', 'video'].includes(formResourceType)) {
            setFormResourceUploading(true);
            try {
                url = await uploadResourceFile(formResourceFile, formResourceType as 'pdf' | 'image' | 'video');
            } catch (e: any) {
                setFormResourceUploading(false);
                alert(e?.message || 'فشل رفع الملف');
                return;
            }
            setFormResourceUploading(false);
        } else if (['pdf', 'image', 'video'].includes(formResourceType) && !formResourceUrl?.trim()) {
            alert('أدخل رابطاً أو حمّل ملفاً.');
            return;
        }

        const fileName = formResourceFile?.name;
        await createResource({
            title: formResourceTitle.trim(),
            type: formResourceType,
            url,
            data: fileName ? { fileName } : undefined,
            tags: formResourceTags.split(',').map(t => t.trim()).filter(Boolean),
            classId: selectedClassId || undefined
        });

        const refreshed = await fetchResourcesByType();
        if(refreshed) setResources(refreshed);

        setShowAddResource(false);
        setFormResourceTitle('');
        setFormResourceUrl('');
        setFormResourceTags('');
        setFormResourceFile(null);
    };

    const addResourceFileInputRef = React.useRef<HTMLInputElement>(null);

    const GRADE_OPTIONS = ["الروضة", "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي", "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي", "الصف السابع الإعدادي", "الصف الثامن الإعدادي", "الصف التاسع الإعدادي"];

    const handleResourceView = (res: Resource) => {
        if (res.url) window.open(res.url, '_blank');
    };
    const handleResourcePrint = (res: Resource) => {
        if (!res.url) return;
        const w = window.open(res.url, '_blank', 'width=800,height=600');
        if (w) w.onload = () => { w.print(); w.close(); };
    };
    const handleResourceDownload = async (res: Resource) => {
        if (!res.url) return;
        try {
            const r = await fetch(res.url, { mode: 'cors' });
            const blob = await r.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = (res.data as { fileName?: string })?.fileName || res.title || 'resource';
            a.click();
            URL.revokeObjectURL(a.href);
        } catch {
            window.open(res.url, '_blank');
        }
    };
    const openGenerateFromResource = (res: Resource) => {
        setSelectedResourceForGenerate(res);
        setFormGenTopic(res.title);
        setFormGenGrade(selectedClass?.gradeLevel || 'الصف الثالث الابتدائي');
        setFormGenPagesTitles('');
        setShowGenerateFromResource(true);
    };
    const openResourceExplorer = (res: Resource) => {
        setResourceForExplorer(res);
        setShowResourceExplorer(true);
    };
    const handleGenerateFromResource = () => {
        if (!formGenTopic.trim() || !onGenerateLesson) return;
        const activities = formGenPagesTitles.split('\n').map(s => s.trim()).filter(Boolean);
        onGenerateLesson(formGenTopic, formGenGrade, activities.length ? activities : undefined, selectedClass?.subject);
        setShowGenerateFromResource(false);
        setSelectedResourceForGenerate(null);
    };

    const openClassDashboard = (classId: string) => {
        setSelectedClassId(classId);
        setView('class-dashboard');
    };

    // --- CSV EXPORT ---
    const handleExportCsv = () => {
        if (!selectedClass) return;
        const BOM = '\uFEFF';
        const header = 'رقم التسجيل,الاسم,تاريخ الميلاد,نمط التعلم,تواصل ولي الأمر,عدد الدرجات,المعدل,المشاركات';
        const rows = selectedClass.students.map(s => {
            const avg = s.grades.length > 0 ? Math.round(s.grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / s.grades.length) : 0;
            const style = LEARNING_STYLES.find(ls => ls.value === s.learningStyle)?.label || '';
            return `"${s.registrationCode || ''}","${s.name}","${s.dob || ''}","${style}","${s.parentContact || ''}",${s.grades.length},${avg}%,${s.participationCount}`;
        });
        const csv = BOM + header + '\n' + rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedClass.name}_students.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // --- EXCEL EXPORT ---
    const handleExportExcel = () => {
        if (!selectedClass) return;
        const rows = selectedClass.students.map(s => {
            const avg = s.grades.length > 0 ? Math.round(s.grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / s.grades.length) : 0;
            const style = LEARNING_STYLES.find(ls => ls.value === s.learningStyle)?.label || '';
            return {
                'رقم التسجيل': s.registrationCode || '',
                'الاسم': s.name,
                'تاريخ الميلاد': s.dob || '',
                'نمط التعلم': style,
                'تواصل ولي الأمر': s.parentContact || '',
                'عدد الدرجات': s.grades.length,
                'المعدل %': avg,
                'المشاركات': s.participationCount
            };
        });
        const ws = utils.json_to_sheet(rows);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, 'الطلاب');
        writeFile(wb, `${selectedClass.name}_students.xlsx`, { bookType: 'xlsx', bookSST: true });
    };

    // --- CSV/EXCEL IMPORT ---
    const parseRowToStudent = (row: Record<string, any>): Partial<Student> | null => {
        const name = (row['الاسم'] ?? row['name'] ?? row[1] ?? row[0] ?? '').toString().trim();
        if (!name) return null;
        const regCode = (row['رقم التسجيل'] ?? row['registration_code'] ?? '').toString().trim();
        const dob = (row['تاريخ الميلاد'] ?? row['dob'] ?? row[2] ?? '').toString().trim() || undefined;
        const styleRaw = (row['نمط التعلم'] ?? row['learning_style'] ?? row[3] ?? '').toString();
        const style = ['visual', 'auditory', 'kinesthetic'].includes(styleRaw) ? styleRaw as Student['learningStyle']
            : styleRaw === 'بصري' ? 'visual' : styleRaw === 'سمعي' ? 'auditory' : styleRaw === 'حركي' ? 'kinesthetic' : undefined;
        const parent = (row['تواصل ولي الأمر'] ?? row['parent_contact'] ?? row[4] ?? '').toString().trim() || undefined;
        return { name, registrationCode: regCode || undefined, dob, learningStyle: style, parentContact: parent };
    };

    const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedClassId || !e.target.files?.[0]) return;
        const file = e.target.files[0];
        const isExcel = /\.(xlsx|xls)$/i.test(file.name);

        const processRows = async (rows: Record<string, any>[]) => {
            const newStudents: Student[] = [];
            const targetClass = classes.find(c => c.id === selectedClassId);
            const siblingClasses = targetClass ? classes.filter(c => c.name === targetClass.name && c.id !== selectedClassId) : [];
            const allTargetIds = [selectedClassId, ...siblingClasses.map(c => c.id)];

            setImportStatus('جاري استيراد الطلاب...');
            for (const row of rows) {
                const studentData = parseRowToStudent(row);
                if (!studentData) continue;
                try {
                    const result = await addStudentToClass(selectedClassId!, studentData);
                    for (const cid of siblingClasses.map(c => c.id)) {
                        await enrollExistingStudentInClass(cid, result.id);
                    }
                    newStudents.push({ id: result.id, name: result.name!, registrationCode: result.registrationCode, dob: result.dob, learningStyle: result.learningStyle, parentContact: result.parentContact, grades: [], participationCount: 0 });
                } catch (err) { console.error('Import student error:', err); }
            }
            if (newStudents.length === 0) { setImportStatus('لم يتم استيراد أي طالب بنجاح'); return; }
            const updatedClasses = classes.map(c => allTargetIds.includes(c.id) ? { ...c, students: [...c.students, ...newStudents] } : c);
            saveClasses(updatedClasses);
            setImportStatus(`تم استيراد ${newStudents.length} طالب إلى ${allTargetIds.length} مادة بنجاح ✅`);
            setTimeout(() => setImportStatus(null), 3000);
        };

        if (isExcel) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const data = ev.target?.result;
                    if (!data) { setImportStatus('فشل قراءة الملف'); return; }
                    const wb = read(data, { type: 'array' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const rows = utils.sheet_to_json<Record<string, any>>(ws);
                    if (rows.length === 0) { setImportStatus('الملف فارغ'); return; }
                    await processRows(rows);
                } catch (err) { setImportStatus('حدث خطأ أثناء قراءة ملف Excel'); }
            };
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const text = (ev.target?.result as string) || '';
                    const lines = text.split(/\r?\n/).filter(l => l.trim());
                    if (lines.length < 2) { setImportStatus('الملف فارغ أو لا يحتوي على بيانات'); return; }
                    const header = lines[0];
                    const rows: Record<string, any>[] = [];
                    for (let i = 1; i < lines.length; i++) {
                        const cols = lines[i].match(/("[^"]*"|[^,]+)/g)?.map(c => c.replace(/^"|"$/g, '').trim()) || [];
                        const headers = header.match(/("[^"]*"|[^,]+)/g)?.map(c => c.replace(/^"|"$/g, '').trim()) || [];
                        const hasReg = headers[0] === 'رقم التسجيل' || headers[0]?.includes('رقم');
                        const obj: Record<string, any> = {};
                        headers.forEach((h, idx) => { obj[h] = cols[idx] ?? ''; });
                        if (!obj['الاسم']) obj['الاسم'] = cols[hasReg ? 1 : 0] ?? cols[0];
                        if (hasReg && !obj['رقم التسجيل']) obj['رقم التسجيل'] = cols[0];
                        if (!obj['تاريخ الميلاد']) obj['تاريخ الميلاد'] = cols[hasReg ? 2 : 1];
                        if (!obj['نمط التعلم']) obj['نمط التعلم'] = cols[hasReg ? 3 : 2];
                        if (!obj['تواصل ولي الأمر']) obj['تواصل ولي الأمر'] = cols[hasReg ? 4 : 3];
                        rows.push(obj);
                    }
                    await processRows(rows);
                } catch (err) { setImportStatus('حدث خطأ أثناء قراءة الملف'); }
            };
            reader.readAsText(file);
        }
        e.target.value = '';
    };

    // --- COPY ROSTER FROM ANOTHER CLASS ---
    const handleCopyRoster = (sourceClassId: string) => {
        if (!selectedClassId || sourceClassId === selectedClassId) return;
        const sourceClass = classes.find(c => c.id === sourceClassId);
        if (!sourceClass || sourceClass.students.length === 0) return;

        const copiedStudents: Student[] = sourceClass.students.map(s => ({
            ...s,
            id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            grades: [],
            participationCount: 0,
        }));

        const updatedClasses = classes.map(c =>
            c.id === selectedClassId ? { ...c, students: [...c.students, ...copiedStudents] } : c
        );
        saveClasses(updatedClasses);
        setShowCopyRoster(false);
    };

    const getAvgScore = (students: Student[]) => {
        const allGrades = students.flatMap(s => s.grades);
        if (allGrades.length === 0) return 0;
        return Math.round(allGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / allGrades.length);
    };

    const getStudentAvg = (student: Student) => {
        if (student.grades.length === 0) return 0;
        return Math.round(student.grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / student.grades.length);
    };

    const getResourceIcon = (type: Resource['type']) => {
        switch (type) {
            case 'pdf': return <FileText size={16} className="text-red-400" />;
            case 'image': return <ImageIcon size={16} className="text-blue-400" />;
            case 'video': return <Video size={16} className="text-purple-400" />;
            case 'link': return <Link2 size={16} className="text-emerald-400" />;
            case 'template': return <Layers size={16} className="text-amber-400" />;
            case 'lesson-plan': return <BookOpen size={16} className="text-cyan-400" />;
        }
    };

    const getAnnIcon = (type: Announcement['type']) => {
        switch (type) {
            case 'info': return <Info size={14} className="text-blue-400" />;
            case 'warning': return <AlertTriangle size={14} className="text-amber-400" />;
            case 'celebration': return <PartyPopper size={14} className="text-pink-400" />;
        }
    };


    // --- RENDER ---
    const renderBreadcrumb = () => (
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
            <button onClick={() => setView('class-list')} className="hover:text-white transition-colors">فصولي</button>
            {selectedClass && view !== 'class-list' && (
                <>
                    <ChevronLeft size={12} />
                    <button onClick={() => setView('class-dashboard')} className="hover:text-white transition-colors">{selectedClass.name}</button>
                </>
            )}
            {view === 'roster' && <><ChevronLeft size={12} /><span className="text-slate-400">الطلاب</span></>}
            {view === 'student-profile' && selectedStudent && (
                <>
                    <ChevronLeft size={12} />
                    <button onClick={() => setView('roster')} className="hover:text-white transition-colors">الطلاب</button>
                    <ChevronLeft size={12} />
                    <span className="text-slate-400">{selectedStudent.name}</span>
                </>
            )}
            {view === 'resources' && <><ChevronLeft size={12} /><span className="text-slate-400">المصادر</span></>}
            {view === 'assessments' && <><ChevronLeft size={12} /><span className="text-slate-400">الاختبارات والتقييمات</span></>}
            {view === 'curriculum-books' && <><ChevronLeft size={12} /><span className="text-slate-400">المناهج المحللة</span></>}
            {view === 'group-manager' && <><ChevronLeft size={12} /><span className="text-slate-400">إدارة الشعب والطلاب</span></>}
        </div>
    );

    // ========== CLASS LIST VIEW ==========
    const renderClassList = () => (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">فصولي الدراسية</h2>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setView('group-manager')}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white text-xs font-bold transition-all">
                        <Users size={14} /> إدارة الشعب
                    </button>
                    <button onClick={() => {
                        if (classes.length === 0) {
                            alert('أنشئ فصلاً أولاً لعرض قائمة الطلاب');
                            return;
                        }
                        setSelectedClassId(classes[0].id);
                        setView('roster');
                    }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                        <Users size={16} /> قائمة الطلاب
                    </button>
                    <button onClick={() => { setFormSelectedGroupForClass(''); setShowAddClass(true); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                        <Plus size={16} /> إضافة فصل
                    </button>
                </div>
            </div>

            {classes.length === 0 ? (
                <div className="text-center py-20">
                    <Users size={48} className="text-slate-700 mx-auto mb-4" />
                    <p className="text-lg text-slate-500 mb-2">لا توجد فصول بعد</p>
                    <p className="text-sm text-slate-600">أنشئ أول فصل دراسي لبدء التنظيم!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classes.map(cls => {
                        const avgScore = getAvgScore(cls.students);
                        return (
                            <div key={cls.id}
                                onClick={() => openClassDashboard(cls.id)}
                                className="group relative bg-slate-900/50 border border-slate-800 rounded-2xl p-5 cursor-pointer hover:border-slate-600 transition-all hover:-translate-y-1 overflow-hidden">
                                {/* Gradient Top */}
                                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${cls.color}`} />

                                {/* Delete */}
                                <button onClick={e => { e.stopPropagation(); handleDeleteClass(cls.id); }}
                                    className="absolute top-3 left-3 w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all z-10">
                                    <Trash2 size={12} />
                                </button>

                                <h3 className="text-lg font-bold text-white mb-1">{cls.name}</h3>
                                <p className="text-xs text-slate-500 mb-4">{cls.gradeLevel}{cls.subject ? ` • ${cls.subject}` : ''}</p>

                                <div className="flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1 text-slate-400">
                                        <Users size={12} /> {cls.students.length} طالب
                                    </div>
                                    {cls.students.length > 0 && (
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <TrendingUp size={12} /> معدل: {avgScore}%
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 text-slate-400">
                                        <Bell size={12} /> {cls.announcements.length}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    // ========== CLASS DASHBOARD VIEW (Command Center) ==========
    const renderClassDashboard = () => {
        if (!selectedClass) return null;
        const avgScore = getAvgScore(selectedClass.students);
        const totalParticipation = selectedClass.students.reduce((sum, s) => sum + s.participationCount, 0);
        const totalGrades = selectedClass.students.reduce((sum, s) => sum + s.grades.length, 0);

        // Sort students by average for spotlight
        const sortedStudents = [...selectedClass.students]
            .map(s => ({ ...s, avg: getStudentAvg(s) }))
            .sort((a, b) => b.avg - a.avg);
        const topStudents = sortedStudents.filter(s => s.grades.length > 0 && s.avg >= 70).slice(0, 5);
        const atRiskStudents = sortedStudents.filter(s => s.grades.length > 0 && s.avg < 60).slice(0, 5);

        // Build simple SVG chart data (per-student averages)
        const chartStudents = selectedClass.students.filter(s => s.grades.length > 0).slice(0, 10);
        const chartPoints = chartStudents.map((s, i) => {
            const avg = getStudentAvg(s);
            const x = chartStudents.length > 1 ? (i / (chartStudents.length - 1)) * 260 + 20 : 150;
            const y = 90 - (avg / 100) * 70;
            return { x, y, avg, name: s.name };
        });
        const chartLine = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
        const chartArea = chartLine ? `${chartLine} L${chartPoints[chartPoints.length - 1]?.x},90 L${chartPoints[0]?.x},90 Z` : '';

        // Avatar colors
        const avatarColors = [
            'from-blue-400 to-cyan-400', 'from-pink-400 to-rose-400', 'from-amber-400 to-orange-400',
            'from-emerald-400 to-teal-400', 'from-purple-400 to-violet-400', 'from-red-400 to-pink-400',
            'from-indigo-400 to-blue-400', 'from-teal-400 to-green-400',
        ];

        return (
            <div className="space-y-4">
                {/* ===== HERO HEADER ===== */}
                <div className={`relative bg-gradient-to-br ${selectedClass.color} rounded-3xl p-6 md:p-8 overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-xl" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                                    <GraduationCap size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{selectedClass.name}</h2>
                                    <p className="text-sm text-white/70">{selectedClass.gradeLevel}{selectedClass.subject ? ` • ${selectedClass.subject}` : ''}</p>
                                </div>
                            </div>
                        </div>

                        {/* Inline Header Stats */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {[
                                { icon: <Users size={16} />, val: selectedClass.students.length, label: 'طالب', bg: 'bg-white/15' },
                                { icon: <BarChart3 size={16} />, val: `${avgScore}%`, label: 'المعدل', bg: avgScore >= 70 ? 'bg-emerald-400/20' : 'bg-red-400/20' },
                                { icon: <Star size={16} />, val: totalParticipation, label: 'مشاركة', bg: 'bg-white/15' },
                                { icon: <Layers size={16} />, val: classUnits.length, label: 'وحدة', bg: 'bg-white/15' },
                            ].map((stat, i) => (
                                <div key={i} className={`${stat.bg} backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2 text-white`}>
                                    {stat.icon}
                                    <span className="text-lg font-black">{stat.val}</span>
                                    <span className="text-[10px] text-white/60 font-bold">{stat.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ===== BENTO GRID ===== */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                    {/* --- Card 1: Student Avatars (Class Photo) --- */}
                    <div className="md:col-span-1 lg:col-span-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-blue-500/30 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Users size={16} className="text-blue-400" /> طلاب الفصل
                            </h3>
                            <button onClick={() => setView('roster')}
                                className="text-[10px] text-blue-400 hover:text-blue-300 font-bold transition-colors">
                                عرض الكل &laquo;
                            </button>
                        </div>
                        {selectedClass.students.length === 0 ? (
                            <div className="text-center py-6 text-slate-600 text-sm">
                                <Users size={32} className="mx-auto mb-2 opacity-40" />
                                <p>لا يوجد طلاب بعد</p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2 justify-center">
                                {selectedClass.students.slice(0, 12).map((s, i) => (
                                    <button key={s.id} onClick={() => { setSelectedStudentId(s.id); setView('student-profile'); }}
                                        className="group/avatar flex flex-col items-center gap-1 transition-transform hover:-translate-y-1"
                                        title={s.name}>
                                        <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover/avatar:ring-2 ring-white/50 transition-all`}>
                                            {s.name.charAt(0)}
                                        </div>
                                        <span className="text-[9px] text-slate-500 max-w-[44px] truncate">{s.name.split(' ')[0]}</span>
                                    </button>
                                ))}
                                {selectedClass.students.length > 12 && (
                                    <button onClick={() => setView('roster')}
                                        className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-[10px] font-bold hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all">
                                        +{selectedClass.students.length - 12}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* --- Card 2: Performance Chart --- */}
                    <div className="md:col-span-1 lg:col-span-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-emerald-500/30 transition-all">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                            <TrendingUp size={16} className="text-emerald-400" /> تحليل الأداء
                        </h3>
                        {chartPoints.length < 2 ? (
                            <div className="text-center py-6 text-slate-600 text-sm">
                                <BarChart3 size={32} className="mx-auto mb-2 opacity-40" />
                                <p>أضف درجات لعرض التحليل</p>
                            </div>
                        ) : (
                            <div className="relative">
                                <svg viewBox="0 0 300 100" className="w-full h-32">
                                    {/* Grid lines */}
                                    {[25, 50, 75].map(y => (
                                        <line key={y} x1="20" y1={90 - (y / 100) * 70} x2="280" y2={90 - (y / 100) * 70} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                                    ))}
                                    {/* Area fill */}
                                    <path d={chartArea} fill="url(#chartGrad)" opacity="0.3" />
                                    {/* Line */}
                                    <path d={chartLine} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    {/* Dots */}
                                    {chartPoints.map((p, i) => (
                                        <g key={i}>
                                            <circle cx={p.x} cy={p.y} r="4" fill="#10B981" stroke="#0F172A" strokeWidth="2" />
                                            <title>{p.name}: {p.avg}%</title>
                                        </g>
                                    ))}
                                    <defs>
                                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                                        </linearGradient>
                                        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#06B6D4" />
                                            <stop offset="100%" stopColor="#10B981" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="flex items-center justify-between text-[9px] text-slate-600 mt-1 font-mono">
                                    <span>أقل: {Math.min(...chartPoints.map(p => p.avg))}%</span>
                                    <span className="text-emerald-400 font-bold">المعدل: {avgScore}%</span>
                                    <span>أعلى: {Math.max(...chartPoints.map(p => p.avg))}%</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- Card 3: Quick Actions --- */}
                    <div className="md:col-span-2 lg:col-span-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-violet-500/30 transition-all">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                            <Sparkles size={16} className="text-violet-400" /> إجراءات سريعة
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'قائمة الطلاب', icon: <Users size={20} />, color: 'text-blue-400 border-blue-500/20 hover:bg-blue-500/15 hover:border-blue-500/40', onClick: () => setView('roster') },
                                { label: 'الاختبارات والتقييمات', icon: <GraduationCap size={20} />, color: 'text-red-400 border-red-500/20 hover:bg-red-500/15 hover:border-red-500/40', onClick: () => setView('assessments') },
                                { label: 'المصادر', icon: <FolderOpen size={20} />, color: 'text-purple-400 border-purple-500/20 hover:bg-purple-500/15 hover:border-purple-500/40', onClick: () => setView('resources') },
                                { label: 'المناهج المحللة', icon: <Book size={20} />, color: 'text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/15 hover:border-cyan-500/40', onClick: () => setView('curriculum-books') },
                                { label: 'إنشاء درس', icon: <BookOpen size={20} />, color: 'text-amber-400 border-amber-500/20 hover:bg-amber-500/15 hover:border-amber-500/40', onClick: () => onNewLesson?.(selectedClassId || undefined) },
                            ].map((action, i) => (
                                <button key={i} onClick={action.onClick}
                                    className={`border rounded-xl p-3 text-center transition-all group/action bg-transparent ${action.color}`}>
                                    <div className="mx-auto mb-1.5 group-hover/action:scale-110 transition-transform">{action.icon}</div>
                                    <div className="text-xs font-bold text-slate-300">{action.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* --- Card 4: Star Performers --- */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-amber-500/30 transition-all">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                            <Award size={16} className="text-amber-400" /> نجوم الفصل ⭐
                        </h3>
                        {topStudents.length === 0 ? (
                            <div className="text-center py-4 text-slate-600 text-xs">لا توجد بيانات كافية بعد</div>
                        ) : (
                            <div className="space-y-2">
                                {topStudents.map((s, i) => (
                                    <button key={s.id} onClick={() => { setSelectedStudentId(s.id); setView('student-profile'); }}
                                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all text-right">
                                        <div className="relative flex-none">
                                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white font-bold text-xs`}>
                                                {s.name.charAt(0)}
                                            </div>
                                            {i === 0 && <span className="absolute -top-1 -right-1 text-[10px]">👑</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white truncate">{s.name}</div>
                                            <div className="text-[10px] text-slate-500">{s.grades.length} تقييم</div>
                                        </div>
                                        <div className="text-sm font-black text-emerald-400">{s.avg}%</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* --- Card 5: Needs Attention --- */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-red-500/30 transition-all">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                            <AlertTriangle size={16} className="text-red-400" /> يحتاجون لدعم 🔔
                        </h3>
                        {atRiskStudents.length === 0 ? (
                            <div className="text-center py-4 text-slate-600 text-xs">
                                {selectedClass.students.length === 0 ? 'لا يوجد طلاب' : totalGrades === 0 ? 'لا توجد درجات مسجلة' : 'جميع الطلاب بخير! 🎉'}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {atRiskStudents.map((s, i) => (
                                    <button key={s.id} onClick={() => { setSelectedStudentId(s.id); setView('student-profile'); }}
                                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all text-right">
                                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColors[(i + 3) % avatarColors.length]} flex items-center justify-center text-white font-bold text-xs flex-none`}>
                                            {s.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white truncate">{s.name}</div>
                                            <div className="text-[10px] text-slate-500">{s.grades.length} تقييم</div>
                                        </div>
                                        <div className="text-sm font-black text-red-400">{s.avg}%</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* --- Card 6: Announcements --- */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-pink-500/30 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Bell size={16} className="text-pink-400" /> آخر الإعلانات
                            </h3>
                            <button onClick={() => setShowAnnouncement(true)}
                                className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 hover:bg-pink-500 hover:text-white transition-all">
                                <Plus size={12} />
                            </button>
                        </div>
                        {selectedClass.announcements.length === 0 ? (
                            <div className="text-center py-4 text-slate-600 text-xs">لا توجد إعلانات</div>
                        ) : (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {selectedClass.announcements.slice(0, 4).map(ann => (
                                    <div key={ann.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/3">
                                        {getAnnIcon(ann.type)}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-300 leading-relaxed">{ann.text}</p>
                                            <p className="text-[9px] text-slate-600 mt-0.5 font-mono">{ann.date}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ========== ROSTER VIEW ==========
    const renderRoster = () => {
        if (!selectedClass) return null;
        const filteredStudents = selectedClass.students.filter(s =>
            s.name.includes(searchQuery)
        );

        return (
            <div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users size={20} className="text-blue-400" /> قائمة الطلاب
                        <span className="text-sm text-slate-500 font-normal">({selectedClass.students.length})</span>
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Export Excel */}
                        <button onClick={handleExportExcel} disabled={selectedClass.students.length === 0}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/15 border border-emerald-500/25 text-emerald-400 text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            title="تحميل Excel">
                            <Download size={14} /> Excel
                        </button>
                        {/* Export CSV */}
                        <button onClick={handleExportCsv} disabled={selectedClass.students.length === 0}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-600/15 border border-slate-500/25 text-slate-400 text-xs font-bold hover:bg-slate-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            title="تحميل CSV">
                            <Download size={14} /> CSV
                        </button>
                        {/* Import CSV/Excel */}
                        <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600/15 border border-cyan-500/25 text-cyan-400 text-xs font-bold hover:bg-cyan-600 hover:text-white transition-all cursor-pointer"
                            title="استيراد CSV أو Excel">
                            <Upload size={14} /> استيراد
                            <input type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={handleImportCsv} />
                        </label>
                        {/* Copy Roster */}
                        {classes.filter(c => c.id !== selectedClassId && c.students.length > 0).length > 0 && (
                            <button onClick={() => setShowCopyRoster(true)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600/15 border border-violet-500/25 text-violet-400 text-xs font-bold hover:bg-violet-600 hover:text-white transition-all"
                                title="نسخ من فصل آخر">
                                <Copy size={14} /> نسخ من فصل
                            </button>
                        )}
                        {/* Add 25 Default Students */}
                        <button onClick={handleAddDefaultStudents} disabled={addingDefaultStudents}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-600/50 border border-slate-500/30 text-slate-300 text-xs font-bold hover:bg-slate-600 hover:text-white transition-all disabled:opacity-50"
                            title="إضافة 25 طالب افتراضي">
                            <Users size={14} /> 25 طالب
                        </button>
                        {/* Add Student */}
                        <button onClick={() => setShowAddStudent(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-lg">
                            <UserPlus size={16} /> إضافة طالب
                        </button>
                    </div>
                </div>

                {/* Import Status Toast */}
                {importStatus && (
                    <div className="mb-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm font-bold text-center animate-pulse">
                        {importStatus}
                    </div>
                )}

                {/* Search */}
                <div className="relative mb-4">
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="بحث عن طالب..." dir="rtl"
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
                </div>

                {filteredStudents.length === 0 ? (
                    <div className="text-center py-12">
                        <Users size={48} className="mx-auto mb-4 text-slate-600 opacity-50" />
                        <p className="text-slate-500 font-bold mb-1">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد طلاب بعد'}</p>
                        {!searchQuery && (
                            <p className="text-slate-600 text-sm mb-6">أضف طالباً واحداً أو استخدم القائمة الافتراضية لتعبئة الفصل بسرعة</p>
                        )}
                        {!searchQuery && (
                            <div className="flex flex-wrap gap-3 justify-center">
                                <button onClick={() => setShowAddStudent(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-lg">
                                    <UserPlus size={18} /> إضافة طالب
                                </button>
                                <button onClick={handleAddDefaultStudents} disabled={addingDefaultStudents}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-500 text-white text-sm font-bold transition-all disabled:opacity-50 border border-slate-500/50">
                                    <Users size={18} /> إضافة 25 طالب افتراضي
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredStudents.map((student, idx) => {
                            const avg = getStudentAvg(student);
                            const styleInfo = LEARNING_STYLES.find(ls => ls.value === student.learningStyle);
                            return (
                                <div key={student.id}
                                    onClick={() => { setSelectedStudentId(student.id); setView('student-profile'); }}
                                    className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-slate-600 transition-all group">

                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-none">
                                        {student.name.charAt(0)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors truncate">{student.name}</h4>
                                        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                                            {student.registrationCode && (
                                                <span className="font-mono text-amber-400/90">رقم: {student.registrationCode}</span>
                                            )}
                                            {styleInfo && (
                                                <span className="flex items-center gap-1">{styleInfo.icon} {styleInfo.label}</span>
                                            )}
                                            <span>درجات: {student.grades.length}</span>
                                            <span>مشاركات: {student.participationCount}</span>
                                        </div>
                                    </div>

                                    {/* Score Badge */}
                                    {student.grades.length > 0 && (
                                        <div className={`text-sm font-bold px-2.5 py-1 rounded-lg ${avg >= 80 ? 'bg-emerald-500/10 text-emerald-400' : avg >= 60 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {avg}%
                                        </div>
                                    )}

                                    {/* Delete */}
                                    <button onClick={e => { e.stopPropagation(); handleDeleteStudent(student.id); }}
                                        className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // ========== STUDENT PROFILE VIEW ==========
    const renderStudentProfile = () => {
        if (!selectedClass || !selectedStudent) return null;
        const avg = getStudentAvg(selectedStudent);
        const styleInfo = LEARNING_STYLES.find(ls => ls.value === selectedStudent.learningStyle);

        return (
            <div>
                {/* Profile Header */}
                <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/20 rounded-2xl p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-2xl flex-none">
                            {selectedStudent.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white">{selectedStudent.name}</h2>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                                {selectedStudent.registrationCode && (
                                    <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5 font-mono text-amber-400">
                                        رقم التسجيل: {selectedStudent.registrationCode}
                                        <button onClick={() => { navigator.clipboard.writeText(selectedStudent.registrationCode!); alert('تم نسخ رقم التسجيل'); }} className="p-0.5 hover:bg-amber-500/20 rounded"><Copy size={10} /></button>
                                    </span>
                                )}
                                {selectedStudent.dob && <span>📅 {selectedStudent.dob}</span>}
                                {styleInfo && <span className="flex items-center gap-1">{styleInfo.icon} {styleInfo.label}</span>}
                                {selectedStudent.parentContact && <span>📞 {selectedStudent.parentContact}</span>}
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCertificateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 font-bold text-sm"
                        >
                            <Award size={18} /> شهادة إبداع
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                        <div className={`text-2xl font-bold ${avg >= 80 ? 'text-emerald-400' : avg >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{avg}%</div>
                        <div className="text-[10px] text-slate-500">المعدل</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-blue-400">{selectedStudent.grades.length}</div>
                        <div className="text-[10px] text-slate-500">الدرجات</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-amber-400">{selectedStudent.participationCount}</div>
                        <div className="text-[10px] text-slate-500">المشاركات</div>
                    </div>
                </div>

                {/* Behavior Notes */}
                <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 mb-4">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><MessageSquare size={14} className="text-teal-400" /> ملاحظات سلوكية</h3>
                    <textarea 
                        value={selectedStudent.behaviorNotes || ''} 
                        onChange={e => handleUpdateBehaviorNotes(e.target.value)}
                        onBlur={saveBehaviorNotesToDB}
                        placeholder="اكتب ملاحظاتك عن الطالب هنا..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/50 resize-none h-20" dir="rtl" />
                </div>

                {/* Grades Table */}
                <div className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden mb-4">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Award size={14} className="text-amber-400" /> سجل الدرجات</h3>
                        <button onClick={() => setShowAddGrade(true)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500 hover:text-white transition-all">
                            <Plus size={12} /> إضافة درجة
                        </button>
                    </div>
                    {selectedStudent.grades.length === 0 ? (
                        <div className="p-6 text-center text-slate-600 text-sm">لا توجد درجات مسجلة</div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {selectedStudent.grades.map(g => (
                                <div key={g.id} className="p-3 flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${g.type === 'exam' ? 'bg-red-500/10 text-red-400' :
                                        g.type === 'homework' ? 'bg-blue-500/10 text-blue-400' :
                                            g.type === 'participation' ? 'bg-emerald-500/10 text-emerald-400' :
                                                'bg-purple-500/10 text-purple-400'
                                        }`}>
                                        {GRADE_TYPES.find(gt => gt.value === g.type)?.label.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-white">{g.title}</div>
                                        <div className="text-[10px] text-slate-500">{GRADE_TYPES.find(gt => gt.value === g.type)?.label} • {g.date}</div>
                                    </div>
                                    <div className={`text-sm font-bold ${(g.score / g.maxScore) * 100 >= 80 ? 'text-emerald-400' : (g.score / g.maxScore) * 100 >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                                        {g.score}/{g.maxScore}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ========== RESOURCES VIEW ==========
    const renderResources = () => (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FolderOpen size={20} className="text-purple-400" /> المصادر والمناهج
                </h2>
                <div className="flex gap-2">
                    <button onClick={() => setShowAddUnit(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-bold hover:bg-purple-600 hover:text-white transition-all">
                        <Target size={14} /> وحدة تعليمية
                    </button>
                    <button onClick={() => setShowAddResource(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all">
                        <Plus size={14} /> مصدر جديد
                    </button>
                </div>
            </div>

            {/* Learning Units */}
            {classUnits.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2"><Target size={14} /> الوحدات التعليمية</h3>
                    <div className="space-y-3">
                        {classUnits.map(unit => (
                            <div key={unit.id} className="bg-slate-900/40 border border-purple-500/10 rounded-xl p-4 group">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-bold text-white">{unit.title}</h4>
                                    <button onClick={async () => {
                                        if(!window.confirm('هل أنت متأكد من حذف هذه الوحدة؟')) return;
                                        try {
                                            await deleteLearningUnit(unit.id);
                                            const r = await fetchLearningUnits();
                                            if(r) setUnits(r);
                                        } catch (e: any) { alert('فشل الحذف: ' + (e?.message || 'خطأ')); }
                                    }}
                                        className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 transition-all">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                {unit.objectives.length > 0 && (
                                    <ul className="text-xs text-slate-400 space-y-1">
                                        {unit.objectives.map((obj, i) => (
                                            <li key={i} className="flex items-start gap-1.5">
                                                <span className="text-purple-400 mt-0.5">•</span> {obj}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Resources Grid */}
            <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2"><FolderOpen size={14} /> المصادر</h3>
            {classResources.length === 0 ? (
                <div className="text-center py-12 text-slate-600">
                    <FolderOpen size={40} className="mx-auto mb-3 opacity-50" />
                    <p>لا توجد مصادر بعد</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {classResources.map(res => (
                        <div key={res.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 flex flex-col gap-3 group hover:border-slate-600 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-none">
                                    {getResourceIcon(res.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    {editingResourceId === res.id ? (
                                        <input
                                            type="text"
                                            value={editingResourceTitle}
                                            onChange={e => setEditingResourceTitle(e.target.value)}
                                            onBlur={async () => {
                                                const title = editingResourceTitle.trim();
                                                if (title && title !== res.title) {
                                                    try {
                                                        await updateResource(res.id, { title });
                                                        setResources(prev => prev.map(r => r.id === res.id ? { ...r, title } : r));
                                                    } catch (e: any) { alert('فشل التحديث: ' + (e?.message || 'خطأ')); }
                                                }
                                                setEditingResourceId(null);
                                            }}
                                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                            className="w-full bg-slate-800 border border-cyan-500/50 rounded-lg px-2 py-1 text-sm text-white"
                                            dir="rtl"
                                            autoFocus
                                        />
                                    ) : (
                                        <h4 className="text-sm font-bold text-white truncate">{res.title}</h4>
                                    )}
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        {res.tags.slice(0, 3).map(tag => (
                                            <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded">{tag}</span>
                                        ))}
                                        {editingResourceId !== res.id && (
                                            <button
                                                onClick={() => { setEditingResourceId(res.id); setEditingResourceTitle(res.title); }}
                                                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-cyan-400 transition-all p-0.5 rounded hover:bg-slate-700/50"
                                                title="تغيير العنوان"
                                            >
                                                <Pencil size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <button onClick={async () => {
                                    if(!window.confirm('هل أنت متأكد من حذف هذا المصدر؟')) return;
                                    try {
                                        if (res.url) await deleteStorageFileByUrl(res.url);
                                        await deleteResource(res.id);
                                        const r = await fetchResourcesByType();
                                        if(r) setResources(r);
                                    } catch (e: any) {
                                        alert('فشل الحذف: ' + (e?.message || 'خطأ غير متوقع'));
                                    }
                                }}
                                    className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 transition-all">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            {res.url && (
                                <div className="flex flex-wrap gap-1.5">
                                    <button onClick={() => handleResourceView(res)} title="عرض" className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-bold">
                                        <ExternalLink size={12} /> عرض
                                    </button>
                                    <button onClick={() => handleResourcePrint(res)} title="طباعة" className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-bold">
                                        <Printer size={12} /> طباعة
                                    </button>
                                    <button onClick={() => handleResourceDownload(res)} title="تحميل" className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-bold">
                                        <Download size={12} /> تحميل
                                    </button>
                                    {(res.type === 'pdf' || res.type === 'image') && onGenerateLesson && (
                                        <button onClick={() => openResourceExplorer(res)} title="استعراض وبحث (OCR)" className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 text-[10px] font-bold border border-cyan-500/30">
                                            <Search size={12} /> استعراض وبحث
                                        </button>
                                    )}
                                    {onGenerateLesson && (
                                        <button onClick={() => openGenerateFromResource(res)} title="توليد درس" className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                                            <Brain size={12} /> توليد درس
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Saved Lessons (from lesson_plans table) */}
            <div className="mt-6">
                <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2"><BookOpen size={14} /> الدروس المحفوظة</h3>
                {classLessonPlans.length === 0 ? (
                    <p className="text-sm text-slate-500">لا توجد دروس محفوظة بعد. أنشئ درساً من منهاجي أو إنشاء درس، ثم احفظه ليظهر هنا.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {classLessonPlans.map(plan => (
                            <div key={plan.id} className="bg-gradient-to-br from-cyan-950/30 to-slate-900/40 border border-cyan-500/20 rounded-xl p-4 group hover:border-cyan-500/50 transition-all">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                            <BookOpen size={18} className="text-cyan-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">{plan.topic}</h4>
                                            <p className="text-[10px] text-slate-500 font-mono">{plan.subject} • {plan.grade}</p>
                                        </div>
                                    </div>
                                    <button onClick={async () => {
                                        if(!window.confirm('هل أنت متأكد من حذف هذا الدرس؟')) return;
                                        try {
                                            await deleteLessonPlan(plan.id);
                                            const p = await fetchLessonPlans();
                                            if(p) setLessonPlans(p);
                                        } catch (e: any) { alert('فشل الحذف: ' + (e?.message || 'خطأ')); }
                                    }}
                                        className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 transition-all">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[9px] text-slate-600 mr-auto font-mono">
                                        {(plan as { createdAt?: string }).createdAt
                                            ? new Date((plan as { createdAt?: string }).createdAt).toLocaleDateString('ar')
                                            : ''}
                                    </span>
                                </div>
                                {onViewLesson && (
                                    <button
                                        onClick={() => onViewLesson(plan)}
                                        className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold hover:bg-cyan-500 hover:text-white transition-all"
                                    >
                                        <Eye size={14} /> فتح الدرس
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    // ========== ASSESSMENTS VIEW ==========
    const renderAssessments = () => {
        if (!selectedClass) return null;
        const assessments = selectedClass.assessments || [];
        const avatarColors = [
            'from-blue-400 to-cyan-400', 'from-pink-400 to-rose-400', 'from-amber-400 to-orange-400',
            'from-emerald-400 to-teal-400', 'from-purple-400 to-violet-400', 'from-red-400 to-pink-400',
        ];

        return (
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <GraduationCap size={20} className="text-red-400" /> الاختبارات والتقييمات
                    </h2>
                    <button onClick={() => setShowAddAssessment(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                        <Plus size={16} /> تقييم جديد
                    </button>
                </div>

                {assessments.length === 0 ? (
                    <div className="text-center py-20">
                        <GraduationCap size={48} className="text-slate-700 mx-auto mb-4" />
                        <p className="text-lg text-slate-500 mb-2">لا توجد تقييمات بعد</p>
                        <p className="text-sm text-slate-600">أنشئ تقييماً جديداً وسيتم ربطه بالتقويم المدرسي تلقائياً</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {assessments.map(assessment => {
                            const isExpanded = expandedAssessmentId === assessment.id;
                            const gradedCount = selectedClass.students.filter(s =>
                                s.grades.some(g => g.assessmentId === assessment.id)
                            ).length;
                            const totalStudents = selectedClass.students.length;
                            const typeLabel = GRADE_TYPES.find(gt => gt.value === assessment.type)?.label || '';
                            const typeColor = assessment.type === 'exam' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                                assessment.type === 'homework' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                                    assessment.type === 'participation' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                                        'text-purple-400 bg-purple-500/10 border-purple-500/20';

                            return (
                                <div key={assessment.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all">
                                    {/* Assessment Header */}
                                    <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => openAssessmentGrading(assessment)}>
                                        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-none ${typeColor}`}>
                                            <GraduationCap size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white text-lg">{assessment.title}</h3>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                <span className={`px-2 py-0.5 rounded-lg border ${typeColor} font-bold`}>{typeLabel}</span>
                                                <span>📅 {assessment.date}</span>
                                                <span>الدرجة العظمى: {assessment.maxScore}</span>
                                                {assessment.relatedCalendarEventId && (
                                                    <span className="flex items-center gap-1 text-indigo-400">
                                                        <CalendarDays size={10} /> مرتبط بالتقويم
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 flex-none">
                                            {/* Grading progress */}
                                            <div className="text-center">
                                                <div className="text-lg font-black text-white">{gradedCount}/{totalStudents}</div>
                                                <div className="text-[9px] text-slate-600 font-bold">تم الرصد</div>
                                            </div>
                                            <button onClick={e => { e.stopPropagation(); handleDeleteAssessment(assessment.id); }}
                                                className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Grading Grid (Expandable) */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-800 p-4 bg-slate-950/50">
                                            {selectedClass.students.length === 0 ? (
                                                <div className="text-center py-6 text-slate-600 text-sm">لا يوجد طلاب في الفصل</div>
                                            ) : (
                                                <>
                                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                                        {selectedClass.students.map((s, i) => {
                                                            const existing = s.grades.find(g => g.assessmentId === assessment.id);
                                                            const score = gradingScores[s.id] ?? '';
                                                            const pct = score ? (parseFloat(score) / assessment.maxScore) * 100 : 0;
                                                            const scoreColor = pct >= 90 ? 'text-emerald-400' : pct >= 70 ? 'text-blue-400' : pct >= 50 ? 'text-amber-400' : score ? 'text-red-400' : 'text-slate-500';

                                                            return (
                                                                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all">
                                                                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white font-bold text-xs flex-none`}>
                                                                        {s.name.charAt(0)}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className="text-sm font-bold text-white">{s.name}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 flex-none">
                                                                        <input
                                                                            type="number"
                                                                            value={score}
                                                                            onChange={e => setGradingScores(prev => ({ ...prev, [s.id]: e.target.value }))}
                                                                            placeholder="—"
                                                                            min="0"
                                                                            max={String(assessment.maxScore)}
                                                                            className={`w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-center font-bold ${scoreColor} focus:outline-none focus:border-indigo-500/50 transition-colors`}
                                                                        />
                                                                        <span className="text-xs text-slate-600 font-mono">/ {assessment.maxScore}</span>
                                                                        {existing && <span className="text-[9px] text-emerald-600">✓</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="flex gap-3 mt-4 pt-3 border-t border-slate-800">
                                                        <button onClick={() => handleSaveAssessmentGrades(assessment)}
                                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg">
                                                            <Save size={16} /> حفظ الدرجات
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // ========== CURRICULUM BOOKS VIEW (Same style as منهاجي) ==========
    const renderKeyVisual = (kv: KeyVisual, idx: number) => {
        const config = MATERIAL_CONFIG[kv.material] || MATERIAL_CONFIG.paper;
        return (
            <div key={idx} className={`relative rounded-xl p-4 border ${config.bg} ${config.border} overflow-hidden`}>
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{config.emoji}</span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">{config.label} — {kv.calligraphyStyle}</span>
                </div>
                <p className={`text-sm font-bold leading-relaxed ${config.textColor}`} style={{ fontFamily: 'serif' }}>
                    « {kv.text} »
                </p>
            </div>
        );
    };

    const renderCurriculumLesson = (book: CurriculumBook, lesson: CurriculumLesson, index: number) => {
        const lessonKey = `${book.id}-${index}`;
        const isExpanded = expandedLessonKey === lessonKey;
        return (
            <div key={lessonKey} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/30">
                <button
                    onClick={() => setExpandedLessonKey(isExpanded ? null : lessonKey)}
                    className="w-full flex items-center justify-between p-4 text-right hover:bg-slate-800/30 transition-colors"
                >
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-sm">
                            {index + 1}
                        </div>
                        <div className="flex-1 text-right">
                            <h4 className="text-white font-bold text-sm">{lesson.lessonTitle}</h4>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                الصفحات: {lesson.pageRange?.[0] ?? 0} — {lesson.pageRange?.[1] ?? 0} • {lesson.objectives?.length ?? 0} أهداف • {lesson.activities?.length ?? 0} أنشطة
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                            <CheckCircle2 size={10} className="inline ml-1" /> جاهز
                        </span>
                        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                </button>
                {isExpanded && (
                    <div className="border-t border-slate-800 p-5 space-y-5">
                        {lesson.objectives?.length ? (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Target size={14} className="text-blue-400" />
                                    <h5 className="text-sm font-bold text-blue-400">الأهداف التعليمية</h5>
                                </div>
                                <div className="space-y-2">
                                    {lesson.objectives.map((obj, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                                            <span>{obj}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        {lesson.keyVisuals?.length ? (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <PenTool size={14} className="text-amber-400" />
                                    <h5 className="text-sm font-bold text-amber-400">العناصر البصرية</h5>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {lesson.keyVisuals.map((kv, i) => renderKeyVisual(kv, i))}
                                </div>
                            </div>
                        ) : null}
                        {lesson.activities?.length ? (
                            <div>
                                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                                    <div className="flex items-center gap-2">
                                        <FlaskConical size={14} className="text-emerald-400" />
                                        <h5 className="text-sm font-bold text-emerald-400">الأنشطة والتجارب</h5>
                                        <span className="text-[10px] text-slate-500">(اختر أنشطة للتوليد أو اترك الكل)</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedCurriculumActivities({ ...selectedCurriculumActivities, [lessonKey]: [...lesson.activities] });
                                            }}
                                            className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 font-bold"
                                        >
                                            تحديد الكل
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const next = { ...selectedCurriculumActivities };
                                                delete next[lessonKey];
                                                setSelectedCurriculumActivities(next);
                                            }}
                                            className="text-[10px] px-2 py-1 rounded-lg bg-slate-700/50 border border-slate-600 text-slate-400 hover:bg-slate-600/50 font-bold"
                                        >
                                            إلغاء التحديد
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {lesson.activities.map((act, i) => {
                                        const isSelected = selectedCurriculumActivities[lessonKey]?.includes(act);
                                        return (
                                            <div
                                                key={i}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const current = selectedCurriculumActivities[lessonKey] || [];
                                                    if (isSelected) {
                                                        const next = { ...selectedCurriculumActivities, [lessonKey]: current.filter(a => a !== act) };
                                                        if (next[lessonKey].length === 0) delete next[lessonKey];
                                                        setSelectedCurriculumActivities(next);
                                                    } else {
                                                        setSelectedCurriculumActivities({ ...selectedCurriculumActivities, [lessonKey]: [...current, act] });
                                                    }
                                                }}
                                                className={`rounded-lg p-3 text-sm cursor-pointer transition-colors flex items-start gap-2 ${
                                                    isSelected
                                                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-white'
                                                        : 'bg-emerald-500/5 border border-emerald-500/10 text-slate-300 hover:bg-emerald-500/10'
                                                }`}
                                            >
                                                {isSelected ? <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 shrink-0" /> : <FlaskConical size={12} className="text-emerald-500 mt-0.5 shrink-0" />}
                                                <span>{act}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : null}
                        {lesson.assessmentQuestions?.length ? (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <HelpCircle size={14} className="text-violet-400" />
                                    <h5 className="text-sm font-bold text-violet-400">أسئلة التقويم</h5>
                                </div>
                                <div className="space-y-2">
                                    {lesson.assessmentQuestions.map((q, i) => (
                                        <div key={i} className="bg-violet-500/5 border border-violet-500/10 rounded-lg p-3 text-sm text-slate-300 flex items-start gap-2">
                                            <span className="text-violet-400 font-bold shrink-0">س{i + 1}:</span>
                                            <span>{q}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); exportLessonToPDF(lesson, book.bookMetadata); }}
                                className="flex-1 py-3 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                                title="تحميل الدرس بصيغة PDF"
                            >
                                <FileText size={16} /> حفظ PDF
                            </button>
                            {onGenerateLesson && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const acts = selectedCurriculumActivities[lessonKey] ?? lesson.activities;
                                        onGenerateLesson(lesson.lessonTitle, book.bookMetadata?.grade || '', acts, book.bookMetadata?.subject, book.bookMetadata?.part);
                                    }}
                                    className="flex-1 py-3 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2"
                                    title={selectedCurriculumActivities[lessonKey]?.length ? `توليد درس بـ ${selectedCurriculumActivities[lessonKey].length} نشاط` : 'توليد درس بكل الأنشطة'}
                                >
                                    <Brain size={16} /> توليد درس ذكي
                                    <span className="text-[10px] opacity-90">
                                        ({selectedCurriculumActivities[lessonKey]?.length ? `${selectedCurriculumActivities[lessonKey].length} أنشطة` : 'كل الأنشطة'})
                                    </span>
                                    <Sparkles size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderCurriculumBooks = () => {
        if (!selectedClass) return null;
        const filteredBooks = curricula.filter(b => {
            if (b.linkedClassId) return b.linkedClassId === selectedClass.id;
            const gradeMatch = !selectedClass.gradeLevel || 
                b.bookMetadata?.grade?.includes(selectedClass.gradeLevel) || 
                selectedClass.gradeLevel?.includes(b.bookMetadata?.grade || '');
            const subjectMatch = !selectedClass.subject || 
                b.bookMetadata?.subject?.includes(selectedClass.subject) || 
                selectedClass.subject?.includes(b.bookMetadata?.subject || '') ||
                selectedClass.subject === 'فصل عام';
            return gradeMatch && subjectMatch;
        });

        return (
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Book size={20} className="text-cyan-400" /> المناهج المحللة
                    </h2>
                </div>
                {filteredBooks.length === 0 ? (
                    <div className="text-center py-20">
                        <Book size={48} className="text-slate-700 mx-auto mb-4" />
                        <p className="text-lg text-slate-500 mb-2">لا توجد مناهج محفوظة</p>
                        <p className="text-sm text-slate-600">قم بتحليل الكتب المدرسية عبر وكيل "منهاجي"</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {filteredBooks.map(book => {
                            const isExpanded = expandedBookId === book.id;
                            return (
                                <div key={book.id} className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/40">
                                    <div 
                                        onClick={() => { setExpandedBookId(isExpanded ? null : book.id); setExpandedLessonKey(null); }}
                                        className="p-4 cursor-pointer hover:bg-slate-800/30 transition-colors border-b border-slate-800"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                                                <BookOpen size={28} className="text-cyan-400" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-black text-white">{getCurriculumBookDisplayName(book)}</h3>
                                                <p className="text-sm text-slate-500 mt-0.5">
                                                    {book.bookMetadata?.subject} • {book.bookMetadata?.grade} • {book.curriculumStructure?.length ?? 0} درس
                                                </p>
                                            </div>
                                            {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="p-6 space-y-6 bg-slate-950/30">
                                            {/* بيانات الكتاب - مثل منهاجي */}
                                            <div className="border border-cyan-500/20 rounded-2xl bg-gradient-to-br from-cyan-950/30 to-blue-950/20 p-5">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <BookOpen size={20} className="text-cyan-400" />
                                                    <h4 className="font-bold text-white">بيانات الكتاب</h4>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-center">
                                                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">المادة</div>
                                                        <div className="text-white font-bold">{book.bookMetadata?.subject || '—'}</div>
                                                    </div>
                                                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-center">
                                                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">الصف</div>
                                                        <div className="text-white font-bold">{book.bookMetadata?.grade || '—'}</div>
                                                    </div>
                                                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-center">
                                                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">الجزء</div>
                                                        <div className="text-white font-bold">{book.bookMetadata?.part || '—'}</div>
                                                    </div>
                                                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-center">
                                                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">الدروس</div>
                                                        <div className="text-cyan-400 font-black text-xl">{book.curriculumStructure?.length ?? 0}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* ربط بالفصل */}
                                            {book.linkedClassId && (
                                                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                                                    <MapPin size={18} className="text-emerald-400" />
                                                    <span className="text-sm text-slate-400">مرتبط بالفصل:</span>
                                                    <span className="text-sm font-bold text-emerald-400">
                                                        {classes.find(c => c.id === book.linkedClassId)?.name || selectedClass?.name}
                                                    </span>
                                                </div>
                                            )}
                                            {/* هيكل المنهج - دروس بتنسيق منهاجي */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Layers size={18} className="text-cyan-400" />
                                                    <h4 className="text-lg font-bold text-slate-200">هيكل المنهج</h4>
                                                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-slate-700 to-transparent" />
                                                </div>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {(book.curriculumStructure || []).map((lesson, idx) => renderCurriculumLesson(book, lesson, idx))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };


    // ========== GROUP MANAGER VIEW ==========
    const renderGroupManager = () => (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users size={20} className="text-emerald-400" /> إدارة الشعب والطلاب
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        إدارة قوائم الطلاب بشكل مركزي للفصول الدراسية
                    </p>
                </div>
                <button onClick={() => setShowAddGroup(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <Plus size={16} /> إضافة شغبة
                </button>
            </div>

            {studentGroups.length === 0 ? (
                <div className="text-center py-20">
                    <Users size={48} className="text-slate-700 mx-auto mb-4" />
                    <p className="text-lg text-slate-500 mb-2">لا توجد شعب دراسية محفوظة</p>
                    <p className="text-sm text-slate-600">قم بإنشاء شعبة (مثل: الصف الثاني - أ) وأضف الطلاب مرة واحدة لتستخدمهم في جميع المواد.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {studentGroups.map(group => (
                        <div key={group.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 hover:border-emerald-500/30 transition-all group relative">
                            <button onClick={() => handleDeleteGroup(group.id)}
                                className="absolute top-3 left-3 w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all">
                                <Trash2 size={12} />
                            </button>

                            <h3 className="text-lg font-bold text-white mb-1">{group.name}</h3>
                            <p className="text-xs text-slate-500 mb-4">{group.gradeLevel}</p>

                            <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                                <span className="flex items-center gap-1"><Users size={12} /> {group.students.length} طالب</span>
                            </div>

                            <div className="flex gap-2">
                                {/* Import Excel */}
                                <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-emerald-600 hover:text-white hover:border-emerald-500 transition-all cursor-pointer">
                                    <Upload size={14} /> استيراد Excel
                                    <input 
                                        type="file" 
                                        accept=".xlsx, .xls, .csv" 
                                        className="hidden" 
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (evt) => {
                                                    const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                                                    const workbook = read(data, { type: 'array' });
                                                    const sheetName = workbook.SheetNames[0];
                                                    const worksheet = workbook.Sheets[sheetName];
                                                    const jsonData: any[] = utils.sheet_to_json(worksheet, { header: 1 });
                                                    
                                                    // Simple parse logic for group context
                                                    if (jsonData.length < 2) return;
                                                    
                                                    // Assume Name is first column
                                                    const newStudents: Student[] = [];
                                                    for (let i = 1; i < jsonData.length; i++) {
                                                        const row = jsonData[i];
                                                        if (row && row[0]) {
                                                            newStudents.push({
                                                                id: `stu-${Date.now()}-${i}`,
                                                                name: String(row[0]).trim(),
                                                                grades: [],
                                                                participationCount: 0
                                                            });
                                                        }
                                                    }
                                                    
                                                    if (newStudents.length > 0) {
                                                        const updatedGroups = studentGroups.map(g => 
                                                            g.id === group.id ? { ...g, students: [...g.students, ...newStudents] } : g
                                                        );
                                                        saveStudentGroups(updatedGroups);
                                                        alert(`تم إضافة ${newStudents.length} طالب بنجاح!`);
                                                    }
                                                };
                                                reader.readAsArrayBuffer(file);
                                            }
                                        }}
                                    />
                                </label>
                                
                                {/* Create Class from Group */}
                                <button 
                                    onClick={() => {
                                        setFormSelectedGroupForClass(group.id);
                                        setFormClassName(`${group.name} - مادة ...`);
                                        setFormClassGrade(group.gradeLevel);
                                        setShowAddClass(true);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all"
                                >
                                    <Plus size={14} /> إنشاء فصل
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // ========== MODAL RENDERER ==========
    const renderModal = (show: boolean, onClose: () => void, title: string, children: React.ReactNode) => {
        if (!show) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
                <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ animation: 'slideUp 0.3s ease-out' }}>
                    <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">{title}</h3>
                        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
                    </div>
                    <div className="p-5 space-y-3">{children}</div>
                </div>
            </div>
        );
    };

    const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors";
    const labelClass = "text-xs text-slate-500 font-bold mb-1.5 block";
    const btnPrimary = "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg";

    return (
        <div className="relative w-full min-h-screen bg-slate-950 flex flex-col overflow-hidden font-sans text-slate-100">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: `radial-gradient(circle at 30% 70%, rgba(139, 92, 246, 0.06) 0%, transparent 50%),
                                  radial-gradient(circle at 70% 30%, rgba(59, 130, 246, 0.06) 0%, transparent 50%)`,
            }} />
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{
                backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)`,
                backgroundSize: '40px 40px'
            }} />

            {/* Header */}
            <div className="relative z-10 p-6 md:p-8 pb-4 flex items-center justify-between border-b border-white/5 bg-gradient-to-b from-slate-900/60 to-transparent backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-all">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                            <GraduationCap className="text-violet-400" size={28} />
                            إدارة فصولي
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">تنظيم الفصول، الطلاب، والمصادر التعليمية</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10">
                <div className="max-w-5xl mx-auto">
                    {renderBreadcrumb()}

                    {view === 'class-list' && renderClassList()}
                    {view === 'group-manager' && renderGroupManager()}
                    {view === 'class-dashboard' && renderClassDashboard()}
                    {view === 'roster' && renderRoster()}
                    {view === 'student-profile' && renderStudentProfile()}
                    {view === 'resources' && renderResources()}
                    {view === 'assessments' && renderAssessments()}
                    {view === 'curriculum-books' && renderCurriculumBooks()}
                </div>
            </div>

            {/* === MODALS === */}


            {/* Add Class Modal */}
            {renderModal(showAddClass, () => setShowAddClass(false), 'إضافة فصل جديد', <>
                <div>
                    <label className={labelClass}>ربط بشعبة / مجموعة (اختياري)</label>
                    <select 
                        value={formSelectedGroupForClass} 
                        onChange={e => {
                            setFormSelectedGroupForClass(e.target.value);
                            const grp = studentGroups.find(g => g.id === e.target.value);
                            if (grp) {
                                setFormClassGrade(grp.gradeLevel);
                            }
                        }}
                        className={inputClass} dir="rtl"
                    >
                        <option value="">بدون ربط (فصل فارغ)</option>
                        {studentGroups.map(g => (
                            <option key={g.id} value={g.id}>{g.name} ({g.students.length} طالب)</option>
                        ))}
                    </select>
                </div>
                <div><label className={labelClass}>اسم الفصل *</label><input type="text" value={formClassName} onChange={e => setFormClassName(e.target.value)} placeholder="مثال: الصف الثاني - فصل أ" className={inputClass} dir="rtl" /></div>
                <div><label className={labelClass}>المرحلة / الصف</label><input type="text" value={formClassGrade} onChange={e => setFormClassGrade(e.target.value)} placeholder="مثال: الصف الثاني" className={inputClass} dir="rtl" /></div>
                <div><label className={labelClass}>المادة (اختياري)</label><input type="text" value={formClassSubject} onChange={e => setFormClassSubject(e.target.value)} placeholder="العلوم" className={inputClass} dir="rtl" /></div>
                <div className="flex gap-3 pt-2">
                    <button onClick={handleAddClass} disabled={!formClassName.trim()} className={btnPrimary}><Save size={16} /> إنشاء الفصل</button>
                </div>
            </>)}

            {/* Add Group Modal */}
            {renderModal(showAddGroup, () => setShowAddGroup(false), 'إضافة شعبة جديدة', <>
                <div><label className={labelClass}>اسم الشعبة *</label><input type="text" value={formGroupName} onChange={e => setFormGroupName(e.target.value)} placeholder="مثال: الصف الثاني - أ" className={inputClass} dir="rtl" /></div>
                <div><label className={labelClass}>المرحلة / الصف</label><input type="text" value={formGroupGrade} onChange={e => setFormGroupGrade(e.target.value)} placeholder="مثال: الصف الثاني" className={inputClass} dir="rtl" /></div>
                <div className="flex gap-3 pt-2">
                    <button onClick={handleAddGroup} disabled={!formGroupName.trim()} className={btnPrimary}><Save size={16} /> إنشاء الشعبة</button>
                </div>
            </>)}


            {/* Add Student Modal */}
            {renderModal(showAddStudent, () => setShowAddStudent(false), 'إضافة طالب جديد', <>
                {classes.length > 1 && selectedClassId && (
                    <div className="mb-4">
                        <label className={labelClass}>الفصل المستهدف</label>
                        <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className={inputClass} dir="rtl">
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name} {c.subject ? `- ${c.subject}` : ''} ({c.students.length} طالب)</option>
                            ))}
                        </select>
                        {selectedClass && (() => {
                            const siblings = classes.filter(c => c.name === selectedClass.name);
                            if (siblings.length > 1) {
                                return (
                                    <p className="text-amber-400/90 text-xs mt-2 flex items-center gap-1">
                                        <Info size={12} /> سيُضاف الطالب تلقائياً إلى جميع المواد ({siblings.length} مواد): {siblings.map(c => c.subject || c.name).join('، ')}
                                    </p>
                                );
                            }
                            return null;
                        })()}
                    </div>
                )}
                <p className="text-slate-400 text-xs mb-4">
                    أضف طالباً يدوياً. سيتم توليد رقم تسجيل تلقائياً إن لم تُدخله. شارك الرقم مع الطالب لإدخاله عند التسجيل.
                </p>
                <div className="space-y-3">
                    <div><label className={labelClass}>اسم الطالب *</label><input type="text" value={formStudentName} onChange={e => setFormStudentName(e.target.value)} placeholder="محمد أحمد" className={inputClass} dir="rtl" /></div>
                    <div>
                        <label className={labelClass}>رقم التسجيل (اختياري)</label>
                        <input type="text" value={formStudentRegistrationCode} onChange={e => setFormStudentRegistrationCode(e.target.value)} placeholder="اتركه فارغاً للتوليد التلقائي" className={inputClass} dir="ltr" />
                        <p className="text-[10px] text-slate-500 mt-1">الرقم الذي يدخله الطالب عند التسجيل للانضمام للفصل</p>
                    </div>
                    <div><label className={labelClass}>تاريخ الميلاد</label><input type="date" value={formStudentDob} onChange={e => setFormStudentDob(e.target.value)} className={inputClass} /></div>
                    <div>
                        <label className={labelClass}>نمط التعلم</label>
                        <div className="flex gap-2 flex-wrap">
                            {LEARNING_STYLES.map(ls => (
                                <button key={ls.value} type="button" onClick={() => setFormStudentStyle(ls.value)}
                                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 ${formStudentStyle === ls.value ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                    {ls.icon} {ls.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div><label className={labelClass}>تواصل ولي الأمر</label><input type="text" value={formStudentParent} onChange={e => setFormStudentParent(e.target.value)} placeholder="هاتف أو بريد إلكتروني" className={inputClass} dir="rtl" /></div>
                    <div>
                        <label className={labelClass}>ملاحظات</label>
                        <textarea value={formStudentNotes} onChange={e => setFormStudentNotes(e.target.value)} placeholder="ملاحظات عن الطالب أو ولي الأمر..." className={`${inputClass} resize-none h-20`} dir="rtl" rows={3} />
                    </div>
                </div>
                <div className="flex gap-3 pt-4">
                    <button onClick={handleAddStudent} disabled={!formStudentName.trim()} className={btnPrimary}><UserPlus size={16} /> إضافة الطالب</button>
                </div>
                <div className="mt-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <p className="text-slate-400 text-xs font-bold mb-2">أو انضم عبر كود الفصل:</p>
                    <div className="flex items-center justify-between gap-2">
                        <code className="text-sm font-mono text-emerald-400">{selectedClass?.classCode || '—'}</code>
                        <button onClick={() => { navigator.clipboard.writeText(selectedClass?.classCode || ''); alert('تم نسخ كود الفصل'); }} className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white"><Copy size={14} /></button>
                    </div>
                </div>
            </>)}

            {/* Calendar Sync Toast */}
            {calendarSyncToast && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold backdrop-blur-md shadow-2xl animate-pulse flex items-center gap-2">
                    <CalendarDays size={16} /> {calendarSyncToast}
                </div>
            )}

            {/* Add Grade Modal (individual / manual grade) */}
            {renderModal(showAddGrade, () => setShowAddGrade(false), 'إضافة درجة', <>
                <div><label className={labelClass}>عنوان التقييم *</label><input type="text" value={formGradeTitle} onChange={e => setFormGradeTitle(e.target.value)} placeholder="مثال: اختبار الوحدة الأولى" className={inputClass} dir="rtl" /></div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelClass}>الدرجة</label><input type="number" value={formGradeScore} onChange={e => setFormGradeScore(e.target.value)} placeholder="85" className={inputClass} /></div>
                    <div><label className={labelClass}>من</label><input type="number" value={formGradeMax} onChange={e => setFormGradeMax(e.target.value)} placeholder="100" className={inputClass} /></div>
                </div>
                <div>
                    <label className={labelClass}>تاريخ التقييم</label>
                    <input type="date" value={formGradeDate} onChange={e => setFormGradeDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>نوع التقييم</label>
                    <div className="grid grid-cols-4 gap-2">
                        {GRADE_TYPES.map(gt => (
                            <button key={gt.value} onClick={() => setFormGradeType(gt.value)}
                                className={`py-2 rounded-xl border text-xs font-bold transition-all ${formGradeType === gt.value ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                {gt.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={handleAddGrade} disabled={!formGradeTitle.trim()} className={btnPrimary}><Save size={16} /> حفظ الدرجة</button>
                </div>
            </>)}

            {/* Add Assessment Modal (class-level, with calendar sync) */}
            {renderModal(showAddAssessment, () => setShowAddAssessment(false), 'تقييم جديد للفصل', <>
                <div><label className={labelClass}>عنوان التقييم *</label><input type="text" value={formAssessmentTitle} onChange={e => setFormAssessmentTitle(e.target.value)} placeholder="مثال: اختبار نهاية الفصل الأول" className={inputClass} dir="rtl" /></div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelClass}>تاريخ التقييم</label>
                        <input type="date" value={formAssessmentDate} onChange={e => setFormAssessmentDate(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>الدرجة العظمى</label>
                        <input type="number" value={formAssessmentMax} onChange={e => setFormAssessmentMax(e.target.value)} placeholder="100" className={inputClass} />
                    </div>
                </div>
                <div>
                    <label className={labelClass}>نوع التقييم</label>
                    <div className="grid grid-cols-4 gap-2">
                        {GRADE_TYPES.map(gt => (
                            <button key={gt.value} onClick={() => setFormAssessmentType(gt.value)}
                                className={`py-2 rounded-xl border text-xs font-bold transition-all ${formAssessmentType === gt.value ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                {gt.label}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Calendar Sync Checkbox */}
                <div
                    onClick={() => setFormAssessmentCalendar(!formAssessmentCalendar)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formAssessmentCalendar
                        ? 'bg-indigo-500/15 border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        }`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all flex-none ${formAssessmentCalendar ? 'bg-indigo-500 border-indigo-400' : 'border-slate-600'
                        }`}>
                        {formAssessmentCalendar && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        <CalendarDays size={14} className={formAssessmentCalendar ? 'text-indigo-400' : 'text-slate-500'} />
                        <span className={`text-sm font-bold ${formAssessmentCalendar ? 'text-indigo-300' : 'text-slate-400'}`}>إضافة للتقويم المدرسي</span>
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={handleAddAssessment} disabled={!formAssessmentTitle.trim()} className={btnPrimary}><Save size={16} /> إنشاء التقييم</button>
                </div>
            </>)}

            {/* Add Unit Modal */}
            {renderModal(showAddUnit, () => setShowAddUnit(false), 'وحدة تعليمية جديدة', <>
                <div><label className={labelClass}>عنوان الوحدة *</label><input type="text" value={formUnitTitle} onChange={e => setFormUnitTitle(e.target.value)} placeholder="مثال: وحدة الحيوانات الأليفة" className={inputClass} dir="rtl" /></div>
                <div><label className={labelClass}>الأهداف (سطر لكل هدف)</label><textarea value={formUnitObjectives} onChange={e => setFormUnitObjectives(e.target.value)} placeholder="هدف ١&#10;هدف ٢" rows={3} className={`${inputClass} resize-none`} dir="rtl" /></div>
                <div className="flex gap-3 pt-2">
                    <button onClick={handleAddUnit} disabled={!formUnitTitle.trim()} className={btnPrimary}><Save size={16} /> إنشاء الوحدة</button>
                </div>
            </>)}

            {/* Add Resource Modal */}
            {showResourceExplorer && (
                <ResourceExplorerModal
                    resource={resourceForExplorer}
                    onClose={() => { setShowResourceExplorer(false); setResourceForExplorer(null); }}
                    onGenerate={(topic, grade, pagesOrTitles, subject, part) => {
                        if (onGenerateLesson) onGenerateLesson(topic, grade, pagesOrTitles, subject ?? selectedClass?.subject, part);
                        setShowResourceExplorer(false);
                        setResourceForExplorer(null);
                    }}
                    onSaveResource={async (resourceId, updates) => {
                        await updateResource(resourceId, updates);
                        setResources(prev => prev.map(r => r.id === resourceId ? { ...r, data: updates.data ?? r.data } : r));
                        setResourceForExplorer(prev => prev?.id === resourceId ? { ...prev, data: updates.data ?? prev.data } : prev);
                    }}
                    defaultGrade={selectedClass?.gradeLevel || 'الصف الثالث الابتدائي'}
                    gradeOptions={GRADE_OPTIONS}
                />
            )}
            {renderModal(showGenerateFromResource, () => { setShowGenerateFromResource(false); setSelectedResourceForGenerate(null); }, 'توليد درس من المصدر', <>
                <p className="text-xs text-slate-500 mb-3">اختر عنوان الدرس والصف، وأدخل صفحات أو عناوين للتركيز عليها (سطر لكل عنصر):</p>
                <div><label className={labelClass}>عنوان الدرس *</label><input type="text" value={formGenTopic} onChange={e => setFormGenTopic(e.target.value)} placeholder="مثال: الحيوانات الأليفة" className={inputClass} dir="rtl" /></div>
                <div><label className={labelClass}>الصف</label>
                    <select value={formGenGrade} onChange={e => setFormGenGrade(e.target.value)} className={inputClass} dir="rtl">
                        {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div><label className={labelClass}>صفحات أو عناوين للتركيز عليها (اختياري)</label><textarea value={formGenPagesTitles} onChange={e => setFormGenPagesTitles(e.target.value)} placeholder="ص 12-15&#10;الفصل الثالث&#10;وحدة النباتات" rows={3} className={`${inputClass} resize-none`} dir="rtl" /></div>
                <div className="flex gap-3 pt-2">
                    <button onClick={handleGenerateFromResource} disabled={!formGenTopic.trim()} className={btnPrimary}><Brain size={16} /> توليد الدرس</button>
                </div>
            </>)}
            {renderModal(showAddResource, () => { setShowAddResource(false); setFormResourceFile(null); }, 'مصدر جديد', <>
                <div><label className={labelClass}>عنوان المصدر *</label><input type="text" value={formResourceTitle} onChange={e => setFormResourceTitle(e.target.value)} placeholder="مثال: كتاب العلوم" className={inputClass} dir="rtl" /></div>
                <div>
                    <label className={labelClass}>النوع</label>
                    <div className="grid grid-cols-5 gap-2">
                        {(['pdf', 'image', 'video', 'link', 'template'] as Resource['type'][]).map(t => (
                            <button key={t} onClick={() => { setFormResourceType(t); setFormResourceFile(null); }}
                                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[10px] font-bold transition-all ${formResourceType === t ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                {getResourceIcon(t)} {t}
                            </button>
                        ))}
                    </div>
                </div>
                {['pdf', 'image', 'video'].includes(formResourceType) ? (
                    <div className="space-y-2">
                        <label className={labelClass}>تحميل ملف أو رابط</label>
                        <div className="flex flex-wrap gap-2">
                            <input ref={addResourceFileInputRef} type="file" accept={getResourceFileAccept(formResourceType as 'pdf'|'image'|'video')} className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) { setFormResourceFile(f); setFormResourceTitle(prev => prev.trim() || f.name); } e.target.value = ''; }} />
                            <button type="button" onClick={() => addResourceFileInputRef.current?.click()}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-slate-300 text-xs font-bold hover:bg-slate-700 hover:border-slate-500 transition-all">
                                <Upload size={14} /> {formResourceFile ? formResourceFile.name : (formResourceType === 'pdf' ? 'اختر PDF' : formResourceType === 'image' ? 'اختر صورة' : 'اختر فيديو')}
                            </button>
                            {formResourceFile && <button type="button" onClick={() => setFormResourceFile(null)} className="text-red-400 hover:text-red-300 text-xs">إلغاء</button>}
                        </div>
                        <input type="text" value={formResourceUrl} onChange={e => setFormResourceUrl(e.target.value)} placeholder="أو أدخل رابطاً: https://..." className={inputClass} dir="ltr" />
                    </div>
                ) : (
                    <div><label className={labelClass}>رابط/مسار</label><input type="text" value={formResourceUrl} onChange={e => setFormResourceUrl(e.target.value)} placeholder="https://..." className={inputClass} /></div>
                )}
                <div><label className={labelClass}>وسوم (فاصلة بينها)</label><input type="text" value={formResourceTags} onChange={e => setFormResourceTags(e.target.value)} placeholder="علوم, أحياء, صف ثاني" className={inputClass} dir="rtl" /></div>
                <div className="flex gap-3 pt-2">
                    <button onClick={handleAddResource} disabled={!formResourceTitle.trim() || formResourceUploading} className={btnPrimary}>
                        {formResourceUploading ? 'جاري الرفع...' : <><Save size={16} /> إضافة المصدر</>}
                    </button>
                </div>
            </>)}

            {/* Add Announcement Modal */}
            {renderModal(showAnnouncement, () => setShowAnnouncement(false), 'إعلان جديد', <>
                <div>
                    <label className={labelClass}>نوع الإعلان</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[{ v: 'info' as const, l: 'معلومة', i: <Info size={14} /> }, { v: 'warning' as const, l: 'تنبيه', i: <AlertTriangle size={14} /> }, { v: 'celebration' as const, l: 'احتفال', i: <PartyPopper size={14} /> }].map(a => (
                            <button key={a.v} onClick={() => setFormAnnouncementType(a.v)}
                                className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-bold transition-all ${formAnnouncementType === a.v ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                {a.i} {a.l}
                            </button>
                        ))}
                    </div>
                </div>
                <div><label className={labelClass}>نص الإعلان *</label><textarea value={formAnnouncementText} onChange={e => setFormAnnouncementText(e.target.value)} placeholder="اكتب إعلانك هنا..." rows={3} className={`${inputClass} resize-none`} dir="rtl" /></div>
                <div className="flex gap-3 pt-2">
                    <button onClick={handleAddAnnouncement} disabled={!formAnnouncementText.trim()} className={btnPrimary}><Megaphone size={16} /> نشر الإعلان</button>
                </div>
            </>)}

            {/* Copy Roster Modal */}
            {renderModal(showCopyRoster, () => setShowCopyRoster(false), 'نسخ طلاب من فصل آخر', <>
                <p className="text-xs text-slate-500 mb-3">اختر فصلاً لنسخ جميع طلابه إلى الفصل الحالي (بدون الدرجات):</p>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {classes.filter(c => c.id !== selectedClassId && c.students.length > 0).map(cls => (
                        <button key={cls.id} onClick={() => handleCopyRoster(cls.id)}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex items-center gap-3 hover:border-violet-500/50 hover:bg-violet-500/10 transition-all text-right">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cls.color} flex items-center justify-center text-white font-bold text-xs flex-none`}>
                                {cls.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-white">{cls.name}</h4>
                                <p className="text-[10px] text-slate-500">{cls.gradeLevel}{cls.subject ? ` • ${cls.subject}` : ''}</p>
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                                <Users size={12} /> {cls.students.length}
                            </div>
                        </button>
                    ))}
                </div>
            </>)}

            {renderModal(showCertificateModal, () => setShowCertificateModal(false), 'شهادة إبداع للطالب المتميز', (
                <div className="p-5">
                    <CertificateCreator
                        studentName={selectedStudent?.name || ''}
                        lessonTopic={selectedStudent?.grades?.[0]?.title || ''}
                        onClose={() => setShowCertificateModal(false)}
                    />
                </div>
            ))}

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};
