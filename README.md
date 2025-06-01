Run Vibe Chat Hackathon App Locally (via Docker)
You can launch the full app on your machine in just a few steps using Docker and Docker Compose.

✅ Prerequisites
Install Docker Desktop

Clone this repository

📦 How to Run
bash
Copy
Edit
# 1. Clone the repo
git clone https://github.com/alexandramak/vibe-chat-hackathon.git
cd vibe-chat-hackathon

# 2. Create a `.env` file in the root with the following content:
Paste this in a file named .env (create it manually):

ini
Copy
Edit
PORT=3000
DATABASE_URL=postgresql://vibe_chat_db_user:bSV2U7ZbTov7fVTTHCPcHMlAaoNJZwpW@dpg-d0tp58c9c44c739n5pf0-a/vibe_chat_db
bash
Copy
Edit
# 3. Build and run everything
docker compose up --build
The app will be available at:
👉 http://localhost:3000

