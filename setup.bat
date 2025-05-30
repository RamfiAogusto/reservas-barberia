@echo off

echo Installing dependencies and setting up the project...

echo Installing frontend dependencies...
cd frontend
npm install
cp env.example .env.local

echo Installing backend dependencies...
cd ../backend
npm install
cp env.example .env

echo Setup complete!