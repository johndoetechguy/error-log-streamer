// PostgreSQL database client for Node.js
// Uses pg (node-postgres) library

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://admin:admin@localhost:5432/error_log_streamer',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Insert error log into PostgreSQL
export async function insertErrorLog(errorLog) {
  try {
    const result = await pool.query(`
      INSERT INTO error_logs (
        timestamp, error_code, error, error_category,
        error_location, api_name, error_reason,
        aws_cluster, action_to_be_taken, correlation_id,
        order_id, service_name, error_stack_trace
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      errorLog.timestamp,
      errorLog.errorCode,
      errorLog.error,
      errorLog.errorCategory,
      errorLog.errorLocation,
      errorLog.apiName,
      errorLog.errorReason,
      errorLog.awsCluster,
      errorLog.actionToBeTaken,
      errorLog.correlationId,
      errorLog.orderId,
      errorLog.serviceName,
      errorLog.errorStackTrace
    ]);
    
    console.log('Error log saved to PostgreSQL, ID:', result.rows[0].id);
    return result.rows[0];
  } catch (error) {
    console.error('Failed to insert error log into database:', error);
    throw error;
  }
}

// Get error logs from PostgreSQL
export async function getErrorLogs(limit = 100, offset = 0) {
  try {
    const result = await pool.query(`
      SELECT * FROM error_logs
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    return result.rows;
  } catch (error) {
    console.error('Failed to fetch error logs:', error);
    throw error;
  }
}

// Get error logs by category
export async function getErrorLogsByCategory(category, limit = 100) {
  try {
    const result = await pool.query(`
      SELECT * FROM error_logs
      WHERE error_category = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [category, limit]);
    
    return result.rows;
  } catch (error) {
    console.error('Failed to fetch error logs by category:', error);
    throw error;
  }
}

// Get analytics data
export async function getAnalytics() {
  try {
    const result = await pool.query(`
      SELECT 
        error_category,
        COUNT(*) as count,
        COUNT(DISTINCT service_name) as unique_services,
        MIN(timestamp) as first_occurrence,
        MAX(timestamp) as last_occurrence
      FROM error_logs
      GROUP BY error_category
    `);
    
    return result.rows;
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    throw error;
  }
}

// Close database connection pool
export async function closeConnection() {
  try {
    await pool.end();
    console.log('PostgreSQL connection pool closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

