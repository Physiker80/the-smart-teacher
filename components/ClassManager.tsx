
import React, { useState, useEffect, useCallback } from 'react';
import { ClassRoom, Student, StudentGrade, Announcement, LearningUnit, Resource, CalendarEvent, ClassAssessment, LessonPlan, CurriculumBook, StudentGroup } from '../types';
import { getAllCurricula } from '../services/curriculumService';
import { read, utils } from 'xlsx';
import {
    ArrowLeft, Plus, X, Save, Trash2, Users, BookOpen, GraduationCap,
    BarChart3, Bell, Eye, Pencil, Search, ChevronLeft, ChevronRight,
    Megaphone, PartyPopper, AlertTriangle, Info, UserPlus, FolderOpen,
    Target, FileText, Image as ImageIcon, Video, Link2, Tag, Layers,
    Brain, Ear, Move, Sparkles, TrendingUp, Award, MessageSquare, Star,
    Download, Upload, Copy, CalendarDays, Book, Briefcase
} from 'lucide-react';

interface ClassManagerProps {
    onBack: () => void;
    onNewLesson?: (classId?: string) => void;
    onViewLesson?: (plan: LessonPlan) => void;
    onViewCurricula?: () => void; // Optional if we want to navigate to the agent
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

const GRADE_TYPES: { value: StudentGrade['type']; label: string }[] = [
    { value: 'exam', label: 'اختبار' },
    { value: 'midterm', label: 'اختبار شهري' },
    { value: 'final', label: 'اختبار فصلي' },
    { value: 'homework', label: 'واجب' },
    { value: 'participation', label: 'مشاركة' },
    { value: 'game', label: 'لعبة تعليمية' },
];

export const ClassManager: React.FC<ClassManagerProps> = ({ onBack, onNewLesson, onViewLesson }) => {
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
    const [importStatus, setImportStatus] = useState<string | null>(null);
    
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
    const [formStudentDob, setFormStudentDob] = useState('');
    const [formStudentStyle, setFormStudentStyle] = useState<Student['learningStyle']>('');
    const [formStudentParent, setFormStudentParent] = useState('');
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

    const [curricula, setCurricula] = useState<CurriculumBook[]>([]);
    const [expandedBookId, setExpandedBookId] = useState<string | null>(null);

    // --- PERSISTENCE ---
    useEffect(() => {
        setCurricula(getAllCurricula());
        try {
            const c = localStorage.getItem(CLASSES_KEY);
            if (c) setClasses(JSON.parse(c));
            const u = localStorage.getItem(UNITS_KEY);
            if (u) setUnits(JSON.parse(u));
            const r = localStorage.getItem(RESOURCES_KEY);
            if (r) setResources(JSON.parse(r));
            const g = localStorage.getItem(STUDENT_GROUPS_KEY);
            if (g) setStudentGroups(JSON.parse(g));
        } catch (e) { console.error('Failed to load class data:', e); }
    }, []);

    const saveClasses = useCallback((data: ClassRoom[]) => {
        setClasses(data);
        localStorage.setItem(CLASSES_KEY, JSON.stringify(data));
    }, []);

    const saveUnits = useCallback((data: LearningUnit[]) => {
        setUnits(data);
        localStorage.setItem(UNITS_KEY, JSON.stringify(data));
    }, []);

    const saveResources = useCallback((data: Resource[]) => {
        setResources(data);
        localStorage.setItem(RESOURCES_KEY, JSON.stringify(data));
    }, []);
    
    const saveStudentGroups = useCallback((data: StudentGroup[]) => {
        setStudentGroups(data);
        localStorage.setItem(STUDENT_GROUPS_KEY, JSON.stringify(data));
    }, []);

    // --- DERIVED DATA ---
    const selectedClass = classes.find(c => c.id === selectedClassId) || null;
    const selectedStudent = selectedClass?.students.find(s => s.id === selectedStudentId) || null;
    const classUnits = units.filter(u => u.classId === selectedClassId);
    
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
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData: any[] = utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length < 2) { setImportStatus('الملف فارغ أو لا يحتوي على بيانات'); return; }

                // Determine column indices based on header (row 0)
                // Expected headers: Name, DOB, LearningStyle, Contact
                const header = jsonData[0] as string[];
                const nameIdx = header.findIndex(h => h && (h.includes('اسم') || h.includes('Name')));
                const dobIdx = header.findIndex(h => h && (h.includes('مواليد') || h.includes('تاريخ') || h.includes('DOB')));
                
                // Fallback to 0, 1 if headers not found
                const finalNameIdx = nameIdx >= 0 ? nameIdx : 0;
                const finalDobIdx = dobIdx >= 0 ? dobIdx : 1;

                const newStudents: Student[] = [];
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || !row[finalNameIdx]) continue;
                    
                    newStudents.push({
                        id: `stu-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
                        name: String(row[finalNameIdx]).trim(),
                        dob: row[finalDobIdx] ? String(row[finalDobIdx]) : undefined,
                        learningStyle: undefined, 
                        parentContact: undefined,
                        grades: [],
                        participationCount: 0,
                    });
                }

                if (newStudents.length === 0) { setImportStatus('لم يتم العثور على طلاب صالحين'); return; }

                if (target === 'class' && targetId) {
                    const updatedClasses = classes.map(c =>
                        c.id === targetId ? { ...c, students: [...c.students, ...newStudents] } : c
                    );
                    saveClasses(updatedClasses);
                    setImportStatus(`تم استيراد ${newStudents.length} طالب للفصل بنجاح ✅`);
                } else if (target === 'group' && targetId) {
                    const updatedGroups = studentGroups.map(g => 
                        g.id === targetId ? { ...g, students: [...g.students, ...newStudents] } : g
                    );
                    saveStudentGroups(updatedGroups);
                    setImportStatus(`تم استيراد ${newStudents.length} طالب للمجموعة بنجاح ✅`);
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
    const handleAddGroup = () => {
        if (!formGroupName.trim()) return;
        const newGroup: StudentGroup = {
            id: `grp-${Date.now()}`,
            name: formGroupName.trim(),
            gradeLevel: formGroupGrade.trim(),
            students: [],
        };
        saveStudentGroups([...studentGroups, newGroup]);
        setShowAddGroup(false);
        setFormGroupName('');
        setFormGroupGrade('');
    };

    const handleDeleteGroup = (groupId: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه المجموعة؟ لن تتأثر الفصول التي أنشئت منها.')) return;
        saveStudentGroups(studentGroups.filter(g => g.id !== groupId));
    };

    // Update handleAddClass to support creating from group
    const handleAddClass = () => {
        if (!formClassName.trim()) return;
        
        // If a group is selected, copy students from it
        let initialStudents: Student[] = [];
        if (formSelectedGroupForClass) {
            const group = studentGroups.find(g => g.id === formSelectedGroupForClass);
            if (group) {
                // Clone students so they have unique IDs in the new class context (optional, but safer is keeping same ID? 
                // Actually keeping same ID is better for tracking student across classes if we ever build that view)
                // Let's keep same ID but reset grades/participation
                initialStudents = group.students.map(s => ({
                     ...s,
                     grades: [],
                     participationCount: 0
                }));
            }
        }

        const newClass: ClassRoom = {
            id: `cls-${Date.now()}`,
            name: formClassName.trim(),
            gradeLevel: formClassGrade.trim(),
            subject: formClassSubject.trim() || undefined,
            students: initialStudents,
            studentGroupId: formSelectedGroupForClass || undefined,
            announcements: [],
            assessments: [],
            color: CLASS_COLORS[classes.length % CLASS_COLORS.length],
        };
        saveClasses([...classes, newClass]);
        setShowAddClass(false);
        setFormClassName('');
        setFormClassGrade('');
        setFormClassSubject('');
        setFormSelectedGroupForClass('');
    };

    const handleDeleteClass = (classId: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الفصل وجميع بياناته؟')) return;
        saveClasses(classes.filter(c => c.id !== classId));
        if (selectedClassId === classId) { setSelectedClassId(null); setView('class-list'); }
    };

    const handleAddStudent = () => {
        if (!formStudentName.trim() || !selectedClassId) return;
        const newStudent: Student = {
            id: `stu-${Date.now()}`,
            name: formStudentName.trim(),
            dob: formStudentDob || undefined,
            learningStyle: formStudentStyle || undefined,
            parentContact: formStudentParent || undefined,
            grades: [],
            participationCount: 0,
        };
        const updatedClasses = classes.map(c =>
            c.id === selectedClassId ? { ...c, students: [...c.students, newStudent] } : c
        );
        saveClasses(updatedClasses);
        setShowAddStudent(false);
        setFormStudentName('');
        setFormStudentDob('');
        setFormStudentStyle('');
        setFormStudentParent('');
    };

    const handleDeleteStudent = (studentId: string) => {
        if (!selectedClassId) return;
        const updatedClasses = classes.map(c =>
            c.id === selectedClassId ? { ...c, students: c.students.filter(s => s.id !== studentId) } : c
        );
        saveClasses(updatedClasses);
        if (selectedStudentId === studentId) { setSelectedStudentId(null); setView('roster'); }
    };

    // --- CALENDAR SYNC HELPER ---
    const addEventToCalendar = (event: CalendarEvent) => {
        try {
            const stored = localStorage.getItem(CALENDAR_KEY);
            const existing: CalendarEvent[] = stored ? JSON.parse(stored) : [];
            existing.push(event);
            localStorage.setItem(CALENDAR_KEY, JSON.stringify(existing));
        } catch (e) {
            console.error('Failed to sync with calendar:', e);
        }
    };

    const handleAddGrade = () => {
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
        const updatedClasses = classes.map(c =>
            c.id === selectedClassId ? {
                ...c,
                students: c.students.map(s =>
                    s.id === selectedStudentId ? { ...s, grades: [...s.grades, newGrade] } : s
                )
            } : c
        );
        saveClasses(updatedClasses);
        setShowAddGrade(false);
        setFormGradeTitle('');
        setFormGradeScore('');
        setFormGradeMax('100');
        setFormGradeDate(new Date().toISOString().split('T')[0]);
    };

    // --- CLASS-LEVEL ASSESSMENT HANDLERS ---
    const handleAddAssessment = () => {
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
            addEventToCalendar(calEvent);
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

        const updatedClasses = classes.map(c =>
            c.id === selectedClassId ? { ...c, assessments: [...(c.assessments || []), newAssessment] } : c
        );
        saveClasses(updatedClasses);
        setShowAddAssessment(false);
        setFormAssessmentTitle('');
        setFormAssessmentDate(new Date().toISOString().split('T')[0]);
        setFormAssessmentMax('100');
        setFormAssessmentCalendar(true);
    };

    const handleDeleteAssessment = (assessmentId: string) => {
        if (!selectedClassId) return;
        if (!window.confirm('هل أنت متأكد من حذف هذا التقييم؟')) return;
        // Also remove related grades from students
        const updatedClasses = classes.map(c =>
            c.id === selectedClassId ? {
                ...c,
                assessments: (c.assessments || []).filter(a => a.id !== assessmentId),
                students: c.students.map(s => ({
                    ...s,
                    grades: s.grades.filter(g => g.assessmentId !== assessmentId)
                }))
            } : c
        );
        saveClasses(updatedClasses);
    };

    const handleSaveAssessmentGrades = (assessment: ClassAssessment) => {
        if (!selectedClassId || !selectedClass) return;
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
                    if (existingIdx >= 0) {
                        // Update existing grade
                        const updatedGrades = [...s.grades];
                        updatedGrades[existingIdx] = { ...updatedGrades[existingIdx], score };
                        return { ...s, grades: updatedGrades };
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
                        return { ...s, grades: [...s.grades, newGrade] };
                    }
                })
            };
        });
        saveClasses(updatedClasses);
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

    const handleUpdateBehaviorNotes = (notes: string) => {
        if (!selectedClassId || !selectedStudentId) return;
        const updatedClasses = classes.map(c =>
            c.id === selectedClassId ? {
                ...c,
                students: c.students.map(s =>
                    s.id === selectedStudentId ? { ...s, behaviorNotes: notes } : s
                )
            } : c
        );
        saveClasses(updatedClasses);
    };

    const handleAddAnnouncement = () => {
        if (!formAnnouncementText.trim() || !selectedClassId) return;
        const ann: Announcement = {
            id: `ann-${Date.now()}`,
            text: formAnnouncementText.trim(),
            date: new Date().toISOString().split('T')[0],
            type: formAnnouncementType,
        };
        const updatedClasses = classes.map(c =>
            c.id === selectedClassId ? { ...c, announcements: [ann, ...c.announcements] } : c
        );
        saveClasses(updatedClasses);
        setShowAnnouncement(false);
        setFormAnnouncementText('');
    };

    const handleAddUnit = () => {
        if (!formUnitTitle.trim() || !selectedClassId) return;
        const newUnit: LearningUnit = {
            id: `unit-${Date.now()}`,
            title: formUnitTitle.trim(),
            classId: selectedClassId,
            objectives: formUnitObjectives.split('\n').filter(o => o.trim()),
            relatedLessonIds: [],
            resourceIds: [],
        };
        saveUnits([...units, newUnit]);
        setShowAddUnit(false);
        setFormUnitTitle('');
        setFormUnitObjectives('');
    };

    const handleAddResource = () => {
        if (!formResourceTitle.trim()) return;
        const newResource: Resource = {
            id: `res-${Date.now()}`,
            title: formResourceTitle.trim(),
            type: formResourceType,
            url: formResourceUrl || undefined,
            tags: formResourceTags.split(',').map(t => t.trim()).filter(Boolean),
            classId: selectedClassId || undefined,
            createdAt: new Date().toISOString().split('T')[0],
        };
        saveResources([...resources, newResource]);
        setShowAddResource(false);
        setFormResourceTitle('');
        setFormResourceUrl('');
        setFormResourceTags('');
    };

    const openClassDashboard = (classId: string) => {
        setSelectedClassId(classId);
        setView('class-dashboard');
    };

    // --- CSV EXPORT ---
    const handleExportCsv = () => {
        if (!selectedClass) return;
        const BOM = '\uFEFF';
        const header = 'الاسم,تاريخ الميلاد,نمط التعلم,تواصل ولي الأمر,عدد الدرجات,المعدل,المشاركات';
        const rows = selectedClass.students.map(s => {
            const avg = s.grades.length > 0 ? Math.round(s.grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / s.grades.length) : 0;
            const style = LEARNING_STYLES.find(ls => ls.value === s.learningStyle)?.label || '';
            return `"${s.name}","${s.dob || ''}","${style}","${s.parentContact || ''}",${s.grades.length},${avg}%,${s.participationCount}`;
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

    // --- CSV IMPORT ---
    const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedClassId || !e.target.files?.[0]) return;
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split(/\r?\n/).filter(l => l.trim());
                if (lines.length < 2) { setImportStatus('الملف فارغ أو لا يحتوي على بيانات'); return; }

                const newStudents: Student[] = [];
                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].match(/("[^"]*"|[^,]+)/g)?.map(c => c.replace(/^"|"$/g, '').trim()) || [];
                    const name = cols[0];
                    if (!name) continue;
                    newStudents.push({
                        id: `stu-${Date.now()}-${i}`,
                        name,
                        dob: cols[1] || undefined,
                        learningStyle: (['visual', 'auditory', 'kinesthetic'].includes(cols[2])
                            ? cols[2] as Student['learningStyle']
                            : cols[2] === 'بصري' ? 'visual' : cols[2] === 'سمعي' ? 'auditory' : cols[2] === 'حركي' ? 'kinesthetic' : ''),
                        parentContact: cols[3] || undefined,
                        grades: [],
                        participationCount: 0,
                    });
                }

                if (newStudents.length === 0) { setImportStatus('لم يتم العثور على طلاب صالحين'); return; }

                const updatedClasses = classes.map(c =>
                    c.id === selectedClassId ? { ...c, students: [...c.students, ...newStudents] } : c
                );
                saveClasses(updatedClasses);
                setImportStatus(`تم استيراد ${newStudents.length} طالب بنجاح ✅`);
                setTimeout(() => setImportStatus(null), 3000);
            } catch (err) {
                setImportStatus('حدث خطأ أثناء قراءة الملف');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset file input
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
                <div className="flex gap-2">
                    <button onClick={() => setView('group-manager')}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white text-xs font-bold transition-all">
                        <Users size={14} /> إدارة الشعب
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
                        {/* Export CSV */}
                        <button onClick={handleExportCsv} disabled={selectedClass.students.length === 0}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/15 border border-emerald-500/25 text-emerald-400 text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            title="تصدير CSV">
                            <Download size={14} /> تصدير
                        </button>
                        {/* Import CSV */}
                        <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600/15 border border-cyan-500/25 text-cyan-400 text-xs font-bold hover:bg-cyan-600 hover:text-white transition-all cursor-pointer"
                            title="استيراد CSV">
                            <Upload size={14} /> استيراد
                            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleImportCsv} />
                        </label>
                        {/* Copy Roster */}
                        {classes.filter(c => c.id !== selectedClassId && c.students.length > 0).length > 0 && (
                            <button onClick={() => setShowCopyRoster(true)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600/15 border border-violet-500/25 text-violet-400 text-xs font-bold hover:bg-violet-600 hover:text-white transition-all"
                                title="نسخ من فصل آخر">
                                <Copy size={14} /> نسخ من فصل
                            </button>
                        )}
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
                    <div className="text-center py-12 text-slate-600">
                        <Users size={40} className="mx-auto mb-3 opacity-50" />
                        <p>{searchQuery ? 'لا توجد نتائج' : 'لا يوجد طلاب بعد'}</p>
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
                                        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
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
                        <div>
                            <h2 className="text-xl font-bold text-white">{selectedStudent.name}</h2>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                {selectedStudent.dob && <span>📅 {selectedStudent.dob}</span>}
                                {styleInfo && <span className="flex items-center gap-1">{styleInfo.icon} {styleInfo.label}</span>}
                                {selectedStudent.parentContact && <span>📞 {selectedStudent.parentContact}</span>}
                            </div>
                        </div>
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
                    <textarea value={selectedStudent.behaviorNotes || ''} onChange={e => handleUpdateBehaviorNotes(e.target.value)}
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
                                    <button onClick={() => saveUnits(units.filter(u => u.id !== unit.id))}
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
                        <div key={res.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 flex items-center gap-3 group hover:border-slate-600 transition-all">
                            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-none">
                                {getResourceIcon(res.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-white truncate">{res.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    {res.tags.slice(0, 3).map(tag => (
                                        <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded">{tag}</span>
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => saveResources(resources.filter(r => r.id !== res.id))}
                                className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 transition-all">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Saved Lessons */}
            {(() => {
                const savedLessons = classResources.filter(r => r.type === 'lesson-plan' && r.data);
                if (savedLessons.length === 0) return null;
                return (
                    <div className="mt-6">
                        <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2"><BookOpen size={14} /> الدروس المحفوظة</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {savedLessons.map(res => (
                                <div key={res.id} className="bg-gradient-to-br from-cyan-950/30 to-slate-900/40 border border-cyan-500/20 rounded-xl p-4 group hover:border-cyan-500/50 transition-all">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                                <BookOpen size={18} className="text-cyan-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white">{res.data!.topic}</h4>
                                                <p className="text-[10px] text-slate-500 font-mono">{res.data!.subject} • {res.data!.grade}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => saveResources(resources.filter(r => r.id !== res.id))}
                                            className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 transition-all">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        {res.tags.map(tag => (
                                            <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded">{tag}</span>
                                        ))}
                                        <span className="text-[9px] text-slate-600 mr-auto font-mono">{new Date(res.createdAt).toLocaleDateString('ar')}</span>
                                    </div>
                                    {onViewLesson && (
                                        <button
                                            onClick={() => onViewLesson(res.data!)}
                                            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold hover:bg-cyan-500 hover:text-white transition-all"
                                        >
                                            <Eye size={14} /> فتح الدرس
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}
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

    // ========== CURRICULUM BOOKS VIEW ==========
    const renderCurriculumBooks = () => {
        if (!selectedClass) return null;

        // Filter books related to this class
        // Logic: 
        // 1. Show if explicitly linked to this class.
        // 2. If NOT linked to ANY class, show if GRADE matches AND SUBJECT matches (if defined).
        // 3. Hide if linked to a DIFFERENT class.
        const filteredBooks = curricula.filter(b => {
            if (b.linkedClassId) {
                return b.linkedClassId === selectedClass.id;
            }
            
            // Fallback for unlinked books
            const gradeMatch = !selectedClass.gradeLevel || 
                               b.bookMetadata.grade.includes(selectedClass.gradeLevel) || 
                               selectedClass.gradeLevel.includes(b.bookMetadata.grade);

            const subjectMatch = !selectedClass.subject || 
                                 b.bookMetadata.subject.includes(selectedClass.subject) || 
                                 selectedClass.subject.includes(b.bookMetadata.subject) ||
                                 selectedClass.subject === 'فصل عام'; // Special case for general classes

            return gradeMatch && subjectMatch;
        });
        
        const displayBooks = filteredBooks;

        return (
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Book size={20} className="text-cyan-400" /> المناهج المحللة
                    </h2>
                </div>

                {displayBooks.length === 0 ? (
                    <div className="text-center py-20">
                        <Book size={48} className="text-slate-700 mx-auto mb-4" />
                        <p className="text-lg text-slate-500 mb-2">لا توجد مناهج محفوظة</p>
                        <p className="text-sm text-slate-600">قم بتحليل الكتب المدرسية عبر وكيل "منهاجي"</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {displayBooks.map(book => {
                            const isExpanded = expandedBookId === book.id;
                            return (
                                <div key={book.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all">
                                    <div 
                                        onClick={() => setExpandedBookId(isExpanded ? null : book.id)}
                                        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-900/80 transition-colors"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-cyan-900/20 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                                            <BookOpen size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-white text-lg">{book.fileName}</h3>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                <span>{book.bookMetadata.subject}</span>
                                                <span>•</span>
                                                <span>{book.bookMetadata.grade}</span>
                                                <span>•</span>
                                                <span>{book.curriculumStructure.length} درس</span>
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronLeft size={20} className="-rotate-90 text-slate-500" /> : <ChevronLeft size={20} className="text-slate-500" />}
                                    </div>

                                    {isExpanded && (
                                        <div className="border-t border-slate-800 p-4 bg-slate-950/30">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {book.curriculumStructure.map((lesson, idx) => (
                                                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-cyan-500/20 transition-all group">
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-bold border border-slate-700">{idx + 1}</span>
                                                                    <h4 className="font-bold text-slate-200 text-sm">{lesson.lessonTitle}</h4>
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 pr-7">
                                                                    {lesson.objectives.length} أهداف • ص {lesson.pageRange[0]}-{lesson.pageRange[1]}
                                                                </p>
                                                            </div>
                                                            {onNewLesson && (
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        // We can't pass topic directly here as onNewLesson takes classId, 
                                                                        // but ideally we'd pass lesson data. For now, navigate to create.
                                                                        onNewLesson(selectedClassId || undefined);
                                                                    }}
                                                                    className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-cyan-500 hover:text-white"
                                                                    title="تخطيط هذا الدرس"
                                                                >
                                                                    <Pencil size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
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
                <div><label className={labelClass}>اسم الطالب *</label><input type="text" value={formStudentName} onChange={e => setFormStudentName(e.target.value)} placeholder="الاسم الكامل" className={inputClass} dir="rtl" /></div>
                <div><label className={labelClass}>تاريخ الميلاد</label><input type="date" value={formStudentDob} onChange={e => setFormStudentDob(e.target.value)} className={inputClass} /></div>
                <div>
                    <label className={labelClass}>نمط التعلم</label>
                    <div className="grid grid-cols-3 gap-2">
                        {LEARNING_STYLES.map(ls => (
                            <button key={ls.value} onClick={() => setFormStudentStyle(ls.value!)}
                                className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-bold transition-all ${formStudentStyle === ls.value ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                {ls.icon} {ls.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div><label className={labelClass}>تواصل ولي الأمر</label><input type="text" value={formStudentParent} onChange={e => setFormStudentParent(e.target.value)} placeholder="رقم الهاتف أو البريد" className={inputClass} dir="rtl" /></div>
                <div className="flex gap-3 pt-2">
                    <button onClick={handleAddStudent} disabled={!formStudentName.trim()} className={btnPrimary}><Save size={16} /> إضافة الطالب</button>
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
            {renderModal(showAddResource, () => setShowAddResource(false), 'مصدر جديد', <>
                <div><label className={labelClass}>عنوان المصدر *</label><input type="text" value={formResourceTitle} onChange={e => setFormResourceTitle(e.target.value)} placeholder="مثال: كتاب العلوم" className={inputClass} dir="rtl" /></div>
                <div>
                    <label className={labelClass}>النوع</label>
                    <div className="grid grid-cols-5 gap-2">
                        {(['pdf', 'image', 'video', 'link', 'template'] as Resource['type'][]).map(t => (
                            <button key={t} onClick={() => setFormResourceType(t)}
                                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[10px] font-bold transition-all ${formResourceType === t ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                {getResourceIcon(t)} {t}
                            </button>
                        ))}
                    </div>
                </div>
                <div><label className={labelClass}>رابط/مسار</label><input type="text" value={formResourceUrl} onChange={e => setFormResourceUrl(e.target.value)} placeholder="https://..." className={inputClass} /></div>
                <div><label className={labelClass}>وسوم (فاصلة بينها)</label><input type="text" value={formResourceTags} onChange={e => setFormResourceTags(e.target.value)} placeholder="علوم, أحياء, صف ثاني" className={inputClass} dir="rtl" /></div>
                <div className="flex gap-3 pt-2">
                    <button onClick={handleAddResource} disabled={!formResourceTitle.trim()} className={btnPrimary}><Save size={16} /> إضافة المصدر</button>
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

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};
