# PostgreSQL Setup for Error Log Streamer

## Quick Start

1. **Start PostgreSQL with Docker Compose:**
   ```bash
   cd postgress
   docker-compose up -d
   ```

2. **Verify containers are running:**
   ```bash
   docker ps
   ```
   You should see:
   - `error-log-streamer-postgres` (PostgreSQL on port 5432)
   - `error-log-streamer-adminer` (Adminer UI on port 8080)

3. **Access Adminer (Database Admin UI):**
   - Open http://localhost:8081
   - System: PostgreSQL
   - Server: postgres
   - Username: admin
   - Password: admin
   - Database: error_log_streamer

## Database Connection

**Connection String:**
```
postgresql://admin:admin@localhost:5432/error_log_streamer
```

**Environment Variable:**
```bash
DATABASE_URL=postgresql://admin:admin@localhost:5432/error_log_streamer
```

## Database Schema

The database is automatically initialized with:
- `error_logs` table - stores all generated error logs
- Indexes on timestamp, category, service_name, and created_at
- `error_logs_analytics` view - pre-aggregated analytics

## Useful Commands

**Stop containers:**
```bash
docker-compose down
```

**Stop and remove volumes (deletes all data):**
```bash
docker-compose down -v
```

**View logs:**
```bash
docker-compose logs -f postgres
```

**Connect via psql:**
```bash
docker exec -it error-log-streamer-postgres psql -U admin -d error_log_streamer
```

## Environment Variables

Set these in your application:
- `DATABASE_URL` - PostgreSQL connection string
- `GEMINI_API_KEY` - Google Gemini API key for error generation

