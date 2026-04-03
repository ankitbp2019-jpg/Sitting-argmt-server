# Validation System Test

## Test Cases

### 1. Valid Enrollment Request
```bash
curl -X POST http://localhost:3000/enrollments \
  -H "Content-Type: application/json" \
  -d '{
    "collegeCode": "ABCD",
    "branchCode": "CS",
    "year": "23",
    "startRoll": 1,
    "endRoll": 60
  }'
```

### 2. Invalid - Missing Required Field
```bash
curl -X POST http://localhost:3000/enrollments \
  -H "Content-Type: application/json" \
  -d '{
    "collegeCode": "ABCD",
    "branchCode": "CS"
  }'
```

### 3. Invalid - Wrong Length
```bash
curl -X POST http://localhost:3000/enrollments \
  -H "Content-Type: application/json" \
  -d '{
    "collegeCode": "ABC",
    "branchCode": "CS",
    "year": "23",
    "startRoll": 1,
    "endRoll": 60
  }'
```

### 4. Invalid - End Roll Less Than Start
```bash
curl -X POST http://localhost:3000/enrollments \
  -H "Content-Type: application/json" \
  -d '{
    "collegeCode": "ABCD",
    "branchCode": "CS",
    "year": "23",
    "startRoll": 60,
    "endRoll": 1
  }'
```

## Expected Results

- **Valid**: 201 status with success response
- **Invalid**: 400 status with validation error details
- **Logs**: Check `logs/combined.log` and `logs/error.log`

## Files Created

✅ `logs/` directory - prevents Winston crashes
✅ `src/controllers/enrollmentController.js` - example controller
✅ `src/routes/enrollmentRoutes.js` - routes with validation
✅ `src/routes/index.js` - updated to include enrollment routes
