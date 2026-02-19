---
name: Verify Backend Changes
description: >
  MANDATORY workflow for verifying backend API changes.
  You must use this skill whenever you modify or add backend endpoints.
  It requires creating a standalone reproduction script to verify the fix/feature before notifying the user.
---

# Verify Backend Changes Workflow

**Rule:** Never ask the user to "try it" until you have verified it yourself with a script.

When you modify backend code (routes, services, DB schema), you must verify it works by acting as the client.

## 1. Analyze the Request
Check the frontend code (`.tsx`, `apiService.ts`) to understand EXACTLY what payload is being sent.
- **Method**: POST, GET, etc.
- **URL**: Correct path including prefix (`/api/...`).
- **Body**: All required fields (check interfaces/types).
- **Headers**: Auth tokens if needed (or mock/bypass for local dev).

## 2. Create Verification Script
Create a temporary TypeScript script in the `backend/` directory (e.g., `backend/verify_fix.ts`).

```typescript
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function verify() {
    console.log('--- Verifying Fix ---');
    try {
        // 1. Simulate the exact frontend call
        const payload = { 
            // ... fields from step 1
        };
        
        console.log('Sending:', payload);
        const response = await axios.post(`${API_URL}/target-endpoint`, payload);
        
        // 2. Assert Success
        if (response.status === 200 || response.status === 201) {
            console.log('✅ Success:', response.data);
        } else {
            console.error('❌ Unexpected Status:', response.status);
        }
        
        // 3. (Optional) Verify Side Effects
        // e.g. Query DB to check if record was created
        
    } catch (error: any) {
        console.error('❌ Failed:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

verify();
```

## 3. Run Verification
Execute the script against your running local server.
`npx ts-node verify_fix.ts`

**If it fails:**
- Do NOT notify the user.
- Debug the error (check server logs, fix code).
- Re-run the script.
- Repeat until it passes.

## 4. Cleanup & Notify
Once the script prints `✅ Success`:
- Delete the script: `rm verify_fix.ts`
- Notify the user with confidence: "I verified this with a script and it works."
