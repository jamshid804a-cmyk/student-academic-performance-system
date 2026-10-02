import axios from "axios";

// Grades
const GetAllGrades = () => axios.get('/api/grade');

// Students
const CreateNewStudent = (data) => axios.post('/api/student', data);
const GetAllStudents = (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.grade) params.append('grade', filters.grade);
    if (filters.section) params.append('section', filters.section);
    if (filters.session) params.append('session', filters.session);
    const qs = params.toString();
    return axios.get('/api/student' + (qs ? `?${qs}` : ''));
};
const DeleteStudentRecord = (id) => axios.delete(`/api/student/${id}`);
const UpdateStudentRecord = (id, data) => axios.put(`/api/student/${id}`, data);

// Attendance
const SaveAttendance = (data) => axios.post('/api/attendance', data);
const GetAttendance = () => axios.get('/api/attendance');
const GetAttendanceList = (grade, month, section, session) => {
    const params = new URLSearchParams();
    params.append('grade', grade);
    params.append('month', month);
    if (section) params.append('section', section);
    if (session) params.append('session', session);
    return axios.get('/api/attendance?' + params.toString());
};
const GetAttendanceFlat = (grade, month, section, session) => {
    const params = new URLSearchParams();
    params.append('grade', grade);
    params.append('month', month);
    if (section) params.append('section', section);
    if (session) params.append('session', session);
    return axios.get('/api/attendance/flat?' + params.toString());
};
const DeleteAttendance = (studentId, day, month) =>
    axios.delete('/api/attendance?studentId=' + studentId + '&day=' + day + '&month=' + month);

// Parents
const GetParentByStudentId = (studentId) =>
    axios.get(`/api/parents?studentId=${studentId}`);

// Subjects
const GetAllSubjects = (studentId) => {
    const qs = studentId ? `?studentId=${studentId}` : "";
    return axios.get('/api/subjects' + qs);
};
const CreateSubject = (data) => axios.post('/api/subjects', data);
const DeleteSubject = (id) => axios.delete(`/api/subjects/${id}`);

// Tests
const GetTests = (params) => {
    const qs = new URLSearchParams(params).toString();
    return axios.get('/api/tests' + (qs ? `?${qs}` : ''));
};
const SaveTest = (data) => axios.post('/api/tests', data);

// Exams
const GetExams = (params) => {
    const qs = new URLSearchParams(params).toString();
    return axios.get('/api/exams' + (qs ? `?${qs}` : ''));
};
const SaveExam = (data) => axios.post('/api/exams', data);

// Fees
const GetFees = (params) => {
    const qs = new URLSearchParams(params).toString();
    return axios.get('/api/fees' + (qs ? `?${qs}` : ''));
};
const SaveFeePayment = (data) => axios.post('/api/fees', data);
const DeleteFeePayment = (id) => axios.delete(`/api/fees?id=${id}`);
const DeleteStudentFees = (studentId, session, month) =>
    axios.put('/api/fees', { studentId, session, month });
const SendFeeReminder = (data) => axios.post('/api/fees/remind', data);

// Teachers
const GetAllTeachers = (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.status) params.append('status', filters.status);
    const qs = params.toString();
    return axios.get('/api/teacher' + (qs ? `?${qs}` : ''));
};
const GetTeacher = (id) => axios.get(`/api/teacher/${id}`);
const CreateTeacher = (data) => axios.post('/api/teacher', data);
const UpdateTeacher = (id, data) => axios.put(`/api/teacher/${id}`, data);
const DeleteTeacher = (id) => axios.delete(`/api/teacher/${id}`);
const RegenerateTeacherToken = (id) => axios.patch(`/api/teacher/${id}`);
const GetPublicTeacher = (token) => axios.get(`/api/teacher/${token}/public`);

// Teacher Attendance
const GetTeacherAttendance = (month, teacherId) => {
    const params = new URLSearchParams();
    params.append('month', month);
    if (teacherId) params.append('teacherId', teacherId);
    return axios.get('/api/teacher-attendance?' + params.toString());
};
const SaveTeacherAttendance = (data) => axios.post('/api/teacher-attendance', data);
const DeleteTeacherAttendance = (teacherId, month, day) =>
    axios.delete(`/api/teacher-attendance?teacherId=${teacherId}&month=${month}&day=${day}`);

// School Info
const GetSchoolInfo = () => axios.get('/api/school');
const SaveSchoolInfo = (data) => axios.post('/api/school', data);

// Org Sections
const GetOrgSections = () => axios.get('/api/org/sections');

// ─────────────────────────────────────────────
// ACADEMY APIs
// ─────────────────────────────────────────────

// Academy Students (uses `email` = owner email)
const GetAcademyStudents = (email) =>
    axios.get('/api/academy/student?email=' + encodeURIComponent(email));
const CreateAcademyStudent = (data) => axios.post('/api/academy/student', data);
const UpdateAcademyStudent = (data) => axios.put('/api/academy/student', data);
const DeleteAcademyStudent = (email, id) =>
    axios.delete(
        '/api/academy/student?email=' + encodeURIComponent(email) + '&id=' + id
    );

// Academy Teachers (uses `orgEmail` = owner email to avoid collision with teacher's own email)
const GetAcademyTeachers = (orgEmail, filters = {}) => {
    const params = new URLSearchParams({ orgEmail });
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.status) params.append('status', filters.status);
    return axios.get('/api/academy/teacher?' + params.toString());
};
const CreateAcademyTeacher = (data) => axios.post('/api/academy/teacher', data);
const UpdateAcademyTeacher = (data) => axios.put('/api/academy/teacher', data);
const RegenerateAcademyTeacherToken = (orgEmail, _id) =>
    axios.patch('/api/academy/teacher', { orgEmail, _id });
const DeleteAcademyTeacher = (orgEmail, id) =>
    axios.delete(
        '/api/academy/teacher?orgEmail=' + encodeURIComponent(orgEmail) + '&id=' + id
    );

// Academy Teacher Attendance (uses `orgEmail`)
const GetAcademyTeacherAttendance = (orgEmail, month, teacherId) => {
    const params = new URLSearchParams({ orgEmail, month });
    if (teacherId) params.append('teacherId', teacherId);
    return axios.get('/api/academy/teacher-attendance?' + params.toString());
};
const SaveAcademyTeacherAttendance = (data) => axios.post('/api/academy/teacher-attendance', data);
const DeleteAcademyTeacherAttendance = (orgEmail, teacherId, month, day) =>
    axios.delete(
        '/api/academy/teacher-attendance?orgEmail=' + encodeURIComponent(orgEmail) +
        '&teacherId=' + teacherId + '&month=' + encodeURIComponent(month) + '&day=' + day
    );

// Academy Courses (uses `email`)
const GetAcademyCourses = (email) =>
    axios.get('/api/academy/courses?email=' + encodeURIComponent(email));
const CreateAcademyCourse = (data) => axios.post('/api/academy/courses', data);
const DeleteAcademyCourse = (email, id) =>
    axios.delete(
        '/api/academy/courses?email=' + encodeURIComponent(email) + '&id=' + id
    );

// Academy Fees (uses `email`)
const GetAcademyFees = (email, filters = {}) => {
    const params = new URLSearchParams({ email });
    if (filters.month) params.append('month', filters.month);
    if (filters.studentId) params.append('studentId', filters.studentId);
    return axios.get('/api/academy/fee?' + params.toString());
};
const SaveAcademyFee = (data) => axios.post('/api/academy/fee', data);
const DeleteAcademyFee = (email, id) =>
    axios.delete(
        '/api/academy/fee?email=' + encodeURIComponent(email) + '&id=' + id
    );

// Academy Attendance (uses `email`)
const GetAcademyAttendanceList = (email, course, monthKey, section, year) => {
    const params = new URLSearchParams({ email });
    if (course) params.append('course', course);
    if (monthKey) params.append('month', monthKey);
    if (section) params.append('section', section);
    if (year) params.append('year', year);
    return axios.get('/api/academy/attendance?' + params.toString());
};
const SaveAcademyAttendance = (data) => axios.post('/api/academy/attendance', data);
const DeleteAcademyAttendance = (email, studentId, day, date) =>
    axios.delete(
        '/api/academy/attendance?email=' + encodeURIComponent(email) +
        '&studentId=' + studentId +
        '&day=' + day +
        '&date=' + encodeURIComponent(date)
    );

// Academy Attendance Flat
const GetAcademyAttendanceFlat = (email, course, monthKey, section, year) => {
    const params = new URLSearchParams({ email, course, month: monthKey });
    if (section) params.append('section', section);
    if (year) params.append('year', year);
    return axios.get('/api/academy/attendance/flat?' + params.toString());
};

export default {
    // School
    GetAllGrades,
    CreateNewStudent,
    GetAllStudents,
    DeleteStudentRecord,
    UpdateStudentRecord,
    SaveAttendance,
    GetAttendance,
    GetAttendanceList,
    GetAttendanceFlat,
    DeleteAttendance,
    GetParentByStudentId,
    GetAllSubjects,
    CreateSubject,
    DeleteSubject,
    GetTests,
    SaveTest,
    GetExams,
    SaveExam,
    GetFees,
    SaveFeePayment,
    DeleteFeePayment,
    DeleteStudentFees,
    SendFeeReminder,
    GetAllTeachers,
    GetTeacher,
    CreateTeacher,
    UpdateTeacher,
    DeleteTeacher,
    RegenerateTeacherToken,
    GetPublicTeacher,
    GetTeacherAttendance,
    SaveTeacherAttendance,
    DeleteTeacherAttendance,
    GetSchoolInfo,
    SaveSchoolInfo,
    GetOrgSections,

    // Academy
    GetAcademyStudents,
    CreateAcademyStudent,
    UpdateAcademyStudent,
    DeleteAcademyStudent,

    GetAcademyTeachers,
    CreateAcademyTeacher,
    UpdateAcademyTeacher,
    RegenerateAcademyTeacherToken,
    DeleteAcademyTeacher,
    GetAcademyTeacherAttendance,
    SaveAcademyTeacherAttendance,
    DeleteAcademyTeacherAttendance,

    GetAcademyCourses,
    CreateAcademyCourse,
    DeleteAcademyCourse,

    GetAcademyFees,
    SaveAcademyFee,
    DeleteAcademyFee,

    GetAcademyAttendanceList,
    SaveAcademyAttendance,
    DeleteAcademyAttendance,
    GetAcademyAttendanceFlat,
};