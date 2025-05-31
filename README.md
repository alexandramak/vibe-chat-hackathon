# Skype-like Chat Application

A full-stack, self-hosted chat application with real-time messaging capabilities.

## Features

- User registration and login (username/password)
- Contact management system
- 1:1 and group chats (up to 300 people)
- Real-time messaging using WebSocket
- Message formatting (Markdown)
- Emoji support
- Message reactions
- Image attachments (AWS S3)
- Full-text message search
- Deep linking to chats
- Docker-based deployment

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React + Tailwind CSS
- **Database**: PostgreSQL
- **Real-time**: Socket.io
- **Storage**: AWS S3
- **Deployment**: Docker, Docker Compose, AWS ECS

## Prerequisites

- Docker and Docker Compose
- Node.js 18+
- AWS Account with configured credentials
- PostgreSQL (for local development)

## Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in the required values
3. Configure AWS credentials

## Local Development

```bash
# Install dependencies
npm install

# Start development servers
docker-compose up -d

# Frontend development server
cd frontend
npm run dev

# Backend development server
cd backend
npm run dev
```

## Production Deployment

### Using Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### AWS ECS Deployment

1. Configure AWS credentials
2. Navigate to infra directory
3. Run Terraform commands:

```bash
cd infra
terraform init
terraform plan
terraform apply
```

## Database Schema

The database schema is automatically initialized on startup. See `backend/db/schema.sql` for details.

## API Documentation

API documentation is available at `/api/docs` when running the server.

## Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test
```

## Development Scripts

- `npm run seed` - Seed the database with test data
- `npm run lint` - Run linting
- `npm run build` - Build for production

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT 