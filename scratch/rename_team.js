import dotenv from 'dotenv';
dotenv.config();

const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/teams?name=eq.ABC`;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const run = async () => {
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ name: 'Team' })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, details: ${errText}`);
    }

    const data = await response.json();
    console.log("Rename response data:", data);
    console.log("Successfully renamed team(s) from 'ABC' to 'Team'!");
  } catch (error) {
    console.error("Error updating team name:", error);
  }
};

run();
