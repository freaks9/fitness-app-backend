
const https = require('https');

const CLIENT_ID = '022819555350478cbd6ac4158f05de35';
const CLIENT_SECRET = '29642cd1f3d64946a09fbb9ebe1cdf80';

// 1. Get Access Token
const getAccessToken = () => {
    return new Promise((resolve, reject) => {
        const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        const options = {
            hostname: 'oauth.fatsecret.com',
            path: '/connect/token',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.access_token) {
                        console.log('Got Access Token');
                        resolve(json.access_token);
                    } else {
                        reject(json); // Error
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write('grant_type=client_credentials&scope=basic');
        req.end();
    });
};

// 2. Get Exercises
const getExercises = (token) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'platform.fatsecret.com',
            path: '/rest/server.api?method=exercises.get&format=json',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log('--- API Response ---');
                console.log(data.substring(0, 500)); // Print first 500 chars to check structure
                resolve(data);
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
};

const run = async () => {
    try {
        const token = await getAccessToken();
        await getExercises(token);
    } catch (e) {
        console.error('Error:', e);
    }
};

run();
