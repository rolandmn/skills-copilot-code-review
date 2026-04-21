# Mergington High School Activities API

A super simple FastAPI application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Sign up for activities
- View active announcements on the homepage
- Manage announcements (create, edit, delete) when signed in as a teacher/admin

## Getting Started

1. Install the dependencies:

   ```
   pip install fastapi uvicorn
   ```

2. Run the application:

   ```
   python app.py
   ```

3. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint                                                          | Description                                                         |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/activities`                                                     | Get all activities with their details and current participant count |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Sign up for an activity                                             |
| GET    | `/announcements/active`                                           | Get currently active announcements for public display               |
| GET    | `/announcements?teacher_username={username}`                      | Get all announcements for management (authenticated)                |
| POST   | `/announcements?teacher_username={username}`                      | Create an announcement (authenticated)                              |
| PUT    | `/announcements/{announcement_id}?teacher_username={username}`    | Update an announcement (authenticated)                              |
| DELETE | `/announcements/{announcement_id}?teacher_username={username}`    | Delete an announcement (authenticated)                              |

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

Data is stored in MongoDB collections (activities, teachers, and announcements).

## Announcement Rules

- Announcement message is required.
- Expiration date is required.
- Start date is optional.
- If start date is provided, expiration date must be later than start date.
