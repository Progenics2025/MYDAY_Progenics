# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

PayPulsePro is a full-stack HR Management System built with React, Express.js, and TypeScript. It provides comprehensive employee management, attendance tracking, payroll processing, and reporting capabilities with a modern web interface and role-based access control.

## Development Commands

### Core Development
- `npm run dev` - Start development server (runs both client and server)
- `npm run build` - Build for production (builds client and server)
- `npm start` - Run production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes using Drizzle

### Development Workflow
- The application runs on port 5000 (configurable via PORT environment variable)
- Development mode uses Vite with hot reload for the React frontend
- Server runs with tsx for TypeScript execution and hot reload

## Architecture Overview

### Project Structure
- **`client/`** - React frontend application with TypeScript
- **`server/`** - Express.js backend API with TypeScript  
- **`shared/`** - Shared TypeScript types, schemas, and utilities
- **`uploads/`** - File storage for document uploads

### Key Architectural Patterns

#### Full-Stack TypeScript Integration
- Uses `@shared` path mapping for type sharing between client and server
- Drizzle ORM with PostgreSQL schema definitions in `shared/schema.ts`
- Zod schemas for runtime validation and type inference
- Path aliases: `@/*` for client, `@shared/*` for shared types

#### Frontend Architecture
- **Router**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state with caching
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Forms**: React Hook Form with Zod validation integration

#### Backend Architecture
- **API Design**: RESTful endpoints with conventional HTTP methods
- **Authentication**: Session-based auth with in-memory session storage
- **Authorization**: Role-based access control (admin, manager, employee)
- **Data Layer**: Currently uses in-memory storage with database interfaces ready for PostgreSQL migration

#### Database Strategy
- **Current**: In-memory storage implementation (`MemStorage` class)
- **Production Ready**: Drizzle ORM configured for PostgreSQL with migrations
- **Schema**: Comprehensive entities for Users, Employees, Attendance, Payroll, Expenses, Leave Requests, and Documents
- **Migration Path**: Easy transition from memory storage to database via interface abstraction

## Core Business Logic

### Employee Management
- Employee creation requires userId linkage to users table
- Employee search supports filtering by department, role, and status
- Salary structure includes basic salary, HRA, allowances, and deductions
- Status tracking: active, inactive, terminated

### Attendance System
- Clock in/out functionality with timestamp tracking
- Daily attendance records with total hours calculation
- Status types: present, absent, late, half-day
- GPS location support for remote attendance tracking

### Payroll Processing
- Indian salary structure implementation:
  - Basic Salary: 50% of total
  - HRA: 25% of total
  - Transport Allowance: 10% (max ₹1,600)
  - Medical Allowance: 5% (max ₹1,250)
- Indian tax calculations:
  - Provident Fund: 12% of basic salary
  - ESI: 0.75% (if salary ≤ ₹21,000)  
  - Professional Tax: ₹200 (if salary > ₹10,000)
  - Income Tax based on new tax regime slabs
- Automated gross/net salary calculations

### Authentication & Authorization
- Session-based authentication with Bearer token headers
- Role hierarchy: admin > manager > employee
- Protected routes with role-based permissions
- Employee profile linking through userId

## Database Schema

### Key Tables
- **users**: Authentication and basic user data
- **employees**: Detailed employee information linked to users
- **attendance**: Daily attendance records with punch in/out
- **payroll**: Monthly salary calculations and payments
- **expenses**: Employee expense claims and approvals
- **leave_requests**: Leave applications with approval workflow
- **documents**: Employee document storage and verification

### Important Relationships
- Users (1:1) Employees via userId
- Employees (1:many) Attendance via employeeId
- Employees (1:many) Payroll via employeeId
- All tables use varchar(36) for primary keys (UUID format)

## Development Guidelines

### Adding New Features
1. Define Zod schemas in `shared/schema.ts` for validation
2. Update storage interface in `server/storage.ts` 
3. Implement storage methods in `MemStorage` class
4. Add API routes in `server/routes.ts` with authentication
5. Create React components using existing UI patterns
6. Use TanStack Query for server state management

### Database Migration Path
- Current in-memory storage implements the same interface as future database storage
- To migrate to PostgreSQL: replace `MemStorage` with Drizzle database implementation
- Run `npm run db:push` after setting DATABASE_URL environment variable
- All schema definitions already exist in `shared/schema.ts`

### UI Component Development
- Use shadcn/ui components from `@/components/ui`
- Follow existing Tailwind CSS patterns and custom properties
- Implement responsive design with mobile-first approach
- Use React Hook Form for form management with Zod validation

### API Development
- All routes require authentication except `/api/auth/login`
- Use role-based authorization for sensitive operations
- Follow RESTful conventions: GET (read), POST (create), PUT (update), DELETE (remove)
- Validate input using Zod schemas from shared module
- Handle errors with appropriate HTTP status codes

## Environment Configuration

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (for production database)
- `PORT`: Server port (defaults to 5000)

### Default Credentials
- Username: `admin`
- Password: `admin123`
- Role: admin with full system access

## File Upload Handling
- Multer configured for file uploads to `./uploads/` directory
- File naming: timestamp + original filename
- Used for employee documents, expense receipts, and profile photos
