# Investment Simulator

A full-stack web application that allows users to simulate stock market trading, manage multiple portfolios, and track market performance in real-time.

## Features

- **User Authentication**: Secure signup and login using JWT-based authentication.
- **Real-time Market Data**: Live stock quotes integrated with the Finnhub API, with a robust mock fallback for development.
- **Stock Collections**: Browse stocks by categories (e.g., Technology, Finance) or collections like `most-active`, `gainers`, `losers`, and `trending`.
- **Portfolio Management**: Create and delete multiple portfolios, deposit virtual funds, and track net worth.
- **Interactive Trading**: Buy and sell shares of over 50+ major stocks.
- **Performance Tracking**: View historical portfolio value charts and current holdings composition.
- **Financial News**: Stay updated with a live news feed integrated with Yahoo Finance RSS.
- **Market Status**: Real-time tracking of New York Stock Exchange (NYSE) trading hours.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL (SQLAlchemy ORM)
- **Caching**: Redis
- **Authentication**: JWT (python-jose)
- **Data Integration**: Finnhub API & Yahoo Finance RSS

### Frontend
- **Framework**: React (TypeScript)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.10+
- Node.js 18+

### 1. Infrastructure Setup
Start the PostgreSQL and Redis services using Docker Compose:
```bash
docker compose up -d
```

### 2. Backend Setup
Navigate to the `backend` directory, create a virtual environment, and install dependencies:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```
Run the backend server:
```bash
uvicorn main:app --reload --port 8000
```
*Alternatively, use the provided script from the root:* `./start_backend.sh`

### 3. Frontend Setup
Navigate to the `frontend` directory and install dependencies:
```bash
cd frontend
npm install
```
Start the development server:
```bash
npm run dev
```

## API Documentation

Once the backend is running, you can access the interactive API documentation (Swagger UI) at:
[http://localhost:8000/docs](http://localhost:8000/docs)

## Key Endpoints

- **Auth**: `/auth/register`, `/auth/token`
- **Trading**: `/trade/buy`, `/trade/sell` (Requires `portfolio_id`, `ticker`, and `quantity`)
- **Market**: `/market/stocks`, `/market/news`, `/market/status`
- **Portfolios**: `/portfolios`, `/market/portfolio-data/{portfolio_id}`
