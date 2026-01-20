import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  try {
        res.setHeader('Cache-Control', 'no-store');
    const query = `
      WITH all_grades AS (
        SELECT u.id AS user_id, u.username, 'sport' AS discipline, cls.scaled_value
        FROM users u
        JOIN grade g ON g.user_id = u.id
        JOIN climb c ON c.id = g.climb_id
        JOIN climbing_level_sport cls
          ON (
            (c.grade_system = 'Francesa' AND cls.french_value = c.value)
            OR
            (c.grade_system = 'YDS' AND cls.yds_value = c.value)
          )
        WHERE g.accomplished = true

        UNION ALL

        SELECT u.id, u.username, 'noRope', clnr.scaled_value
        FROM users u
        JOIN grade g ON g.user_id = u.id
        JOIN climb c ON c.id = g.climb_id
        JOIN climbing_level_no_rope clnr
          ON (
            (c.grade_system = 'VScale' AND clnr.vscale = c.value)
            OR
            (c.grade_system = 'Fontainebleau' AND clnr.fontainebleau = c.value)
          )
        WHERE g.accomplished = true

        UNION ALL

        SELECT u.id, u.username, 'trad', clt.scaled_value
        FROM users u
        JOIN grade g ON g.user_id = u.id
        JOIN climb c ON c.id = g.climb_id
        JOIN climbing_level_trad clt
          ON clt.british = c.value
        WHERE g.accomplished = true
      )
      SELECT
        user_id,
        username,
        discipline,
        ROUND(AVG(scaled_value), 2) AS avg_level,
        COUNT(*) AS total_grades,
        RANK() OVER (
          PARTITION BY discipline
          ORDER BY AVG(scaled_value) DESC
        ) AS ranking
      FROM all_grades
      GROUP BY user_id, username, discipline
      ORDER BY discipline, ranking;
    `;

    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
