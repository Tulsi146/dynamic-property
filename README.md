# Dynamic Properties Portal

A Next.js real estate website for property listings with performance optimizations.

## Features

- Property listings with search and filtering
- Featured properties and best choices sections
- Property detail pages with image galleries
- Admin dashboard for managing properties
- Contact form with email notifications
- SEO optimized pages
- Mobile responsive design

## Performance Optimizations

- **Client-side caching**: PropertiesContext for sharing data between components
- **Server-side caching**: Cache headers in API routes (60s s-maxage, 300s stale-while-revalidate)
- **Database indexing**: Indexes on frequently queried columns (created_at, status, category, isBestChoice, location)

## Tech Stack

- Next.js 14 (App Router)
- MySQL Database
- Tailwind CSS
- Swiper (for carousels)
- React Context for state management

## Setup

### Prerequisites

- Node.js 18+
- MySQL database

### Installation

1. Clone the repository
2. Install dependencies:
   
```
bash
   cd frontend
   npm install
   
```

3. Create `.env.local` file:
   
```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=property_db
   
```

4. Run the development server:
   
```
bash
   npm run dev
   
```

## Database Setup

1. Create the database and tables using `frontend/database.sql`
2. Add performance indexes using `frontend/add_performance_indexes.sql`

## Deployment

See HOSTINGER_SETUP.md for deployment instructions on Hostinger.

## License

Private - All rights reserved
