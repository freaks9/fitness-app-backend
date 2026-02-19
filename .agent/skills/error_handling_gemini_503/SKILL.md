---
name: Handle Gemini 503 Service Unavailable
description: >
  Pattern for handling Google Gemini API "503 Service Unavailable" errors gracefully.
  Use this when integrating Gemini AI to prevent app crashes or generic "Internal Server Error" responses during high traffic.
---

# Handling Gemini 503 Errors

When using the Google Gemini API (via `@google/generative-ai`), the service may return a `503 Service Unavailable` error during periods of high demand. This error often manifests as `[GoogleGenerativeAI Error]: ... [503 Service Unavailable] ...`.

Instead of letting this crash the backend or returning a generic 500 error, you should catch it and return a specific 503 status with a user-friendly message.

## Implementation Pattern

### Backend (Fastify Example)

In your route handler (e.g., `ai.ts`), wrap the API call in a `try-catch` block and check the error message for keywords like `503`, `Service Unavailable`, or `Overloaded`.

```typescript
try {
    const analysis = await geminiService.analyze(image);
    return { analysis };
} catch (error: any) {
    fastify.log.error('AI Route Error:', error);
    
    const msg = error.message || '';
    
    // Check for 503 specific keywords
    if (msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('Overloaded')) {
        return reply.code(503).send({ 
            error: 'AI Service Temporarily Unavailable', 
            message: 'The AI service is currently experiencing high traffic. Please try again in a few minutes.' 
        });
    }
    
    // Fallback for other errors
    return reply.code(500).send({ error: 'Internal Server Error', message: msg });
}
```

### Frontend (React Native Example)

In your frontend service or hook (e.g., `useMealAnalysis.ts`), handle the 503 status specifically.

```typescript
try {
    const result = await api.analyze(image);
    // ...
} catch (error: any) {
    const status = error.response?.status;
    const errorMessage = error.response?.data?.message || 'Unknown Error';

    if (status === 503 || errorMessage.includes('503')) {
        Alert.alert(
            'AI Service Busy',
            'The AI service is currently experiencing high traffic (Google Gemini 503). Please try again later or use manual entry.'
        );
    } else {
        Alert.alert('Error', errorMessage);
    }
}
```

## Verification
You can verify this logic by creating a small script that mocks the error and asserts the response code is 503.

## Checklist
- [ ] Backend: Catch block checks for `503` in error message.
- [ ] Backend: Returns `reply.code(503)`.
- [ ] Frontend: Checks `error.response.status === 503`.
- [ ] Frontend: Displays specific, friendly message (not "Internal Server Error").
