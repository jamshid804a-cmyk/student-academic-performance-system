"use client"
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarDays } from 'lucide-react'
import { addMonths } from 'date-fns';
import moment from 'moment/moment';
import { Calendar } from "@/components/ui/calendar"

function MonthSelection({ selectedMonth, defaultMonth }) {
    const nextMonths = addMonths(new Date(), 0);
    const [Month, setMonth] = useState(nextMonths);

    useEffect(() => {
        if (defaultMonth) {
            const parsed = moment(defaultMonth, 'MM/YYYY', true);
            if (parsed.isValid()) {
                setMonth(parsed.toDate());
            }
        }
    }, [defaultMonth]);

    return (
        <div>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="flex gap-2 items-center text-slate-500">
                        <CalendarDays className='h-5 w-5' />
                        {moment(Month).format('MMMM yyyy')}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="flex items-center">
                    <Calendar
                        mode="single"
                        month={Month}
                        onMonthChange={(value) => { selectedMonth(value); setMonth(value) }}
                        className="flex flex-1 justify-center"
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}

export default MonthSelection