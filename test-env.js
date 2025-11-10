// Quick test to verify environment variables
console.log('Environment Variables Check:');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✓ Set (length: ' + process.env.GOOGLE_CLIENT_ID.length + ')' : '✗ NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✓ Set (length: ' + process.env.GOOGLE_CLIENT_SECRET.length + ')' : '✗ NOT SET');
console.log('GOOGLE_REFRESH_TOKEN:', process.env.GOOGLE_REFRESH_TOKEN ? '✓ Set (length: ' + process.env.GOOGLE_REFRESH_TOKEN.length + ')' : '✗ NOT SET');
