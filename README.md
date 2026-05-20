# 🌐 SocialSphere - MERN Stack Social Media Clone

A full-featured social media platform built with the **MERN** stack (MongoDB, Express, React, Node.js), inspired by Twitter and Instagram.

## ✨ Features

### 🔐 Authentication
- JWT-based register/login/logout
- Protected routes
- Persistent auth state (Zustand + localStorage)

### 📰 News Feed
- Infinite scroll feed from followed users
- Real-time-optimistic like/unlike interactions
- Repost/unrepost posts
- Save posts for later
- Delete own posts

### 📸 Rich Media Upload
- Drag & drop image/video upload (up to 4 files, 50MB each)
- Media grid layouts (1/2/3/4 media per post)
- Local file storage (easily swap for AWS S3/Cloudinary)
- Avatar upload on profile edit

### 💬 Comment System
- Nested comments with replies (2-level deep)
- Like/unlike individual comments
- Delete own comments
- Real-time comment count

### 🔍 Explore Page
- Masonry-style media grid
- Trending hashtag filter buttons
- Full-text post search
- User search with profile cards

### 👤 User Profiles
- Cover image + avatar
- Follow / unfollow
- Follower/following counts
- Posts grid and media-only view
- Edit profile with bio, website, location

### 🔔 Notifications
- Like, comment, follow, repost, reply notifications
- Mark all as read
- Unread badge counter
- Notification type icons

### 🌐 Real-time
- Socket.io integration for live notifications
- Online user presence tracking

---

## 🏗️ Project Structure

```
social-media-app/
├── backend/
│   ├── controllers/        # Business logic
│   │   ├── authController.js
│   │   ├── postController.js
│   │   ├── userController.js
│   │   ├── commentController.js
│   │   ├── notificationController.js
│   │   └── uploadController.js
│   ├── middleware/
│   │   └── auth.js         # JWT middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── Post.js
│   │   ├── Comment.js
│   │   └── Notification.js
│   ├── routes/             # Express routes
│   ├── uploads/            # Local media storage
│   ├── server.js           # Entry point + Socket.io
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── layout/     # Sidebar, MobileNav, AppLayout
    │   │   ├── post/       # PostCard, CreatePost, CommentSection
    │   │   ├── profile/    # EditProfileModal
    │   │   └── sidebar/    # RightSidebar
    │   ├── pages/          # FeedPage, ExplorePage, ProfilePage, etc.
    │   ├── store/          # Zustand state (authStore, postStore)
    │   └── utils/          # Axios API instance
    └── .env
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **MongoDB** running locally (`mongodb://localhost:27017`)
- npm

### 1. Clone/Navigate to the project

```bash
cd social-media-app
```

### 2. Start Backend

```bash
cd backend
npm install
# Edit .env with your MongoDB URI (default is localhost)
npm run dev
```

Backend starts at: `http://localhost:5000`

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts at: `http://localhost:5173`

---

## 🔧 Environment Variables

### Backend `.env`
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/socialmedia
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:5000/api
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/posts/feed` | Get feed (paginated) |
| GET | `/api/posts/explore` | Explore posts |
| POST | `/api/posts` | Create post |
| PUT | `/api/posts/:id/like` | Like/unlike |
| POST | `/api/posts/:id/repost` | Repost |
| POST | `/api/posts/:id/save` | Save post |
| GET | `/api/users/:username` | Get profile |
| PUT | `/api/users/:id/follow` | Follow/unfollow |
| GET | `/api/comments/post/:id` | Get comments |
| POST | `/api/comments/post/:id` | Add comment |
| GET | `/api/notifications` | Get notifications |
| POST | `/api/upload/media` | Upload media files |

---

## 🎨 Tech Stack

**Backend:** Node.js, Express, MongoDB, Mongoose, JWT, Socket.io, Multer
**Frontend:** React 18, Vite, Zustand, React Router v6, Axios, react-hot-toast, react-icons, date-fns

---

## ☁️ Upgrading to Cloud Storage (AWS S3/Cloudinary)

The upload controller in `backend/controllers/uploadController.js` uses local disk storage by default. To use **Cloudinary**:

1. Add your Cloudinary credentials to `.env`
2. Replace the `uploadMedia` function with Cloudinary SDK calls:

```js
const cloudinary = require('cloudinary').v2;
cloudinary.config({ cloud_name, api_key, api_secret });
const result = await cloudinary.uploader.upload(file.tempFilePath);
// use result.secure_url as the media URL
```
