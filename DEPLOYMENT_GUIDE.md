# Luxtril Deployment Guide

This guide describes how to deploy the **Luxtril Node.js backend** and **PostgreSQL database** on your VPS (`187.127.147.96`), and how to verify that your local mobile app and admin panel are correctly connected to it on port `5001`.

---

## Part 1: Push Config Changes to GitHub

Before beginning the VPS deployment, ensure all latest configuration updates (pointing your local app/admin-panel to the VPS IP) are committed and pushed to your new repository.

Run these commands on your **local machine** terminal:

```bash
# 1. Stage the changed configuration files
git add admin-panel/src/utils/api.js app/src/config/api.js

# 2. Commit the changes
git commit -m "Update API URLs to point to VPS IP 187.127.147.96:5001"

# 3. Push to GitHub
git push origin main
```

---

## Part 2: Connect to your VPS and Set Up Docker

Connect to your VPS server via SSH and prepare the system.

### 1. SSH into VPS
Run this command from your terminal:
```bash
ssh root@187.127.147.96
```

### 3. Update System and Install Docker
Execute these commands inside your VPS terminal to ensure Docker and Docker Compose are installed:

```bash
# Update package database
apt-get update

# Install Docker
apt-get install -y docker.io

# Install Docker Compose (v2)
apt-get install -y docker-compose-v2

# Start and enable Docker service
systemctl start docker
systemctl enable docker
```

---

## Part 3: Deploy the Backend & Database

### 1. Clone the GitHub Repository
Navigate to the directory where you want to host the project on the VPS and clone the repository:

```bash
git clone https://github.com/Bpska/Luxtril-new.git
cd Luxtril-new
```

### 2. Run Docker Compose
Build and launch the Docker containers in the background:

```bash
docker compose up -d --build
```

This will spin up:
*   `luxtril-db` (PostgreSQL) mapped internally to container port `5432` and exposed to host port `5433`
*   `luxtril-backend` (Express API) exposed to host port `5001`
*   `luxtril-admin-panel` (React Web App) exposed to host port `8080`

You can verify that the containers are running by typing:
```bash
docker ps
```

---

## Part 4: Run Database Migrations and Seed Demo Data

Once the containers are up and running, you need to initialize the PostgreSQL database schema and seed the default user accounts and dummy salons.

Run the following commands on your **VPS**:

### 1. Run Migrations (Create Tables)
```bash
docker exec -it luxtril-backend npm run db:migrate
```

### 2. Seed Data (Add Admin, Owner, Client, and Salon)
```bash
docker exec -it luxtril-backend npm run db:seed
```

---

## Part 5: Verify the Deployment

*   **API Endpoint:** Open your browser and navigate to `http://187.127.147.96:5001/api`. You should see the backend server's default response.
*   **Admin Dashboard:** Open your browser and navigate to `http://187.127.147.96:8080`. You should see the Lustril admin panel login page.
*   **Mobile App:** Re-run `npm run android` on your local machine. The mobile application will now bypass your local backend and connect directly to the VPS at `http://187.127.147.96:5001/api`. You can log in using:
    *   **Client Login:** `client@luxtril.com` / `client123`
    *   **Owner Login:** `owner@luxtril.com` / `owner123`
