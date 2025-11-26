# Admin Dashboard Setup & Usage

## Overview
The Expert Dashboard now includes an admin-only section for managing client-agent assignments. This feature is accessible only to users with admin credentials.

## Admin Access
- **Email**: `admin@example.com`
- **Password**: `hey123`

## Features

### 1. Admin Dashboard (`/admin-clients`)
- **Purpose**: Manage client-agent assignments across all clients
- **Access**: Only available to admin users
- **Features**:
  - View all clients in card format
  - Assign/unassign agents to clients
  - Search and filter clients
  - View client details and preferences
  - Real-time agent assignment updates

### 2. Agent Access Control
- **Purpose**: Agents can only view clients assigned to them
- **Access**: Available to all registered users (non-admin)
- **Features**:
  - View only assigned clients on `/clients` page
  - Read-only agent assignment display
  - Personalized dashboard with agent identification
  - Restricted access to admin functions

### 3. Client Cards Display
Each client card shows:
- **Basic Info**: Name, location, client ID
- **Contact Details**: Email, phone, last contact date
- **Preferences**: Property type, budget, configuration, timeline
- **Agent Assignment**: Dropdown to select/unselect agents
- **Stats**: Number of matched properties
- **Actions**: View client details button

### 4. Agent Management
- **Available Agents**: 5 pre-configured agents in the system
- **Assignment**: Drag-and-drop style assignment via dropdown
- **Removal**: Can unassign agents (sets to "No Agent Assigned")
- **Persistence**: Assignments saved to localStorage and backend

## Navigation

### Sidebar Experience

**Admin Users (`admin@example.com`):**
- **Only** "Admin Dashboard" menu item visible
- Clean, focused interface for client management
- No access to regular client, calendar, or about pages
- Shield icon with "Manage client assignments" description

**Regular Users (Agents):**
- Standard navigation: "Clients", "Calendar", "About"
- Access to their assigned clients only
- Full calendar and about page functionality

### From Sidebar
- **Admin users**: See ONLY "Admin Dashboard" menu item (no Clients, Calendar, About)
- **Regular users**: See normal navigation (Clients, Calendar, About)
- **Icon**: Shield icon to indicate admin-only access
- **Description**: "Manage client assignments"

### From Clients Page
- Admin users see an "Admin Dashboard" button in the header
- Quick access to admin functionality
- Maintains context of current client view

## Technical Implementation

### Routes
- **Admin Route**: `/admin-clients` (protected)
- **Regular Route**: `/clients` (existing functionality)

### Database Collections
- **UserData**: Stores user accounts (agents)
- **ClientAgentAssignments**: Stores client-agent relationships
- **properties**: Stores property data (existing)

### Authentication
- Admin check performed on component mount
- Redirects non-admin users to regular clients page
- Toast notification for access denied attempts

### Data Flow
1. **Login**: Admin users redirected to admin dashboard
2. **Data Fetching**: 
   - Clients loaded from `/api/webhook-handler`
   - Agents loaded from `UserData` collection via `/api/agents`
   - Existing assignments loaded from `ClientAgentAssignments` collection
3. **Assignment**: Changes saved to MongoDB database via `/api/clients/:id/assign-agent`
4. **State Management**: Real-time updates across components with database persistence

## Available Agents

The system dynamically fetches agents from the `UserData` collection in MongoDB. Each user in the system becomes an available agent with:

- **ID**: MongoDB ObjectId converted to string
- **Name**: Username from the user account
- **Email**: Email address from the user account
- **Status**: Always set to 'active'
- **Created**: Account creation timestamp

### Sample Agent Data Structure
```json
{
  "id": "68888d93ff900cb3c8c089cd",
  "name": "sathwik",
  "email": "sathwik@gmail.com",
  "phone": "Not specified",
  "status": "active",
  "createdAt": "2025-07-29T09:00:03.318Z"
}
```

## Usage Workflow

### 1. Login as Admin
```
Email: admin@example.com
Password: hey123
```

### 2. Login as Agent
```
Email: [any user email from UserData collection]
Password: [user's password]
```

**Example Agent Login:**
```
Email: sathwik@gmail.com
Password: [sathwik's password]
```

### 3. Access Admin Dashboard (Admin Only)
- Automatically redirected after login, OR
- Click "Admin Dashboard" in sidebar, OR
- Click "Admin Dashboard" button on clients page

### 4. Manage Assignments (Admin Only)
- Browse client cards
- Use dropdown to assign agents
- Search for specific clients
- View detailed client information

### 5. Agent View (Agents Only)
- View only assigned clients
- Read-only access to client information
- Cannot modify agent assignments
- Personalized dashboard showing agent name

### 6. Monitor Changes
- Real-time assignment updates
- Toast notifications for success/errors
- Persistent storage across sessions

## Security Features

- **Route Protection**: Admin-only routes
- **Component-Level Checks**: Admin status verification
- **Access Control**: Automatic redirects for non-admin users
- **Session Management**: Admin status checked on each access

## Troubleshooting

### Common Issues

1. **"Access Denied" Message**
   - Verify you're logged in as admin@example.com
   - Check localStorage for userData
   - Clear browser data and re-login

2. **Agents Not Loading**
   - Check backend server status
   - Verify `/api/agents` endpoint is accessible
   - Check browser console for errors

3. **Assignments Not Saving**
   - Verify backend `/api/clients/:id/assign-agent` endpoint
   - Check localStorage permissions
   - Review browser console for API errors

### Debug Information
- Admin status logged to console
- API calls logged with response status
- Assignment changes logged with details

## Future Enhancements

- **Bulk Operations**: Assign multiple clients to agents
- **Agent Performance**: Track assignment success rates
- **Audit Trail**: Log all assignment changes
- **Advanced Filtering**: Filter by agent, assignment status
- **Export Functionality**: Download assignment reports
