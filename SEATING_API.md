# 🪑 Seating Plan API - Complete Implementation

## ✅ **API Overview**

Complete REST API for seating plan management with validation, error handling, and production-ready features.

---

## 🚀 **API Endpoints**

### **1. Create Seating Plan**
```http
POST /api/seating/generate
```

**Request Body:**
```json
{
  "scheduleId": "507f1f77bcf86cd799439011",
  "rooms": [
    {
      "roomNumber": "A101",
      "rows": 8,
      "cols": 10
    },
    {
      "roomNumber": "B205",
      "rows": 6,
      "cols": 12
    }
  ],
  "students": [
    "0537CS231001",
    "0537CS231002",
    "0537CS231003"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Seating plan created successfully",
  "data": {
    "seatingPlan": {
      "id": "507f1f77bcf86cd799439012",
      "scheduleId": "507f1f77bcf86cd799439011",
      "date": "2026-05-15T00:00:00.000Z",
      "session": "morning",
      "rooms": [
        {
          "roomNumber": "A101",
          "rows": 8,
          "cols": 10
        }
      ],
      "totalSeats": 80,
      "assignedSeats": 3,
      "emptySeats": 77
    }
  }
}
```

---

### **2. Get Seating Plan**
```http
GET /api/seating/schedule/:scheduleId
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Seating plan retrieved successfully",
  "data": {
    "seatingPlan": {
      "id": "507f1f77bcf86cd799439012",
      "scheduleId": "507f1f77bcf86cd799439011",
      "date": "2026-05-15T00:00:00.000Z",
      "session": "morning",
      "rooms": [...],
      "seats": [
        {
          "seatNumber": "A101-R1C1",
          "enrollmentNumber": "0537CS231001",
          "roomNumber": "A101",
          "row": 1,
          "col": 1,
          "status": "assigned"
        }
      ],
      "totalSeats": 80,
      "assignedSeats": 3,
      "emptySeats": 77,
      "deletedSeats": 0
    }
  }
}
```

---

### **3. Update Seat Assignment (Drag & Drop)**
```http
PUT /api/seating/seat
```

**Request Body:**
```json
{
  "scheduleId": "507f1f77bcf86cd799439011",
  "seatNumber": "A101-R3C5",
  "enrollmentNumber": "0537CS231002"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Seat assignment updated successfully",
  "data": {
    "seatingPlan": {
      "id": "507f1f77bcf86cd799439012",
      "seats": [...],
      "assignedSeats": 3,
      "emptySeats": 77
    }
  }
}
```

---

### **4. Clear Seat Assignment**
```http
DELETE /api/seating/seat
```

**Request Body:**
```json
{
  "scheduleId": "507f1f77bcf86cd799439011",
  "seatNumber": "A101-R3C5"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Seat assignment cleared successfully",
  "data": {
    "seatingPlan": {
      "id": "507f1f77bcf86cd799439012",
      "seats": [...],
      "assignedSeats": 2,
      "emptySeats": 78
    }
  }
}
```

---

## 🛡️ **Validation Features**

### **Input Validation:**
```javascript
// Schedule ID validation
body('scheduleId')
  .isMongoId()
  .withMessage('Invalid schedule ID format')

// Room validation
body('rooms.*.rows')
  .isInt({ min: 1, max: 50 })
  .withMessage('Rows must be an integer between 1 and 50')

// Student validation
body('students.*')
  .isLength({ min: 8, max: 20 })
  .withMessage('Student enrollment number must be between 8 and 20 characters')

// Seat number validation
body('seatNumber')
  .matches(/^[A-Za-z0-9\-]+-R\d+C\d+$/)
  .withMessage('Seat number must be in format: Room-R1C1')
```

### **Business Logic Validation:**
- ✅ **Schedule existence check**
- ✅ **Duplicate seating plan prevention**
- ✅ **Capacity validation**
- ✅ **Duplicate student detection**

---

## 🔧 **Error Handling**

### **HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found (schedule/seating plan not found)
- `409` - Conflict (duplicate seating plan)
- `500` - Internal Server Error

### **Error Response Format:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Not enough seats available. Required: 100, Available: 80",
  "data": null
}
```

---

## 🎯 **Integration Features**

### **Controller Features:**
- ✅ **AsyncHandler integration** - Automatic error handling
- ✅ **ApiResponse utility** - Consistent response format
- ✅ **Schedule validation** - Ensures schedule exists
- ✅ **Duplicate prevention** - Avoids multiple seating plans
- ✅ **Service integration** - Calls seating service
- ✅ **Logging** - Complete operation tracking

### **Route Features:**
- ✅ **Express validation** - Comprehensive input checking
- ✅ **Parameter validation** - Route parameter validation
- ✅ **Body validation** - Request body validation
- ✅ **Custom validators** - Seat number format validation

---

## 📊 **Usage Examples**

### **Create Seating Plan:**
```javascript
// Frontend API call
const response = await fetch('/api/seating/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token'
  },
  body: JSON.stringify({
    scheduleId: '507f1f77bcf86cd799439011',
    rooms: [
      { roomNumber: 'A101', rows: 8, cols: 10 }
    ],
    students: ['0537CS231001', '0537CS231002']
  })
});

const result = await response.json();
console.log(result.data.seatingPlan);
```

### **Drag & Drop Update:**
```javascript
// Student moved to new seat
const updateResponse = await fetch('/api/seating/seat', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token'
  },
  body: JSON.stringify({
    scheduleId: '507f1f77bcf86cd799439011',
    seatNumber: 'A101-R3C5',
    enrollmentNumber: '0537CS231002'
  })
});
```

---

## ✅ **Production Ready Features**

✅ **Comprehensive validation** - Input and business logic validation  
✅ **Error handling** - Proper HTTP status codes and error messages  
✅ **Logging** - Complete operation tracking  
✅ **Security** - Schedule existence and duplicate checks  
✅ **Performance** - Efficient database operations  
✅ **Scalability** - Handles large seating plans  
✅ **Drag & drop support** - Real-time seat updates  
✅ **Consistent responses** - ApiResponse utility for all endpoints  
✅ **Route protection** - Express validation middleware  

**Your seating plan API is complete and production-ready!** 🚀
