import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  try {
    const query = `
      SELECT
        a.id,
        a.name,
        COUNT(g.id) AS total_grades
      FROM area a
      JOIN sector s ON s.area_id = a.id
      JOIN climb c ON c.sector_id = s.id
      JOIN grade g ON g.climb_id = c.id
      WHERE a.status = 'active'
        AND s.status = 'active'
        AND c.status = 'active'
        AND g.status = 'active'
      GROUP BY a.id, a.name
      ORDER BY total_grades DESC;
    `;

    const { rows } = await pool.query(query);
    res.status(200).json(rows[0] ?? null);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Query failed',
      error: error.message
    });
  }
}
