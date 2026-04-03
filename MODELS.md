# 🏗️ Mongoose Models for Seating System

## Models Created

### 1. Branch Model (`src/models/Branch.js`)

**Schema:**
```javascript
{
  name: String (required, max 100 chars),
  code: String (required, exactly 2 uppercase chars),
  timestamps: true
}
```

**Features:**
- ✅ Unique index on `code`
- ✅ Uppercase validation
- ✅ Virtual `formatted` field
- ✅ Clean JSON output

**Example:**
```json
{
  "_id": "...",
  "name": "Computer Science",
  "code": "CS",
  "formatted": "CS - Computer Science",
  "createdAt": "2026-04-03T16:00:00.000Z",
  "updatedAt": "2026-04-03T16:00:00.000Z"
}
```

---

### 2. EnrollmentRange Model (`src/models/EnrollmentRange.js`)

**Schema:**
```javascript
{
  collegeCode: String (required, exactly 4 uppercase chars),
  branchCode: String (required, exactly 2 uppercase chars),
  year: String (required, exactly 2 digits),
  startRoll: Number (required, min 1, integer),
  endRoll: Number (required, > startRoll, integer),
  timestamps: true
}
```

**Features:**
- ✅ Compound unique index (collegeCode + branchCode + year)
- ✅ Pre-save validation (endRoll > startRoll)
- ✅ Virtual fields:
  - `totalStudents` - Number of students in range
  - `formattedRange` - "1-60" format
  - `uniqueId` - "ABCD-CS-23" format
- ✅ Optimized indexes for range queries

**Example:**
```json
{
  "_id": "...",
  "collegeCode": "ABCD",
  "branchCode": "CS",
  "year": "23",
  "startRoll": 1,
  "endRoll": 60,
  "totalStudents": 60,
  "formattedRange": "1-60",
  "uniqueId": "ABCD-CS-23",
  "createdAt": "2026-04-03T16:00:00.000Z",
  "updatedAt": "2026-04-03T16:00:00.000Z"
}
```

---

## 🎯 Design Principles

### **Clean Schema Design:**
- No unnecessary fields
- Proper data types and constraints
- Meaningful field names

### **Validations:**
- Required field validation
- Length and format validation
- Custom validation (endRoll > startRoll)

### **Performance:**
- Strategic indexes for common queries
- Compound unique index for data integrity
- Virtual fields for computed values

### **Scalability:**
- Flexible structure for future extensions
- Optimized for range-based queries
- Clean separation of concerns

---

## 📚 Usage Examples

```javascript
import { Branch, EnrollmentRange } from '../models/index.js';

// Create branch
const branch = await Branch.create({
  name: 'Computer Science',
  code: 'CS'
});

// Create enrollment range
const range = await EnrollmentRange.create({
  collegeCode: 'ABCD',
  branchCode: 'CS',
  year: '23',
  startRoll: 1,
  endRoll: 60
});

// Query with virtuals
const ranges = await EnrollmentRange.find({ collegeCode: 'ABCD' });
console.log(ranges[0].totalStudents); // 60
console.log(ranges[0].uniqueId); // "ABCD-CS-23"
```

## 🚀 Production Ready

✅ **Data Integrity:** Unique constraints and validations
✅ **Performance:** Optimized indexes
✅ **Flexibility:** Virtual fields and clean structure
✅ **Maintainability:** Clear naming and documentation
