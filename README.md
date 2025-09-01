# VaxTracker - Personal Vaccination Management

A modern, secure web application for tracking personal vaccination records and managing immunization schedules.

## Features

### 🔐 Secure Authentication
- Email and password authentication via Supabase
- Secure user registration and login
- Protected user data with Row Level Security (RLS)

### 💉 Vaccination Record Management
- Add, edit, and delete vaccination records
- Support for common vaccines (COVID-19, Flu, MMR, etc.)
- Custom vaccine name support
- Dose tracking and scheduling
- Date management for vaccinations

### 📅 Smart Reminders
- Automatic reminder creation for upcoming vaccinations
- Visual indicators for overdue vaccines
- Reminder status tracking
- Due date notifications

### 📊 Dashboard Analytics
- Real-time statistics overview
- Total vaccination count
- Up-to-date status tracking
- Upcoming and overdue reminders count

### 🔍 Advanced Features
- Search and filter vaccination records
- Responsive design for all devices
- Toast notifications for user feedback
- Modern, intuitive user interface

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Supabase (PostgreSQL database)
- **Authentication**: Supabase Auth
- **Styling**: Custom CSS with modern design principles
- **Icons**: Font Awesome
- **Fonts**: Inter (Google Fonts)

## Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `email` (Text, Unique)
- `name` (Text, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Vaccination Records Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to users)
- `vaccine_name` (Text)
- `dose_number` (Integer, Default: 1)
- `date_given` (Date)
- `next_due` (Date, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Reminders Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to users)
- `record_id` (UUID, Foreign Key to vaccination_records)
- `due_date` (Date)
- `sent` (Boolean, Default: false)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

## Security Features

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Secure authentication with Supabase
- Input validation and sanitization
- Protected API endpoints

## Getting Started

1. **Environment Setup**
   - Ensure you have a Supabase project configured
   - Set up the required environment variables in `.env`

2. **Database Setup**
   - The database schema is already configured with proper RLS policies
   - All necessary tables and relationships are in place

3. **Run the Application**
   ```bash
   npm install
   npm run dev
   ```

4. **First Use**
   - Create an account using the registration form
   - Start adding your vaccination records
   - Set up reminders for future doses

## Usage Guide

### Adding Vaccination Records
1. Click "Add Vaccination Record" button
2. Select vaccine type or choose "Other" for custom vaccines
3. Enter dose number and date given
4. Optionally set next due date for automatic reminders
5. Save the record

### Managing Reminders
- Reminders are automatically created when you set a "next due" date
- View all reminders in the dedicated reminders section
- Overdue reminders are highlighted in red
- Upcoming reminders (within 30 days) are shown in yellow

### Dashboard Statistics
- **Total Vaccines**: Count of all vaccination records
- **Up to Date**: Records that don't have overdue next doses
- **Upcoming**: Reminders due within the next 30 days
- **Overdue**: Reminders past their due date

## Design Philosophy

The application follows modern design principles with:
- Clean, minimalist interface
- Intuitive navigation and user flows
- Responsive design for all screen sizes
- Accessible color contrasts and typography
- Smooth animations and micro-interactions
- Professional medical application aesthetics

## Security & Privacy

- All data is encrypted in transit and at rest
- User data is isolated using Row Level Security
- No data sharing between users
- Secure authentication protocols
- Regular security updates via Supabase

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

This is a personal vaccination tracking application. For feature requests or bug reports, please create an issue in the project repository.

## License

This project is for personal use and educational purposes.