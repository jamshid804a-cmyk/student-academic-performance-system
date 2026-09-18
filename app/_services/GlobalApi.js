import axios from "axios";

const GetAllGrades = () => axios.get('/api/grade');

const CreateNewStudent = (data) =>
    axios.post('/api/student', data);

const GetAllStudents = (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.grade) params.append('grade', filters.grade);
    if (filters.section) params.append('section', filters.section);
    if (filters.session) params.append('session', filters.session);
    const qs = params.toString();
    return axios.get('/api/student' + (qs ? `?${qs}` : ''));
};

const DeleteStudentRecord = (id) =>
    axios.delete(`/api/student/${id}`);

const UpdateStudentRecord = (id, data) =>
    axios.put(`/api/student/${id}`, data);

const SaveAttendance = (data) =>
    axios.post('/api/attendance', data);

const GetAttendanceList = (grade, month, section, session) => {
    const params = new URLSearchParams();
    params.append('grade', grade);
    params.append('month', month);
    if (section) params.append('section', section);
    if (session) params.append('session', session);
    return axios.get('/api/attendance?' + params.toString());
};

const DeleteAttendance = (studentId, day, month) =>
    axios.delete(
        '/api/attendance?studentId=' + studentId +
        '&day=' + day +
        '&month=' + month
    );

const GetParentByStudentId = (studentId) =>
    axios.get(`/api/parents?studentId=${studentId}`);

export default {
    GetAllGrades,
    CreateNewStudent,
    GetAllStudents,
    DeleteStudentRecord,
    UpdateStudentRecord,
    SaveAttendance,
    GetAttendanceList,
    DeleteAttendance,
    GetParentByStudentId,
};