
import { supabase } from "./supabaseClient";
import { ClassRoom, Student, Announcement, ClassAssessment, StudentGrade } from '../types';

// Map DB row to Frontend 'ClassRoom' object
const mapClassFromDB = (row: any, students: Student[]): ClassRoom => ({
    id: row.id,
    name: row.name || `${row.grade} - ${row.section}`, // Fallback name
    gradeLevel: row.grade,
    subject: row.subject,
    students: students,
    studentGroupId: undefined, // Not stored in DB yet, can be added later
    announcements: (row.announcements as Announcement[]) || [],
    assessments: (row.assessments as ClassAssessment[]) || [],
    color: row.color || 'from-blue-500 to-cyan-500'
});

// Map DB row to Frontend 'Student' object
const mapStudentFromDB = (enrollment: any, profile: any): Student => ({
    id: profile.id,
    name: profile.full_name || 'طالب مجهول',
    registrationCode: profile.registration_code,
    dob: profile.dob,
    avatar: profile.avatar_url,
    behaviorNotes: enrollment.behavior_notes,
    learningStyle: (profile.learning_style as any) || undefined,
    grades: (enrollment.grades as StudentGrade[]) || [],
    participationCount: enrollment.participation_count || 0,
    parentContact: profile.parent_contact
});

export const fetchTeacherClasses = async (teacherId: string): Promise<ClassRoom[]> => {
    try {
        // 1. Fetch Classes
        const { data: classesData, error: classesError } = await supabase
            .from('classes')
            .select('*')
            .eq('teacher_id', teacherId);

        if (classesError) throw classesError;
        if (!classesData) return [];

        const classes: ClassRoom[] = [];

        // 2. Fetch Enrollments for ALL these classes to avoid N+1 problem (somewhat)
        // Actually, let's fetch students per class or all at once?
        // Since we have RLS, we can just fetch all enrollments we have access to?
        // But better to filter by class IDs we just fetched.
        const classIds = classesData.map(c => c.id);
        
        if (classIds.length === 0) return [];

        const { data: enrollmentsData, error: enrollError } = await supabase
            .from('class_enrollments')
            .select(`
                class_id,
                behavior_notes,
                grades,
                participation_count,
                student_id,
                profiles:student_id (id, full_name, learning_style, dob, parent_contact, registration_code)
            `)
            .in('class_id', classIds);

        if (enrollError) throw enrollError;

        // Group enrollments by Class ID
        const enrollmentsByClass: Record<string, Student[]> = {};
        enrollmentsData?.forEach((e: any) => {
            if (!enrollmentsByClass[e.class_id]) enrollmentsByClass[e.class_id] = [];
            if (e.profiles) {
                enrollmentsByClass[e.class_id].push(mapStudentFromDB(e, e.profiles));
            }
        });

        // Assemble final objects
        for (const clsRow of classesData) {
            classes.push(mapClassFromDB(clsRow, enrollmentsByClass[clsRow.id] || []));
        }

        return classes;

    } catch (error) {
        console.error('Error fetching classes:', error);
        return [];
    }
};

export const createClass = async (teacherId: string, classData: Partial<ClassRoom>) => {
    // Generate a random class code
    const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data, error } = await supabase
        .from('classes')
        .insert([
            {
                teacher_id: teacherId,
                name: classData.name,
                grade: classData.gradeLevel,
                section: 'General', // Default, maybe add to UI later
                subject: classData.subject,
                class_code: generatedCode,
                color: classData.color,
                announcements: classData.announcements,
                assessments: classData.assessments
            }
        ])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

// Helper to update entire class state (announcements, assessments, color)
// Note: Students are handled via enrollments table, not here!
export const updateClassDetails = async (classId: string, updates: Partial<ClassRoom>) => {
    const { error } = await supabase
        .from('classes')
        .update({
            name: updates.name,
            grade: updates.gradeLevel,
            subject: updates.subject,
            color: updates.color,
            announcements: updates.announcements,
            assessments: updates.assessments
        })
        .eq('id', classId);

    if (error) throw error;
};

// Helper to update a student's data within a class (grades, behavior, participation)
export const updateStudentEnrollment = async (classId: string, studentId: string, updates: Partial<Student>) => {
    const { error } = await supabase
        .from('class_enrollments')
        .update({
            behavior_notes: updates.behaviorNotes,
            grades: updates.grades,
            participation_count: updates.participationCount
        })
        .match({ class_id: classId, student_id: studentId });

    if (error) throw error;
};

export const deleteClass = async (classId: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', classId);
    if (error) throw error;
};

export const removeStudentFromClass = async (classId: string, studentId: string) => {
    const { error } = await supabase
        .from('class_enrollments')
        .delete()
        .match({ class_id: classId, student_id: studentId });
    
    if (error) throw error;
};

/** Generates a unique 6-digit registration code */
const generateRegistrationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const addStudentToClass = async (classId: string, studentData: Partial<Student>) => {
    const registrationCode = studentData.registrationCode?.trim() || generateRegistrationCode();

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
            full_name: studentData.name,
            role: 'student',
            registration_code: registrationCode,
            learning_style: studentData.learningStyle,
            dob: studentData.dob,
            parent_contact: studentData.parentContact,
        })
        .select()
        .single();
    
    if (profileError) throw profileError;

    // 2. Enroll in Class
    const { error: enrollError } = await supabase
        .from('class_enrollments')
        .insert({
            class_id: classId,
            student_id: profile.id,
            grades: [], // Start with empty grades
            participation_count: 0,
            behavior_notes: studentData.behaviorNotes || ''
        });

    if (enrollError) {
        // Rollback profile creation? ideal but complex.
        console.error("Failed to enroll after creating profile:", enrollError);
        throw enrollError;
    }

    return { ...studentData, id: profile.id, registrationCode };
};

/** Enroll an existing student (by profile id) in another class. Used when adding student to all subjects in the same class. */
export const enrollExistingStudentInClass = async (classId: string, studentId: string, behaviorNotes?: string) => {
    const { error } = await supabase
        .from('class_enrollments')
        .insert({
            class_id: classId,
            student_id: studentId,
            grades: [],
            participation_count: 0,
            behavior_notes: behaviorNotes || ''
        });

    if (error) throw error;
};
