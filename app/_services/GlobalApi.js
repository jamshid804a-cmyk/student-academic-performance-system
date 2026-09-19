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
    axios.delete(
        '/api/attendance?studentId=' + studentId +
        '&day=' + day +
        '&month=' + month
    );

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

// Export
export default {
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
};