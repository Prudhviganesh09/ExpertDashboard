# Google Calendar Integration Setup

This guide explains how to set up Google Calendar integration for the Expert Call Scheduling feature.

## Prerequisites

- Google Cloud Platform account
- Access to Google Calendar API

## Current Setup (OAuth2)

The application is currently configured to use **OAuth2 credentials** for Google Calendar API access.

### Environment Variables Required

Add the following to your `.env` file in the `ExpertDashboard/Backend` directory:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
GOOGLE_CLIENT_EMAIL=your-email@domain.com
```

**Current Configuration:**
- ✅ OAuth2 authentication is enabled
- ✅ Calendar events are created in the authenticated user's calendar
- ✅ Expert emails are added as attendees to receive invitations

### How It Works

1. The application uses OAuth2 credentials to authenticate with Google Calendar API
2. When a meeting is scheduled, it creates an event in the **primary calendar** (Connect@relai.world)
3. The expert (harshithv@relai.world or vaishnavig@relai.world) is added as an **attendee**
4. Both parties receive email invitations and calendar notifications

---

## Alternative Setup: Service Account (For Direct Calendar Access)

If you prefer to create events directly in the expert's calendars, follow these steps:

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Create a Service Account

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - Name: `Expert Call Scheduler` (or your preferred name)
   - Description: `Service account for scheduling expert calls`
4. Click "Create and Continue"
5. Skip the optional steps and click "Done"

### 3. Generate Service Account Key

1. Click on the newly created service account
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" format
5. Click "Create" - this will download a JSON file

### 4. Grant Calendar Access

For each expert's Google Calendar (harshithv@relai.world and vaishnavig@relai.world):

1. Open Google Calendar
2. Go to Settings > Share with specific people
3. Add the service account email (found in the JSON file as `client_email`)
4. Set permission to "Make changes to events"
5. Click "Send"

### 5. Update Backend Code

The backend code needs to be updated to use JWT authentication instead of OAuth2. Contact your developer to switch the authentication method in `index.js`.

### 6. Restart the Application

After adding the environment variables, restart your application:

```bash
npm run dev
```

You should see: `✅ Google Calendar authentication initialized` in the logs.

## Verification

To verify the integration is working:

1. Log in to the Pre-Sale dashboard
2. Navigate to a client detail page
3. Click "Schedule Expert Call"
4. Select an expert, date, and time
5. Click "Schedule Meeting"
6. Check the expert's Google Calendar to confirm the event was created

## Troubleshooting

### Error: "Google Calendar credentials not configured"

- Verify the environment variables are set correctly in `.env`
- Make sure there are no extra spaces or quotes around the values
- Restart the application after updating `.env`

### Error: "Failed to create Google Calendar event"

- Verify the service account has been granted access to the expert's calendar
- Check that the service account email is correct
- Review the backend logs for detailed error messages

### Events not appearing in calendar

- Verify the expert's email address is correct (harshithv@relai.world or vaishnavig@relai.world)
- Check that the service account has "Make changes to events" permission
- Ensure the calendar ID matches the expert's email

## Features

- **Automatic Scheduling**: Meetings are automatically added to the expert's Google Calendar
- **45-Minute Duration**: Each meeting is scheduled for exactly 45 minutes
- **15-Minute Gap**: The system enforces a 15-minute gap between meetings
- **Availability Checking**: The system prevents double-booking
- **Email Notifications**: Google Calendar sends automatic email reminders to the expert

## API Endpoints

The following API endpoints are used for expert scheduling:

- `GET /api/experts` - Get list of available experts
- `GET /api/expert-meetings/:clientId` - Get scheduled meetings for a client
- `POST /api/expert-meetings` - Schedule a new expert call
- `GET /api/expert-meetings/availability/:expertEmail` - Check availability

## Support

For issues or questions, please contact the development team.
