import React from 'react'
import HolidayCalendar from '../components/holiday/holiday-calendar'

export default function HolidayDemoPage(){
  return (
    <div style={{padding:20}}>
      <HolidayCalendar role="admin" />
    </div>
  )
}
