# 🎓 Enrollment Generator Service

## Overview

A clean, dependency-free service for generating enrollment numbers with proper validation and error handling.

---

## 🚀 **Core Function**

### `generateEnrollments(params)`

**Input:**
```javascript
{
  collegeCode: "ABCD",    // 4 characters
  branchCode: "CS",       // 2 characters  
  year: "23",            // 2 digits
  startRoll: 1,          // Positive number
  endRoll: 60            // Positive number, >= startRoll
}
```

**Output:**
```javascript
[
  "ABCDCS230001",
  "ABCDCS230002",
  "ABCDCS230003",
  // ... up to "ABCDCS230060"
]
```

**Format:** `[collegeCode][branchCode][year][roll(4 digits)]`

---

## 📋 **Usage Examples**

### **Basic Usage:**
```javascript
import { generateEnrollments } from '../services/enrollmentGenerator.service.js';

const enrollments = generateEnrollments({
  collegeCode: 'ABCD',
  branchCode: 'CS',
  year: '23',
  startRoll: 1,
  endRoll: 60
});

console.log(enrollments);
// ["ABCDCS230001", "ABCDCS230002", ..., "ABCDCS230060"]
```

### **Single Enrollment:**
```javascript
import { generateSingleEnrollment } from '../services/enrollmentGenerator.service.js';

const enrollment = generateSingleEnrollment({
  collegeCode: 'ABCD',
  branchCode: 'CS', 
  year: '23',
  roll: 15
});

console.log(enrollment); // "ABCDCS230015"
```

### **Validation:**
```javascript
import { validateEnrollmentNumber } from '../services/enrollmentGenerator.service.js';

const parsed = validateEnrollmentNumber('ABCDCS230015');
console.log(parsed);
// {
//   collegeCode: 'ABCD',
//   branchCode: 'CS',
//   year: '23', 
//   roll: 15
// }
```

---

## 🛡️ **Error Handling**

### **Invalid Parameters:**
```javascript
// Throws: "Start roll cannot be greater than end roll"
generateEnrollments({
  collegeCode: 'ABCD',
  branchCode: 'CS',
  year: '23',
  startRoll: 60,
  endRoll: 1
});
```

### **Format Validation:**
```javascript
// Throws: "College code must be exactly 4 characters"
generateEnrollments({
  collegeCode: 'ABC',     // Too short
  branchCode: 'CS',
  year: '23',
  startRoll: 1,
  endRoll: 60
});
```

---

## ⚡ **Performance Features**

### **Efficient Loop:**
- Single for-loop from startRoll to endRoll
- No array operations inside loop
- String concatenation optimized

### **Memory Efficient:**
- Pre-allocates array size
- No intermediate arrays created
- Direct string building

### **Validation Early:**
- All inputs validated before generation
- Prevents wasted computation on bad data

---

## 🔧 **Additional Functions**

### **`generateSingleEnrollment()`**
Generate one enrollment number for a specific roll.

### **`validateEnrollmentNumber()`**
Parse and validate existing enrollment numbers.

### **`extractRollNumber()`**
Extract roll number from enrollment string.

---

## 📊 **Format Specifications**

| Component | Length | Format | Example |
|-----------|--------|--------|---------|
| College Code | 4 chars | Uppercase letters | "ABCD" |
| Branch Code | 2 chars | Uppercase letters | "CS" |
| Year | 2 chars | Digits | "23" |
| Roll | 4 chars | Zero-padded digits | "0015" |
| **Total** | **12 chars** | **Combined** | **"ABCDCS230015"** |

---

## 🎯 **Integration Examples**

### **With EnrollmentRange Model:**
```javascript
import { generateEnrollments } from '../services/enrollmentGenerator.service.js';
import { EnrollmentRange } from '../models/index.js';

const range = await EnrollmentRange.findById(rangeId);
const enrollments = generateEnrollments({
  collegeCode: range.collegeCode,
  branchCode: range.branchCode,
  year: range.year,
  startRoll: range.startRoll,
  endRoll: range.endRoll
});

// Use enrollments for seat assignments
```

### **With SeatingPlan:**
```javascript
// Generate seats for seating plan
const seats = enrollments.map((enrollmentNumber, index) => ({
  seatNumber: `A101-${Math.floor(index / 10) + 1}-${(index % 10) + 1}`,
  enrollmentNumber,
  roomNumber: 'A101',
  row: Math.floor(index / 10) + 1,
  col: (index % 10) + 1,
  status: 'assigned'
}));
```

---

## ✅ **Production Ready**

✅ **No external dependencies** - Pure JavaScript  
✅ **Comprehensive validation** - All inputs checked  
✅ **Efficient implementation** - Optimized loops  
✅ **Clean error messages** - Helpful debugging  
✅ **Type-safe** - Proper parameter checking  
✅ **Well-documented** - JSDoc comments included  

Your enrollment generator is ready for production use! 🚀
