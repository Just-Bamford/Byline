# Byline Publisher Dashboard

Real-time earnings and readership dashboard for Byline publishers. Built with React, TypeScript, and Tailwind CSS. Connects to the publisher backend via REST API.

## Features

- **Real-time Analytics**: View total earnings, reads, and top articles
- **Earnings Chart**: Visual representation of earnings over time (30-day history)
- **Articles Management**: Browse all published articles with per-article stats
- **Article Registration**: Register new articles directly from the dashboard
  - Submits transactions to Soroban smart contract
  - Supports both Stroops and USDC pricing
- **Live Updates**: Auto-refresh every 30 seconds
- **Responsive Design**: Works on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **UI**: Tailwind CSS + Lucide Icons
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Build Tool**: Vite
- **Linting**: ESLint + TypeScript

## Project Structure

```
publisher-dashboard/
├── src/
│   ├── components/          # React components
│   │   ├── StatsCard.tsx
│   │   ├── EarningsChart.tsx
│   │   ├── RegisterArticleForm.tsx
│   │   └── ArticlesTable.tsx
│   ├── pages/               # Page components
│   │   ├── Dashboard.tsx
│   │   └── Login.tsx
│   ├── services/            # API clients
│   │   └── api.ts
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── styles/              # CSS
│   │   └── globals.css
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Publisher backend running on `http://localhost:3001`

### Installation

```bash
# Install dependencies
npm install

# Set environment variables
echo "REACT_APP_API_URL=http://localhost:3001/api" > .env.local

# Start development server
npm run dev

# Build for production
npm run build
```

## Development

### Start Dev Server

```bash
npm run dev
```

Server runs on `http://localhost:5174` by default

### Lint Code

```bash
npm run lint
```

### Type Check

```bash
npm run type-check
```

### Build for Production

```bash
npm run build
```

Output in `dist/` directory

### Preview Production Build

```bash
npm run preview
```

## API Integration

The dashboard connects to the publisher backend via REST API:

### Required Endpoints

All endpoints require `Authorization: Bearer <token>` header

```
GET    /api/publishers/{address}/profile
GET    /api/publishers/{address}/stats
GET    /api/publishers/{address}/articles
POST   /api/publishers/{address}/articles/register
GET    /api/publishers/{address}/earnings-history?days=30
GET    /api/publishers/{address}/top-readers?limit=10
```

See `src/services/api.ts` for implementation details.

## Components

### StatsCard

Displays key metrics:

- Total earnings
- Total reads
- Article count
- Top article

### EarningsChart

Line chart showing 30-day earnings history powered by Recharts

### RegisterArticleForm

Form to register new articles on-chain:

- Article ID validation
- Title input
- Price input (stroops or USDC)
- Submits to Soroban via backend
- Shows success/error messages

### ArticlesTable

Responsive table of published articles:

- Article title and ID
- Read count
- Revenue generated
- Price and currency
- Publication date
- Trending indicators

### Dashboard

Main page combining all components:

- Stats grid
- Earnings chart + registration form (side-by-side)
- Articles table
- Auto-refresh timer
- Logout button

### LoginPage

Authentication entry point:

- Stellar address input
- Token-based auth
- Error handling

## Authentication

Publishers log in with their Stellar address. The dashboard:

1. Accepts Stellar address
2. Generates/stores auth token in `localStorage`
3. Sends token with all API requests
4. Clears token on logout

## Data Flow

```
Login
  ↓
Store auth token + address in localStorage
  ↓
Load Dashboard
  ↓
Fetch stats, articles, earnings history (parallel)
  ↓
Render components with data
  ↓
Auto-refresh every 30 seconds
```

## Error Handling

- API errors displayed in error banner
- Form validation with inline error messages
- Network timeout handling (10s default)
- Graceful fallbacks for missing data

## Responsive Design

- Mobile: Single column layout
- Tablet: 2-column grid (tablet-optimized)
- Desktop: Full multi-column layout
- All components scale appropriately

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Modern mobile browsers

## Performance

- Auto-refresh interval: 30 seconds (configurable)
- API timeout: 10 seconds
- Parallel data fetching
- Lazy loading for charts
- Optimized re-renders with React best practices

## Future Enhancements

- [ ] Publisher profile editing
- [ ] Advanced analytics (cohort analysis, retention)
- [ ] Revenue split tracking (writers)
- [ ] NFT transfer history
- [ ] Secondary market statistics
- [ ] Export analytics as CSV
- [ ] Dark mode
- [ ] Multi-language support

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json .
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5174
CMD ["npm", "run", "preview"]
```

### Vercel/Netlify

```bash
npm run build
# Deploy dist/ directory
```

### Environment Variables

```
REACT_APP_API_URL=https://api.example.com
```

## Contributing

1. Follow TypeScript strict mode
2. Use Tailwind CSS for styling
3. Add tests for new components
4. Update types in `src/types/index.ts`
5. Follow ESLint rules

## License

MIT - See LICENSE file
