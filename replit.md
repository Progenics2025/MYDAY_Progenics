# HR Management System

## Overview

This is a full-stack HR Management System built with React and Express.js that provides comprehensive employee management, attendance tracking, payroll processing, and reporting capabilities. The application features a modern web interface with role-based access control, real-time attendance monitoring, automated payroll calculations, and detailed analytics dashboards.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: Radix UI components with shadcn/ui design system for consistent, accessible interface
- **Styling**: Tailwind CSS with CSS custom properties for theming and responsive design
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for RESTful API endpoints
- **Language**: TypeScript for type safety across the entire stack
- **Authentication**: Session-based authentication with in-memory session storage
- **Data Storage**: In-memory storage with interfaces designed for easy database migration
- **API Design**: RESTful endpoints following conventional HTTP methods and status codes

### Data Storage Solutions
- **Current**: In-memory storage implementation for rapid development and testing
- **Database Ready**: Drizzle ORM configured for PostgreSQL with schema definitions
- **Schema**: Well-defined TypeScript interfaces for Users, Employees, Attendance, and Payroll entities
- **Migration Support**: Drizzle migrations configured for production database deployment

### Authentication and Authorization
- **Authentication Method**: Username/password login with session management
- **Session Storage**: In-memory sessions with generated session IDs
- **Authorization**: Role-based access control (admin, manager, employee roles)
- **Security**: Protected routes and middleware for endpoint access control

### Core Modules
- **Employee Management**: CRUD operations, search/filtering, role assignments, and status tracking
- **Attendance Tracking**: Clock in/out functionality, status monitoring, and historical records
- **Payroll Processing**: Automated salary calculations, allowances, deductions, and payslip generation
- **Reporting & Analytics**: Dashboard metrics, data export capabilities, and period-based reporting

## External Dependencies

### Core Framework Dependencies
- **@tanstack/react-query**: Server state management and data synchronization
- **wouter**: Lightweight routing library for single-page application navigation
- **react-hook-form**: Form handling with validation and error management
- **@hookform/resolvers**: Integration between react-hook-form and validation libraries

### Database and ORM
- **drizzle-orm**: Type-safe ORM for database operations and query building
- **drizzle-zod**: Schema validation integration between Drizzle and Zod
- **@neondatabase/serverless**: PostgreSQL serverless database driver for production

### UI and Styling
- **@radix-ui/***: Comprehensive set of accessible UI components (dialogs, forms, navigation)
- **tailwindcss**: Utility-first CSS framework for responsive design
- **class-variance-authority**: Type-safe variant API for component styling
- **clsx**: Utility for constructing className strings conditionally

### Development and Build Tools
- **vite**: Fast build tool and development server with hot module replacement
- **typescript**: Static type checking and enhanced developer experience
- **tsx**: TypeScript execution environment for Node.js development
- **esbuild**: Fast JavaScript bundler for production builds

### Validation and Utilities
- **zod**: Runtime type validation and schema definition
- **date-fns**: Date manipulation and formatting utilities
- **lucide-react**: Icon library for consistent visual elements throughout the application