const { Client } = require('pg');
const str = `postgresql://postgres.cwrrqtttkpbgnqfrfizv:0735111660Ja%2B@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require`;
async function tryConnect() {
    try {
        const client = new Client({ connectionString: str });
        await client.connect();
        console.log('Success on eu-west-1');
        await client.end();
    } catch (e) {
        console.log('Failed', e.message);
    }
}
tryConnect();
