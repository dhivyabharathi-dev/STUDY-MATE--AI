# Study Buddy AI

Build "AI StudyMate" — a full-stack web app that acts as an AI learning 

assistant for school students.

CORE IDEA:

A chatbot-based study companion where students ask academic questions and 

get simple, tutor-style explanations, plus tools to generate notes, take 

quizzes, plan study time, and track progress.

KEY FEATURES (build these):

1. Login/Register — student name, class, preferred language (English/Tamil)

2. AI Chatbot — ask questions, get simple explanations with examples; 

   supports English and Tamil; keeps chat history

3. Notes Generator — enter a topic, get short notes with definitions, 

   examples, and exam points

4. Quiz Generator — pick subject/topic/difficulty, get 5-10 MCQs with 

   scoring and explanations for wrong answers

5. Study Planner — enter subjects, exam date, and study hours → get a 

   daily/weekly timetable

6. Progress Dashboard — charts showing quizzes taken, average score, 

   strong/weak subjects, study time

TECH STACK:

- Frontend: HTML/CSS/JS or React

- Backend: Python (Flask/Django)

- Database: SQLite

- AI: Gemini or OpenAI API (key stored in env variables, never exposed 

  to frontend)

CHATBOT PERSONALITY:

Friendly, patient tutor — never just gives answers to homework, instead 

explains simply, gives an example, then a quick check-in question. 

Age-appropriate, avoids inappropriate content, never impersonates a 

real teacher/doctor/lawyer.

DESIGN:

Clean, modern, student-friendly UI — light background, blue/purple 

accents, rounded cards, mobile-responsive.

DELIVERABLE:

Fully functional app (not just UI mockup) with working auth, chatbot, 

database, and all buttons wired up. Include folder structure, setup 

instructions, and a sample student account.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://learnpal-app.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d13d1818-a148-47a0-a433-ec9b54a25acf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
