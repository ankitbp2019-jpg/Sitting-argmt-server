# 🗓️ Additional Models: Schedule & SeatMapping

## Models Created

### 1. Schedule Model (`src/models/Schedule.js`)

**Schema:**
```javascript
{
  date: Date (required, future date only),
  branches: [{
    branchCode: String (required, exactly 2 uppercase chars),
    year: String (required, exactly 2 digits),
    enrollmentRangeId: ObjectId (ref: EnrollmentRange, required)
  }],
  timestamps: true
}
```

**Features:**
- ✅ Future date validation
- ✅ Array of branches with enrollment range references
- ✅ Unique index on date (one schedule per day)
- ✅ Compound index for efficient queries
- ✅ Virtual fields: `formattedDate`, `totalBranches`, `totalStudents`
- ✅ Pre-save validation to prevent duplicate branch-year combinations

**Example:**
```json
{
  "_id": "...",
  "date": "2026-05-15T00:00:00.000Z",
  "formattedDate": "2026-05-15",
  "branches": [
    {
      "branchCode": "CS",
      "year": "23",
      "enrollmentRangeId": "..."
    },
    {
      "branchCode": "EC",
      "year": "23", 
      "enrollmentRangeId": "..."
    }
  ],
  "totalBranches": 2,
  "createdAt": "2026-04-03T16:00:00.000Z",
  "updatedAt": "2026-04-03T16:00:00.000Z"
}
```

---

### 2. SeatMapping Model (`src/models/SeatMapping.js`)

**Schema:**
```javascript
{
  enrollmentNumber: String (required, unique, max 20 chars),
  roomNumber: String (required, max 10 chars),
  row: Number (required, min 1, integer),
  col: Number (required, min 1, integer),
  deskId: String (optional, max 15 chars),
  timestamps: true
}
```

**Features:**
- ✅ Unique enrollment numbers
- ✅ Room layout validation (no duplicate seats)
- ✅ Compound indexes for efficient queries
- ✅ Virtual fields: `formattedSeat`, `coordinates`
- ✅ Static methods: `findByRoom()`, `findByEnrollment()`
- ✅ Instance method: `getNeighbors()`

**Example:**
```json
{
  "_id": "...",
  "enrollmentNumber": "ABCDCS23001",
  "roomNumber": "A101",
  "row": 3,
  "col": 5,
  "deskId": "A101-3-5",
  "formattedSeat": "A101-R3C5",
  "coordinates": {
    "row": 3,
    "column": 5,
    "room": "A101"
  },
  "createdAt": "2026-04-03T16:00:00.000Z",
  "updatedAt": "2026-04-03T16:00:00.000Z"
}
```

---

## 🔗 Model Relationships

```
Schedule
  ↓ (references)
EnrollmentRange
  ↓ (generates)
SeatMapping
```

**Flow:**
1. **Schedule** defines exam date and branches
2. **EnrollmentRange** provides student count ranges
3. **SeatMapping** assigns specific seats to students

---

## 🎯 Key Features

### **Schedule Model:**
- 📅 **Date validation**: Prevents past dates
- 🏫 **Multi-branch support**: Multiple branches per schedule
- 🔗 **Referential integrity**: Links to enrollment ranges
- 📊 **Virtual totals**: Automatic student count calculation

### **SeatMapping Model:**
- 🪑 **Unique seat assignments**: No duplicate seats in rooms
- 📍 **Coordinate system**: Row/column positioning
- 🔍 **Efficient lookups**: Multiple query methods
- 👥 **Neighbor finding**: Get adjacent seats for monitoring

---

## 📚 Usage Examples

```javascript
import { Schedule, SeatMapping } from '../models/index.js';

// Create schedule
const schedule = await Schedule.create({
  date: new Date('2026-05-15'),
  branches: [
    { branchCode: 'CS', year: '23', enrollmentRangeId: '...' },
    { branchCode: 'EC', year: '23', enrollmentRangeId: '...' }
  ]
});

// Create seat mapping
const seat = await SeatMapping.create({
  enrollmentNumber: 'ABCDCS23001',
  roomNumber: 'A101',
  row: 3,
  col: 5,
  deskId: 'A101-3-5'
});

// Find all seats in a room
const roomSeats = await SeatMapping.findByRoom('A101');

// Find student's seat
const studentSeat = await SeatMapping.findByEnrollment('ABCDCS23001');

// Get neighboring seats
const neighbors = await seat.getNeighbors();
```

## 🚀 Production Ready

✅ **Data Integrity**: Unique constraints and validations
✅ **Performance**: Optimized indexes for common queries
✅ **Scalability**: Flexible structure for multiple rooms/schedules
✅ **Maintainability**: Clean methods and virtual fields
✅ **Relationships**: Proper foreign key references
