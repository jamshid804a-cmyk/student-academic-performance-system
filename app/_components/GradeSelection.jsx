"use client"
import React, { useEffect, useState } from 'react'
import GlobalApi from '../_services/GlobalApi';

function GradeSelection({ selectedGrade, defaultGrade }) {

    const [grades, setGrades] = useState([]);
    const [selected, setSelected] = useState('');

    useEffect(() => {
        GetAllGradesList();
    }, []);

    // ✅ Set selected after grades are loaded
    useEffect(() => {
        if (defaultGrade && grades.length > 0) {
            setSelected(defaultGrade);
        }
    }, [defaultGrade, grades]); // ✅ depend on both defaultGrade AND grades

    const GetAllGradesList = () => {
        GlobalApi.GetAllGrades().then(resp => {
            setGrades(resp.data);
        });
    }

    const handleChange = (e) => {
        setSelected(e.target.value);
        selectedGrade(e.target.value);
    }

    return (
        <div>
            <select
                className='px-3 py-1.5 border rounded-lg'
                value={selected}
                onChange={handleChange}
            >
                <option value=''>Select Grade</option>
                {grades.map((item, index) => (
                    <option key={index} value={item.grade}>
                        {item.grade}
                    </option>
                ))}
            </select>
        </div>
    )
}

export default GradeSelection