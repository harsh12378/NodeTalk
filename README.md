 Nodetalk

Nodetalk is a real-time chat application built with Node.js, enabling seamless communication between users. It comes with core social and messaging features such as friend management, live status updates, and instant messaging powered by WebSockets.

## Features

 Real-time Messaging – Send and receive messages instantly.

 Live Online Status – See which of your friends are online in real time.

 Friend Management – Add and remove friends dynamically.

 Instant Notifications – Get notified when a friend comes online or sends a message.

 Secure Authentication – User authentication and session management.

🛠 Tech Stack

## Frontend

React

Tailwind CSS / Bootstrap for styling

## Backend

Node.js
Express.js
Socket.IO (for real-time messaging)

## Database

MongoDB (Mongoose ORM)

## Authentication

JWT (JSON Web Token)

Bcrypt for password hashing

# clone repo
git clone https://github.com/yourusername/nodetalk.git
cd nodetalk

# install dependencies
npm install

# dotenv (backend)
PORT={}
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key

# run command (for both client and server)
npm run dev
Nodemon (dev server)
dotenv (environment configuration)

## run in docker(for backend)
setup dotenv with all required variables
Build image -> docker build -t nodetalk-server .
Run the container -> docker run -d -p 5000:5000 --env-file .env --name nodetalk-container nodetalk-server

