# 🪑 Seating Generator Service

## Overview

A comprehensive service for generating seating plans with room management, student assignment, and existing seat mapping integration.

---

## 🚀 **Core Function**

### `generateSeatingPlan(params)`

**Input:**
```javascript
{
  scheduleId: 'schedule123',                    // Schedule ID
  rooms: [
    {
      roomNumber: 'A101',                      // Room number
      rows: 8,                                 // Number of rows
      cols: 10                                 // Number of columns
    },
    {
      roomNumber: 'B205',
      rows: 6,
      cols: 12
    }
  ],
  students: ['ABCDCS230001', 'ABCDCS230002', 'ABCDCS230003']  // Enrollment numbers
}
```

**Output:**
```javascript
{
  _id: 'plan123',
  scheduleId: 'schedule123',
  rooms: [
    { roomNumber: 'A101', rows: 8, cols: 10 },
    { roomNumber: 'B205', rows: 6, cols: 12 }
  ],
  seats: [
    {
      seatNumber: 'A101-R1C1',
      enrollmentNumber: 'ABCDCS230001',
      roomNumber: 'A101',
      row: 1,
      col: 1,
      status: 'assigned'
    },
    {
      seatNumber: 'A101-R1C2',
      enrollmentNumber: 'ABCDCS230002',
      roomNumber: 'A101',
      row: 1,
      col: 2,
      status: 'assigned'
    }
    // ... more seats
  ]
}
```

---

## 📋 **Key Features**

### **1. Intelligent Seat Assignment:**
```javascript
// Loop through rooms → rows → cols
for (let roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
  const room = rooms[roomIndex];
  
  for (let row = 1; row <= room.rows; row++) {
    for (let col = 1; col <= room.cols; col++) {
      const seatNumber = `${room.roomNumber}-R${row}C${col}`;
      // Assign seat to next student
    }
  }
}
```

### **2. Existing Seat Mapping Integration:**
```javascript
// Check if student already has a seat
const existingMapping = existingSeatMap.get(enrollmentNumber);

if (existingMapping) {
  // Reuse existing seat
  seats.push({
    seatNumber: existingMapping.seatNumber,
    enrollmentNumber,
    // ... existing seat details
  });
} else {
  // Assign new seat
  seats.push({
    seatNumber,
    enrollmentNumber,
    // ... new seat details
  });
}
```

### **3. Bulk Database Operations:**
```javascript
// Efficient bulk insert for new mappings
if (newMappings.length > 0) {
  await SeatMapping.insertMany(newMappings);
  logger.info(`Created ${newMappings.length} new seat mappings`);
}
```

---

## 🛡️ **Error Handling & Validation**

### **Comprehensive Input Validation:**
```javascript
// Room validation
if (typeof room.rows !== 'number' || room.rows < 1) {
  throw new Error(`Room ${i + 1}: Rows must be a positive number`);
}

// Student validation
const uniqueStudents = [...new Set(students)];
if (uniqueStudents.length !== students.length) {
  throw new Error('Duplicate student enrollment numbers found');
}

// Capacity validation
const totalCapacity = rooms.reduce((sum, room) => sum + (room.rows * room.cols), 0);
if (students.length > totalCapacity) {
  throw new Error(`Not enough seats. Required: ${students.length}, Available: ${totalCapacity}`);
}
```

### **Error Scenarios Handled:**
- ✅ **Insufficient seats** - Clear capacity check
- ✅ **Duplicate students** - Prevents double assignment
- ✅ **Invalid room config** - Validates rows/cols
- ✅ **Missing parameters** - All required fields checked

---

## 🔧 **Additional Functions**

### **1. Auto Room Allocation:**
```javascript
import { generateAutoSeatingPlan } from '../services/seatingGenerator.service.js';

const autoPlan = await generateAutoSeatingPlan({
  scheduleId: 'schedule123',
  students: ['ABCDCS230001', 'ABCDCS230002', ...],
  maxRoomSize: 60  // Maximum seats per room
});

// Automatically creates optimal room configuration
```

### **2. Drag & Drop Support:**
```javascript
// Update seat assignment
await updateSeatAssignment({
  scheduleId: 'schedule123',
  seatNumber: 'A101-R3C5',
  enrollmentNumber: 'ABCDCS230015'
});

// Clear seat assignment
await clearSeatAssignment({
  scheduleId: 'schedule123',
  seatNumber: 'A101-R3C5'
});
```

---

## 📊 **Usage Examples**

### **Basic Seating Plan Generation:**
```javascript
import { generateSeatingPlan } from '../services/seatingGenerator.service.js';

try {
  const seatingPlan = await generateSeatingPlan({
    scheduleId: 'schedule123',
    rooms: [
      { roomNumber: 'A101', rows: 8, cols: 10 },
      { roomNumber: 'B205', rows: 6, cols: 12 }
    ],
    students: [
      'ABCDCS230001', 'ABCDCS230002', 'ABCDCS230003',
      'ABCDCS230004', 'ABCDCS230005', 'ABCDCS230006'
    ]
  });
  
  console.log(`Generated seating plan with ${seatingPlan.seats.length} seats`);
} catch (error) {
  console.error('Seating plan generation failed:', error.message);
}
```

### **Automatic Room Configuration:**
```javascript
// For 150 students with max 60 per room
const autoPlan = await generateAutoSeatingPlan({
  scheduleId: 'schedule123',
  students: generateEnrollments({
    collegeCode: 'ABCD',
    branchCode: 'CS',
    year: '23',
    startRoll: 1,
    endRoll: 150
  }),
  maxRoomSize: 60
});

// Creates: Room001 (8x8=64), Room002 (8x8=64), Room003 (6x4=24)
```

### **Drag & Drop Updates:**
```javascript
// Student moves to different seat
await updateSeatAssignment({
  scheduleId: 'schedule123',
  seatNumber: 'B205-R2C5',
  enrollmentNumber: 'ABCDCS230015'
});

// Seat becomes empty
await clearSeatAssignment({
  scheduleId: 'schedule123',
  seatNumber: 'A101-R3C5'
});
```

---

## 🎯 **Seat Numbering Convention**

**Format:** `[roomNumber]-R[row]C[col]`

**Examples:**
- `A101-R1C1` - Room A101, Row 1, Column 1
- `B205-R8C10` - Room B205, Row 8, Column 10
- `Room001-R5C7` - Room Room001, Row 5, Column 7

---

## 📈 **Performance Features**

### **Efficient Database Operations:**
- ✅ **Bulk insert** - `insertMany()` for new mappings
- ✅ **Existing mapping reuse** - Avoids duplicate database calls
- ✅ **Single query** - Get all existing mappings at once
- ✅ **Map-based lookup** - O(1) existing seat finding

### **Memory Optimization:**
- ✅ **Sequential processing** - No large intermediate arrays
- ✅ **Map for lookups** - Efficient existing seat detection
- ✅ **Bulk operations** - Minimizes database round trips

---

## ✅ **Production Ready**

✅ **Comprehensive validation** - All inputs checked thoroughly  
✅ **Error handling** - Descriptive messages for all failure scenarios  
✅ **Existing integration** - Reuses existing seat mappings  
✅ **Bulk operations** - Efficient database interactions  
✅ **Drag & drop support** - Real-time seat assignment updates  
✅ **Auto room allocation** - Intelligent room configuration  
✅ **Logging** - Complete operation tracking  
✅ **Flexible seating** - Supports any room layout  

Your seating generator is ready for complex exam management with real-time updates! 🚀
