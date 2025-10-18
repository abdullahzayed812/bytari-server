# Docker Setup

Simple Docker setup for the Veterinary Backend.

## Quick Start

### Development
```bash
# Create environment file
cp .env.example .env

# Start with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker compose logs -f

# Stop everything
docker compose down
```

### Production
```bash
# Create environment file
cp .env.example .env

# Edit .env for production:
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here

# Start everything
docker compose up -d

# View logs
docker compose logs -f
```

## What It Includes

- **PostgreSQL Database**: Stores all your data
- **Backend API**: Your Bun.js/tRPC server
- **Volume Persistence**: Data survives container restarts

## Common Commands

```bash
# Check status
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs postgres

# Run migrations
docker-compose exec backend bun run db:migrate

# Access database
docker-compose exec postgres psql -U postgres veterinary_app

# Shell into backend
docker-compose exec backend sh

# Restart just the backend
docker-compose restart backend

# Clean up everything (⚠️  deletes data!)
docker-compose down -v
```

## Environment Variables

Key variables in `.env`:

- `NODE_ENV`: `development` or `production`
- Use `-f docker-compose.dev.yml` for development hot reload
- `JWT_SECRET`: Change this for production!
- `POSTGRES_PASSWORD`: Database password

## Accessing Services

- **API**: http://localhost:3001
- **Database**: localhost:5432 (from host machine)
- **Health Check**: http://localhost:3001/health

That's it! Keep it simple. 🐳
