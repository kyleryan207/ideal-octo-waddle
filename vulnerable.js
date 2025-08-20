const mysql = require('mysql');
function getUserData(userId) {
  // SQL injection vulnerability
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  return db.query(query);
}
