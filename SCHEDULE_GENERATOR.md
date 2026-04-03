# 📅 Schedule Generator Service

## Overview

A comprehensive service for generating exam schedules with flexible date management, session allocation, and group handling.

---

## 🚀 **Core Function**

### `generateSchedule(params)`

**Input:**
```javascript
{
  startDate: new Date('2026-05-15'),           // Starting date
  gapDays: 2,                                  // Days between groups
  sessions: ['morning', 'afternoon'],            // Available sessions
  groups: [
    {
      collegeCode: 'ABCD',                       // College code
      branches: ['CS', 'EC'],                   // Branch codes
      year: '23',                               // Year
      enrollmentRangeIds: ['id1', 'id2']         // Corresponding IDs
    }
  ]
}
```

**Output:**
```javascript
[
  {
    date: new Date('2026-05-15'),
    session: 'morning',
    collegeCode: 'ABCD',
    branches: [
      { branchCode: 'CS', year: '23', enrollmentRangeId: 'id1' },
      { branchCode: 'EC', year: '23', enrollmentRangeId: 'id2' }
    ]
  },
  {
    date: new Date('2026-05-15'),
    session: 'afternoon',
    collegeCode: 'ABCD',
    branches: [
      { branchCode: 'CS', year: '23', enrollmentRangeId: 'id1' },
      { branchCode: 'EC', year: '23', enrollmentRangeId: 'id2' }
    ]
  },
  {
    date: new Date('2026-05-17'),  // +2 gap days
    session: 'morning',
    collegeCode: 'ABCD',
    branches: [...]
  }
]
```

---

## 📋 **Usage Examples**

### **Basic Schedule Generation:**
```javascript
import { generateSchedule } from '../services/scheduleGenerator.service.js';

const schedule = generateSchedule({
  startDate: new Date('2026-05-15'),
  gapDays: 2,
  sessions: ['morning', 'afternoon'],
  groups: [
    {
      collegeCode: 'ABCD',
      branches: ['CS', 'EC'],
      year: '23',
      enrollmentRangeIds: ['range1', 'range2']
    },
    {
      collegeCode: 'EFGH',
      branches: ['ME', 'CE'],
      year: '23',
      enrollmentRangeIds: ['range3', 'range4']
    }
  ]
});
```

### **Balanced Schedule (Auto Session Alternation):**
```javascript
import { generateBalancedSchedule } from '../services/scheduleGenerator.service.js';

const balancedSchedule = generateBalancedSchedule({
  startDate: new Date('2026-05-15'),
  gapDays: 1,
  groups: [
    { collegeCode: 'ABCD', branches: ['CS'], year: '23', enrollmentRangeIds: ['id1'] },
    { collegeCode: 'EFGH', branches: ['EC'], year: '23', enrollmentRangeIds: ['id2'] }
  ]
});

// Automatically alternates sessions for resource optimization
```

### **Custom Date Schedule:**
```javascript
import { generateCustomSchedule } from '../services/scheduleGenerator.service.js';

const customSchedule = generateCustomSchedule({
  dates: [
    new Date('2026-05-15'),
    new Date('2026-05-20'),
    new Date('2026-05-25')
  ],
  sessions: ['morning', 'afternoon', 'morning'],
  groups: [
    { collegeCode: 'ABCD', branches: ['CS'], year: '23', enrollmentRangeIds: ['id1'] },
    { collegeCode: 'EFGH', branches: ['EC'], year: '23', enrollmentRangeIds: ['id2'] },
    { collegeCode: 'IJKL', branches: ['ME'], year: '23', enrollmentRangeIds: ['id3'] }
  ]
});
```

---

## 🛡️ **Error Handling & Validation**

### **Comprehensive Input Validation:**
```javascript
// Date validation
if (!startDate || !(startDate instanceof Date)) {
  throw new Error('Start date is required and must be a Date object');
}

// Session validation
const validSessions = ['morning', 'afternoon', 'evening'];
if (!validSessions.includes(session)) {
  throw new Error(`Invalid session: ${session}`);
}

// Group validation
if (group.branches.length !== group.enrollmentRangeIds.length) {
  throw new Error('Number of branches must match number of enrollment range IDs');
}
```

### **Schedule Validation:**
```javascript
import { validateSchedule } from '../services/scheduleGenerator.service.js';

const validation = validateSchedule(schedule);
console.log(validation);
// {
//   isValid: true,
//   errors: [],
//   warnings: ['Duplicate schedule found: 2026-05-15-morning-ABCD']
// }
```

---

## 🎯 **Key Features**

### **1. Flexible Date Management:**
- ✅ **Gap days** between groups
- ✅ **Multiple sessions** per date
- ✅ **Custom date arrays** for specific scheduling
- ✅ **Automatic date incrementation**

### **2. Branch-Enrollment Mapping:**
```javascript
// branches[i] maps to enrollmentRangeIds[i]
branches: ['CS', 'EC'],                    // Branch codes
enrollmentRangeIds: ['range1', 'range2']      // Corresponding IDs

// Result:
[
  { branchCode: 'CS', year: '23', enrollmentRangeId: 'range1' },
  { branchCode: 'EC', year: '23', enrollmentRangeId: 'range2' }
]
```

### **3. Session Allocation:**
- **Morning**: 9:00 AM - 12:00 PM
- **Afternoon**: 2:00 PM - 5:00 PM  
- **Evening**: 6:00 PM - 9:00 PM

### **4. Balanced Scheduling:**
```javascript
// Automatic session alternation
Group 1: ['morning', 'afternoon']
Group 2: ['afternoon', 'morning']  // Reversed for balance
Group 3: ['morning', 'afternoon']
```

---

## 📊 **Output Formatting**

### **Display Formatting:**
```javascript
import { formatSchedule } from '../services/scheduleGenerator.service.js';

const formattedSchedule = formatSchedule(schedule);
console.log(formattedSchedule[0]);
// {
//   date: new Date('2026-05-15'),
//   session: 'morning',
//   collegeCode: 'ABCD',
//   branches: [...],
//   formattedDate: '2026-05-15',
//   readableDate: 'Thursday, May 15, 2026'
// }
```

---

## 🔄 **Advanced Usage**

### **Multi-College Schedule:**
```javascript
const multiCollegeSchedule = generateSchedule({
  startDate: new Date('2026-05-15'),
  gapDays: 3,
  sessions: ['morning', 'afternoon', 'evening'],
  groups: [
    {
      collegeCode: 'ABCD',  // College 1
      branches: ['CS', 'EC'],
      year: '23',
      enrollmentRangeIds: ['id1', 'id2']
    },
    {
      collegeCode: 'EFGH',  // College 2
      branches: ['ME', 'CE'],
      year: '23',
      enrollmentRangeIds: ['id3', 'id4']
    },
    {
      collegeCode: 'IJKL',  // College 3
      branches: ['EE', 'IT'],
      year: '23',
      enrollmentRangeIds: ['id5', 'id6']
    }
  ]
});
```

### **Complex Session Pattern:**
```javascript
const complexSchedule = generateSchedule({
  startDate: new Date('2026-05-15'),
  gapDays: 1,
  sessions: ['morning', 'afternoon', 'evening'],  // 3 sessions per day
  groups: [
    {
      collegeCode: 'ABCD',
      branches: ['CS'],
      year: '23',
      enrollmentRangeIds: ['id1']
    }
  ]
});

// Creates 3 schedule entries per group
```

---

## ✅ **Production Ready**

✅ **Comprehensive validation** - All inputs checked  
✅ **Flexible date management** - Gap days, custom dates  
✅ **Session balancing** - Automatic alternation  
✅ **Branch mapping** - Perfect enrollment correlation  
✅ **Error handling** - Descriptive error messages  
✅ **Scalable structure** - Handles unlimited groups  
✅ **Format utilities** - Display-ready output  

Your schedule generator is ready for complex exam management! 🚀
