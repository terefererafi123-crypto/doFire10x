# DoFIRE

#workflow test

A simple FIRE (Financial Independence, Retire Early) calculator web application that helps users calculate their FIRE number, time to financial independence, and the age at which they can achieve it.

## Project Description

DoFIRE is a web-based financial calculator designed to help users track their progress toward financial independence. Unlike static calculators that only provide basic projections like "you'll achieve FIRE in 2043," DoFIRE offers a dynamic tool with portfolio analysis and investment tracking.

### Key Features

- **User Authentication**: Passwordless login via Supabase magic links
- **Investment Management**: Full CRUD operations for tracking investments (ETF, Bonds, Stocks, Cash)
- **FIRE Calculations**: Real-time calculation of FIRE number, progress, and target age
- **Portfolio Analysis**: Deterministic AI hints providing insights on portfolio structure and risk
- **Text-Based Dashboard**: Simple, clean interface without complex charts

### Problem Statement

Most FIRE calculators limit themselves to static calculations without context or financial analysis. Users struggle to understand:

- How their investment decisions affect risk and progress
- How to balance their investment portfolio
- How quickly they can achieve independence with current expenses and return rates

DoFIRE solves this by offering a simple, dynamic tool with brief result interpretations—without complicated charts or excessive data.

## Tech Stack

### Frontend

- **[Astro](https://astro.build/)** v5.13.7 - Modern web framework for building fast, content-focused websites
- **[React](https://react.dev/)** v19.1.1 - UI library for building interactive components
- **[TypeScript](https://www.typescriptlang.org/)** v5 - Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** v4.1.13 - Utility-first CSS framework
- **[Shadcn/ui](https://ui.shadcn.com/)** - Accessible React component library

### Backend

- **[Supabase](https://supabase.com/)** - Backend-as-a-Service providing:
  - PostgreSQL database
  - User authentication (magic links)
  - Row Level Security (RLS)
  - TypeScript SDK

### Development & Testing

- **[Playwright](https://playwright.dev/)** - End-to-end testing framework
- **[ESLint](https://eslint.org/)** - Code linting
- **[Prettier](https://prettier.io/)** - Code formatting

### CI/CD & Hosting

- **[GitHub Actions](https://github.com/features/actions)** - CI/CD pipelines
- **DigitalOcean** - Application hosting via Docker

### AI Integration

- **Openrouter.ai** - Access to various AI models (OpenAI, Anthropic, Google, etc.) with API cost controls

## Getting Started Locally

### Prerequisites

- **Node.js** v22.14.0 (as specified in `.nvmrc`)
- **npm** (comes with Node.js)
- **Supabase account** (for backend services)

### Installation

1. **Clone the repository:**

```bash
git clone <repository-url>
cd doFire10x
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set up environment variables:**

Create a `.env` file in the root directory with your Supabase credentials:

```env
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Run the development server:**

```bash
npm run dev
```

The application will be available at `http://localhost:4321` (default Astro port).

5. **Build for production:**

```bash
npm run build
```

6. **Preview production build:**

```bash
npm run preview
```

## Available Scripts

| Script             | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start the development server         |
| `npm run build`    | Build the application for production |
| `npm run preview`  | Preview the production build locally |
| `npm run astro`    | Run Astro CLI commands               |
| `npm run lint`     | Run ESLint to check for code issues  |
| `npm run lint:fix` | Automatically fix ESLint issues      |
| `npm run format`   | Format code using Prettier           |

## Project Scope

### MVP Features

This project is an MVP created exclusively for the 10xDevs training program. The current scope includes:

- ✅ User authentication via Supabase magic links
- ✅ CRUD operations for investments (Create, Read, Update, Delete)
- ✅ Simple FIRE calculator with real-time calculations
- ✅ Deterministic AI hints for portfolio analysis
- ✅ Playwright end-to-end tests
- ✅ CI/CD pipeline with GitHub Actions

### Out of Scope

The following features are explicitly **not** included in the MVP:

- ❌ Charts, reports, and data exports
- ❌ Integration with external financial APIs
- ❌ Native mobile application
- ❌ Inflation simulation or monthly capitalization
- ❌ Persistent storage of calculation results (calculations are runtime-only)

### Project Assumptions

- No taxes or transaction fees are included in calculations
- Real estate is not counted in FIRE target
- Project is created exclusively for training purposes (non-commercial)
- Results are displayed only in PLN currency

### Investment Types

The application supports the following investment types:

- **ETF** - Exchange-Traded Funds
- **Bond** - Bonds
- **Stock** - Stocks
- **Cash** - Cash holdings

### FIRE Calculations

The application performs the following calculations in real-time:

- `annual_expense = monthly_expense * 12`
- `fire_target = annual_expense / (withdrawal_rate_pct / 100)`
- `invested_total = Σ(amount)` (sum of all investments)
- `fire_progress = invested_total / fire_target`
- `years_to_fire = log(fire_target / invested_total) / log(1 + expected_return_pct / 100)`
- `fire_age = age + years_to_fire`

## Project Status

**Status:** 🚧 MVP (Minimum Viable Product) - Development

This project is currently in development as part of the 10xDevs training program. It is a non-commercial MVP focused on demonstrating core functionality:

- User authentication and session management
- Investment portfolio management
- FIRE calculations and progress tracking
- Portfolio risk analysis via AI hints

### Success Metrics

| Metric          | Description                                           | Success Criteria                                |
| --------------- | ----------------------------------------------------- | ----------------------------------------------- |
| Authentication  | User can log in and maintain session                  | 100% successful logins                          |
| CRUD Operations | Adding, editing, deleting investments works correctly | All CRUD operations return success              |
| Calculations    | Results generated after clicking "Calculate metrics"  | Results match formulas                          |
| Testing         | E2E tests and CI/CD work correctly                    | All Playwright tests and GitHub Actions succeed |

## Project Structure

```
.
├── src/
│   ├── layouts/          # Astro layouts
│   ├── pages/            # Astro pages
│   │   └── api/          # API endpoints
│   ├── components/       # UI components (Astro & React)
│   │   └── ui/           # Shadcn/ui components
│   ├── lib/              # Services and helpers
│   ├── db/               # Supabase clients and types
│   ├── types.ts          # Shared types (Entities, DTOs)
│   ├── middleware/       # Astro middleware
│   └── assets/           # Static internal assets
├── public/               # Public assets
├── .ai/                  # Project documentation (PRD, tech stack)
├── .cursor/              # Cursor IDE rules
└── .github/              # GitHub workflows and configurations
```

## License

This project is created for educational purposes as part of the 10xDevs training program. Please refer to the license file for more details.

## Additional Resources

- [Astro Documentation](https://docs.astro.build/)
- [React Documentation](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Playwright Documentation](https://playwright.dev/)

## Contributing

This is a training project for the 10xDevs program. Contributions should follow the coding practices and guidelines defined in the project's AI configuration files (`.cursor/rules/`).

---

**Note:** This project processes data only during runtime sessions. Calculation results are not persistently stored.
