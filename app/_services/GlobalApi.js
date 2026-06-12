import axios from "axios";

const GetAllGrades = () => axios.get('/api/grade');

const CreateNewStudent = (data) =>
    axios.post('/api/student', data);

const GetAllStudents = () =>
    axios.get('/api/student');

const DeleteStudentRecord = (id) =>
    axios.delete(`/api/student/${id}`);

const SaveAttendance = (data) =>
    axios.post('/api/attendance', data);

const GetAttendance = () =>
    axios.get('/api/attendance');

const GetAttendanceList = (grade, month) =>
    axios.get('/api/attendance?grade=' + grade + '&month=' + month);

const DeleteAttendance = (studentId, day, month) =>
    axios.delete(
        '/api/attendance?studentId=' +
        studentId +
        '&day=' +
        day +
        '&month=' +
        month
    );

const GetParentByStudentId = (studentId) =>
    axios.get(`/api/parents?studentId=${studentId}`);

export default {
    GetAllGrades,
    CreateNewStudent,
    GetAllStudents,
    DeleteStudentRecord,
    SaveAttendance,
    GetAttendance,
    GetAttendanceList,
    DeleteAttendance,
    GetParentByStudentId,
};