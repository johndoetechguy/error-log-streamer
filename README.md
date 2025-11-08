# Error Log Streamer

A real-time synthetic error log streaming application powered by Google Gemini AI. Generate, stream, and analyze realistic API error logs with a modern React dashboard interface.

## 🚀 Features

- **Real-time Error Log Streaming**: Stream synthetic error logs via WebSocket with configurable intervals
- **AI-Powered Generation**: Uses Google Gemini AI to generate realistic, diverse error logs
- **PostgreSQL Integration**: Persistent storage of all generated error logs
- **Analytics Dashboard**: Visualize error patterns, categories, and trends
- **Configurable Settings**: Customize stream intervals, prompt templates, and themes
- **Export Functionality**: Export logs as JSON for analysis
- **Responsive Design**: Mobile-first UI built with Tailwind CSS and shadcn/ui

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **React Router** for navigation
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **Recharts** for data visualization
- **WebSocket** for real-time updates

### Backend
- **Node.js** with Express
- **WebSocket (ws)** for real-time streaming
- **PostgreSQL** for data persistence
- **Google Gemini AI** for error log generation
- **CORS** enabled for cross-origin requests

## 📋 Prerequisites

- **Node.js** 20.x or higher
- **npm** or **yarn**
- **Docker** and **Docker Compose** (for PostgreSQL)
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

## 🔧 Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd error-log-streamer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL:**
   ```bash
   cd postgress
   docker-compose up -d
   cd ..
   ```

4. **Configure environment variables:**
   
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://admin:admin@localhost:5432/error_log_streamer

   # Gemini AI API Key (required)
   GEMINI_API_KEY=your_gemini_api_key_here

   # Server Configuration
   PORT=3000

   # Frontend API URL (for Vite)
   VITE_API_URL=http://localhost:3000
   ```

## 🚀 Running the Application

### Development Mode

1. **Start the backend server:**
   ```bash
   npm run server:dev
   ```
   The server will run on `http://localhost:3000` with auto-reload on file changes.

2. **Start the frontend (in a new terminal):**
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:8080`.

### Production Mode

1. **Build the frontend:**
   ```bash
   npm run build
   ```

2. **Start the server:**
   ```bash
   npm run server
   ```

## 📡 API Endpoints

### Stream Control
- `GET /api/start-stream?interval=<ms>` - Start streaming error logs
- `GET /api/stop-stream` - Stop streaming

### Configuration
- `GET /api/config` - Get current configuration (interval, template)
- `POST /api/config` - Update configuration
  ```json
  {
    "interval": 5000,
    "template": "Your custom prompt template..."
  }
  ```

### Error Logs
- `POST /api/generate-error` - Generate a single error log
- `GET /api/logs?limit=<num>&offset=<num>` - Fetch error logs from database
- `GET /api/analytics` - Get analytics data (error categories, counts, etc.)

### WebSocket
- `WS /ws/stream` - Real-time error log stream
  - Messages: `{ type: 'error-log', data: {...} }`
  - Status: `{ type: 'stream-status', data: { isStreaming: boolean } }`

### Health Check
- `GET /health` - Server health status

## 🗄️ Database Setup

The application uses PostgreSQL for persistent storage. The database is automatically initialized with:

- **Table**: `error_logs` - Stores all generated error logs
- **Indexes**: On timestamp, category, and service_name for fast queries
- **Schema**: Matches the error log JSON structure

### Accessing the Database

**Via Adminer (Web UI):**
- URL: http://localhost:8081
- System: PostgreSQL
- Server: postgres
- Username: admin
- Password: admin
- Database: error_log_streamer

**Via psql:**
```bash
docker exec -it error-log-streamer-postgres psql -U admin -d error_log_streamer
```

## 📁 Project Structure

```
error-log-streamer/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── Dashboard.tsx  # Main dashboard
│   │   └── ...
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   └── ...
├── server/                 # Backend Node.js server
│   ├── index.js           # Express server & WebSocket
│   ├── services/          # Business logic
│   │   └── geminiService.js  # Gemini AI integration
│   └── db/                # Database layer
│       └── postgres.js    # PostgreSQL operations
├── postgress/             # PostgreSQL setup
│   ├── docker-compose.yml # Docker configuration
│   └── init.sql           # Database schema
├── public/                # Static assets
└── package.json           # Dependencies & scripts
```

## 🎨 Error Log Schema

Each generated error log follows this structure:

```json
{
  "timestamp": "2025-10-23T10:12:54Z",
  "errorCode": "NO_SEAT_AVAILABLE_ERR",
  "error": "Seat Allocation Failed",
  "errorCategory": "API_FAILURE",
  "errorLocation": "ANCILLARY_DOWNSTREAM_SERVICE",
  "apiName": "GET_SEAT_ALLOCATION_API",
  "errorReason": "No available seats for selected class",
  "awsCluster": "cluster-local-Uae-North",
  "actionToBeTaken": "Validate seat availability before assignment",
  "correlationId": "13b8ef13-db7b-422a-b959-1e5a00654631",
  "orderId": "0486938b-8b29-4ef3-b1d5-1a74489196a6",
  "serviceName": "SEAT_SERVICE",
  "errorStackTrace": "Exception at Service.method()..."
}
```

**Error Categories:**
- `API_FAILURE`
- `VALIDATION_ERROR`
- `SYSTEM_ERROR`
- `NETWORK_FAILURE`

## ⚙️ Configuration

### Stream Interval
Configure the time between generated logs (1000-10000ms) via the Settings page or API.

### Prompt Template
Customize the AI prompt used to generate error logs. The default template ensures realistic, diverse error logs with proper JSON formatting.

### Theme
Choose between Light, Dark, or System theme in the Settings page.

## 🔍 Development

### Available Scripts

- `npm run dev` - Start Vite dev server (frontend)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run server` - Start Node.js server
- `npm run server:dev` - Start server with auto-reload
- `npm run lint` - Run ESLint

### Code Style

- TypeScript for type safety
- Functional components with hooks
- Tailwind CSS for styling
- ESLint for code quality

## 🐛 Troubleshooting

### Server won't start
- Ensure PostgreSQL is running: `docker ps`
- Check environment variables in `.env`
- Verify `GEMINI_API_KEY` is set correctly

### WebSocket connection fails
- Ensure server is running on port 3000
- Check CORS settings if accessing from different origin
- Verify WebSocket URL: `ws://localhost:3000/ws/stream`

### Database connection errors
- Verify PostgreSQL container is running
- Check `DATABASE_URL` in `.env`
- Ensure database is initialized: `docker-compose logs postgres`

### Gemini API errors
- Verify API key is valid and has quota
- Check API key in `.env` file
- Review server logs for detailed error messages

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. For issues or feature requests, please contact the maintainers.

---

**Built with ❤️ using React, Node.js, and Google Gemini AI**

