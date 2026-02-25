import axios from 'axios';

const API_URL = 'http://localhost:3000/api';
const MOCK_USER_ID = 'test-user-id'; // We might need a real UUID if the DB enforces it, but let's try a string first
const TEST_DATE = new Date().toISOString().split('T')[0];

async function verify() {
    console.log('--- Verifying Backend Logs Endpoint ---');
    try {
        console.log(`Fetching logs for user: ${MOCK_USER_ID}, date: ${TEST_DATE}`);
        const response = await axios.get(`${API_URL}/logs/${MOCK_USER_ID}/date/${TEST_DATE}`);

        if (response.status === 200) {
            console.log('✅ Success:', response.data);
        } else {
            console.error('❌ Unexpected Status:', response.status);
        }
    } catch (error: any) {
        console.error('❌ Failed:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        } else {
            console.error('No response received from server. Is it running?');
        }
    }
}

verify();
