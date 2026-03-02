# C Connect

A Centralized Role-Based Institutional Communication Platform - A full-stack mobile application for educational institutions enabling seamless communication between students, teachers, committee members, and administrators.

## 🎯 Features

### Smart Announcement Feed
- Role-based post visibility
- Weighted ranking algorithm considering urgency, engagement, department relevance, and recency
- Support for text, images, and external links
- Comment system with moderation

### Event Management
- Event calendar with QR code check-in
- RSVP functionality
- Automatic reminders for upcoming events
- Attendance tracking

### Polling System
- Create polls with 2-6 options
- Department-targeted polls
- Real-time vote counting
- Automatic poll expiry

### Analytics Dashboard (Admin)
- User engagement metrics
- Department-wise activity
- Content performance tracking

## 🏗️ Architecture

### Backend (Node.js + Express)
```
backend/
├── src/
│   ├── config/         # Database, Cloudinary configuration
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Auth, RBAC, validation, error handling
│   ├── models/         # Mongoose schemas
│   ├── routes/         # API endpoints
│   ├── utils/          # Notifications, scheduler
│   └── server.js       # Entry point
├── .env.example        # Environment template
└── package.json
```

### Frontend (React Native + Expo)
```
mobile/
├── src/
│   ├── config/         # App constants
│   ├── context/        # Auth context
│   ├── navigation/     # React Navigation setup
│   ├── screens/        # All app screens
│   └── services/       # API client
├── App.js              # Root component
├── app.json            # Expo configuration
└── package.json
```

## 🔧 Tech Stack

### Backend
- **Runtime:** Node.js v18+
- **Framework:** Express.js
- **Database:** MongoDB Atlas
- **ODM:** Mongoose
- **Authentication:** JWT (HMAC SHA256)
- **Password Hashing:** bcrypt (saltRounds=10)
- **File Storage:** Cloudinary
- **Push Notifications:** Expo Server SDK
- **Scheduling:** node-cron

### Frontend
- **Framework:** React Native (Expo ~50.0.0)
- **Navigation:** React Navigation 6.x
- **HTTP Client:** Axios
- **Secure Storage:** expo-secure-store
- **Camera:** expo-camera
- **QR Scanner:** expo-barcode-scanner
- **Calendar:** react-native-calendars

## 🚀 Getting Started

### Prerequisites
- Node.js v18 or higher
- npm or yarn
- MongoDB Atlas account
- Cloudinary account
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from template:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/campus_connect
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

5. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

### Frontend Setup

1. Navigate to mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Update API URL in `src/config/constants.js`:
```javascript
export const API_BASE_URL = 'http://YOUR_LOCAL_IP:5000/api';
```
> Note: Use your computer's local IP address (not localhost) for mobile device testing

4. Start Expo:
```bash
npx expo start
```

5. Scan the QR code with Expo Go app

## 📱 User Roles

| Role | Permissions |
|------|-------------|
| **Student** | View posts, comment, vote in polls, RSVP to events |
| **Teacher** | All student permissions + Create posts, Create polls |
| **Committee** | All teacher permissions + Create events, Manage check-ins |
| **Admin** | Full access + Analytics dashboard, User management |

## 🔐 Authentication

### PID Expiry Logic
- `graduation_year = admission_year + 4`
- Login denied if `current_year > graduation_year`
- Graceful handling with clear error messages

### Password Requirements
- Minimum 6 characters
- Hashed with bcrypt (salt rounds: 10)

## 📊 Smart Feed Algorithm

Posts are ranked using a weighted scoring system:

```
score = (5 × is_urgent) + (3 × engagement_score) + (2 × department_match) − time_decay
```

Where:
- `is_urgent`: 1 if urgent, 0 otherwise
- `engagement_score`: Normalized (likes + comments)
- `department_match`: 1 if matches user's department or is "All"
- `time_decay`: Hours since posted / 24

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register    - Register new user
POST   /api/auth/login       - User login
GET    /api/auth/me          - Get current user
PUT    /api/auth/password    - Change password
```

### Posts
```
GET    /api/posts            - Get all posts
GET    /api/posts/feed       - Get ranked feed
POST   /api/posts            - Create post (Teacher+)
GET    /api/posts/:id        - Get post details
PUT    /api/posts/:id        - Update post
DELETE /api/posts/:id        - Soft delete post
POST   /api/posts/:id/like   - Toggle like
```

### Events
```
GET    /api/events           - Get all events
POST   /api/events           - Create event (Committee+)
GET    /api/events/:id       - Get event details
PUT    /api/events/:id       - Update event
DELETE /api/events/:id       - Delete event
POST   /api/events/:id/rsvp  - Toggle RSVP
POST   /api/events/checkin   - QR check-in
```

### Polls
```
GET    /api/polls            - Get all polls
POST   /api/polls            - Create poll (Teacher+)
GET    /api/polls/:id        - Get poll details
POST   /api/polls/:id/vote   - Cast vote
DELETE /api/polls/:id        - Close poll
```

### Users
```
GET    /api/users            - Get all users (Admin)
GET    /api/users/:id        - Get user profile
PUT    /api/users/:id        - Update user
DELETE /api/users/:id        - Deactivate user (Admin)
```

### Analytics (Admin Only)
```
GET    /api/analytics/dashboard       - Dashboard overview
GET    /api/analytics/posts           - Post analytics
GET    /api/analytics/users           - User analytics
GET    /api/analytics/events          - Event analytics
GET    /api/analytics/engagement      - Engagement metrics
```

### Comments
```
GET    /api/comments/:postId          - Get post comments
POST   /api/comments/:postId          - Add comment
PUT    /api/comments/:id              - Update comment
DELETE /api/comments/:id              - Delete comment
```

## 🔔 Push Notifications

The app uses Expo Push Notifications for:
- New posts in user's department
- Urgent announcements
- Event reminders (24h and 1h before)
- Poll expiry reminders
- Event check-in confirmations

## ⏰ Scheduled Tasks

| Task | Schedule | Description |
|------|----------|-------------|
| Event Reminders | Every 5 minutes | Send notifications for upcoming events |
| Poll Expiry | Every hour | Close expired polls |
| Analytics Update | Daily at midnight | Aggregate engagement data |

## 🛡️ Security Features

- JWT token authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Input validation with Joi
- Soft delete for data preservation
- Secure token storage (expo-secure-store)

## 📁 Database Models

### User
- PID (unique identifier)
- Name, password, role, department
- Admission year, graduation year
- Push notification token
- Active status

### Post
- Title, description, department
- Created by (User reference)
- Attachment (URL, type)
- Event date, external link
- Urgency flag, likes count
- Soft delete support

### Event
- Title, description, location
- Date, department
- QR code (auto-generated UUID)
- Attendance count (virtual)

### Poll
- Question, options (with vote counts)
- Voters array (prevents duplicate votes)
- Department, expiry date
- Atomic vote operations

### Comment
- Text, user reference, post reference
- Timestamps

### Attendance
- User, Event references
- Check-in timestamp
- Compound unique index

### Analytics
- User, Post, Event references
- Event type, timestamp
- Aggregation pipelines

## 🧪 Testing

### Backend
```bash
cd backend
npm test
```

### Frontend
```bash
cd mobile
npm test
```

## 📦 Building for Production

### Backend
1. Set `NODE_ENV=production`
2. Use PM2 or similar process manager
3. Configure MongoDB Atlas production cluster
4. Set up proper SSL/TLS

### Frontend
```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android

# Or use EAS Build
eas build --platform all
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

Campus Connect Development Team

## 🙏 Acknowledgments

- Expo for the amazing React Native tooling
- MongoDB for the flexible database solution
- Cloudinary for media management
